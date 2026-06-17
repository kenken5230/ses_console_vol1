import {
  aggregateMarketCells,
  aggregatePriceBandMarket,
  aggregateRegionMarket,
  aggregateSkillMarket,
  buildQualityAlerts,
} from "./aggregate";
import {
  attachAnonymousExamplesToMarketCellRankings,
  attachAnonymousExamplesToPriceBandRankings,
  attachAnonymousExamplesToRegionRankings,
  attachAnonymousExamplesToSkillRankings,
} from "./anonymous-examples";
import {
  CONTRACT_TYPE_KEYS,
  PRICE_BAND_LEGACY_KEY_MAP,
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
  MarketCellRanking,
  MarketPersonInput,
  MarketProjectInput,
  PriceBandKey,
  PriceBandMetric,
  PriceBandRanking,
  QualityAlert,
  RegionMarketRanking,
  SkillMarketRanking,
  WorkStyleKey,
} from "./types";

export const MARKET_ANALYSIS_DEFAULT_LIMIT = 100;
export const MARKET_ANALYSIS_MAX_LIMIT = 1000;
export const MARKET_ANALYSIS_RANKING_LIMIT = 50;
export const MARKET_ANALYSIS_CUMULATIVE_FROM_MONTH = "2026-01";

export const MARKET_ANALYSIS_PROJECT_SELECT = {
  id: true,
  createdAt: true,
  status: true,
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
  createdAt: true,
  status: true,
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
  limit?: number;
  focusOnly: boolean;
  fromMonth?: string;
  toMonth?: string;
  skill?: string;
  region?: string;
  priceBand?: PriceBandKey;
  workStyle?: WorkStyleKey;
  contractType?: ContractTypeKey;
};

export type MarketProjectDbRow = {
  id: string;
  createdAt?: string | Date | null;
  status?: string | null;
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
  createdAt?: string | Date | null;
  status?: string | null;
  desiredUnitPrice?: number | null;
  availableFrom?: string | Date | null;
  preferredLocation?: string | null;
  remotePreference?: string | null;
  skills?: Array<{
    skillName?: string | null;
    years?: unknown;
  }> | null;
};

export type MarketAnalysisApiResponse = {
  summary: {
    projectCount: number;
    personCount: number;
    focusProjectCount: number;
    sampleProjectCount: number;
    samplePersonCount: number;
    sampleFocusProjectCount: number;
    cumulativeFromMonth: string | null;
    qualityAlertCount: number;
    limit: number | null;
    focusOnly: boolean;
  };
  period: {
    basis: "createdAt";
    basisLabel: string;
    fromMonth: string | null;
    toMonth: string | null;
    actualFromMonth: string | null;
    actualToMonth: string | null;
    projectFromMonth: string | null;
    projectToMonth: string | null;
    personFromMonth: string | null;
    personToMonth: string | null;
  };
  appliedFilters: {
    limit: number | null;
    focusOnly: boolean;
    fromMonth: string | null;
    toMonth: string | null;
    skill: string | null;
    region: string | null;
    priceBand: PriceBandKey | null;
    workStyle: WorkStyleKey | null;
    contractType: ContractTypeKey | null;
  };
  skillRankings: SkillMarketRanking[];
  priceBandRankings: PriceBandRanking[];
  regionRankings: RegionMarketRanking[];
  marketCellRankings: MarketCellRanking[];
  qualityAlerts: QualityAlert[];
  generatedAt: string;
};

function clampLimit(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
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

function monthParam(value: string | null) {
  const normalized = optionalParam(value);
  if (!normalized || !/^\d{4}-\d{2}$/.test(normalized)) return undefined;
  const month = Number(normalized.slice(5, 7));
  return month >= 1 && month <= 12 ? normalized : undefined;
}

function priceBandParam(value: string | null): PriceBandKey | undefined {
  const normalized = optionalParam(value);
  if (!normalized) return undefined;
  if (PRICE_BANDS.some((band) => band.key === normalized)) return normalized as PriceBandKey;

  const legacyPriceBand = PRICE_BAND_LEGACY_KEY_MAP[normalized as keyof typeof PRICE_BAND_LEGACY_KEY_MAP];
  return legacyPriceBand ? legacyPriceBand as PriceBandKey : undefined;
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

export function defaultRecentMonthRange(now = new Date()) {
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 2, 1));
  return {
    fromMonth: monthKeyFromDate(from) ?? undefined,
    toMonth: monthKeyFromDate(current) ?? undefined,
  };
}

