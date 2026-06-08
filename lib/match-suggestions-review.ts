export const MATCH_SUGGESTION_DEFAULT_LIMIT = 20;
export const MATCH_SUGGESTION_MAX_LIMIT = 100;
export const MATCH_SUGGESTION_SAMPLE_LIMIT = 20;

const MATCH_SUGGESTION_STATUSES = new Set(["SUGGESTED", "NEEDS_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]);
const MATCH_SUGGESTION_REVIEW_ACTIONS = new Set(["CREATED", "SAVED", "REVIEW_REQUESTED", "APPROVED", "REJECTED", "ARCHIVED", "REOPENED"]);
const MATCH_SUGGESTION_SOURCE_ROLES = new Set(["PROJECT_EVIDENCE", "PERSON_EVIDENCE", "MATCH_EVIDENCE"]);
const SCORE_BANDS = new Set(["HIGH", "MEDIUM", "LOW", "REVIEW"]);
const SOURCE_RECORD_TYPES = new Set(["PROJECT", "PERSON", "OTHER", "EXCLUDED", "UNKNOWN"]);
const SOURCE_RECORD_STATUSES = new Set(["NEW", "LINKED", "SKIPPED", "NEEDS_REVIEW", "APPLIED", "ARCHIVED"]);
const IMPORT_SOURCE_TYPES = new Set(["GMAIL", "CSV", "NOTION", "MANUAL", "OTHER_EMAIL", "API", "UNKNOWN"]);
const SORT_OPTIONS = new Set(["newest", "score-desc", "score-asc"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_:-]{0,63}$/;
const SENSITIVE_KEY_PATTERN = /(body|company|customer|email|file|name|normalized|path|payload|raw|secret|subject|text|token|url|value)/i;
const SAFE_STRING_PATTERN = /^(?:[A-Z0-9_:-]{2,96}|[a-z][a-z0-9_:-]{1,96})$/;
const MUTATION_LIKE_PARAMS = [
  "apply",
  "create",
  "createProposal",
  "delete",
  "draftEmail",
  "email",
  "patch",
  "proposal",
  "put",
  "save",
  "send",
  "sendEmail",
  "update",
  "write",
];

const SENSITIVE_OUTPUT_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /[A-Za-z]:\\(?:Users|OneDrive|Documents|Desktop|Downloads)\\/i,
  /\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/,
  /\b(?:api[_-]?key|password|secret|token)\s*[:=]/i,
  /\b(?:bodyText|careerSummary|companyName|customerName|emailAddress|fullBody|fullSubject|normalizedPayload|personName|rawCsv|rawText|rawValue|workDescription)\b/i,
];

export type MatchSuggestionReviewDb = {
  matchSuggestion: {
    count(args: Record<string, unknown>): Promise<number>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  };
};

export type MatchSuggestionPagination = {
  page: number;
  limit: number;
  skip: number;
  maxLimit: number;
};

export type MatchSuggestionFilters = {
  status?: string;
  scoreBand?: string;
  attentionState?: string;
  minScore?: number;
  maxScore?: number;
  projectId?: string;
  personId?: string;
};

export class MatchSuggestionRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MatchSuggestionRequestError";
    this.status = status;
  }
}

function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function scoreParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(100, Math.trunc(parsed)));
}

function enumParam(params: URLSearchParams, key: string, allowed: Set<string>) {
  const value = params.get(key)?.trim().toUpperCase();
  return value && allowed.has(value) ? value : undefined;
}

function uuidParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  if (!value) return undefined;
  return UUID_PATTERN.test(value) ? value : undefined;
}

function safeStringParam(params: URLSearchParams, key: string, maxLength: number) {
  const value = params.get(key)?.trim();
  if (!value) return undefined;
  if (value.length > maxLength) return undefined;
  if (!SAFE_STRING_PATTERN.test(value)) return undefined;
  if (SENSITIVE_OUTPUT_PATTERNS.some((pattern) => pattern.test(value))) return undefined;
  return value;
}

