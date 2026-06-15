import type { AuthUser } from "./auth";

export const SEARCH_HISTORY_SCOPES = [
  "PROJECTS",
  "MAILS",
  "PERSONS",
  "PROPOSALS",
  "COMPANIES",
  "COMPANY_CONTACTS",
  "DISTRIBUTION_LOGS",
] as const;

export type SearchHistoryScope = (typeof SEARCH_HISTORY_SCOPES)[number];

export type SearchHistoryFilters = Record<string, unknown>;

export type SearchHistoryListParams = {
  targetScope?: SearchHistoryScope;
  limit: number;
};

export type SearchHistoryPayload = {
  targetScope: SearchHistoryScope;
  queryText: string | null;
  filters: SearchHistoryFilters | null;
  sortKey: string | null;
  resultCount: number | null;
};

export class SearchHistoryRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SearchHistoryRequestError";
    this.status = status;
  }
}

const MAX_HISTORY_LIMIT = 50;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_QUERY_TEXT_LENGTH = 300;
const MAX_SORT_KEY_LENGTH = 120;
const MAX_FILTERS_JSON_BYTES = 8_000;
const MAX_RESULT_COUNT = 1_000_000;

function isSearchHistoryScope(value: unknown): value is SearchHistoryScope {
  return typeof value === "string" && SEARCH_HISTORY_SCOPES.includes(value as SearchHistoryScope);
}

function parseLimit(value: string | null) {
  if (!value) return DEFAULT_HISTORY_LIMIT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new SearchHistoryRequestError(400, "limit must be a positive integer");
  }

  return Math.min(parsed, MAX_HISTORY_LIMIT);
}

function optionalTrimmedString(value: unknown, fieldName: string, maxLength: number) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new SearchHistoryRequestError(400, `${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new SearchHistoryRequestError(400, `${fieldName} is too long`);
  }

  return trimmed;
}

function parseFilters(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new SearchHistoryRequestError(400, "filters must be an object");
  }

  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > MAX_FILTERS_JSON_BYTES) {
    throw new SearchHistoryRequestError(400, "filters payload is too large");
  }

  return JSON.parse(serialized) as SearchHistoryFilters;
}

function parseResultCount(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_RESULT_COUNT) {
    throw new SearchHistoryRequestError(400, "resultCount must be a safe non-negative integer");
  }

  return value;
}

export function parseSearchHistoryListParams(url: URL): SearchHistoryListParams {
  const rawScope = url.searchParams.get("targetScope");
  let targetScope: SearchHistoryScope | undefined;
  if (rawScope) {
    if (!isSearchHistoryScope(rawScope)) {
      throw new SearchHistoryRequestError(400, "targetScope is invalid");
    }
    targetScope = rawScope;
  }

  return {
    targetScope,
    limit: parseLimit(url.searchParams.get("limit")),
  };
}

export function validateSearchHistoryBody(input: unknown): SearchHistoryPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SearchHistoryRequestError(400, "request body must be an object");
  }

  const body = input as Record<string, unknown>;
  const targetScope = body.targetScope;
  if (!isSearchHistoryScope(targetScope)) {
    throw new SearchHistoryRequestError(400, "targetScope is invalid");
  }

  return {
    targetScope,
    queryText: optionalTrimmedString(body.queryText, "queryText", MAX_QUERY_TEXT_LENGTH),
    filters: parseFilters(body.filters),
    sortKey: optionalTrimmedString(body.sortKey, "sortKey", MAX_SORT_KEY_LENGTH),
    resultCount: parseResultCount(body.resultCount),
  };
}

export function publicSearchHistory(row: any) {
  return {
    id: row.id,
    targetScope: row.targetScope,
    queryText: row.queryText || "",
    filters: row.filters || {},
    sortKey: row.sortKey || "",
    resultCount: row.resultCount ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
  };
}

export async function listSearchHistories(db: any, user: AuthUser, params: SearchHistoryListParams) {
  const rows = await db.searchHistory.findMany({
    where: {
      userId: user.id,
      ...(params.targetScope ? { targetScope: params.targetScope } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: params.limit,
  });

  return rows.map(publicSearchHistory);
}

export async function saveSearchHistory(db: any, user: AuthUser, input: unknown) {
  const payload = validateSearchHistoryBody(input);
  const row = await db.searchHistory.create({
    data: {
      userId: user.id,
      targetScope: payload.targetScope,
      queryText: payload.queryText,
      filters: payload.filters,
      sortKey: payload.sortKey,
      resultCount: payload.resultCount,
    },
  });

  return publicSearchHistory(row);
}

export function assertNoSensitiveSearchHistoryOutput(serialized: string) {
  const unsafePatterns = [
    /"userId"\s*:/i,
    /[A-Z]:\\Users\\/i,
  ];

  for (const pattern of unsafePatterns) {
    if (pattern.test(serialized)) {
      throw new Error("search history output contains unsafe private data");
    }
  }
}
