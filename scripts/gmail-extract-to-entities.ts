import "dotenv/config";

import { prisma } from "../lib/prisma";
import { assertNotProductionMutation } from "../lib/production-guard";
import {
  extractFromMail,
  type MailExtraction,
  type MailExtractionSource,
  type PersonExtraction,
  type ProjectExtraction,
} from "./gmail-extraction";

assertNotProductionMutation("gmail:extract");

type ExtractType = "all" | "anken" | "youin";
type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type ExtractEntity = "project" | "person";
type ExistingEntity = {
  id: string;
  source: "sourceMailId" | "mailEntityLink" | "extractionResult" | "deterministicCode" | "senderSubject";
};
type ExtractActionResult = {
  entity: ExtractEntity;
  action: "created" | "updated" | "skipped";
  id: string;
  reason?: string;
};

function parseLimit(): number | null {
  const argLimit = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const raw = argLimit ?? process.env.GMAIL_EXTRACT_LIMIT;
  if (!raw) return null;
  const limit = Number(raw);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function parseType(): ExtractType {
  const argType = process.argv.find((arg) => arg.startsWith("--type="))?.split("=")[1];
  if (argType === "anken" || argType === "youin") return argType;
  return "all";
}

function categoryFilter(type: ExtractType) {
  if (type === "anken") return ["PROJECT_INTRO"] as const;
  if (type === "youin") return ["PERSON_INTRO"] as const;
  return ["PROJECT_INTRO", "PERSON_INTRO"] as const;
}

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function nullableText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return truncateText(trimmed, maxLength);
}

