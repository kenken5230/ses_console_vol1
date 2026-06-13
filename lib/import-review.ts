import { createHash } from "node:crypto";

export const IMPORT_REVIEW_DEFAULT_LIMIT = 20;
export const IMPORT_REVIEW_MAX_LIMIT = 100;
export const IMPORT_REVIEW_RECORD_SAMPLE_LIMIT = 20;

const IMPORT_SOURCE_TYPES = new Set(["GMAIL", "CSV", "NOTION", "MANUAL", "OTHER_EMAIL", "API", "UNKNOWN"]);
const IMPORT_RUN_MODES = new Set(["DRY_RUN", "APPLY", "BACKFILL", "SYNC", "AUDIT"]);
const IMPORT_RUN_STATUSES = new Set(["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "PARTIAL", "CANCELLED"]);
const SOURCE_RECORD_TYPES = new Set(["PROJECT", "PERSON", "OTHER", "EXCLUDED", "UNKNOWN"]);
const SOURCE_RECORD_STATUSES = new Set(["NEW", "LINKED", "SKIPPED", "NEEDS_REVIEW", "APPLIED", "ARCHIVED"]);
const ENTITY_LINK_TYPES = new Set(["CREATED_FROM", "LINKED_TO", "DUPLICATE_OF", "RELATED_TO", "REVIEW_CANDIDATE"]);
const ENTITY_TYPES = new Set(["PROJECT", "PERSON"]);

const SAFE_REVIEW_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_:-]{0,63}$/;
const SENSITIVE_KEY_PATTERN = /(body|company|customer|email|file|mail|name|normalized|path|payload|person|raw|secret|subject|text|token|url|value)/i;
const SAFE_STRING_PATTERN = /^(?:[A-Z0-9_:-]{2,96}|[a-z][a-z0-9_:-]{1,96})$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SENSITIVE_OUTPUT_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /[A-Za-z]:\\(?:Users|OneDrive|Documents|Desktop|Downloads)\\/i,
  /\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/,
  /\b(?:api[_-]?key|password|secret|token)\s*[:=]/i,
  /\b(?:bodyText|fullBody|fullSubject|normalizedPayload|rawCsv|rawValue)\b/i,
];

export type ImportReviewDb = {
  importRun: {
    count(args: Record<string, unknown>): Promise<number>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
  };
  sourceRecord: {
    count(args: Record<string, unknown>): Promise<number>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    findUnique?(args: Record<string, unknown>): Promise<unknown | null>;
  };
};

export type ImportReviewPagination = {
  page: number;
  limit: number;
  skip: number;
  maxLimit: number;
};

export type ImportRunFilters = {
  sourceType?: string;
  mode?: string;
  status?: string;
};

export type SourceRecordFilters = {
  sourceType?: string;
  recordType?: string;
  status?: string;
  linkType?: string;
  importRunId?: string;
  reviewNeeded?: boolean;
  warningsPresent?: boolean;
};

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function enumParam(params: URLSearchParams, key: string, allowed: Set<string>) {
  const value = params.get(key)?.trim().toUpperCase();
  return value && allowed.has(value) ? value : undefined;
}

function booleanParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim().toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return undefined;
}

function safeIdParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  if (!value) return undefined;
  return UUID_PATTERN.test(value) ? value : undefined;
}

export function parseImportReviewPagination(params: URLSearchParams): ImportReviewPagination {
  const page = positiveInteger(params.get("page"), 1);
  const requestedLimit = positiveInteger(params.get("limit") ?? params.get("take"), IMPORT_REVIEW_DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, IMPORT_REVIEW_MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    maxLimit: IMPORT_REVIEW_MAX_LIMIT,
  };
}

export function parseImportRunFilters(params: URLSearchParams): ImportRunFilters {
  return {
    sourceType: enumParam(params, "sourceType", IMPORT_SOURCE_TYPES),
    mode: enumParam(params, "mode", IMPORT_RUN_MODES),
    status: enumParam(params, "status", IMPORT_RUN_STATUSES),
  };
}

