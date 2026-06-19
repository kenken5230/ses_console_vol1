import type { AuthUser } from "./auth";

export const PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT = "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOCKED_TRADE_STATUSES = new Set(["NG", "NEEDS_REVIEW", "SUSPENDED"]);

const ALLOWED_BODY_KEYS = new Set([
  "intent",
  "companyId",
  "contactId",
  "confirmCompanyContactLink",
  "expectedOwnerCompanyId",
  "expectedOwnerContactId",
  "expectedUpdatedAt",
]);

const FORBIDDEN_TOP_LEVEL_KEYS = new Set([
  "body",
  "bodyText",
  "company",
  "companyName",
  "contact",
  "contactEmail",
  "contactName",
  "csvRawValue",
  "email",
  "emailAddress",
  "freeNote",
  "fullBody",
  "fullNote",
  "fullNotes",
  "mailBody",
  "memo",
  "name",
  "note",
  "notes",
  "person",
  "personName",
  "rawBody",
  "rawCsv",
  "rawMailBody",
  "rawPersonText",
  "rawSourcePayload",
  "rawText",
  "rawValue",
  "subject",
  "text",
]);

const SENSITIVE_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /\b(?:api[_-]?key|password|secret|token)\s*[:=]/i,
  /[A-Za-z]:\\(?:Users|OneDrive|Documents|Desktop|Downloads)\\/i,
  /\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/,
];

const personSelect = {
  id: true,
  ownerCompanyId: true,
  ownerContactId: true,
  updatedAt: true,
};

export type PersonOwnerCompanyContactLinkEnv = {
  COMPANY_CONTACT_LINK_WRITE_ENABLED?: string;
  COMPANY_CONTACT_LINK_WRITE_TARGET?: string;
  [key: string]: string | undefined;
};

export type PersonOwnerCompanyContactLinkGuard = {
  allowed: boolean;
  enabled: boolean;
  target: "staging" | "production" | "not-staging";
};

export type PersonOwnerCompanyContactLinkUser = Pick<AuthUser, "id" | "role"> & {
  isActive?: boolean;
};

export type LinkExistingPersonOwnerCompanyContactInput = {
  intent: typeof PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT;
  companyId: string;
  contactId: string;
  confirmCompanyContactLink: true;
  expectedOwnerCompanyId: string | null;
  expectedOwnerContactId: string | null;
  expectedUpdatedAt: string;
};

export type PersonOwnerCompanyContactLinkDb = {
  company: {
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  };
  companyContact: {
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  };
  person: {
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
    update(args: Record<string, unknown>): Promise<unknown>;
  };
  auditLog: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  $transaction<T>(fn: (tx: PersonOwnerCompanyContactLinkDb) => Promise<T>): Promise<T>;
};

export class PersonOwnerCompanyContactLinkRequestError extends Error {
  status: number;
  reasonCode: string;
  manualReview: boolean;

