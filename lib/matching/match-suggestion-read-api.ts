import {
  MATCH_DUPLICATE_STATES,
  MATCH_SOURCE_EVIDENCE_STATES,
  MATCH_STALENESS_STATES,
  MATCH_SUGGESTION_STATUSES,
  MATCH_WARNING_SEVERITIES,
  type MatchAttentionState,
  type MatchDownstreamReadiness,
  type MatchDuplicateState,
  type MatchSourceEvidenceState,
  type MatchStalenessState,
  type MatchSuggestionReviewEventType,
  type MatchSuggestionStatus,
  type MatchWarningSeverity,
} from "./match-suggestion-schema";

export const DEFAULT_MATCH_SUGGESTION_PAGE_SIZE = 20;
export const MAX_MATCH_SUGGESTION_PAGE_SIZE = 100;

const TENANT_ID_PATTERN = /^[A-Za-z0-9_:-]{1,80}$/;
const SORT_FIELDS = ["createdAt", "updatedAt", "score", "lastReviewedAt"] as const;
const SORT_ORDERS = ["asc", "desc"] as const;
const REVIEW_QUEUE_STATUSES: MatchSuggestionStatus[] = ["SUGGESTED", "NEEDS_REVIEW"];
const SCHEMA_MISSING_CODES = new Set(["P2021", "P2022", "42P01", "42703"]);

type SortField = (typeof SORT_FIELDS)[number];
type SortOrder = (typeof SORT_ORDERS)[number];

type DateRange = {
  gte?: Date;
  lte?: Date;
};

export type MatchSuggestionListQuery = {
  tenantId: string;
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  filters: {
    status?: MatchSuggestionStatus[];
    warningSeverity?: MatchWarningSeverity[];
    stalenessState?: MatchStalenessState[];
    duplicateState?: MatchDuplicateState[];
    sourceEvidenceState?: MatchSourceEvidenceState[];
    createdAt?: DateRange;
    lastReviewedAt?: DateRange;
  };
  sort: {
    sortBy: SortField;
    sortOrder: SortOrder;
  };
};

export type MatchSuggestionSafeListItem = {
  id: string;
  tenantId: string;
  organizationId: string | null;
  projectRef: { id: string };
  personRef: { id: string };
  status: MatchSuggestionStatus;
  score: string | null;
  scoreBand: string | null;
  systemReasonCodes: string[];
  systemWarningCodes: string[];
  warningSeverity: MatchWarningSeverity;
  stalenessState: MatchStalenessState;
  duplicateState: MatchDuplicateState;
  sourceEvidenceState: MatchSourceEvidenceState;
  attentionState: MatchAttentionState;
  promotionBlockers: string[];
  promotionEligible: boolean;
  downstreamReadiness: MatchDownstreamReadiness;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt: string | null;
  lockVersion: number;
};

export type MatchSuggestionSafeDetail = MatchSuggestionSafeListItem & {
  suggestionPairKey: string;
  suggestionRevisionKey: string;
  versions: {
    scoringVersion: string;
    taxonomyVersion: string;
    redactionPolicyVersion: string;
  };
  createdByUserId: string;
  lastReviewedByUserId: string | null;
  reviewEvents: Array<{
    id: string;
    eventType: MatchSuggestionReviewEventType;
    fromStatus: MatchSuggestionStatus | null;
    toStatus: MatchSuggestionStatus | null;
    actorUserId: string;
    reasonCode: string | null;
    createdAt: string;
    requestId: string;
  }>;
  sourceRecords: Array<{
    id: string;
    sourceType: string;
    sourceRecordId: string;
    evidenceRole: string;
    safeSummary: string | null;
    createdAt: string;
  }>;
};

export type MatchSuggestionQueueItem = MatchSuggestionSafeListItem & {
  queuePriority: number;
  queueReasons: string[];
  reviewAgeHours: number;
};

export type MatchSuggestionPage<T> = {
  items: T[];
  pageInfo: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: MatchSuggestionListQuery["filters"];
  sort: MatchSuggestionListQuery["sort"];
};