export function parseSourceRecordFilters(params: URLSearchParams): SourceRecordFilters {
  return {
    sourceType: enumParam(params, "sourceType", IMPORT_SOURCE_TYPES),
    recordType: enumParam(params, "recordType", SOURCE_RECORD_TYPES),
    status: enumParam(params, "status", SOURCE_RECORD_STATUSES),
    linkType: enumParam(params, "linkType", ENTITY_LINK_TYPES),
    importRunId: safeIdParam(params, "importRunId"),
    reviewNeeded: booleanParam(params, "reviewNeeded"),
    warningsPresent: booleanParam(params, "warningsPresent"),
  };
}

export function buildImportRunWhere(filters: ImportRunFilters) {
  const where: Record<string, unknown> = {};
  if (filters.sourceType) where.source = { type: filters.sourceType };
  if (filters.mode) where.mode = filters.mode;
  if (filters.status) where.status = filters.status;
  return where;
}

export function buildSourceRecordWhere(filters: SourceRecordFilters) {
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (filters.sourceType) where.source = { type: filters.sourceType };
  if (filters.recordType) where.recordType = filters.recordType;
  if (filters.status) where.status = filters.status;
  if (filters.importRunId) where.importRunId = filters.importRunId;
  if (filters.linkType) and.push({ entityLinks: { some: { linkType: filters.linkType } } });
  if (filters.reviewNeeded === true) and.push({ status: "NEEDS_REVIEW" });
  if (filters.reviewNeeded === false) and.push({ NOT: { status: "NEEDS_REVIEW" } });
  if (filters.warningsPresent === true) and.push({ warnings: { not: [] } });
  if (filters.warningsPresent === false) and.push({ OR: [{ warnings: null }, { warnings: [] }] });
  if (and.length) where.AND = and;

  return where;
}

function totalPages(total: number, limit: number) {
  return Math.max(1, Math.ceil(total / limit));
}

export function shortId(value: unknown, length = 8) {
  if (typeof value !== "string" || !value) return "";
  return value.slice(0, length);
}

function shortHash(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  return value.slice(0, 12);
}

function isoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isSafeReviewString(value: string) {
  return value.length <= 96 && SAFE_STRING_PATTERN.test(value) && !SENSITIVE_OUTPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function sanitizeCode(value: unknown) {
  if (typeof value === "string" && isSafeReviewString(value)) return value;
  return "REDACTED_CODE";
}

function sanitizeCodeArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, IMPORT_REVIEW_RECORD_SAMPLE_LIMIT).map(sanitizeCode);
}

export function safeRawRef(value: unknown) {
  const record = asRecord(value);
  const rawRef: Record<string, number> = {};

  for (const key of ["rowIndex", "rowNumber", "recordIndex", "itemIndex"]) {
    const numeric = safeNumber(record[key]);
    if (numeric !== null && Number.isInteger(numeric) && numeric >= 0) rawRef[key] = numeric;
  }

  return rawRef;
}

export function sanitizeReviewJson(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[redacted]";
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return isSafeReviewString(value) ? value : "[redacted]";
  if (Array.isArray(value)) return value.slice(0, IMPORT_REVIEW_RECORD_SAMPLE_LIMIT).map((item) => sanitizeReviewJson(item, depth + 1));

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(asRecord(value))) {
    if (!SAFE_REVIEW_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) continue;
    sanitized[key] = sanitizeReviewJson(child, depth + 1);
  }
  return sanitized;
}

export function safeSourceName(value: unknown, sourceType: unknown) {
  const type = typeof sourceType === "string" && IMPORT_SOURCE_TYPES.has(sourceType) ? sourceType.toLowerCase() : "unknown";
  const name = typeof value === "string" ? value.trim() : "";

  if (/^synthetic-[a-z0-9_.-]+\.csv$/i.test(name)) return name;
  if (/^csv-file-[a-f0-9]{8,64}$/i.test(name)) return name;
  if (/^[a-z0-9_-]+-source-[a-f0-9]{8}$/i.test(name)) return name;

  return `${type}-source-${hashText(name || type).slice(0, 8)}`;
}