function assertNoMutationLikeParams(params: URLSearchParams) {
  for (const key of MUTATION_LIKE_PARAMS) {
    if (params.has(key)) {
      throw new MatchSuggestionRequestError("Saved match suggestion APIs are read-only and do not accept mutation-like parameters.");
    }
  }
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function parseMatchSuggestionPagination(params: URLSearchParams): MatchSuggestionPagination {
  assertNoMutationLikeParams(params);
  const page = positiveInteger(params.get("page"), 1);
  const requestedLimit = positiveInteger(params.get("limit") ?? params.get("take"), MATCH_SUGGESTION_DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MATCH_SUGGESTION_MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    maxLimit: MATCH_SUGGESTION_MAX_LIMIT,
  };
}

export function parseMatchSuggestionFilters(params: URLSearchParams): MatchSuggestionFilters {
  assertNoMutationLikeParams(params);
  const minScore = scoreParam(params, "minScore");
  const maxScore = scoreParam(params, "maxScore");

  return {
    status: enumParam(params, "status", MATCH_SUGGESTION_STATUSES),
    scoreBand: enumParam(params, "scoreBand", SCORE_BANDS),
    attentionState: safeStringParam(params, "attentionState", 40),
    minScore,
    maxScore,
    projectId: uuidParam(params, "projectId"),
    personId: uuidParam(params, "personId"),
  };
}

export function parseMatchSuggestionSort(params: URLSearchParams) {
  const value = params.get("sort")?.trim().toLowerCase() || "newest";
  return SORT_OPTIONS.has(value) ? value : "newest";
}

export function buildMatchSuggestionWhere(filters: MatchSuggestionFilters) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.scoreBand) where.scoreBand = filters.scoreBand;
  if (filters.attentionState) where.attentionState = filters.attentionState;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.personId) where.personId = filters.personId;
  if (filters.minScore !== undefined || filters.maxScore !== undefined) {
    const score: Record<string, number> = {};
    if (filters.minScore !== undefined) score.gte = filters.minScore;
    if (filters.maxScore !== undefined) score.lte = filters.maxScore;
    where.score = score;
  }
  return where;
}

function mergeWhere(...conditions: Record<string, unknown>[]) {
  const active = conditions.filter((condition) => Object.keys(condition).length > 0);
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { AND: active };
}

function reviewQueueBaseWhere(filters: MatchSuggestionFilters) {
  return mergeWhere(buildMatchSuggestionWhere(filters), {
    OR: [
      { status: { in: ["SUGGESTED", "NEEDS_REVIEW"] } },
      { warningCount: { gt: 0 } },
      { reviewReasonCount: { gt: 0 } },
    ],
  });
}

function reviewQueueSegments(filters: MatchSuggestionFilters) {
  const filtered = buildMatchSuggestionWhere(filters);
  return [
    mergeWhere(filtered, { status: "NEEDS_REVIEW" }),
    mergeWhere(filtered, { status: "SUGGESTED" }),
    mergeWhere(filtered, {
      NOT: { status: { in: ["NEEDS_REVIEW", "SUGGESTED"] } },
      OR: [
        { warningCount: { gt: 0 } },
        { reviewReasonCount: { gt: 0 } },
      ],
    }),
  ];
}

function orderByFor(sort: string) {
  if (sort === "score-asc") return [{ score: "asc" }, { createdAt: "desc" }];
  if (sort === "score-desc") return [{ score: "desc" }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }];
}

const listSelect = {
  id: true,
  projectId: true,
  personId: true,
  status: true,
  score: true,
  scoreBand: true,
  scoringVersion: true,
  attentionState: true,
  warningCount: true,
  reviewReasonCount: true,
  reasonCodes: true,
  warningCodes: true,
  reviewFlags: true,
  compatibilitySummary: true,
  skillOverlapSummary: true,
  redactedPreview: true,
  reviewedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { reviewEvents: true, sourceRecords: true } },
};

