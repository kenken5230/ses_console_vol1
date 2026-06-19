import {
  MARKET_ANALYSIS_DEFAULT_LIMIT,
  MARKET_ANALYSIS_MAX_LIMIT,
  MARKET_ANALYSIS_MIN_LIMIT,
} from "./constants";

export const MARKET_ANALYSIS_VISIBLE_RANKING_LIMIT = 20;

export function normalizeMarketAnalysisLimitInput(
  value: string | null | undefined,
  invalidFallback = String(MARKET_ANALYSIS_DEFAULT_LIMIT),
) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return invalidFallback;

  const integer = Math.trunc(parsed);
  if (integer < MARKET_ANALYSIS_MIN_LIMIT) return String(MARKET_ANALYSIS_MIN_LIMIT);
  if (integer > MARKET_ANALYSIS_MAX_LIMIT) return String(MARKET_ANALYSIS_MAX_LIMIT);
  return String(integer);
}

export function visibleMarketRankingRows<T>(
  rows: readonly T[] = [],
  rowLimit: number | null = MARKET_ANALYSIS_VISIBLE_RANKING_LIMIT,
) {
  if (rowLimit === null) return [...rows];
  if (!Number.isFinite(rowLimit) || rowLimit <= 0) return [];
  return rows.slice(0, Math.trunc(rowLimit));
}