function sourceSummary(source: unknown) {
  const record = asRecord(source);
  return {
    id: typeof record.id === "string" ? record.id : "",
    shortId: shortId(record.id),
    type: typeof record.type === "string" && IMPORT_SOURCE_TYPES.has(record.type) ? record.type : "UNKNOWN",
    nameRedacted: safeSourceName(record.name, record.type),
    status: typeof record.status === "string" ? record.status : "UNKNOWN",
  };
}

function mapEntityLink(link: unknown) {
  const record = asRecord(link);
  const entityType = typeof record.entityType === "string" && ENTITY_TYPES.has(record.entityType) ? record.entityType : "PROJECT";
  const linkType = typeof record.linkType === "string" && ENTITY_LINK_TYPES.has(record.linkType) ? record.linkType : "RELATED_TO";

  return {
    id: typeof record.id === "string" ? record.id : "",
    shortId: shortId(record.id),
    entityType,
    entityIdShort: shortId(record.entityId),
    linkType,
    confidence: safeNumber(record.confidence),
    reasons: sanitizeCodeArray(record.reasons),
    createdAt: isoDate(record.createdAt),
    updatedAt: isoDate(record.updatedAt),
  };
}

function codeCount(value: unknown) {
  return sanitizeCodeArray(value).length;
}

function mapSourceRecord(recordLike: unknown) {
  const record = asRecord(recordLike);
  const entityLinks = Array.isArray(record.entityLinks) ? record.entityLinks.map(mapEntityLink) : [];
  const reviewReasons = sanitizeCodeArray(record.reviewReasons);
  const warnings = sanitizeCodeArray(record.warnings);
  const entityLinkCount = safeNumber(asRecord(record._count).entityLinks) ?? entityLinks.length;

  return {
    id: typeof record.id === "string" ? record.id : "",
    shortId: shortId(record.id),
    source: sourceSummary(record.source),
    importRun: record.importRun ? {
      id: typeof asRecord(record.importRun).id === "string" ? asRecord(record.importRun).id : "",
      shortId: shortId(asRecord(record.importRun).id),
      mode: asRecord(record.importRun).mode ?? null,
      status: asRecord(record.importRun).status ?? null,
      createdAt: isoDate(asRecord(record.importRun).createdAt),
      startedAt: isoDate(asRecord(record.importRun).startedAt),
      finishedAt: isoDate(asRecord(record.importRun).finishedAt),
    } : null,
    recordType: typeof record.recordType === "string" ? record.recordType : "UNKNOWN",
    status: typeof record.status === "string" ? record.status : "UNKNOWN",
    recordHashShort: shortHash(record.recordHash),
    rawRef: safeRawRef(record.rawRef),
    warningCount: codeCount(record.warnings),
    reviewReasonCount: codeCount(record.reviewReasons),
    linkCount: entityLinkCount,
    reviewNeeded: record.status === "NEEDS_REVIEW" || reviewReasons.length > 0,
    warningsPresent: warnings.length > 0,
    redactedPreview: sanitizeReviewJson(record.redactedPreview),
    reviewReasons,
    warnings,
    entitySourceLinks: entityLinks,
    payloadRedacted: true,
    createdAt: isoDate(record.createdAt),
    updatedAt: isoDate(record.updatedAt),
  };
}

function mapImportRun(runLike: unknown, entityLinkCountsByRunId: Map<string, number>) {
  const run = asRecord(runLike);
  const sourceRecordCount = safeNumber(asRecord(run._count).sourceRecords) ?? 0;
  const id = typeof run.id === "string" ? run.id : "";

  return {
    id,
    shortId: shortId(id),
    source: sourceSummary(run.source),
    mode: typeof run.mode === "string" ? run.mode : "UNKNOWN",
    status: typeof run.status === "string" ? run.status : "UNKNOWN",
    startedAt: isoDate(run.startedAt),
    finishedAt: isoDate(run.finishedAt),
    createdAt: isoDate(run.createdAt),
    updatedAt: isoDate(run.updatedAt),
    summary: sanitizeReviewJson(run.summary),
    sourceRecordCount,
    entityLinkCount: entityLinkCountsByRunId.get(id) ?? 0,
  };
}