export class MatchSuggestionReadApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "MatchSuggestionReadApiError";
    this.status = status;
    this.code = code;
  }
}

export function parseTenantContext(url: URL, headers: Headers) {
  const tenantId = (url.searchParams.get("tenantId") || headers.get("x-tenant-id") || "").trim();
  if (!tenantId) {
    throw new MatchSuggestionReadApiError(400, "TENANT_REQUIRED", "tenantId is required");
  }
  if (!TENANT_ID_PATTERN.test(tenantId)) {
    throw new MatchSuggestionReadApiError(400, "TENANT_INVALID", "tenantId is invalid");
  }

  return tenantId;
}

export function parseSuggestionListQuery(
  url: URL,
  headers: Headers,
  options: { reviewQueue?: boolean } = {},
): MatchSuggestionListQuery {
  const tenantId = parseTenantContext(url, headers);
  const page = parsePositiveInteger(url.searchParams.get("page"), 1, "page");
  const requestedPageSize = parsePositiveInteger(
    url.searchParams.get("pageSize"),
    DEFAULT_MATCH_SUGGESTION_PAGE_SIZE,
    "pageSize",
  );
  const pageSize = Math.min(requestedPageSize, MAX_MATCH_SUGGESTION_PAGE_SIZE);
  const statusFilter = parseEnumList(
    url.searchParams.get("status"),
    MATCH_SUGGESTION_STATUSES,
    "status",
  ) as MatchSuggestionStatus[] | undefined;

  if (options.reviewQueue && statusFilter?.some((status) => !REVIEW_QUEUE_STATUSES.includes(status))) {
    throw new MatchSuggestionReadApiError(
      400,
      "INVALID_QUERY",
      "review queue status must be SUGGESTED or NEEDS_REVIEW",
    );
  }

  return {
    tenantId,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    filters: {
      status: options.reviewQueue ? statusFilter || REVIEW_QUEUE_STATUSES : statusFilter,
      warningSeverity: parseEnumList(
        url.searchParams.get("warningSeverity"),
        MATCH_WARNING_SEVERITIES,
        "warningSeverity",
      ) as MatchWarningSeverity[] | undefined,
      stalenessState: parseEnumList(
        url.searchParams.get("stalenessState"),
        MATCH_STALENESS_STATES,
        "stalenessState",
      ) as MatchStalenessState[] | undefined,
      duplicateState: parseEnumList(
        url.searchParams.get("duplicateState"),
        MATCH_DUPLICATE_STATES,
        "duplicateState",
      ) as MatchDuplicateState[] | undefined,
      sourceEvidenceState: parseEnumList(
        url.searchParams.get("sourceEvidenceState"),
        MATCH_SOURCE_EVIDENCE_STATES,
        "sourceEvidenceState",
      ) as MatchSourceEvidenceState[] | undefined,
      createdAt: parseDateRange(url.searchParams, "createdAt"),
      lastReviewedAt: parseDateRange(url.searchParams, "lastReviewedAt"),
    },
    sort: parseSort(url.searchParams),
  };
}

export function buildSuggestionWhere(query: MatchSuggestionListQuery) {
  const where: Record<string, unknown> = { tenantId: query.tenantId };
  addInFilter(where, "status", query.filters.status);
  addInFilter(where, "warningSeverity", query.filters.warningSeverity);
  addInFilter(where, "stalenessState", query.filters.stalenessState);
  addInFilter(where, "duplicateState", query.filters.duplicateState);
  addInFilter(where, "sourceEvidenceState", query.filters.sourceEvidenceState);
  if (query.filters.createdAt) where.createdAt = query.filters.createdAt;
  if (query.filters.lastReviewedAt) where.lastReviewedAt = query.filters.lastReviewedAt;
  return where;
}

export function buildSuggestionOrderBy(query: MatchSuggestionListQuery) {
  return [{ [query.sort.sortBy]: query.sort.sortOrder }, { id: "asc" }];
}

