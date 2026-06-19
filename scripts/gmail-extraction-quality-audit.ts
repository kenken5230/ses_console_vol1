import "dotenv/config";

import { prisma } from "../lib/prisma";
import { buildExtractionBodyText } from "../lib/gmail-message-body";
import {
  classifyMailExtractionQuality,
  extractFromMail,
  type MailExtractionSource,
} from "./gmail-extraction";
import {
  inferGmailCompanyCandidateForExtraction,
  type KnownCompanyIdentity,
} from "./gmail-company-candidate";
import {
  assertNoSensitiveOutput,
  buildAnonymizedIssueRow,
  incrementCounter,
  incrementMany,
  isHighRiskExtraction,
  qualityReviewReasons,
  qualityScoreSummary,
  qualitySkillCount,
  qualitySkillOverExtraction,
  scoreBucketKey,
  shortHash,
  skillCountBucket,
} from "./gmail-extraction-quality-report";

type ExtractTarget = "all" | "project" | "person";
type EntityTarget = "project" | "person";
type AuditScope = "all" | "unlinked" | "linked";

type CandidateMail = {
  id: string;
  category: "PROJECT_INTRO" | "PERSON_INTRO";
  externalMessageId: string;
  subject: string | null;
  normalizedSubject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  normalizedBody: string | null;
  snippet?: string | null;
  fromEmail: string | null;
  fromName: string | null;
  receivedAt: Date;
  sourceProjects: Array<{ id: string; status: string }>;
  sourcePersons: Array<{ id: string; status: string }>;
  entityLinks: Array<{ entityType: string; entityId: string; linkType: string }>;
  extractionResults: Array<{
    targetType: string;
    targetId: string | null;
    extractionType: string;
    reviewStatus: string;
  }>;
};

type KnownCompanyRow = KnownCompanyIdentity & {
  aliases: Array<{ aliasName: string; normalizedAliasName: string }>;
};

function parseArgValue(name: string): string | null {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? null;
}

function parseLimit(): number {
  const raw = parseArgValue("limit");
  const limit = raw ? Number(raw) : NaN;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("Missing required --limit=N. quality-audit is read-only; start with --limit=100.");
  }
  return Math.min(Math.trunc(limit), 500);
}

function parseTarget(): ExtractTarget {
  const raw = parseArgValue("type") ?? "all";
  if (raw === "all" || raw === "project" || raw === "person") return raw;
  throw new Error("--type must be all, project, or person.");
}

function parseAuditScope(): AuditScope {
  const raw = parseArgValue("audit-scope") ?? "all";
  if (raw === "all" || raw === "unlinked" || raw === "linked") return raw;
  throw new Error("--audit-scope must be all, unlinked, or linked.");
}

function assertNoApplyFlag(): void {
  if (process.argv.includes("--apply")) {
    throw new Error("quality-audit is read-only and does not accept --apply.");
  }
}

function scopeWhere(target: EntityTarget, scope: AuditScope) {
  if (scope === "all") return {};

  const entityType = target === "project" ? "PROJECT" : "PERSON";
  const targetType = target === "project" ? "PROJECT" : "PERSON";
  const extractionType = target === "project" ? "PROJECT_EXTRACTION" : "PERSON_EXTRACTION";
  const linkedFilters = [
    { entityLinks: { some: { entityType, linkType: "EXTRACTED" as const } } },
    {
      extractionResults: {
        some: {
          targetType,
          extractionType,
          targetId: { not: null },
        },
      },
    },
  ];

  if (scope === "linked") {
    return { OR: linkedFilters };
  }

  return {
    entityLinks: { none: { entityType, linkType: "EXTRACTED" as const } },
    extractionResults: {
      none: {
        targetType,
        extractionType,
        targetId: { not: null },
      },
    },
  };
}

function categoryWhere(target: ExtractTarget, scope: AuditScope) {
  const clauses = [];
  if (target === "all" || target === "project") {
    clauses.push({
      category: "PROJECT_INTRO" as const,
      sourceProjects: { none: {} },
      ...scopeWhere("project", scope),
    });
  }
  if (target === "all" || target === "person") {
    clauses.push({
      category: "PERSON_INTRO" as const,
      sourcePersons: { none: {} },
      ...scopeWhere("person", scope),
    });
  }
  return clauses;
}

function entityTargetForMail(mail: CandidateMail): EntityTarget {
  return mail.category === "PROJECT_INTRO" ? "project" : "person";
}

