import "dotenv/config";

import { prisma } from "../lib/prisma";
import { assertNotProductionMutation } from "../lib/production-guard";
import {
  createPersonFromExtraction,
  createProjectFromExtraction,
  findExistingPersonForExtraction,
  findExistingPersonForSenderSubject,
  findExistingProjectForExtraction,
  findExistingProjectForSenderSubject,
} from "../lib/gmail-extract-entities";
import { buildExtractionBodyText } from "../lib/gmail-message-body";
import {
  anonymizedCompanyCandidate,
  inferGmailCompanyCandidateForExtraction,
  type GmailCompanyCandidate,
  type KnownCompanyIdentity,
} from "./gmail-company-candidate";
import { extractFromMail, formatDate, personDisplayName, type MailExtraction, type MailExtractionSource } from "./gmail-extraction";
import { qualityScoreSummary, shortHash } from "./gmail-extraction-quality-report";

type ExtractTarget = "all" | "project" | "person";
type EntityTarget = "project" | "person";
type KnownCompanyRow = KnownCompanyIdentity & {
  aliases: Array<{ aliasName: string; normalizedAliasName: string }>;
};

type CandidateMail = {
  id: string;
  category: "PROJECT_INTRO" | "PERSON_INTRO";
  externalMessageId: string;
  subject: string | null;
  normalizedSubject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  normalizedBody: string | null;
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

function parseArgValue(name: string): string | null {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseLimit(): number {
  const raw = parseArgValue("limit");
  const limit = raw ? Number(raw) : NaN;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("Missing required --limit=N. Use a small limit first, e.g. --limit=50.");
  }
  return Math.min(Math.trunc(limit), 500);
}

function parseTarget(): ExtractTarget {
  const raw = parseArgValue("type") ?? "all";
  if (raw === "all" || raw === "project" || raw === "person") return raw;
  if (raw === "anken") return "project";
  if (raw === "youin") return "person";
  throw new Error("--type must be all, project, person, anken, or youin.");
}

function categoryWhere(target: ExtractTarget, includeProcessed: boolean) {
  const clauses = [];
  if (target === "all" || target === "project") {
    clauses.push({
      category: "PROJECT_INTRO" as const,
      sourceProjects: { none: {} },
      ...(includeProcessed
        ? {}
        : {
            entityLinks: { none: { entityType: "PROJECT" as const, linkType: "EXTRACTED" as const } },
            extractionResults: {
              none: {
                targetType: "PROJECT" as const,
                extractionType: "PROJECT_EXTRACTION" as const,
                targetId: { not: null },
              },
            },
          }),
    });
  }
  if (target === "all" || target === "person") {
    clauses.push({
      category: "PERSON_INTRO" as const,
      sourcePersons: { none: {} },
      ...(includeProcessed
        ? {}
        : {
            entityLinks: { none: { entityType: "PERSON" as const, linkType: "EXTRACTED" as const } },
            extractionResults: {
              none: {
                targetType: "PERSON" as const,
                extractionType: "PERSON_EXTRACTION" as const,
                targetId: { not: null },
              },
            },
          }),
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

function skipReasonFromExistingLinks(mail: CandidateMail, target: EntityTarget): string | null {
  if (target === "project" && mail.sourceProjects.length) return "source_project_exists";
  if (target === "person" && mail.sourcePersons.length) return "source_person_exists";
  if (target === "project" && mail.sourcePersons.length) return "cross_entity_person_source_exists";
  if (target === "person" && mail.sourceProjects.length) return "cross_entity_project_source_exists";
  if (targetLinkCount(mail, target)) return "target_mail_entity_link_exists";
  if (targetExtractionCount(mail, target)) return "target_extraction_result_exists";
  return null;
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return safeLogText(message, 1000);
}

function safeErrorName(error: unknown): string {
  return safeLogText(error instanceof Error ? error.name : "", 120);
}

function safeErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return safeLogText(typeof code === "string" ? code : "", 80);
}

function safeLogText(value: string | null | undefined, maxLength: number): string {
  const secretValues = Object.entries(process.env)
    .filter(([key, secret]) => {
      return Boolean(
        secret &&
          secret.length >= 8 &&
          /(DATABASE_URL|SECRET|TOKEN|PASSWORD|PASS|KEY)/i.test(key),
      );
    })
    .map(([, secret]) => secret as string);

  let next = value ?? "";
  for (const secret of secretValues) {
    next = next.split(secret).join("[redacted]");
  }

  return next
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(client_secret|refresh_token|access_token|reset_token|resetToken|password|token|secret)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/(DATABASE_URL|database_url)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeSubject(subject: string | null | undefined): string {
  const value = subject || "";
  return value ? `[redacted-subject len=${value.length} hash=${shortHash(value)}]` : "(no subject)";
}

function shortId(value: string | null | undefined): string {
  return value ? value.slice(0, 8) : "";
}

function redactedNameSummary(extraction: MailExtraction, mail: CandidateMail): string {
  if (extraction.target !== "person") return "[redacted-project-title]";
  if (extraction.name) return "[redacted-name]";
  if (extraction.initials) return "[initials]";
  return personDisplayName(mail.id, null, null);
}

function scoreSummary(extraction: MailExtraction): string {
  const score = qualityScoreSummary(extraction);
  return `project=${score.projectScore};person=${score.personScore};margin=${score.conflictMargin};predicted=${score.predictedType}`;
}

function companyCandidateColumns(companyCandidate: GmailCompanyCandidate) {
  const anonymized = anonymizedCompanyCandidate(companyCandidate);
  return {
    companyCandidatePresent: anonymized.candidatePresent ? "yes" : "",
    companyCandidateSource: anonymized.source,
    companyCandidateConfidence: anonymized.confidence,
    companyCandidateReason: anonymized.reasonCodes.join(", "),
    companyCandidateGenericDomain: anonymized.isGenericDomain ? "yes" : "",
  };
}

function qualityColumns(extraction: MailExtraction, mail: CandidateMail, companyCandidate: GmailCompanyCandidate) {
  const score = qualityScoreSummary(extraction);
  if (extraction.target === "person") {
    return {
      extractedName: extraction.name ? "[redacted-name]" : extraction.initials ? "[initials]" : "",
      finalName: redactedNameSummary(extraction, mail),
      nameConfidence: extraction.nameConfidence,
      nameSource: extraction.nameSource,
      needsReview: extraction.needsReview,
      reviewReasons: extraction.reviewReasons.join(", "),
      roleHeadline: extraction.roleHeadline ? "[redacted-role-label]" : "",
      roleHeadlineSource: extraction.roleHeadlineSource,
      age: extraction.age ?? "",
      price: extraction.desiredUnitPrice ?? "",
      availableFrom: formatDate(extraction.availableFrom) ?? "",
      skillCount: extraction.skills.length,
      skills: `[redacted-skills count=${extraction.skills.length}]`,
      classificationWarning: extraction.classificationWarning ?? "",
      classificationScoreSummary: scoreSummary(extraction),
      predictedType: score.predictedType,
      projectScore: score.projectScore,
      personScore: score.personScore,
      conflictMargin: score.conflictMargin,
      subjectOnlyFallback: score.subjectOnlyFallback ? "yes" : "",
      bodyDerived: score.bodyDerived ? "yes" : "",
      skillOverExtraction: extraction.skillOverExtraction ? "yes" : "",
      wouldNeedsReview: extraction.needsReview ? "yes" : "",
      ...companyCandidateColumns(companyCandidate),
    };
  }

  return {
    extractedName: "",
    finalName: redactedNameSummary(extraction, mail),
    nameConfidence: "",
    nameSource: "",
    needsReview: extraction.needsReview,
    reviewReasons: extraction.reviewReasons.join(", "),
    roleHeadline: "",
    roleHeadlineSource: "",
    age: "",
    price: extraction.unitPriceMax ?? "",
    availableFrom: formatDate(extraction.startMonth) ?? "",
    skillCount: extraction.requiredSkills.length + extraction.preferredSkills.length + extraction.usedTechnologies.length,
    skills: `[redacted-skills count=${extraction.requiredSkills.length + extraction.preferredSkills.length + extraction.usedTechnologies.length}]`,
    classificationWarning: extraction.classificationWarning ?? "",
    classificationScoreSummary: scoreSummary(extraction),
    predictedType: score.predictedType,
    projectScore: score.projectScore,
    personScore: score.personScore,
    conflictMargin: score.conflictMargin,
    subjectOnlyFallback: score.subjectOnlyFallback ? "yes" : "",
    bodyDerived: score.bodyDerived ? "yes" : "",
    skillOverExtraction: extraction.skillOverExtraction ? "yes" : "",
    wouldNeedsReview: extraction.needsReview ? "yes" : "",
    ...companyCandidateColumns(companyCandidate),
  };
}

async function findExistingForTarget(target: EntityTarget, source: MailExtractionSource) {
  if (target === "project") return findExistingProjectForExtraction(prisma, source);
  return findExistingPersonForExtraction(prisma, source);
}

async function findSameSenderSubjectCandidate(target: EntityTarget, source: MailExtractionSource) {
  if (target === "project") return findExistingProjectForSenderSubject(prisma, source);
  return findExistingPersonForSenderSubject(prisma, source);
}

async function applyExtraction(target: EntityTarget, source: MailExtractionSource) {
  const extraction = extractFromMail(source);
  return prisma.$transaction(async (tx) => {
    if (target === "project" && extraction.target === "project") {
      return createProjectFromExtraction(tx, source, extraction);
    }
    if (target === "person" && extraction.target === "person") {
      return createPersonFromExtraction(tx, source, extraction);
    }
    throw new Error("Extraction target did not match mail category.");
  });
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const target = parseTarget();
  const apply = hasFlag("apply");
  const includeProcessed = hasFlag("include-processed");
  if (apply) {
    assertNotProductionMutation("gmail:extract:unlinked");
  }

  const mails = await prisma.mailNotification.findMany({
    where: {
      isExcluded: false,
      OR: categoryWhere(target, includeProcessed),
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
      sourceProjects: {
        select: {
          id: true,
          status: true,
        },
      },
      sourcePersons: {
        select: {
          id: true,
          status: true,
        },
      },
      entityLinks: {
        where: {
          entityType: { in: ["PROJECT", "PERSON"] },
        },
        select: {
          entityType: true,
          entityId: true,
          linkType: true,
        },
      },
      extractionResults: {
        where: {
          targetType: { in: ["PROJECT", "PERSON"] },
          extractionType: { in: ["PROJECT_EXTRACTION", "PERSON_EXTRACTION"] },
        },
        select: {
          targetType: true,
          targetId: true,
          extractionType: true,
          reviewStatus: true,
        },
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

  const summary = {
    mode: apply ? "apply" : "dry-run",
    type: target,
    includeProcessed,
    fetched: mails.length,
    wouldCreate: 0,
    wouldNeedsReview: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  const rows = [];

  for (const mail of mails as CandidateMail[]) {
    const entityTarget = entityTargetForMail(mail);
    const source = toMailSource(mail);
    const extraction = extractFromMail(source);
    const companyCandidate = inferGmailCompanyCandidateForExtraction({ mail: source, extraction, knownCompanies });
    const existingLinkReason = skipReasonFromExistingLinks(mail, entityTarget);
    const existing = existingLinkReason ? null : await findExistingForTarget(entityTarget, source);
    const skipReason = existingLinkReason ?? (existing ? existing.source : null);
    const sameSenderSubjectCandidate = await findSameSenderSubjectCandidate(entityTarget, source);
    const duplicateCandidate = sameSenderSubjectCandidate ? "same_sender_subject_candidate" : "";
    const bodyTextLength = source.bodyText?.length ?? 0;

    if (skipReason) {
      summary.skipped += 1;
      rows.push({
        action: "skip",
        reason: skipReason,
        target: entityTarget,
        category: mail.category,
        duplicateCandidate,
        duplicateCandidateEntityId: shortId(sameSenderSubjectCandidate?.id),
        bodyTextLength,
        missing: extraction.missingFields.join(", "),
        subject: safeSubject(mail.subject),
        mailId: shortId(mail.id),
        ...qualityColumns(extraction, mail, companyCandidate),
      });
      continue;
    }

    if (!apply) {
      summary.wouldCreate += 1;
      if (extraction.needsReview) summary.wouldNeedsReview += 1;
      rows.push({
        action: "would_create",
        reason: extraction.needsReview ? "needs_review" : "ok",
        target: entityTarget,
        category: mail.category,
        duplicateCandidate,
        duplicateCandidateEntityId: shortId(sameSenderSubjectCandidate?.id),
        bodyTextLength,
        missing: extraction.missingFields.join(", "),
        subject: safeSubject(mail.subject),
        mailId: shortId(mail.id),
        ...qualityColumns(extraction, mail, companyCandidate),
      });
      continue;
    }

    try {
      const result = await applyExtraction(entityTarget, source);
      if (result.action === "created") summary.created += 1;
      else if (result.action === "updated") summary.updated += 1;
      else summary.skipped += 1;
      rows.push({
        action: result.action,
        reason: result.reason ?? (extraction.needsReview ? "needs_review" : "ok"),
        target: entityTarget,
        category: mail.category,
        duplicateCandidate,
        duplicateCandidateEntityId: shortId(sameSenderSubjectCandidate?.id),
        bodyTextLength,
        missing: extraction.missingFields.join(", "),
        subject: safeSubject(mail.subject),
        mailId: shortId(mail.id),
        entityId: shortId(result.id),
        ...qualityColumns(extraction, mail, companyCandidate),
      });
    } catch (error) {
      summary.failed += 1;
      rows.push({
        action: "failed",
        reason: safeErrorMessage(error),
        target: entityTarget,
        category: mail.category,
        duplicateCandidate,
        duplicateCandidateEntityId: shortId(sameSenderSubjectCandidate?.id),
        bodyTextLength,
        missing: extraction.missingFields.join(", "),
        subject: safeSubject(mail.subject),
        mailId: shortId(mail.id),
        errorName: safeErrorName(error),
        errorCode: safeErrorCode(error),
        errorMessage: safeErrorMessage(error),
        ...qualityColumns(extraction, mail, companyCandidate),
      });
    }
  }

  console.log(apply ? "Gmail unlinked extraction apply." : "Gmail unlinked extraction dry-run. No DB changes are performed.");
  console.log(`type: ${target}, limit: ${limit}, fetched: ${mails.length}`);
  console.table([summary]);
  console.table(rows);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