const detailSelect = {
  ...listSelect,
  reviewEvents: {
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      fromStatus: true,
      toStatus: true,
      actorUserId: true,
      reasonCodes: true,
      noteRedacted: true,
      createdAt: true,
    },
  },
  sourceRecords: {
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      role: true,
      createdAt: true,
      sourceRecord: {
        select: {
          id: true,
          recordType: true,
          recordHash: true,
          rawRef: true,
          redactedPreview: true,
          status: true,
          reviewReasons: true,
          warnings: true,
          createdAt: true,
          updatedAt: true,
          source: { select: { id: true, type: true, status: true } },
        },
      },
    },
  },
};

function totalPages(total: number, limit: number) {
  return Math.max(1, Math.ceil(total / limit));
}

function shortId(value: unknown, length = 8) {
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
  return value.slice(0, MATCH_SUGGESTION_SAMPLE_LIMIT).map(sanitizeCode);
}

function safeEnum(value: unknown, allowed: Set<string>, fallback = "UNKNOWN") {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

function safeRawRef(value: unknown) {
  const record = asRecord(value);
  const rawRef: Record<string, number> = {};
  for (const key of ["rowIndex", "rowNumber", "recordIndex", "itemIndex"]) {
    const numeric = safeNumber(record[key]);
    if (numeric !== null && Number.isInteger(numeric) && numeric >= 0) rawRef[key] = numeric;
  }
  return rawRef;
}

export function sanitizeMatchSuggestionJson(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[redacted]";
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return isSafeReviewString(value) ? value : "[redacted]";
  if (Array.isArray(value)) return value.slice(0, MATCH_SUGGESTION_SAMPLE_LIMIT).map((item) => sanitizeMatchSuggestionJson(item, depth + 1));

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(asRecord(value))) {
    if (!SAFE_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) continue;
    sanitized[key] = sanitizeMatchSuggestionJson(child, depth + 1);
  }
  return sanitized;
}

function mapReviewEvent(eventLike: unknown) {
  const event = asRecord(eventLike);
  return {
    shortId: shortId(event.id),
    action: safeEnum(event.action, MATCH_SUGGESTION_REVIEW_ACTIONS),
    fromStatus: event.fromStatus ? safeEnum(event.fromStatus, MATCH_SUGGESTION_STATUSES) : null,
    toStatus: event.toStatus ? safeEnum(event.toStatus, MATCH_SUGGESTION_STATUSES) : null,
    actorUserShortId: shortId(event.actorUserId),
    reasonCodes: sanitizeCodeArray(event.reasonCodes),
    notePresent: typeof event.noteRedacted === "string" && event.noteRedacted.length > 0,
    createdAt: isoDate(event.createdAt),
  };
}

function mapSourceEvidence(evidenceLike: unknown) {
  const evidence = asRecord(evidenceLike);
  const sourceRecord = asRecord(evidence.sourceRecord);
  const source = asRecord(sourceRecord.source);
  const reviewReasons = sanitizeCodeArray(sourceRecord.reviewReasons);
  const warnings = sanitizeCodeArray(sourceRecord.warnings);

  return {
    shortId: shortId(evidence.id),
    role: safeEnum(evidence.role, MATCH_SUGGESTION_SOURCE_ROLES),
    createdAt: isoDate(evidence.createdAt),
    sourceRecord: {
      shortId: shortId(sourceRecord.id),
      sourceShortId: shortId(source.id),
      sourceType: safeEnum(source.type, IMPORT_SOURCE_TYPES),
      sourceStatus: typeof source.status === "string" ? source.status : "UNKNOWN",
      recordType: safeEnum(sourceRecord.recordType, SOURCE_RECORD_TYPES),
      status: safeEnum(sourceRecord.status, SOURCE_RECORD_STATUSES),
      recordHashShort: shortHash(sourceRecord.recordHash),
      rawRef: safeRawRef(sourceRecord.rawRef),
      warningCount: warnings.length,
      reviewReasonCount: reviewReasons.length,
      redactedPreview: sanitizeMatchSuggestionJson(sourceRecord.redactedPreview),
      createdAt: isoDate(sourceRecord.createdAt),
      updatedAt: isoDate(sourceRecord.updatedAt),
    },
  };
}