function toMailSource(mail: CandidateMail): MailExtractionSource {
  return {
    id: mail.id,
    category: mail.category,
    externalMessageId: mail.externalMessageId,
    subject: mail.subject,
    normalizedSubject: mail.normalizedSubject,
    bodyText: buildExtractionBodyText(mail),
    bodyHtml: mail.bodyHtml,
    normalizedBody: mail.normalizedBody,
    fromEmail: mail.fromEmail,
    fromName: mail.fromName,
    receivedAt: mail.receivedAt,
  };
}

function targetLinkCount(mail: CandidateMail, target: EntityTarget): number {
  const entityType = target === "project" ? "PROJECT" : "PERSON";
  return mail.entityLinks.filter((link) => link.entityType === entityType && link.linkType === "EXTRACTED").length;
}

function targetExtractionCount(mail: CandidateMail, target: EntityTarget): number {
  const targetType = target === "project" ? "PROJECT" : "PERSON";
  const extractionType = target === "project" ? "PROJECT_EXTRACTION" : "PERSON_EXTRACTION";
  return mail.extractionResults.filter((result) => {
    return result.targetType === targetType && result.extractionType === extractionType && result.targetId;
  }).length;
}

function existingLinkReasons(mail: CandidateMail, target: EntityTarget): string[] {
  const reasons = [];
  if (target === "project" && mail.sourceProjects.length) reasons.push("EXISTING_ENTITY_LINK_CANDIDATE");
  if (target === "person" && mail.sourcePersons.length) reasons.push("EXISTING_ENTITY_LINK_CANDIDATE");
  if (targetLinkCount(mail, target)) reasons.push("EXISTING_ENTITY_LINK_CANDIDATE");
  if (targetExtractionCount(mail, target)) reasons.push("DUPLICATE_OR_RELATED_MAIL_CANDIDATE");
  if (mail.entityLinks.length && !reasons.length) reasons.push("DUPLICATE_OR_RELATED_MAIL_CANDIDATE");
  return reasons;
}

function senderSubjectKey(mail: CandidateMail): string {
  return shortHash(`${mail.fromEmail ?? "none"}:${mail.normalizedSubject ?? mail.subject ?? "none"}`);
}

function emptyCounters() {
  return {
    predictedCounts: {} as Record<string, number>,
    nameConfidenceCounts: {} as Record<string, number>,
    nameSourceCounts: {} as Record<string, number>,
    rejectedNameCandidateCounts: {} as Record<string, number>,
    classificationWarningCounts: {} as Record<string, number>,
    reviewReasonCounts: {} as Record<string, number>,
    roleHeadlineSourceCounts: {} as Record<string, number>,
    companyCandidateSourceCounts: {} as Record<string, number>,
    companyCandidateConfidenceCounts: {} as Record<string, number>,
    companyCandidateReasonCounts: {} as Record<string, number>,
    skillCountDistribution: {} as Record<string, number>,
    projectScoreDistribution: {} as Record<string, number>,
    personScoreDistribution: {} as Record<string, number>,
  };
}

