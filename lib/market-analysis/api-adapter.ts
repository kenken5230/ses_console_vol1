import {
  aggregateMarketCells,
  aggregatePriceBandMarket,
  aggregateRegionMarket,
  aggregateSkillMarket,
  buildQualityAlerts,
} from "./aggregate";
import {
  CONTRACT_TYPE_KEYS,
  PRICE_BANDS,
  UNKNOWN_REGION,
  WORK_STYLE_KEYS,
} from "./constants";
import {
  normalizeContractType,
  normalizeRegion,
  normalizeSkillName,
  normalizeWorkStyle,
  pickProjectPrice,
  toPriceBand,
} from "./normalize";
import type {
  ContractTypeKey,
  MarketCellMetric,
  MarketPersonInput,
  MarketProjectInput,
  PriceBandKey,
  PriceBandMetric,
  QualityAlert,
  RegionMarketMetric,
  SalesPriorityScore,
  SkillMarketMetric,
  WorkStyleKey,
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
  skill?: string;
  region?: string;
  priceBand?: PriceBandKey;
  workStyle?: WorkStyleKey;
  contractType?: ContractTypeKey;
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
  appliedFilters: {
    limit: number;
    focusOnly: boolean;
    skill: string | null;
    region: string | null;
    priceBand: PriceBandKey | null;
    workStyle: WorkStyleKey | null;
    contractType: ContractTypeKey | null;
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

function optionalParam(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function priceBandParam(value: string | null): PriceBandKey | undefined {
  const normalized = optionalParam(value);
  if (!normalized) return undefined;
  return PRICE_BANDS.some((band) => band.key === normalized) ? normalized as PriceBandKey : undefined;
}

function workStyleParam(value: string | null): WorkStyleKey | undefined {
  const normalized = optionalParam(value)?.toUpperCase();
  if (!normalized) return undefined;
  return WORK_STYLE_KEYS.includes(normalized as WorkStyleKey) ? normalized as WorkStyleKey : undefined;
}

function contractTypeParam(value: string | null): ContractTypeKey | undefined {
  const normalized = optionalParam(value);
  if (!normalized) return undefined;

  const direct = normalized.toUpperCase();
  if (CONTRACT_TYPE_KEYS.includes(direct as ContractTypeKey)) return direct as ContractTypeKey;

  return normalizeContractType(normalized);
}

function skillParam(value: string | null) {
  const normalized = optionalParam(value);
  if (!normalized) return undefined;
  return normalizeSkillName(normalized);
}

function regionParam(value: string | null) {
  const normalized = optionalParam(value);
  if (!normalized) return undefined;
  if (normalized.toLowerCase() === UNKNOWN_REGION) return UNKNOWN_REGION;
  return normalizeRegion(normalized);
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
  const query: MarketAnalysisQuery = {
    limit: clampLimit(params.get("limit")),
    focusOnly: booleanParam(params.get("focusOnly")),
  };
  const skill = skillParam(params.get("skill"));
  const region = regionParam(params.get("region"));
  const priceBand = priceBandParam(params.get("priceBand"));
  const workStyle = workStyleParam(params.get("workStyle"));
  const contractType = contractTypeParam(params.get("contractType"));

  if (skill) query.skill = skill;
  if (region) query.region = region;
  if (priceBand) query.priceBand = priceBand;
  if (workStyle) query.workStyle = workStyle;
  if (contractType) query.contractType = contractType;

  return query;
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
  const filters = appliedFiltersFromOptions(options);
  const projects = projectRows.map(marketProjectFromDb).filter((project) => projectMatchesFilters(project, filters));
  const persons = personRows.map(marketPersonFromDb).filter((person) => personMatchesFilters(person, filters));
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
    appliedFilters: filters,
    skillRankings: aggregateSkillMarket(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    priceBandRankings: priceBandRankings.slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    regionRankings: aggregateRegionMarket(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    marketCellRankings: aggregateMarketCells(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
    qualityAlerts,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

function appliedFiltersFromOptions(options: Partial<MarketAnalysisQuery>) {
  return {
    limit: options.limit ?? MARKET_ANALYSIS_DEFAULT_LIMIT,
    focusOnly: Boolean(options.focusOnly),
    skill: options.skill ?? null,
    region: options.region ?? null,
    priceBand: options.priceBand ?? null,
    workStyle: options.workStyle ?? null,
    contractType: options.contractType ?? null,
  };
}

function hasSkill(skills: MarketProjectInput["skills"] | MarketPersonInput["skills"], skill: string) {
  return (skills ?? []).some((item) => normalizeSkillName(item.skillName) === skill);
}

function projectMatchesFilters(project: MarketProjectInput, filters: ReturnType<typeof appliedFiltersFromOptions>) {
  if (filters.skill && !hasSkill(project.skills, filters.skill)) return false;
  if (filters.region && normalizeRegion(project) !== filters.region) return false;
  if (filters.priceBand && toPriceBand(pickProjectPrice(project)) !== filters.priceBand) return false;
  if (
    filters.workStyle
    && normalizeWorkStyle(project.remoteType, `${project.workStyleText ?? ""} ${project.workLocationText ?? ""}`) !== filters.workStyle
  ) {
    return false;
  }
  if (filters.contractType && normalizeContractType(project.contractType) !== filters.contractType) return false;
  return true;
}

function personMatchesFilters(person: MarketPersonInput, filters: ReturnType<typeof appliedFiltersFromOptions>) {
  if (filters.skill && !hasSkill(person.skills, filters.skill)) return false;
  if (filters.region && normalizeRegion(person) !== filters.region) return false;
  if (filters.priceBand && toPriceBand(person.desiredUnitPrice) !== filters.priceBand) return false;
  if (filters.workStyle && normalizeWorkStyle(null, person.remotePreference) !== filters.workStyle) return false;
  return true;
}

export function buildFocusInsights(response: MarketAnalysisApiResponse) {
  return {
    topSkill: response.skillRankings[0]?.skill ?? null,
    topPriceBand: firstKnownPriceBand(response.priceBandRankings),
    topRegion: response.regionRankings[0]?.region ?? null,
  };
}