export function serializeSuggestionListItem(record: any): MatchSuggestionSafeListItem {
  return {
    id: record.id,
    tenantId: record.tenantId,
    organizationId: record.organizationId ?? null,
    projectRef: { id: record.projectId },
    personRef: { id: record.personId },
    status: record.status,
    score: stringifyNullable(record.score),
    scoreBand: record.scoreBand ?? null,
    systemReasonCodes: record.systemReasonCodes || [],
    systemWarningCodes: record.systemWarningCodes || [],
    warningSeverity: record.warningSeverity,
    stalenessState: record.stalenessState,
    duplicateState: record.duplicateState,
    sourceEvidenceState: record.sourceEvidenceState,
    attentionState: record.attentionState,
    promotionBlockers: record.promotionBlockers || [],
    promotionEligible: Boolean(record.promotionEligible),
    downstreamReadiness: record.downstreamReadiness,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    lastReviewedAt: record.lastReviewedAt ? toIsoString(record.lastReviewedAt) : null,
    lockVersion: record.lockVersion,
  };
}

export function serializeSuggestionDetail(record: any): MatchSuggestionSafeDetail {
  return {
    ...serializeSuggestionListItem(record),
    suggestionPairKey: record.suggestionPairKey,
    suggestionRevisionKey: record.suggestionRevisionKey,
    versions: {
      scoringVersion: record.scoringVersion,
      taxonomyVersion: record.taxonomyVersion,
      redactionPolicyVersion: record.redactionPolicyVersion,
    },
    createdByUserId: record.createdByUserId,
    lastReviewedByUserId: record.lastReviewedByUserId ?? null,
    reviewEvents: (record.reviewEvents || []).map((event: any) => ({
      id: event.id,
      eventType: event.eventType,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus ?? null,
      actorUserId: event.actorUserId,
      reasonCode: event.reasonCode ?? null,
      createdAt: toIsoString(event.createdAt),
      requestId: event.requestId,
    })),
    sourceRecords: (record.sourceRecords || []).map((sourceRecord: any) => ({
      id: sourceRecord.id,
      sourceType: sourceRecord.sourceType,
      sourceRecordId: sourceRecord.sourceRecordId,
      evidenceRole: sourceRecord.evidenceRole,
      safeSummary: sourceRecord.safeSummary ?? null,
      createdAt: toIsoString(sourceRecord.createdAt),
    })),
  };
}

export function serializeReviewQueueItem(record: any, now = new Date()): MatchSuggestionQueueItem {
  const base = serializeSuggestionListItem(record);
  const reviewAgeHours = computeReviewAgeHours(record.lastReviewedAt || record.createdAt, now);
  const { queuePriority, queueReasons } = computeReviewQueuePriority({
    status: base.status,
    warningSeverity: base.warningSeverity,
    stalenessState: base.stalenessState,
    duplicateState: base.duplicateState,
    sourceEvidenceState: base.sourceEvidenceState,
    reviewAgeHours,
  });

  return {
    ...base,
    queuePriority,
    queueReasons,
    reviewAgeHours,
  };
}