function mapSuggestion(suggestionLike: unknown, detail = false) {
  const suggestion = asRecord(suggestionLike);
  const counts = asRecord(suggestion._count);

  const mapped: Record<string, unknown> = {
    id: typeof suggestion.id === "string" ? suggestion.id : "",
    shortId: shortId(suggestion.id),
    projectShortId: shortId(suggestion.projectId),
    personShortId: shortId(suggestion.personId),
    status: safeEnum(suggestion.status, MATCH_SUGGESTION_STATUSES),
    score: safeNumber(suggestion.score) ?? 0,
    scoreBand: typeof suggestion.scoreBand === "string" && SCORE_BANDS.has(suggestion.scoreBand) ? suggestion.scoreBand : "UNKNOWN",
    scoringVersion: typeof suggestion.scoringVersion === "string" && isSafeReviewString(suggestion.scoringVersion) ? suggestion.scoringVersion : "[redacted]",
    attentionState: typeof suggestion.attentionState === "string" && isSafeReviewString(suggestion.attentionState) ? suggestion.attentionState : null,
    warningCount: safeNumber(suggestion.warningCount) ?? 0,
    reviewReasonCount: safeNumber(suggestion.reviewReasonCount) ?? 0,
    reasonCodes: sanitizeCodeArray(suggestion.reasonCodes),
    warningCodes: sanitizeCodeArray(suggestion.warningCodes),
    reviewFlags: sanitizeCodeArray(suggestion.reviewFlags),
    compatibilitySummary: sanitizeMatchSuggestionJson(suggestion.compatibilitySummary),
    skillOverlapSummary: sanitizeMatchSuggestionJson(suggestion.skillOverlapSummary),
    redactedPreview: sanitizeMatchSuggestionJson(suggestion.redactedPreview),
    createdAt: isoDate(suggestion.createdAt),
    updatedAt: isoDate(suggestion.updatedAt),
    reviewedAt: isoDate(suggestion.reviewedAt),
    archivedAt: isoDate(suggestion.archivedAt),
    reviewEventCount: safeNumber(counts.reviewEvents) ?? (Array.isArray(suggestion.reviewEvents) ? suggestion.reviewEvents.length : 0),
    sourceEvidenceCount: safeNumber(counts.sourceRecords) ?? (Array.isArray(suggestion.sourceRecords) ? suggestion.sourceRecords.length : 0),
    readOnly: true,
    piiSafe: true,
  };

  if (detail) {
    mapped.reviewEvents = Array.isArray(suggestion.reviewEvents) ? suggestion.reviewEvents.map(mapReviewEvent) : [];
    mapped.sourceEvidence = Array.isArray(suggestion.sourceRecords) ? suggestion.sourceRecords.map(mapSourceEvidence) : [];
  }

  return mapped;
}

async function fetchSegmentedQueuePage(
  db: MatchSuggestionReviewDb,
  filters: MatchSuggestionFilters,
  pagination: MatchSuggestionPagination,
) {
  const segments = reviewQueueSegments(filters);
  const counts = await Promise.all(segments.map((where) => db.matchSuggestion.count({ where })));
  const items: unknown[] = [];
  let remainingSkip = pagination.skip;
  let remainingTake = pagination.limit;

  for (let index = 0; index < segments.length && remainingTake > 0; index += 1) {
    const segmentCount = counts[index];
    if (remainingSkip >= segmentCount) {
      remainingSkip -= segmentCount;
      continue;
    }

    const take = Math.min(remainingTake, segmentCount - remainingSkip);
    const rows = await db.matchSuggestion.findMany({
      where: segments[index],
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      skip: remainingSkip,
      take,
      select: listSelect,
    });
    items.push(...rows);
    remainingTake -= rows.length;
    remainingSkip = 0;
  }

  return {
    total: counts.reduce((sum, count) => sum + count, 0),
    items,
  };
}