async function main(): Promise<void> {
  assertNoApplyFlag();
  const limit = parseLimit();
  const target = parseTarget();
  const auditScope = parseAuditScope();
  const counters = emptyCounters();
  const highRiskRows = [];
  const summary = {
    mode: "quality-audit",
    readOnly: true,
    type: target,
    auditScope,
    limit,
    scanned: 0,
    extractionAvailable: 0,
    wouldCreate: 0,
    wouldNeedsReview: 0,
    wouldSkip: 0,
    conflictCases: 0,
    subjectOnlyFallback: 0,
    bodyDerivedExtraction: 0,
    sameSenderSubjectCandidate: 0,
    linkedToExisting: 0,
    skillOverExtraction: 0,
    failed: 0,
  };

  const mails = await prisma.mailNotification.findMany({
    where: {
      isExcluded: false,
      OR: categoryWhere(target, auditScope),
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      category: true,
      externalMessageId: true,
      subject: true,
      normalizedSubject: true,
      bodyText: true,
      bodyHtml: true,
      normalizedBody: true,
      fromEmail: true,
      fromName: true,
      receivedAt: true,
      sourceProjects: { select: { id: true, status: true } },
      sourcePersons: { select: { id: true, status: true } },
      entityLinks: {
        where: { entityType: { in: ["PROJECT", "PERSON"] } },
        select: { entityType: true, entityId: true, linkType: true },
      },
      extractionResults: {
        where: {
          targetType: { in: ["PROJECT", "PERSON"] },
          extractionType: { in: ["PROJECT_EXTRACTION", "PERSON_EXTRACTION"] },
        },
        select: { targetType: true, targetId: true, extractionType: true, reviewStatus: true },
      },
    },
  });
  const knownCompanies = await prisma.company.findMany({
    select: {
      name: true,
      normalizedName: true,
      mainEmailDomain: true,
      aliases: { select: { aliasName: true, normalizedAliasName: true } },
    },
  }) as KnownCompanyRow[];
  const senderSubjectCounts = new Map<string, number>();
  for (const mail of mails as CandidateMail[]) {
    const key = senderSubjectKey(mail);
    senderSubjectCounts.set(key, (senderSubjectCounts.get(key) ?? 0) + 1);
  }

  for (const mail of mails as CandidateMail[]) {
    summary.scanned += 1;
    const entityTarget = entityTargetForMail(mail);
    const source = toMailSource(mail);
    const quality = classifyMailExtractionQuality(source);
    const existingReasons = existingLinkReasons(mail, entityTarget);
    if ((senderSubjectCounts.get(senderSubjectKey(mail)) ?? 0) > 1) {
      existingReasons.push("DUPLICATE_OR_RELATED_MAIL_CANDIDATE");
      summary.sameSenderSubjectCandidate += 1;
    }
    const extraction = extractFromMail(source);
    const companyCandidate = inferGmailCompanyCandidateForExtraction({ mail: source, extraction, knownCompanies });
    const score = qualityScoreSummary(extraction);
    const reasons = [...qualityReviewReasons(extraction), ...existingReasons];

    incrementCounter(counters.predictedCounts, quality.predictedType);
    incrementCounter(counters.companyCandidateSourceCounts, companyCandidate.source);
    incrementCounter(counters.companyCandidateConfidenceCounts, companyCandidate.confidence);
    incrementMany(counters.companyCandidateReasonCounts, companyCandidate.reasonCodes);
    incrementCounter(counters.projectScoreDistribution, scoreBucketKey(quality.projectScore));
    incrementCounter(counters.personScoreDistribution, scoreBucketKey(quality.personScore));
    incrementCounter(counters.skillCountDistribution, skillCountBucket(qualitySkillCount(extraction)));
    incrementMany(counters.classificationWarningCounts, [...quality.warnings, ...extraction.classificationWarnings, ...existingReasons]);
    incrementMany(counters.reviewReasonCounts, reasons);

    if (quality.predictedType === "project" || quality.predictedType === "person") summary.extractionAvailable += 1;
    if (quality.featureFlags.includes("classification_conflict")) summary.conflictCases += 1;
    if (quality.subjectOnlyFallback) summary.subjectOnlyFallback += 1;
    if (quality.bodyDerived) summary.bodyDerivedExtraction += 1;
    if (qualitySkillOverExtraction(extraction)) summary.skillOverExtraction += 1;
    if (existingReasons.length) summary.linkedToExisting += 1;

    if (extraction.target === "person") {
      incrementCounter(counters.nameConfidenceCounts, extraction.nameConfidence);
      incrementCounter(counters.nameSourceCounts, extraction.nameSource);
      incrementCounter(counters.roleHeadlineSourceCounts, extraction.roleHeadlineSource);
      if (extraction.rejectedNameCandidate) incrementCounter(counters.rejectedNameCandidateCounts, extraction.nameSource);
    }

    if (existingReasons.length || quality.predictedType === "other" || quality.predictedType === "excluded") {
      summary.wouldSkip += 1;
    } else {
      summary.wouldCreate += 1;
      if (extraction.needsReview || quality.needsReview) summary.wouldNeedsReview += 1;
    }

    if (isHighRiskExtraction(extraction, existingReasons) && highRiskRows.length < 20) {
      highRiskRows.push(buildAnonymizedIssueRow({ id: mail.id, extraction, issueCodes: reasons, companyCandidate }));
    }
  }

  const output = {
    summary,
    counters,
    highRiskRows,
    notes: [
      "read-only audit; no DB writes",
      "audit-scope=all includes linked and unlinked candidates; audit-scope=unlinked focuses on new creation candidates; audit-scope=linked focuses on already linked/extracted candidates.",
      "company candidate source/confidence/reason is reported without candidateName",
      "subjects, bodies, emails, names, company names are not printed",
      `sampleRunId=${shortHash(`${new Date().toISOString()}-${mails.length}`)}`,
    ],
  };
  const serialized = JSON.stringify(output, null, 2);
  assertNoSensitiveOutput(serialized);
  console.log(serialized);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "quality-audit failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