export function computeReviewQueuePriority(input: {
  status: MatchSuggestionStatus;
  warningSeverity: MatchWarningSeverity;
  stalenessState: MatchStalenessState;
  duplicateState: MatchDuplicateState;
  sourceEvidenceState: MatchSourceEvidenceState;
  reviewAgeHours: number;
}) {
  let queuePriority = 0;
  const queueReasons: string[] = [];

  if (input.status === "NEEDS_REVIEW") addQueueReason(queueReasons, "STATUS_NEEDS_REVIEW", 30);
  if (input.warningSeverity === "CRITICAL") addQueueReason(queueReasons, "WARNING_CRITICAL", 50);
  if (input.warningSeverity === "HIGH") addQueueReason(queueReasons, "WARNING_HIGH", 30);
  if (input.sourceEvidenceState === "REQUIRED_MISSING") addQueueReason(queueReasons, "REQUIRED_SOURCE_MISSING", 25);
  if (input.stalenessState === "STALE") addQueueReason(queueReasons, "STALE", 20);
  if (input.duplicateState === "POSSIBLE_DUPLICATE") addQueueReason(queueReasons, "POSSIBLE_DUPLICATE", 15);
  if (input.duplicateState === "DUPLICATE_CONFIRMED") addQueueReason(queueReasons, "DUPLICATE_CONFIRMED", 30);
  if (input.reviewAgeHours > 72) addQueueReason(queueReasons, "REVIEW_AGE_OVER_72H", 20);
  else if (input.reviewAgeHours > 24) addQueueReason(queueReasons, "REVIEW_AGE_OVER_24H", 10);

  function addQueueReason(reasons: string[], reason: string, points: number) {
    reasons.push(reason);
    queuePriority += points;
  }

  return { queuePriority, queueReasons };
}

export async function fetchSuggestionList(prismaClient: any, query: MatchSuggestionListQuery) {
  const where = buildSuggestionWhere(query);
  const orderBy = buildSuggestionOrderBy(query);
  const [totalCount, records] = await Promise.all([
    prismaClient.matchSuggestion.count({ where }),
    prismaClient.matchSuggestion.findMany({
      where,
      orderBy,
      skip: query.skip,
      take: query.take,
      select: listSelect,
    }),
  ]);

  return buildPage(records.map(serializeSuggestionListItem), totalCount, query);
}

export async function fetchSuggestionDetail(prismaClient: any, tenantId: string, id: string) {
  const record = await prismaClient.matchSuggestion.findFirst({
    where: { id, tenantId },
    select: detailSelect,
  });
  return record ? serializeSuggestionDetail(record) : null;
}

export async function fetchReviewQueue(prismaClient: any, query: MatchSuggestionListQuery, now = new Date()) {
  const where = buildSuggestionWhere(query);
  const orderBy = buildSuggestionOrderBy(query);
  const [totalCount, records] = await Promise.all([
    prismaClient.matchSuggestion.count({ where }),
    prismaClient.matchSuggestion.findMany({
      where,
      orderBy,
      skip: query.skip,
      take: query.take,
      select: listSelect,
    }),
  ]);

  return buildPage(records.map((record: any) => serializeReviewQueueItem(record, now)), totalCount, query);
}

export function isMatchSuggestionSchemaMissingError(error: unknown): boolean {
  const seen = new Set<unknown>();
  const stack = [error];
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (typeof current === "object") {
      const record = current as Record<string, any>;
      if (SCHEMA_MISSING_CODES.has(String(record.code))) return true;
      if (SCHEMA_MISSING_CODES.has(String(record.sqlState))) return true;
      if (SCHEMA_MISSING_CODES.has(String(record.routine))) return true;
      for (const key of ["cause", "error", "meta", "clientVersion"]) {
        if (record[key] && typeof record[key] === "object") stack.push(record[key]);
      }
      if (
        typeof record.message === "string" &&
        /match_suggestions|match_suggestion_review_events|match_suggestion_source_records|match_suggestion_idempotency_records/.test(
          record.message,
        )
      ) {
        if (/does not exist|not found|P2021|P2022|42P01|42703/i.test(record.message)) return true;
      }
    }
  }

  return false;
}

export function buildReadApiErrorResponse(error: unknown) {
  if (error instanceof MatchSuggestionReadApiError) {
    return {
      status: error.status,
      body: { message: error.message, code: error.code },
    };
  }

  if (isMatchSuggestionSchemaMissingError(error)) {
    return {
      status: 503,
      body: {
        message: "Match suggestion schema is not ready",
        code: "MATCH_SUGGESTION_SCHEMA_NOT_READY",
      },
    };
  }

  return {
    status: 500,
    body: {
      message: "Failed to read match suggestions",
      code: "MATCH_SUGGESTION_READ_FAILED",
    },
  };
}