  constructor(message: string, status = 400, reasonCode = "INVALID_PERSON_OWNER_LINK_REQUEST") {
    super(message);
    this.name = "PersonOwnerCompanyContactLinkRequestError";
    this.status = status;
    this.reasonCode = reasonCode;
    this.manualReview = status === 409;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isObject(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function uuidValue(value: unknown, field: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new PersonOwnerCompanyContactLinkRequestError(`${field} must be a valid UUID`);
  }
  return value;
}

function expectedOwnerIdValue(body: Record<string, unknown>, field: string) {
  if (!hasOwn(body, field)) {
    throw new PersonOwnerCompanyContactLinkRequestError(`${field} is required`);
  }

  const value = body[field];
  if (value === null) return null;
  if (typeof value === "string" && UUID_PATTERN.test(value)) return value;
  throw new PersonOwnerCompanyContactLinkRequestError(`${field} must be null or a valid UUID`);
}

function requiredTimestampValue(body: Record<string, unknown>, field: string) {
  if (!hasOwn(body, field)) {
    throw new PersonOwnerCompanyContactLinkRequestError(`${field} is required`);
  }

  const value = body[field];
  if (typeof value !== "string" || SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new PersonOwnerCompanyContactLinkRequestError(`${field} must be a valid timestamp`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new PersonOwnerCompanyContactLinkRequestError(`${field} must be a valid timestamp`);
  }

  return parsed.toISOString();
}

function ownerId(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function containsSensitiveValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  if (Array.isArray(value)) return value.some(containsSensitiveValue);
  if (!isObject(value)) return false;
  return Object.values(asRecord(value)).some(containsSensitiveValue);
}

function isPrismaRecordNotFoundError(error: unknown) {
  return asRecord(error).code === "P2025";
}

function assertNoUnsupportedOrRawFields(body: Record<string, unknown>) {
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_BODY_KEYS.has(key) || FORBIDDEN_TOP_LEVEL_KEYS.has(key)) {
      throw new PersonOwnerCompanyContactLinkRequestError("Request contains unsupported raw, note, or PII fields");
    }

    if (containsSensitiveValue(value)) {
      throw new PersonOwnerCompanyContactLinkRequestError("Request contains unsafe raw or PII values");
    }
  }
}

function safeRecordId(record: unknown) {
  const id = asRecord(record).id;
  return typeof id === "string" ? id : null;
}

function safeTradeStatus(record: unknown) {
  const tradeStatus = asRecord(record).tradeStatus;
  return typeof tradeStatus === "string" ? tradeStatus : "UNKNOWN";
}

function safeCompanyId(record: unknown) {
  const companyId = asRecord(record).companyId;
  return typeof companyId === "string" ? companyId : null;
}

function safeIsActive(record: unknown) {
  return asRecord(record).isActive !== false;
}

function auditMetadata(
  input: LinkExistingPersonOwnerCompanyContactInput,
  guard: PersonOwnerCompanyContactLinkGuard,
) {
  return {
    intent: input.intent,
    companyId: input.companyId,
    contactId: input.contactId,
    confirmed: true,
    featureGuard: {
      COMPANY_CONTACT_LINK_WRITE_ENABLED: guard.enabled ? "true" : "not-true",
      COMPANY_CONTACT_LINK_WRITE_TARGET: guard.target,
    },
  };
}

function assertExpectedPersonState(
  person: unknown,
  input: LinkExistingPersonOwnerCompanyContactInput,
) {
  const record = asRecord(person);
  const currentOwnerCompanyId = ownerId(record.ownerCompanyId);
  const currentOwnerContactId = ownerId(record.ownerContactId);
  const currentUpdatedAt = isoDate(record.updatedAt);

  if (currentOwnerCompanyId || currentOwnerContactId) {
    throw new PersonOwnerCompanyContactLinkRequestError(
      "Person already has ownerCompanyId or ownerContactId.",
      409,
      "EXISTING_OWNER_LINK_PRESENT",
    );
  }

  if (input.expectedOwnerCompanyId !== currentOwnerCompanyId) {
    throw new PersonOwnerCompanyContactLinkRequestError(
      "Person ownerCompanyId changed before link update.",
      409,
      "STALE_OWNER_COMPANY_ID",
    );
  }

  if (input.expectedOwnerContactId !== currentOwnerContactId) {
    throw new PersonOwnerCompanyContactLinkRequestError(
      "Person ownerContactId changed before link update.",
      409,
      "STALE_OWNER_CONTACT_ID",
    );
  }

  if (!currentUpdatedAt || input.expectedUpdatedAt !== currentUpdatedAt) {
    throw new PersonOwnerCompanyContactLinkRequestError(
      "Person updatedAt changed before link update.",
      409,
      "STALE_PERSON_UPDATED_AT",
    );
  }
}

export function personOwnerCompanyContactLinkGuard(
  env: PersonOwnerCompanyContactLinkEnv = process.env,
): PersonOwnerCompanyContactLinkGuard {
  const enabled = env.COMPANY_CONTACT_LINK_WRITE_ENABLED === "true";
  const rawTarget = env.COMPANY_CONTACT_LINK_WRITE_TARGET;
  const target = rawTarget === "staging" || rawTarget === "production" ? rawTarget : "not-staging";

  return {
    allowed: enabled && target === "staging",
    enabled,
    target,
  };
}

export function disabledPersonOwnerCompanyContactLinkResponse(guard = personOwnerCompanyContactLinkGuard()) {
  return {
    status: "disabled",
    linked: false,
    writeAttempted: false,
    guard: {
      allowed: false,
      enabled: guard.enabled,
      target: guard.target,
      required: [
        "COMPANY_CONTACT_LINK_WRITE_ENABLED=true",
        "COMPANY_CONTACT_LINK_WRITE_TARGET=staging",
      ],
    },
    message: guard.target === "production"
      ? "Person owner company/contact link writes are not allowed for production target."
      : "Person owner company/contact link writes are disabled for this environment.",
  };
}

export function personOwnerCompanyContactLinkErrorResponse(error: PersonOwnerCompanyContactLinkRequestError) {
  return {
    status: error.manualReview ? "manual-review" : "error",
    reasonCode: error.reasonCode,
    message: error.message,
    linked: false,
    writeAttempted: false,
  };
}

export function isPersonOwnerCompanyContactLinkUser(user: unknown): user is PersonOwnerCompanyContactLinkUser {
  const record = asRecord(user);
  return typeof record.id === "string"
    && (record.role === "ADMIN" || record.role === "MANAGER")
    && record.isActive !== false;
}

export function validatePersonOwnerCompanyContactLinkBody(
  bodyLike: unknown,
  routePersonId: string,
): LinkExistingPersonOwnerCompanyContactInput {
  if (!UUID_PATTERN.test(routePersonId)) {
    throw new PersonOwnerCompanyContactLinkRequestError("Invalid person id");
  }

  if (!isObject(bodyLike)) {
    throw new PersonOwnerCompanyContactLinkRequestError("Request body must be a JSON object");
  }

  const body = asRecord(bodyLike);
  assertNoUnsupportedOrRawFields(body);

  for (const key of ALLOWED_BODY_KEYS) {
    if (!hasOwn(body, key)) {
      throw new PersonOwnerCompanyContactLinkRequestError(`${key} is required`);
    }
  }

  if (body.intent !== PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT) {
    throw new PersonOwnerCompanyContactLinkRequestError("intent must be LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT");
  }

  if (body.confirmCompanyContactLink !== true) {
    throw new PersonOwnerCompanyContactLinkRequestError("confirmCompanyContactLink must be true");
  }

  return {
    intent: PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
    companyId: uuidValue(body.companyId, "companyId"),
    contactId: uuidValue(body.contactId, "contactId"),
    confirmCompanyContactLink: true,
    expectedOwnerCompanyId: expectedOwnerIdValue(body, "expectedOwnerCompanyId"),
    expectedOwnerContactId: expectedOwnerIdValue(body, "expectedOwnerContactId"),
    expectedUpdatedAt: requiredTimestampValue(body, "expectedUpdatedAt"),
  };
}

export async function linkExistingPersonOwnerCompanyContact(
  db: PersonOwnerCompanyContactLinkDb,
  routePersonId: string,
  body: unknown,
  user: PersonOwnerCompanyContactLinkUser,
  guard: PersonOwnerCompanyContactLinkGuard = personOwnerCompanyContactLinkGuard(),
) {
  if (!guard.allowed) {
    throw new PersonOwnerCompanyContactLinkRequestError("Person owner company/contact link writes are disabled", 403, "FEATURE_DISABLED");
  }

  if (!isPersonOwnerCompanyContactLinkUser(user)) {
    throw new PersonOwnerCompanyContactLinkRequestError("Forbidden", 403, "FORBIDDEN_ROLE");
  }

  const input = validatePersonOwnerCompanyContactLinkBody(body, routePersonId);

  const company = await db.company.findUnique({
    where: { id: input.companyId },
    select: { id: true, tradeStatus: true },
  });
  if (!company || safeRecordId(company) !== input.companyId) {
    throw new PersonOwnerCompanyContactLinkRequestError("Company was not found", 404, "COMPANY_NOT_FOUND");
  }

  const contact = await db.companyContact.findUnique({
    where: { id: input.contactId },
    select: { id: true, companyId: true, isActive: true },
  });
  if (!contact || safeRecordId(contact) !== input.contactId) {
    throw new PersonOwnerCompanyContactLinkRequestError("Company contact was not found", 404, "COMPANY_CONTACT_NOT_FOUND");
  }

  if (safeCompanyId(contact) !== input.companyId) {
    throw new PersonOwnerCompanyContactLinkRequestError(
      "Company contact does not belong to the requested company.",
      409,
      "CONTACT_COMPANY_MISMATCH",
    );
  }

  if (!safeIsActive(contact)) {
    throw new PersonOwnerCompanyContactLinkRequestError(
      "Company contact is inactive and requires manual review.",
      409,
      "INACTIVE_COMPANY_CONTACT",
    );
  }

  const tradeStatus = safeTradeStatus(company);
  if (BLOCKED_TRADE_STATUSES.has(tradeStatus)) {
    throw new PersonOwnerCompanyContactLinkRequestError(
      "Company trade status requires manual review before linking.",
      409,
      `COMPANY_TRADE_STATUS_${tradeStatus}`,
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const person = await tx.person.findUnique({
      where: { id: routePersonId },
      select: personSelect,
    });

    if (!person || safeRecordId(person) !== routePersonId) {
      throw new PersonOwnerCompanyContactLinkRequestError("Person was not found", 404, "PERSON_NOT_FOUND");
    }

    assertExpectedPersonState(person, input);

    const beforeData = {
      ownerCompanyId: null,
      ownerContactId: null,
      updatedAt: input.expectedUpdatedAt,
    };

    let updatedPerson: unknown;
    try {
      updatedPerson = await tx.person.update({
        where: {
          id: routePersonId,
          ownerCompanyId: null,
          ownerContactId: null,
          updatedAt: new Date(input.expectedUpdatedAt),
        },
        data: {
          ownerCompanyId: input.companyId,
          ownerContactId: input.contactId,
        },
        select: personSelect,
      });
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw new PersonOwnerCompanyContactLinkRequestError(
          "Person changed before link update.",
          409,
          "STALE_PERSON_UPDATED_AT",
        );
      }
      throw error;
    }

    const updatedAt = isoDate(asRecord(updatedPerson).updatedAt);
    const afterData = {
      ownerCompanyId: input.companyId,
      ownerContactId: input.contactId,
      updatedAt,
      metadata: auditMetadata(input, guard),
    };

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
        entityType: "Person",
        entityId: routePersonId,
        beforeData,
        afterData,
      },
    });

    return updatedPerson;
  });

  return {
    personId: routePersonId,
    ownerCompanyId: ownerId(asRecord(updated).ownerCompanyId) || input.companyId,
    ownerContactId: ownerId(asRecord(updated).ownerContactId) || input.contactId,
    intent: PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
  };
}

export function assertNoSensitivePersonOwnerCompanyContactLinkOutput(output: string) {
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(output)) {
      throw new Error("Sensitive person owner company/contact link output detected");
    }
  }
}