export function parseMarketAnalysisQuery(params: URLSearchParams, now = new Date()): MarketAnalysisQuery {
  const requestedFromMonth = monthParam(params.get("fromMonth"));
  const requestedToMonth = monthParam(params.get("toMonth"));
  const monthRange = normalizeMonthRange(
    requestedFromMonth,
    requestedToMonth,
    !requestedFromMonth && !requestedToMonth ? defaultRecentMonthRange(now) : undefined,
  );
  const limit = clampLimit(params.get("limit"));
  const query: MarketAnalysisQuery = {
    focusOnly: booleanParam(params.get("focusOnly")),
  };
  const skill = skillParam(params.get("skill"));
  const region = regionParam(params.get("region"));
  const priceBand = priceBandParam(params.get("priceBand"));
  const workStyle = workStyleParam(params.get("workStyle"));
  const contractType = contractTypeParam(params.get("contractType"));

  if (limit !== undefined) query.limit = limit;
  if (monthRange.fromMonth) query.fromMonth = monthRange.fromMonth;
  if (monthRange.toMonth) query.toMonth = monthRange.toMonth;
  if (skill) query.skill = skill;
  if (region) query.region = region;
  if (priceBand) query.priceBand = priceBand;
  if (workStyle) query.workStyle = workStyle;
  if (contractType) query.contractType = contractType;

  return query;
}

