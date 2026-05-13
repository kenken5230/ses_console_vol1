import type {
  MailExtraction,
  MailExtractionSource,
  PersonExtraction,
  ProjectExtraction,
} from "../scripts/gmail-extraction";

type TransactionClient = any;

export type ExtractEntity = "project" | "person";
export type ExistingEntity = {
  id: string;
  status?: string | null;
  source: "sourceMailId" | "mailEntityLink" | "extractionResult" | "deterministicCode" | "senderSubject";
};
export type ExtractActionResult = {
  entity: ExtractEntity;
  action: "created" | "updated" | "skipped";
  id: string;
  reason?: string;
};

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeSubjectForDedupe(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function senderDomain(email: string | null | undefined): string | null {
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  return domain || null;
}

function senderSubjectFilters(mail: MailExtractionSource) {
  const subject = normalizeSubjectForDedupe(mail.normalizedSubject ?? mail.subject);
  const email = mail.fromEmail?.trim();
  const domain = senderDomain(mail.fromEmail);
  const senderClauses = [
    email ? { fromEmail: { equals: email, mode: "insensitive" } } : null,
    domain ? { fromEmail: { endsWith: `@${domain}`, mode: "insensitive" } } : null,
  ].filter(Boolean);

  if (!subject || senderClauses.length === 0) return null;

  return {
    normalizedSubject: { equals: subject, mode: "insensitive" },
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

function projectCode(mailId: string): string {
  return `GMAIL-PRJ-${mailId.slice(0, 8).toUpperCase()}`;
}

function personCode(mailId: string): string {
  return `GMAIL-PER-${mailId.slice(0, 8).toUpperCase()}`;
}

export async function findExistingProjectForMail(tx: TransactionClient, mailId: string): Promise<ExistingEntity | null> {
  const bySourceMail = await tx.project.findFirst({
    where: { sourceMailId: mailId },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true },
  });
  if (bySourceMail) return { id: bySourceMail.id, status: bySourceMail.status, source: "sourceMailId" };

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
    const linkedProject = await tx.project.findUnique({ where: { id: byLink.entityId }, select: { id: true, status: true } });
    if (linkedProject) return { id: linkedProject.id, status: linkedProject.status, source: "mailEntityLink" };
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
    const extractedProject = await tx.project.findUnique({ where: { id: byExtraction.targetId }, select: { id: true, status: true } });
    if (extractedProject) return { id: extractedProject.id, status: extractedProject.status, source: "extractionResult" };
  }

  const byCode = await tx.project.findUnique({
    where: { projectCode: projectCode(mailId) },
    select: { id: true, status: true },
  });
  if (byCode) return { id: byCode.id, status: byCode.status, source: "deterministicCode" };

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
    select: { id: true, status: true },
  });

  return existing ? { id: existing.id, status: existing.status, source: "senderSubject" } : null;
}

export async function findExistingPersonForMail(tx: TransactionClient, mailId: string): Promise<ExistingEntity | null> {
  const bySourceMail = await tx.person.findFirst({
    where: { sourceMailId: mailId },
    orderBy: { createdAt: "asc" },
    select: { id: true, status: true },
  });
  if (bySourceMail) return { id: bySourceMail.id, status: bySourceMail.status, source: "sourceMailId" };

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
    const linkedPerson = await tx.person.findUnique({ where: { id: byLink.entityId }, select: { id: true, status: true } });
    if (linkedPerson) return { id: linkedPerson.id, status: linkedPerson.status, source: "mailEntityLink" };
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
    const extractedPerson = await tx.person.findUnique({ where: { id: byExtraction.targetId }, select: { id: true, status: true } });
    if (extractedPerson) return { id: extractedPerson.id, status: extractedPerson.status, source: "extractionResult" };
  }

  const byCode = await tx.person.findUnique({
    where: { personCode: personCode(mailId) },
    select: { id: true, status: true },
  });
  if (byCode) return { id: byCode.id, status: byCode.status, source: "deterministicCode" };

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
    select: { id: true, status: true },
  });

  return existing ? { id: existing.id, status: existing.status, source: "senderSubject" } : null;
}