const listSelect = {
  id: true,
  tenantId: true,
  organizationId: true,
  projectId: true,
  personId: true,
  status: true,
  score: true,
  scoreBand: true,
  systemReasonCodes: true,
  systemWarningCodes: true,
  warningSeverity: true,
  stalenessState: true,
  duplicateState: true,
  sourceEvidenceState: true,
  attentionState: true,
  promotionBlockers: true,
  promotionEligible: true,
  downstreamReadiness: true,
  createdAt: true,
  updatedAt: true,
  lastReviewedAt: true,
  lockVersion: true,
};

const detailSelect = {
  ...listSelect,
  suggestionPairKey: true,
  suggestionRevisionKey: true,
  scoringVersion: true,
  taxonomyVersion: true,
  redactionPolicyVersion: true,
  createdByUserId: true,
  lastReviewedByUserId: true,
  reviewEvents: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      eventType: true,
      fromStatus: true,
      toStatus: true,
      actorUserId: true,
      reasonCode: true,
      createdAt: true,
      requestId: true,
    },
  },
  sourceRecords: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      sourceType: true,
      sourceRecordId: true,
      evidenceRole: true,
      safeSummary: true,
      createdAt: true,
    },
  },
};

function buildPage<T>(items: T[], totalCount: number, query: MatchSuggestionListQuery): MatchSuggestionPage<T> {
  const totalPages = Math.ceil(totalCount / query.pageSize);
  return {
    items,
    pageInfo: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
    filters: query.filters,
    sort: query.sort,
  };
}

function parsePositiveInteger(value: string | null, fallback: number, label: string) {
  if (value === null || value === "") return fallback;
  if (!/^\d+$/.test(value)) {
    throw new MatchSuggestionReadApiError(400, "INVALID_QUERY", `${label} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new MatchSuggestionReadApiError(400, "INVALID_QUERY", `${label} must be a positive integer`);
  }
  return parsed;
}

function parseEnumList<T extends readonly string[]>(value: string | null, allowed: T, label: string) {
  if (!value) return undefined;
  const allowedSet = new Set<string>(allowed as readonly string[]);
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!parsed.length) return undefined;
  const invalid = parsed.find((item) => !allowedSet.has(item));
  if (invalid) {
    throw new MatchSuggestionReadApiError(400, "INVALID_QUERY", `${label} contains invalid value`);
  }
  return Array.from(new Set(parsed));
}

function parseDateRange(searchParams: URLSearchParams, key: "createdAt" | "lastReviewedAt"): DateRange | undefined {
  const from = searchParams.get(`${key}From`);
  const to = searchParams.get(`${key}To`);
  const range: DateRange = {};
  if (from) range.gte = parseDateFilter(from, `${key}From`);
  if (to) range.lte = parseDateFilter(to, `${key}To`);
  return range.gte || range.lte ? range : undefined;
}

function parseDateFilter(value: string, label: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new MatchSuggestionReadApiError(400, "INVALID_QUERY", `${label} must be a valid date`);
  }
  return date;
}

function parseSort(searchParams: URLSearchParams): MatchSuggestionListQuery["sort"] {
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  if (!SORT_FIELDS.includes(sortBy as SortField)) {
    throw new MatchSuggestionReadApiError(400, "INVALID_QUERY", "sortBy is invalid");
  }
  if (!SORT_ORDERS.includes(sortOrder as SortOrder)) {
    throw new MatchSuggestionReadApiError(400, "INVALID_QUERY", "sortOrder is invalid");
  }

  return { sortBy: sortBy as SortField, sortOrder: sortOrder as SortOrder };
}

function addInFilter(where: Record<string, unknown>, key: string, values: string[] | undefined) {
  if (!values?.length) return;
  where[key] = values.length === 1 ? values[0] : { in: values };
}

function stringifyNullable(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function toIsoString(value: Date | string) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function computeReviewAgeHours(value: Date | string, now: Date) {
  const startedAt = value instanceof Date ? value : new Date(value);
  const diffMs = now.getTime() - startedAt.getTime();
  return Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
}