async function entityLinkCountsByRun(db: ImportReviewDb, runIds: string[]) {
  const counts = new Map<string, number>();
  if (!runIds.length) return counts;

  const records = await db.sourceRecord.findMany({
    where: { importRunId: { in: runIds } },
    select: {
      importRunId: true,
      _count: { select: { entityLinks: true } },
    },
  });

  for (const item of records) {
    const record = asRecord(item);
    const runId = typeof record.importRunId === "string" ? record.importRunId : "";
    if (!runId) continue;
    counts.set(runId, (counts.get(runId) ?? 0) + (safeNumber(asRecord(record._count).entityLinks) ?? 0));
  }

  return counts;
}

export async function listImportRuns(db: ImportReviewDb, params: URLSearchParams) {
  const pagination = parseImportReviewPagination(params);
  const filters = parseImportRunFilters(params);
  const where = buildImportRunWhere(filters);

  const [total, runs] = await Promise.all([
    db.importRun.count({ where }),
    db.importRun.findMany({
      where,
      orderBy: { createdAt: params.get("order") === "asc" ? "asc" : "desc" },
      skip: pagination.skip,
      take: pagination.limit,
      include: {
        source: { select: { id: true, type: true, name: true, status: true } },
        _count: { select: { sourceRecords: true } },
      },
    }),
  ]);
  const runIds = runs.map((run) => asRecord(run).id).filter((id): id is string => typeof id === "string");
  const linkCounts = await entityLinkCountsByRun(db, runIds);
  const items = runs.map((run) => mapImportRun(run, linkCounts));
  const result = {
    page: pagination.page,
    limit: pagination.limit,
    maxLimit: pagination.maxLimit,
    total,
    totalPages: totalPages(total, pagination.limit),
    filters,
    items,
  };

  assertNoSensitiveImportReviewOutput(JSON.stringify(result));
  return result;
}

export async function listSourceRecords(db: ImportReviewDb, params: URLSearchParams) {
  const pagination = parseImportReviewPagination(params);
  const filters = parseSourceRecordFilters(params);
  const where = buildSourceRecordWhere(filters);

  const [total, records] = await Promise.all([
    db.sourceRecord.count({ where }),
    db.sourceRecord.findMany({
      where,
      orderBy: { createdAt: params.get("order") === "asc" ? "asc" : "desc" },
      skip: pagination.skip,
      take: pagination.limit,
      include: {
        source: { select: { id: true, type: true, name: true, status: true } },
        importRun: { select: { id: true, mode: true, status: true, createdAt: true, startedAt: true, finishedAt: true } },
        entityLinks: {
          orderBy: { createdAt: "desc" },
          take: IMPORT_REVIEW_RECORD_SAMPLE_LIMIT,
          select: { id: true, entityType: true, entityId: true, linkType: true, confidence: true, reasons: true, createdAt: true, updatedAt: true },
        },
        _count: { select: { entityLinks: true } },
      },
    }),
  ]);
  const items = records.map(mapSourceRecord);
  const result = {
    page: pagination.page,
    limit: pagination.limit,
    maxLimit: pagination.maxLimit,
    total,
    totalPages: totalPages(total, pagination.limit),
    filters,
    items,
  };

  assertNoSensitiveImportReviewOutput(JSON.stringify(result));
  return result;
}

export async function getSourceRecordDetail(db: ImportReviewDb, id: string) {
  if (!UUID_PATTERN.test(id)) return null;
  if (!db.sourceRecord.findUnique) return null;

  const record = await db.sourceRecord.findUnique({
    where: { id },
    include: {
      source: { select: { id: true, type: true, name: true, status: true } },
      importRun: { select: { id: true, mode: true, status: true, createdAt: true, startedAt: true, finishedAt: true } },
      entityLinks: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, entityType: true, entityId: true, linkType: true, confidence: true, reasons: true, createdAt: true, updatedAt: true },
      },
      _count: { select: { entityLinks: true } },
    },
  });

  if (!record) return null;
  const result = { item: mapSourceRecord(record) };
  assertNoSensitiveImportReviewOutput(JSON.stringify(result));
  return result;
}

export function assertNoSensitiveImportReviewOutput(output: string) {
  for (const pattern of SENSITIVE_OUTPUT_PATTERNS) {
    if (pattern.test(output)) {
      throw new Error("Sensitive import review output detected");
    }
  }
}
