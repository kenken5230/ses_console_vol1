import {
  aggregateMarketCells,
  aggregatePriceBandMarket,
  aggregateRegionMarket,
  aggregateSkillMarket,
  buildQualityAlerts,
} from "./aggregate";
import type {
  MarketCellMetric,
  MarketPersonInput,
  MarketProjectInput,
  PriceBandKey,
  PriceBandMetric,
  QualityAlert,
  RegionMarketMetric,
  SalesPriorityScore,
  SkillMarketMetric,
} from "./types";

export const MARKET_ANALYSIS_DEFAULT_LIMIT = 1000;
export const MARKET_ANALYSIS_MAX_LIMIT = 1000;
export const MARKET_ANALYSIS_RANKING_LIMIT = 50;

export const MARKET_ANALYSIS_PROJECT_SELECT = {
  id: true,
  isFocus: true,
  condition: {
    select: {
      unitPriceMin: true,
      unitPriceMax: true,
      upperAmountMin: true,
      upperAmountMax: true,
      recruitingCount: true,
      prefecture: true,
      workLocationText: true,
      remoteType: true,
      workEnvironment: true,
      startMonth: true,
      contractType: true,
    },
  },
  skills: {
    select: {
      skillName: true,
      skillType: true,
      yearsRequired: true,
    },
  },
} as const;

export const MARKET_ANALYSIS_PERSON_SELECT = {
  id: true,
  desiredUnitPrice: true,
  availableFrom: true,
  preferredLocation: true,
  remotePreference: true,
  skills: {
    select: {
      skillName: true,
      years: true,
    },
  },
} as const;

export type MarketAnalysisQuery = {
  limit: number;
  focusOnly: boolean;
};

export type MarketProjectDbRow = {
  id: string;
  isFocus?: boolean | null;
  condition?: {
    unitPriceMin?: number | null;
    unitPriceMax?: number | null;
    upperAmountMin?: number | null;
    upperAmountMax?: number | null;
    recruitingCount?: number | null;
    prefecture?: string | null;
    workLocationText?: string | null;
    remoteType?: string | null;
    workEnvironment?: string | null;
    startMonth?: string | Date | null;
    contractType?: string | null;
  } | null;
  skills?: Array<{
    skillName?: string | null;
    skillType?: string | null;
    yearsRequired?: unknown;
  }> | null;
};

export type MarketPersonDbRow = {
  id: string;
  desiredUnitPrice?: number | null;
  availableFrom?: string | Date | null;
  preferredLocation?: string | null;
  remotePreference?: string | null;
  skills?: Array<{
    skillName?: string | null;
    years?: unknown;
  }> | null;
};

export type MarketCellRanking = MarketCellMetric & {
  salesPriorityScore: SalesPriorityScore;
};

export type MarketAnalysisApiResponse = {
  summary: {
    projectCount: number;
    personCount: number;
    focusProjectCount: number;
    qualityAlertCount: number;
    limit: number;
    focusOnly: boolean;
  };
  skillRankings: SkillMarketMetric[];
  priceBandRankings: PriceBandMetric[];
  regionRankings: RegionMarketMetric[];
  marketCellRankings: MarketCellRanking[];
  qualityAlerts: QualityAlert[];
  generatedAt: string;
};

function clampLimit(value: string | null) {
  if (!value) return MARKET_ANALYSIS_DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return MARKET_ANALYSIS_DEFAULT_LIMIT;
  return Math.min(Math.trunc(parsed), MARKET_ANALYSIS_MAX_LIMIT);
}

function booleanParam(value: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function decimalLikeToNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    const parsed = value.toNumber();
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstKnownPriceBand(metrics: PriceBandMetric[]): PriceBandKey | null {
  return metrics.find((metric) => metric.priceBand !== "unknown")?.priceBand ?? null;
}

export function parseMarketAnalysisQuery(params: URLSearchParams): MarketAnalysisQuery {
  return {
    limit: clampLimit(params.get("limit")),
    focusOnly: booleanParam(params.get("focusOnly")),
  };
}

export function marketProjectFromDb(row: MarketProjectDbRow): MarketProjectInput {
  const condition = row.condition;
  return {
    id: row.id,
    skills: (row.skills ?? []).map((skill) => ({
      skillName: skill.skillName ?? null,
      skillType: skill.skillType ?? "OTHER",
      years: decimalLikeToNumber(skill.yearsRequired),
    })),
    unitPriceMin: condition?.unitPriceMin ?? null,
    unitPriceMax: condition?.unitPriceMax ?? null,
    upperAmountMin: condition?.upperAmountMin ?? null,
    upperAmountMax: condition?.upperAmountMax ?? null,
    recruitingCount: condition?.recruitingCount ?? null,
    prefecture: condition?.prefecture ?? null,
    workLocationText: condition?.workLocationText ?? null,
    remoteType: condition?.remoteType ?? null,
    workStyleText: condition?.workEnvironment ?? null,
    startMonth: condition?.startMonth ?? null,
    contractType: condition?.contractType ?? null,
    isFocus: Boolean(row.isFocus),
  };
}

export function marketPersonFromDb(row: MarketPersonDbRow): MarketPersonInput {
  return {
    id: row.id,
    skills: (row.skills ?? []).map((skill) => ({
      skillName: skill.skillName ?? null,
      years: decimalLikeToNumber(skill.years),
    })),
    desiredUnitPrice: row.desiredUnitPrice ?? null,
    availableFrom: row.availableFrom ?? null,
    preferredLocation: row.preferredLocation ?? null,
    remotePreference: row.remotePreference ?? null,
  };
}

export function buildMarketAnalysisResponse(
  projectRows: MarketProjectDbRow[],
  personRows: MarketPersonDbRow[],
  options: Partial<MarketAnalysisQuery> & { generatedAt?: string } = {},
): MarketAnalysisApiResponse {
  const projects = projectRows.map(marketProjectFromDb);
  const persons = personRows.map(marketPersonFromDb);
  const qualityAlerts = buildQualityAlerts(projects, persons);
  const priceBandRankings = aggregatePriceBandMarket(projects, persons);
  const focusProjectCount = projects.filter((project) => project.isFocus).length;

  return {
    summary: {
      projectCount: projects.length,
      personCount: persons.length,
      focusProjectCount,
      qualityAlertCount: qualityAlerts.reduce((total, alert) => total + alert.count, 0),
      limit: options.limit ?? MARKET_ANALYSIS_DEFAULT_LIMIT,
      focusOnly: Boolean(options.focusOnly),
    },
    skillRankings: aggregateSkillMarket(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    priceBandRankings: priceBandRankings.slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    regionRankings: aggregateRegionMarket(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    marketCellRankings: aggregateMarketCells(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    qualityAlerts,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

export function buildFocusInsights(response: MarketAnalysisApiResponse) {
  return {
    topSkill: response.skillRankings[0]?.skill ?? null,
    topPriceBand: firstKnownPriceBand(response.priceBandRankings),
    topRegion: response.regionRankings[0]?.region ?? null,
  };
}