function normalizeSubjectForDedupe(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function senderDomain(email: string | null | undefined): string | null {
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  return domain || null;
}

function senderSubjectFilters(mail: MailExtractionSource): any {
  const subject = normalizeSubjectForDedupe(mail.normalizedSubject ?? mail.subject);
  const email = mail.fromEmail?.trim();
  const domain = senderDomain(mail.fromEmail);
  const mode = "insensitive" as const;
  const senderClauses = [
    email ? { fromEmail: { equals: email, mode } } : null,
    domain ? { fromEmail: { endsWith: `@${domain}`, mode } } : null,
  ].filter(Boolean);

  if (!subject || senderClauses.length === 0) return null;

  return {
    normalizedSubject: { equals: subject, mode },
    OR: senderClauses,
  };
}

async function findOrCreateCompany(tx: TransactionClient, name: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const normalizedName = normalizeCompanyName(trimmed);
  const existing = await tx.company.findFirst({ where: { normalizedName } });
  if (existing) return existing;

  return tx.company.create({
    data: {
      name: trimmed,
      normalizedName,
      tradeStatus: "UNKNOWN",
    },
  });
}

async function findOrCreateContact(tx: TransactionClient, companyId: string, name: string | null, email: string | null) {
  if (!name && !email) return null;

  const existing = await tx.companyContact.findFirst({
    where: {
      companyId,
      OR: [{ name: name ?? "" }, email ? { email } : undefined].filter(Boolean),
    },
  });
  if (existing) return existing;

  return tx.companyContact.create({
    data: {
      companyId,
      name: name ?? email ?? "Gmail contact",
      email,
      contactPolicy: "Gmail extracted contact",
    },
  });
}

async function createExtractionResult(tx: TransactionClient, params: {
  mailId: string;
  extraction: MailExtraction;
  targetId: string;
}) {
  const normalizedExtraction = JSON.parse(JSON.stringify(params.extraction));
  const extractionType = params.extraction.target === "project" ? "PROJECT_EXTRACTION" : "PERSON_EXTRACTION";
  const targetType = params.extraction.target === "project" ? "PROJECT" : "PERSON";
  const existing = await tx.extractionResult.findFirst({
    where: {
      mailNotificationId: params.mailId,
      extractionType,
      targetType,
      targetId: params.targetId,
    },
    select: { id: true },
  });

  if (existing) return;

  await tx.extractionResult.create({
    data: {
      mailNotificationId: params.mailId,
      targetType,
      targetId: params.targetId,
      extractionType,
      modelName: "regex",
      modelVersion: "gmail-regex-v0.1",
      confidence: params.extraction.confidence,
      rawResult: normalizedExtraction.raw,
      normalizedResult: normalizedExtraction,
      reviewStatus: params.extraction.needsReview ? "NEEDS_REVIEW" : "PENDING",
    },
  });
}

async function createMailEntityLink(tx: TransactionClient, params: {
  mailId: string;
  entityType: "PROJECT" | "PERSON";
  entityId: string;
}) {
  const existing = await tx.mailEntityLink.findFirst({
    where: {
      mailNotificationId: params.mailId,
      entityType: params.entityType,
      entityId: params.entityId,
      linkType: "EXTRACTED",
    },
  });

  if (existing) return;

  await tx.mailEntityLink.create({
    data: {
      mailNotificationId: params.mailId,
      entityType: params.entityType,
      entityId: params.entityId,
      linkType: "EXTRACTED",
    },
  });
}

function projectCode(mailId: string): string {
  return `GMAIL-PRJ-${mailId.slice(0, 8).toUpperCase()}`;
}

function personCode(mailId: string): string {
  return `GMAIL-PER-${mailId.slice(0, 8).toUpperCase()}`;
}

async function findExistingProjectForMail(tx: TransactionClient, mailId: string): Promise<ExistingEntity | null> {
  const bySourceMail = await tx.project.findFirst({
    where: { sourceMailId: mailId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (bySourceMail) return { id: bySourceMail.id, source: "sourceMailId" };

  const byLink = await tx.mailEntityLink.findFirst({
    where: {
      mailNotificationId: mailId,
      entityType: "PROJECT",
      linkType: "EXTRACTED",
    },
    orderBy: { createdAt: "asc" },
    select: { entityId: true },
  });
  if (byLink) {
    const linkedProject = await tx.project.findUnique({ where: { id: byLink.entityId }, select: { id: true } });
    if (linkedProject) return { id: linkedProject.id, source: "mailEntityLink" };
  }

  const byExtraction = await tx.extractionResult.findFirst({
    where: {
      mailNotificationId: mailId,
      targetType: "PROJECT",
      extractionType: "PROJECT_EXTRACTION",
      targetId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: { targetId: true },
  });
  if (byExtraction?.targetId) {
    const extractedProject = await tx.project.findUnique({ where: { id: byExtraction.targetId }, select: { id: true } });
    if (extractedProject) return { id: extractedProject.id, source: "extractionResult" };
  }

  const byCode = await tx.project.findUnique({
    where: { projectCode: projectCode(mailId) },
    select: { id: true },
  });
  if (byCode) return { id: byCode.id, source: "deterministicCode" };

  return null;
}

async function findExistingProjectForSenderSubject(
  tx: TransactionClient,
  mail: MailExtractionSource,
): Promise<ExistingEntity | null> {
  const sourceMailFilter = senderSubjectFilters(mail);
  if (!sourceMailFilter) return null;

  const existing = await tx.project.findFirst({
    where: {
      sourceMailId: { not: null },
      status: { not: "ARCHIVED" },
      sourceMail: {
        is: sourceMailFilter,
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return existing ? { id: existing.id, source: "senderSubject" } : null;
}

async function findExistingPersonForMail(tx: TransactionClient, mailId: string): Promise<ExistingEntity | null> {
  const bySourceMail = await tx.person.findFirst({
    where: { sourceMailId: mailId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (bySourceMail) return { id: bySourceMail.id, source: "sourceMailId" };

  const byLink = await tx.mailEntityLink.findFirst({
    where: {
      mailNotificationId: mailId,
      entityType: "PERSON",
      linkType: "EXTRACTED",
    },
    orderBy: { createdAt: "asc" },
    select: { entityId: true },
  });
  if (byLink) {
    const linkedPerson = await tx.person.findUnique({ where: { id: byLink.entityId }, select: { id: true } });
    if (linkedPerson) return { id: linkedPerson.id, source: "mailEntityLink" };
  }

  const byExtraction = await tx.extractionResult.findFirst({
    where: {
      mailNotificationId: mailId,
      targetType: "PERSON",
      extractionType: "PERSON_EXTRACTION",
      targetId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: { targetId: true },
  });
  if (byExtraction?.targetId) {
    const extractedPerson = await tx.person.findUnique({ where: { id: byExtraction.targetId }, select: { id: true } });
    if (extractedPerson) return { id: extractedPerson.id, source: "extractionResult" };
  }

  const byCode = await tx.person.findUnique({
    where: { personCode: personCode(mailId) },
    select: { id: true },
  });
  if (byCode) return { id: byCode.id, source: "deterministicCode" };

  return null;
}

async function findExistingPersonForSenderSubject(
  tx: TransactionClient,
  mail: MailExtractionSource,
): Promise<ExistingEntity | null> {
  const sourceMailFilter = senderSubjectFilters(mail);
  if (!sourceMailFilter) return null;

  const existing = await tx.person.findFirst({
    where: {
      sourceMailId: { not: null },
      status: { not: "ARCHIVED" },
      sourceMail: {
        is: sourceMailFilter,
      },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return existing ? { id: existing.id, source: "senderSubject" } : null;
}

async function createProjectFromExtraction(
  tx: TransactionClient,
  mail: MailExtractionSource,
  extraction: ProjectExtraction,
): Promise<ExtractActionResult> {
  const existing = await findExistingProjectForMail(tx, mail.id);
  if (existing) {
    return { entity: "project", action: "skipped", id: existing.id, reason: existing.source };
  }

  const senderSubjectExisting = await findExistingProjectForSenderSubject(tx, mail);
  if (senderSubjectExisting) {
    await createExtractionResult(tx, { mailId: mail.id, extraction, targetId: senderSubjectExisting.id });
    await createMailEntityLink(tx, { mailId: mail.id, entityType: "PROJECT", entityId: senderSubjectExisting.id });
    return { entity: "project", action: "skipped", id: senderSubjectExisting.id, reason: senderSubjectExisting.source };
  }

  const project = await tx.project.create({
    data: {
      projectCode: projectCode(mail.id),
      title: extraction.title.slice(0, 255),
      summary: extraction.workDescription?.slice(0, 500) ?? mail.subject,
      workDescription: extraction.workDescription,
      businessDescription: extraction.businessDescription,
      sourceMailId: mail.id,
      status: extraction.needsReview ? "DRAFT" : "OPEN",
      publishedAt: extraction.needsReview ? null : new Date(),
    },
  });

  await tx.projectCondition.create({
    data: {
      projectId: project.id,
      unitPriceMin: extraction.unitPriceMin,
      unitPriceMax: extraction.unitPriceMax,
      unitPriceText: extraction.unitPriceMax ? `${extraction.unitPriceMin ?? extraction.unitPriceMax}〜${extraction.unitPriceMax}万円` : null,
      upperAmountMin: extraction.upperAmountMin,
      upperAmountMax: extraction.upperAmountMax,
      startMonth: extraction.startMonth,
      settlementTimeMin: extraction.settlementTimeMin,
      settlementTimeMax: extraction.settlementTimeMax,
      workLocationText: extraction.workLocationText,
      prefecture: extraction.prefecture,
      remoteType: extraction.remoteType,
      contractType: extraction.contractType,
      foreignNationalityPolicy: extraction.foreignNationalityPolicy,
      ageCondition: extraction.ageCondition,
      interviewCount: extraction.interviewCount,
      notes: extraction.commerceFlow ? `commerce: ${extraction.commerceFlow}` : null,
    },
  });

  const company = await findOrCreateCompany(tx, extraction.upperCompanyName);
  if (company) {
    const contact = await findOrCreateContact(tx, company.id, extraction.contactName, extraction.contactEmail);
    await tx.projectCompanyRole.create({
      data: {
        projectId: project.id,
        companyId: company.id,
        companyContactId: contact?.id ?? null,
        role: "UPPER_COMPANY",
        roleOrder: 1,
        isPrimary: true,
      },
    });
  }

  const skillRows = [
    ...unique(extraction.usedTechnologies).map((skillName) => ({ projectId: project.id, skillName, skillType: "USED_TECHNOLOGY" as const })),
    ...unique(extraction.requiredSkills).map((skillName) => ({ projectId: project.id, skillName, skillType: "REQUIRED" as const })),
    ...unique(extraction.preferredSkills).map((skillName) => ({ projectId: project.id, skillName, skillType: "PREFERRED" as const })),
  ];
  if (skillRows.length) {
    await tx.projectSkill.createMany({ data: skillRows, skipDuplicates: true });
  }

  await createExtractionResult(tx, { mailId: mail.id, extraction, targetId: project.id });
  await createMailEntityLink(tx, { mailId: mail.id, entityType: "PROJECT", entityId: project.id });

  return { entity: "project", action: "created", id: project.id };
}

async function createPersonFromExtraction(
  tx: TransactionClient,
  mail: MailExtractionSource,
  extraction: PersonExtraction,
): Promise<ExtractActionResult> {
  const name = nullableText(extraction.name, 160);
  const initials = nullableText(extraction.initials, 40);
  const missingPersonName = "要員名";
  const missingFields = name || extraction.missingFields.includes(missingPersonName)
    ? extraction.missingFields
    : [...extraction.missingFields, missingPersonName];
  const reviewReasons = unique([
    ...extraction.reviewReasons,
    !name ? "PERSON_NAME_LOW_CONFIDENCE" : "",
    !name && initials ? "PERSON_NAME_INITIALS_ONLY" : "",
  ]);
  const normalizedExtraction: PersonExtraction = {
    ...extraction,
    name,
    initials,
    remotePreference: nullableText(extraction.remotePreference, 120),
    nationality: nullableText(extraction.nationality, 80),
    needsReview: extraction.needsReview || !name || extraction.missingFields.includes(missingPersonName) || reviewReasons.length > 0,
    missingFields,
    reviewReasons,
  };

  const existing = await findExistingPersonForMail(tx, mail.id);
  if (existing) {
    return { entity: "person", action: "skipped", id: existing.id, reason: existing.source };
  }

  const senderSubjectExisting = await findExistingPersonForSenderSubject(tx, mail);
  if (senderSubjectExisting) {
    await createExtractionResult(tx, { mailId: mail.id, extraction: normalizedExtraction, targetId: senderSubjectExisting.id });
    await createMailEntityLink(tx, { mailId: mail.id, entityType: "PERSON", entityId: senderSubjectExisting.id });
    return { entity: "person", action: "skipped", id: senderSubjectExisting.id, reason: senderSubjectExisting.source };
  }

  const company = await findOrCreateCompany(tx, normalizedExtraction.ownerCompanyName);
  const contact = company ? await findOrCreateContact(tx, company.id, normalizedExtraction.contactName, normalizedExtraction.contactEmail) : null;
  const person = await tx.person.create({
    data: {
      personCode: personCode(mail.id),
      name: normalizedExtraction.name,
      initials: normalizedExtraction.initials,
      sourceMailId: mail.id,
      ownerCompanyId: company?.id ?? null,
      ownerContactId: contact?.id ?? null,
      summary: mail.subject,
      careerSummary: normalizedExtraction.careerSummary,
      desiredUnitPrice: normalizedExtraction.desiredUnitPrice,
      availableFrom: normalizedExtraction.availableFrom,
      preferredLocation: normalizedExtraction.preferredLocation,
      remotePreference: normalizedExtraction.remotePreference,
      age: normalizedExtraction.age,
      nationality: normalizedExtraction.nationality,
      status: normalizedExtraction.status,
    },
  });

  const skillRows = unique(normalizedExtraction.skills)
    .map((skillName) => nullableText(skillName, 160))
    .filter((skillName): skillName is string => Boolean(skillName))
    .map((skillName) => ({ personId: person.id, skillName }));
  if (skillRows.length) {
    await tx.personSkill.createMany({ data: skillRows, skipDuplicates: true });
  }

  await createExtractionResult(tx, { mailId: mail.id, extraction: normalizedExtraction, targetId: person.id });
  await createMailEntityLink(tx, { mailId: mail.id, entityType: "PERSON", entityId: person.id });

  return { entity: "person", action: "created", id: person.id };
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const type = parseType();
  const categories = categoryFilter(type);
  const mails = await prisma.mailNotification.findMany({
    where: {
      category: { in: [...categories] },
      isExcluded: false,
    },
    orderBy: { receivedAt: "desc" },
    take: limit ?? undefined,
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
    },
  });
  const summary = {
    fetched: mails.length,
    targetMails: mails.length,
    projectCreated: 0,
    projectUpdated: 0,
    projectSkipped: 0,
    personCreated: 0,
    personUpdated: 0,
    personSkipped: 0,
    failed: 0,
  };

  console.log("Starting Gmail extraction to projects/persons.");
  console.log(`target: ${type}, limit: ${limit ?? "all"}, candidates: ${mails.length}`);

  for (const mail of mails) {
    try {
      const extraction = extractFromMail(mail as MailExtractionSource);
      const result = await prisma.$transaction(async (tx) => {
        if (extraction.target === "project") {
          return createProjectFromExtraction(tx, mail as MailExtractionSource, extraction);
        }

        return createPersonFromExtraction(tx, mail as MailExtractionSource, extraction);
      });

      if (result.entity === "project" && result.action === "created") {
        summary.projectCreated += 1;
      } else if (result.entity === "project" && result.action === "updated") {
        summary.projectUpdated += 1;
      } else if (result.entity === "project") {
        summary.projectSkipped += 1;
      } else if (result.entity === "person" && result.action === "created") {
        summary.personCreated += 1;
      } else if (result.entity === "person" && result.action === "updated") {
        summary.personUpdated += 1;
      } else {
        summary.personSkipped += 1;
      }

      console.log(`[${result.entity === "project" ? "anken" : "youin"}] ${result.action} ${result.id} ${result.reason ? `(${result.reason})` : ""} ${mail.subject ?? ""}`);
    } catch (error) {
      summary.failed += 1;
      console.error(`[failed] ${mail.externalMessageId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.table([summary]);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
