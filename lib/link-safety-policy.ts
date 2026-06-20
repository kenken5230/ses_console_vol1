type LinkRuntimeEnv = Partial<Record<string, string | undefined>>;

export const LINK_WRITER_ROLES = ["ADMIN", "MANAGER"] as const;
export type LinkWriterRole = (typeof LINK_WRITER_ROLES)[number];

export const BLOCKED_COMPANY_LINK_TRADE_STATUSES = ["NG", "NEEDS_REVIEW", "SUSPENDED"] as const;
export type BlockedCompanyLinkTradeStatus = (typeof BLOCKED_COMPANY_LINK_TRADE_STATUSES)[number];

export const LINK_NON_PRODUCTION_WRITE_TARGETS = ["local", "test", "staging"] as const;
export type LinkNonProductionWriteTarget = (typeof LINK_NON_PRODUCTION_WRITE_TARGETS)[number];

export const LINK_FORBIDDEN_RAW_PAYLOAD_KEYS = [
  "body",
  "bodyText",
  "comment",
  "comments",
  "company",
  "companyName",
  "contact",
  "contactEmail",
  "contactName",
  "csvRawValue",
  "customer",
  "customerData",
  "email",
  "emailAddress",
  "freeNote",
  "fullBody",
  "fullNote",
  "fullNotes",
  "generatedMemo",
  "mailBody",
  "memo",
  "name",
  "note",
  "notes",
  "person",
  "personName",
  "phone",
  "phoneText",
  "project",
  "projectId",
  "projectName",
  "rawBody",
  "rawCsv",
  "rawMailBody",
  "rawPersonText",
  "rawSourcePayload",
  "rawText",
  "rawValue",
  "sourceBody",
  "subject",
  "text",
] as const;

export const LINK_SENSITIVE_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /\b(?:api[_-]?key|password|secret|token)\s*[:=]/i,
  /[A-Za-z]:\\(?:Users|OneDrive|Documents|Desktop|Downloads)\\/i,
  /\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/,
] as const;

export type UnsafeLinkPayloadField = {
  kind: "unsupported-key" | "sensitive-value";
  key: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isObject(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeTradeStatus(value: unknown) {
  return String(value || "UNKNOWN").trim().toUpperCase();
}

function isForbiddenRawPayloadKey(key: string, extraForbiddenKeys: ReadonlySet<string>) {
  return LINK_FORBIDDEN_RAW_PAYLOAD_KEYS.includes(key as (typeof LINK_FORBIDDEN_RAW_PAYLOAD_KEYS)[number])
    || extraForbiddenKeys.has(key);
}

export function isCompanyContactLinkWriterRole(role: unknown): role is LinkWriterRole {
  return LINK_WRITER_ROLES.includes(role as LinkWriterRole);
}

export function isBlockedCompanyLinkTradeStatus(value: unknown): value is BlockedCompanyLinkTradeStatus {
  return BLOCKED_COMPANY_LINK_TRADE_STATUSES.includes(normalizeTradeStatus(value) as BlockedCompanyLinkTradeStatus);
}

export function companyLinkTradeStatusReasonCode(value: unknown) {
  const tradeStatus = normalizeTradeStatus(value);
  return isBlockedCompanyLinkTradeStatus(tradeStatus) ? `COMPANY_TRADE_STATUS_${tradeStatus}` : null;
}

export function isAllowedNonProductionLinkWriteTarget(value: unknown): value is LinkNonProductionWriteTarget {
  return LINK_NON_PRODUCTION_WRITE_TARGETS.includes(value as LinkNonProductionWriteTarget);
}

export function isLinkProductionRuntime(env: LinkRuntimeEnv = process.env, target?: string) {
  return target === "production"
    || env.NODE_ENV === "production"
    || env.VERCEL_ENV === "production";
}

export function containsSensitiveLinkPayloadValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return LINK_SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  if (Array.isArray(value)) return value.some(containsSensitiveLinkPayloadValue);
  if (!isObject(value)) return false;
  return Object.values(asRecord(value)).some(containsSensitiveLinkPayloadValue);
}

export function findUnsafeLinkPayloadField(
  body: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  options: { extraForbiddenKeys?: Iterable<string> } = {},
): UnsafeLinkPayloadField | null {
  const extraForbiddenKeys = new Set(options.extraForbiddenKeys || []);

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.has(key) || isForbiddenRawPayloadKey(key, extraForbiddenKeys)) {
      return { kind: "unsupported-key", key };
    }

    if (containsSensitiveLinkPayloadValue(value)) {
      return { kind: "sensitive-value", key };
    }
  }

  return null;
}