export function buildCreatedAtWhere(query: Pick<MarketAnalysisQuery, "fromMonth" | "toMonth">) {
  const from = monthToDate(query.fromMonth);
  const toExclusive = nextMonthToDate(query.toMonth);
  if (!from && !toExclusive) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(toExclusive ? { lt: toExclusive } : {}),
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
  options: Partial<MarketAnalysisQuery> & {
    cumulativeFocusProjectCount?: number;
    cumulativeFromMonth?: string;
    cumulativePersonCount?: number;
    cumulativeProjectCount?: number;
    generatedAt?: string;
  } = {},
): MarketAnalysisApiResponse {
  const filters = appliedFiltersFromOptions(options);
  const projectPairs = projectRows
    .map((row, sourceIndex) => ({ row, sourceIndex, project: marketProjectFromDb(row) }))
    .filter(({ row }) => rowIsActive(row.status))
    .filter(({ row }) => rowMatchesPeriod(row.createdAt, filters))
    .filter(({ project }) => !filters.focusOnly || Boolean(project.isFocus))
    .filter(({ project }) => projectMatchesFilters(project, filters));
  const personPairs = personRows
    .map((row, sourceIndex) => ({ row, sourceIndex, person: marketPersonFromDb(row) }))
    .filter(({ row }) => rowIsActive(row.status))
    .filter(({ row }) => rowMatchesPeriod(row.createdAt, filters))
    .filter(({ person }) => personMatchesFilters(person, filters));
  const projects = projectPairs.map(({ project }) => project);
  const persons = personPairs.map(({ person }) => person);
  const qualityAlerts = buildQualityAlerts(projects, persons);
  const priceBandRankings = aggregatePriceBandMarket(projects, persons);
  const skillRankings = aggregateSkillMarket(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT);
  const regionRankings = aggregateRegionMarket(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT);
  const marketCellRankings = aggregateMarketCells(projects, persons).slice(0, MARKET_ANALYSIS_RANKING_LIMIT);
  const focusProjectCount = projects.filter((project) => project.isFocus).length;
  const period = buildPeriodSummary(
    filters,
    projectPairs.map(({ row }) => row.createdAt),
    personPairs.map(({ row }) => row.createdAt),
  );
  const projectExampleSources = projectPairs.map(({ project, row, sourceIndex }) => ({
    project,
    createdAt: row.createdAt,
    status: row.status ?? null,
    sourceIndex,
  }));
  const personExampleSources = personPairs.map(({ person, row, sourceIndex }) => ({
    person,
    createdAt: row.createdAt,
    status: row.status ?? null,
    sourceIndex,
  }));

  return {
    summary: {
      projectCount: options.cumulativeProjectCount ?? projects.length,
      personCount: options.cumulativePersonCount ?? persons.length,
      focusProjectCount: options.cumulativeFocusProjectCount ?? focusProjectCount,
      sampleProjectCount: projects.length,
      samplePersonCount: persons.length,
      sampleFocusProjectCount: focusProjectCount,
      cumulativeFromMonth: options.cumulativeFromMonth ?? null,
      qualityAlertCount: qualityAlerts.reduce((total, alert) => total + alert.count, 0),
      limit: filters.limit,
      focusOnly: Boolean(options.focusOnly),
    },
    period,
    appliedFilters: filters,
    skillRankings: attachAnonymousExamplesToSkillRankings(skillRankings, projectExampleSources, personExampleSources),
    priceBandRankings: attachAnonymousExamplesToPriceBandRankings(
      priceBandRankings.slice(0, MARKET_ANALYSIS_RANKING_LIMIT),
      projectExampleSources,
      personExampleSources,
    ),
    regionRankings: attachAnonymousExamplesToRegionRankings(regionRankings, projectExampleSources, personExampleSources),
    marketCellRankings: attachAnonymousExamplesToMarketCellRankings(marketCellRankings, projectExampleSources, personExampleSources),
    qualityAlerts,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

function appliedFiltersFromOptions(options: Partial<MarketAnalysisQuery>) {
  const monthRange = normalizeMonthRange(options.fromMonth, options.toMonth);
  return {
    limit: options.limit ?? null,
    focusOnly: Boolean(options.focusOnly),
    fromMonth: monthRange.fromMonth ?? null,
    toMonth: monthRange.toMonth ?? null,
    skill: options.skill ?? null,
    region: options.region ?? null,
    priceBand: options.priceBand ?? null,
    workStyle: options.workStyle ?? null,
    contractType: options.contractType ?? null,
  };
}

function normalizeMonthRange(
  fromMonth: string | null | undefined,
  toMonth: string | null | undefined,
  fallback?: { fromMonth?: string; toMonth?: string },
) {
  const from = fromMonth ?? fallback?.fromMonth;
  const to = toMonth ?? fallback?.toMonth;
  if (from && to && from > to) {
    return { fromMonth: to, toMonth: from };
  }
  return { fromMonth: from, toMonth: to };
}

function rowIsActive(status: string | null | undefined) {
  return String(status ?? "").trim().toUpperCase() !== "ARCHIVED";
}

function monthToDate(month: string | null | undefined) {
  if (!month) return null;
  const [year, monthIndex] = month.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return null;
  return new Date(Date.UTC(year, monthIndex - 1, 1));
}

function nextMonthToDate(month: string | null | undefined) {
  if (!month) return null;
  const [year, monthIndex] = month.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) return null;
  return new Date(Date.UTC(year, monthIndex, 1));
}

function dateValue(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKeyFromDate(value: string | Date | null | undefined) {
  const date = dateValue(value);
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function rowMatchesPeriod(value: string | Date | null | undefined, filters: ReturnType<typeof appliedFiltersFromOptions>) {
  if (!filters.fromMonth && !filters.toMonth) return true;
  const date = dateValue(value);
  if (!date) return false;
  const from = monthToDate(filters.fromMonth);
  const toExclusive = nextMonthToDate(filters.toMonth);
  if (from && date < from) return false;
  if (toExclusive && date >= toExclusive) return false;
  return true;
}

function monthRange(values: Array<string | Date | null | undefined>) {
  const months = values
    .map(monthKeyFromDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  return {
    fromMonth: months[0] ?? null,
    toMonth: months[months.length - 1] ?? null,
  };
}

function buildPeriodSummary(
  filters: ReturnType<typeof appliedFiltersFromOptions>,
  projectCreatedAtValues: Array<string | Date | null | undefined>,
  personCreatedAtValues: Array<string | Date | null | undefined>,
): MarketAnalysisApiResponse["period"] {
  const projectRange = monthRange(projectCreatedAtValues);
  const personRange = monthRange(personCreatedAtValues);
  const actualRange = monthRange([...projectCreatedAtValues, ...personCreatedAtValues]);

  return {
    basis: "createdAt",
    basisLabel: "データ登録月",
    fromMonth: filters.fromMonth,
    toMonth: filters.toMonth,
    actualFromMonth: actualRange.fromMonth,
    actualToMonth: actualRange.toMonth,
    projectFromMonth: projectRange.fromMonth,
    projectToMonth: projectRange.toMonth,
    personFromMonth: personRange.fromMonth,
    personToMonth: personRange.toMonth,
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