export async function ensureExtractionResult(tx: TransactionClient, params: {
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

  const data = {
    modelName: "regex",
    modelVersion: "gmail-regex-v0.1",
    confidence: params.extraction.confidence,
    rawResult: normalizedExtraction.raw,
    normalizedResult: normalizedExtraction,
    reviewStatus: params.extraction.needsReview ? "NEEDS_REVIEW" : "PENDING",
  };

  if (existing) {
    await tx.extractionResult.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const created = await tx.extractionResult.create({
    data: {
      mailNotificationId: params.mailId,
      targetType,
      targetId: params.targetId,
      extractionType,
      ...data,
    },
    select: { id: true },
  });
  return created.id;
}

export async function ensureMailEntityLink(tx: TransactionClient, params: {
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
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await tx.mailEntityLink.create({
    data: {
      mailNotificationId: params.mailId,
      entityType: params.entityType,
      entityId: params.entityId,
      linkType: "EXTRACTED",
    },
    select: { id: true },
  });
  return created.id;
}

export async function createProjectFromExtraction(
  tx: TransactionClient,
  mail: MailExtractionSource,
  extraction: ProjectExtraction,
): Promise<ExtractActionResult> {
  const existing = await findExistingProjectForMail(tx, mail.id);
  if (existing) {
    if (existing.status === "ARCHIVED") {
      await tx.project.update({
        where: { id: existing.id },
        data: {
          sourceMailId: mail.id,
          status: extraction.needsReview ? "DRAFT" : "OPEN",
          publishedAt: extraction.needsReview ? null : new Date(),
        },
      });
      await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: existing.id });
      await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PROJECT", entityId: existing.id });
      return { entity: "project", action: "updated", id: existing.id, reason: "revivedArchived" };
    }
    await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: existing.id });
    await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PROJECT", entityId: existing.id });
    return { entity: "project", action: "skipped", id: existing.id, reason: existing.source };
  }

  const senderSubjectExisting = await findExistingProjectForSenderSubject(tx, mail);
  if (senderSubjectExisting) {
    await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: senderSubjectExisting.id });
    await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PROJECT", entityId: senderSubjectExisting.id });
    return { entity: "project", action: "skipped", id: senderSubjectExisting.id, reason: senderSubjectExisting.source };
  }

  const title = extraction.title || mail.subject || "Gmail imported project";
  const project = await tx.project.create({
    data: {
      projectCode: projectCode(mail.id),
      title: title.slice(0, 255),
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
      unitPriceText: extraction.unitPriceMax ? `${extraction.unitPriceMin ?? extraction.unitPriceMax}-${extraction.unitPriceMax}` : null,
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
    ...unique(extraction.usedTechnologies).map((skillName) => ({ projectId: project.id, skillName, skillType: "USED_TECHNOLOGY" })),
    ...unique(extraction.requiredSkills).map((skillName) => ({ projectId: project.id, skillName, skillType: "REQUIRED" })),
    ...unique(extraction.preferredSkills).map((skillName) => ({ projectId: project.id, skillName, skillType: "PREFERRED" })),
  ];
  if (skillRows.length) {
    await tx.projectSkill.createMany({ data: skillRows, skipDuplicates: true });
  }

  await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: project.id });
  await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PROJECT", entityId: project.id });

  return { entity: "project", action: "created", id: project.id };
}

export async function createPersonFromExtraction(
  tx: TransactionClient,
  mail: MailExtractionSource,
  extraction: PersonExtraction,
): Promise<ExtractActionResult> {
  const existing = await findExistingPersonForMail(tx, mail.id);
  if (existing) {
    if (existing.status === "ARCHIVED") {
      await tx.person.update({
        where: { id: existing.id },
        data: {
          sourceMailId: mail.id,
          status: extraction.status,
        },
      });
      await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: existing.id });
      await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PERSON", entityId: existing.id });
      return { entity: "person", action: "updated", id: existing.id, reason: "revivedArchived" };
    }
    await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: existing.id });
    await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PERSON", entityId: existing.id });
    return { entity: "person", action: "skipped", id: existing.id, reason: existing.source };
  }

  const senderSubjectExisting = await findExistingPersonForSenderSubject(tx, mail);
  if (senderSubjectExisting) {
    await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: senderSubjectExisting.id });
    await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PERSON", entityId: senderSubjectExisting.id });
    return { entity: "person", action: "skipped", id: senderSubjectExisting.id, reason: senderSubjectExisting.source };
  }

  const company = await findOrCreateCompany(tx, extraction.ownerCompanyName);
  const contact = company ? await findOrCreateContact(tx, company.id, extraction.contactName, extraction.contactEmail) : null;
  const person = await tx.person.create({
    data: {
      personCode: personCode(mail.id),
      name: extraction.name || mail.subject || "Gmail imported person",
      initials: extraction.initials,
      sourceMailId: mail.id,
      ownerCompanyId: company?.id ?? null,
      ownerContactId: contact?.id ?? null,
      summary: mail.subject,
      careerSummary: extraction.careerSummary,
      desiredUnitPrice: extraction.desiredUnitPrice,
      availableFrom: extraction.availableFrom,
      preferredLocation: extraction.preferredLocation,
      remotePreference: extraction.remotePreference,
      age: extraction.age,
      nationality: extraction.nationality,
      status: extraction.status,
    },
  });

  const skillRows = unique(extraction.skills).map((skillName) => ({ personId: person.id, skillName }));
  if (skillRows.length) {
    await tx.personSkill.createMany({ data: skillRows, skipDuplicates: true });
  }

  await ensureExtractionResult(tx, { mailId: mail.id, extraction, targetId: person.id });
  await ensureMailEntityLink(tx, { mailId: mail.id, entityType: "PERSON", entityId: person.id });

  return { entity: "person", action: "created", id: person.id };
}
