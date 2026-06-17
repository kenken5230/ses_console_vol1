import type { AuthUser } from "./auth";

export const SEARCH_HISTORY_TARGET_SCOPES = [
  "PROJECTS",
  "MAILS",
  "PERSONS",
  "PROPOSALS",
  "COMPANIES",
  "COMPANY_CONTACTS",
  "DISTRIBUTION_LOGS"
] as const;

export type SearchHistoryTargetScope = (typeof SEARCH_HISTORY_TARGET_SCOPES)[number];

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 50;
const MAX_QUERY_TEXT_LENGTH = 300;
const MAX_SORT_KEY_LENGTH = 120;
const MAX_FILTERS_BYTES = 8_000;
const MAX_RESULT_COUNT = 1_000_000;
const SENSITIVE_FILTER_USER_KEYS = new Set([
  "userid",
  "user_id",
  "user",
  "ownerid",
  "owner_id",
  "createdby",
  "created_by"
]);

export class SearchHistoryRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SearchHistoryRequestError";
    this.status = status;
  }
}

type SearchHistoryDb = {
  searchHistory: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    create: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

type RawSearchHistory = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSensitiveFilterUserKey(key: string) {
  return SENSITIVE_FILTER_USER_KEYS.has(key.replace(/[-\s]/g, "_").toLowerCase());
}

export function sanitizeSearchHistoryFilters(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeSearchHistoryFilters(item));
  if (!isPlainObject(value)) return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (isSensitiveFilterUserKey(key)) continue;
    sanitized[key] = sanitizeSearchHistoryFilters(nestedValue);
  }
  return sanitized;
}

function assertNoSensitiveSearchHistoryKeys(value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoSensitiveSearchHistoryKeys(item);
    return;
  }
  if (!isPlainObject(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (isSensitiveFilterUserKey(key)) {
      throw new Error("SearchHistory public output must not include user-identifying keys");
    }
    assertNoSensitiveSearchHistoryKeys(nestedValue);
  }
}

function normalizeOptionalString(value: unknown, maxLength: number, fieldName: string) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new SearchHistoryRequestError(400, `${fieldName} must be a string`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new SearchHistoryRequestError(400, `${fieldName} is too long`);
  return normalized || null;
}

export function normalizeSearchHistoryScope(value: unknown, fallback: SearchHistoryTargetScope = "PROJECTS") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") throw new SearchHistoryRequestError(400, "targetScope must be a string");
  if (!SEARCH_HISTORY_TARGET_SCOPES.includes(value as SearchHistoryTargetScope)) {
    throw new SearchHistoryRequestError(400, "targetScope is invalid");
  }
  return value as SearchHistoryTargetScope;
}

export function parseSearchHistoryListParams(url: URL) {
  const limitValue = Number(url.searchParams.get("limit") || DEFAULT_LIST_LIMIT);
  const limit = Number.isFinite(limitValue) ? Math.floor(limitValue) : DEFAULT_LIST_LIMIT;
  if (limit < 1) throw new SearchHistoryRequestError(400, "limit must be positive");

  return {
    limit: Math.min(limit, MAX_LIST_LIMIT),
    targetScope: normalizeSearchHistoryScope(url.searchParams.get("targetScope"), "PROJECTS")
  };
}

function normalizeFilters(value: unknown) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) throw new SearchHistoryRequestError(400, "filters must be an object");

  const sanitized = sanitizeSearchHistoryFilters(value);
  if (!isPlainObject(sanitized)) throw new SearchHistoryRequestError(400, "filters must be an object");

  const serialized = JSON.stringify(sanitized);
  if (Buffer.byteLength(serialized, "utf8") > MAX_FILTERS_BYTES) {
    throw new SearchHistoryRequestError(400, "filters payload is too large");
  }

  return sanitized;
}

function normalizeResultCount(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new SearchHistoryRequestError(400, "resultCount must be an integer");
  }
  if (value < 0 || value > MAX_RESULT_COUNT) {
    throw new SearchHistoryRequestError(400, "resultCount is out of range");
  }
  return value;
}

export function validateSearchHistoryBody(input: unknown) {
  if (!isPlainObject(input)) throw new SearchHistoryRequestError(400, "request body must be an object");

  return {
    targetScope: normalizeSearchHistoryScope(input.targetScope, "PROJECTS"),
    queryText: normalizeOptionalString(input.queryText, MAX_QUERY_TEXT_LENGTH, "queryText"),
    filters: normalizeFilters(input.filters),
    sortKey: normalizeOptionalString(input.sortKey, MAX_SORT_KEY_LENGTH, "sortKey"),
    resultCount: normalizeResultCount(input.resultCount)
  };
}

export function publicSearchHistory(row: RawSearchHistory) {
  return {
    id: String(row.id || ""),
    targetScope: normalizeSearchHistoryScope(row.targetScope, "PROJECTS"),
    queryText: typeof row.queryText === "string" ? row.queryText : null,
    filters: isPlainObject(row.filters) ? (sanitizeSearchHistoryFilters(row.filters) as Record<string, unknown>) : null,
    sortKey: typeof row.sortKey === "string" ? row.sortKey : null,
    resultCount: typeof row.resultCount === "number" ? row.resultCount : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || "")
  };
}

export async function listSearchHistories(db: SearchHistoryDb, user: AuthUser, params: { limit: number; targetScope: SearchHistoryTargetScope }) {
  const rows = await db.searchHistory.findMany({
    where: {
      userId: user.id,
      targetScope: params.targetScope
    },
    orderBy: { createdAt: "desc" },
    take: params.limit
  });

  return rows.map((row) => publicSearchHistory(row as RawSearchHistory));
}

export async function saveSearchHistory(db: SearchHistoryDb, user: AuthUser, input: unknown) {
  const data = validateSearchHistoryBody(input);
  const row = await db.searchHistory.create({
    data: {
      userId: user.id,
      targetScope: data.targetScope,
      queryText: data.queryText,
      filters: data.filters,
      sortKey: data.sortKey,
      resultCount: data.resultCount
    }
  });

  return publicSearchHistory(row as RawSearchHistory);
}

export function assertNoSensitiveSearchHistoryOutput(value: unknown) {
  assertNoSensitiveSearchHistoryKeys(value);
}