export async function listMatchSuggestions(db: MatchSuggestionReviewDb, params: URLSearchParams) {
  const pagination = parseMatchSuggestionPagination(params);
  const filters = parseMatchSuggestionFilters(params);
  const sort = parseMatchSuggestionSort(params);
  const where = buildMatchSuggestionWhere(filters);

  const [total, suggestions] = await Promise.all([
    db.matchSuggestion.count({ where }),
    db.matchSuggestion.findMany({
      where,
      orderBy: orderByFor(sort),
      skip: pagination.skip,
      take: pagination.limit,
      select: listSelect,
    }),
  ]);
  const items = suggestions.map((suggestion) => mapSuggestion(suggestion));
  const result = {
    mode: "saved-match-suggestions",
    readOnly: true,
    migrationRequired: false,
    page: pagination.page,
    limit: pagination.limit,
    maxLimit: pagination.maxLimit,
    total,
    totalPages: totalPages(total, pagination.limit),
    filters,
    sort,
    summary: {
      total,
      displayed: items.length,
      page: pagination.page,
      limit: pagination.limit,
      readOnly: true,
      piiSafe: true,
    },
    items,
  };

  assertNoSensitiveMatchSuggestionOutput(JSON.stringify(result));
  return result;
}

export async function listMatchSuggestionReviewQueue(db: MatchSuggestionReviewDb, params: URLSearchParams) {
  const pagination = parseMatchSuggestionPagination(params);
  const filters = parseMatchSuggestionFilters(params);
  const queueWhere = reviewQueueBaseWhere(filters);
  const { total, items: suggestions } = await fetchSegmentedQueuePage(db, filters, pagination);
  const items = suggestions.map((suggestion) => mapSuggestion(suggestion));
  const result = {
    mode: "saved-match-suggestion-review-queue",
    readOnly: true,
    migrationRequired: false,
    page: pagination.page,
    limit: pagination.limit,
    maxLimit: pagination.maxLimit,
    total,
    totalPages: totalPages(total, pagination.limit),
    filters,
    queueWhereApplied: Boolean(Object.keys(queueWhere).length),
    sort: "needs-review-first-score-desc-newest",
    summary: {
      total,
      displayed: items.length,
      queueCriteria: ["NEEDS_REVIEW", "SUGGESTED", "warningCount>0", "reviewReasonCount>0"],
      readOnly: true,
      piiSafe: true,
    },
    items,
  };

  assertNoSensitiveMatchSuggestionOutput(JSON.stringify(result));
  return result;
}

export async function getMatchSuggestionDetail(db: MatchSuggestionReviewDb, id: string) {
  if (!UUID_PATTERN.test(id)) return null;

  const suggestion = await db.matchSuggestion.findUnique({
    where: { id },
    select: detailSelect,
  });

  if (!suggestion) return null;
  const result = {
    mode: "saved-match-suggestion-detail",
    readOnly: true,
    migrationRequired: false,
    item: mapSuggestion(suggestion, true),
  };

  assertNoSensitiveMatchSuggestionOutput(JSON.stringify(result));
  return result;
}

export function isMatchSuggestionMigrationRequiredError(error: unknown) {
  const record = asRecord(error);
  const code = typeof record.code === "string" ? record.code : "";
  if (["P1014", "P2021", "P2022"].includes(code)) return true;

  const message = typeof record.message === "string" ? record.message : "";
  return /(match_suggestions|match_suggestion_review_events|match_suggestion_source_records|relation .* does not exist|table .* does not exist|column .* does not exist|does not exist)/i.test(message);
}

export function matchSuggestionMigrationRequiredResponse(endpoint: string) {
  return {
    migrationRequired: true,
    readOnly: true,
    endpoint,
    message: "Saved match suggestion tables are not available. Apply the match suggestion persistence migration before using this read-only API.",
    items: [],
  };
}

export function assertNoSensitiveMatchSuggestionOutput(output: string) {
  for (const pattern of SENSITIVE_OUTPUT_PATTERNS) {
    if (pattern.test(output)) {
      throw new Error("Sensitive match suggestion output detected");
    }
  }
}
