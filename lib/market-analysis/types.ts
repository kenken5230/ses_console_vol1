import type {
  CONTRACT_TYPE_KEYS,
  MARKET_SKILL_TYPES,
  PRICE_BANDS,
  WORK_STYLE_KEYS,
} from "./constants";

export type PriceBandKey = typeof PRICE_BANDS[number]["key"];
export type WorkStyleKey = typeof WORK_STYLE_KEYS[number];
export type ContractTypeKey = typeof CONTRACT_TYPE_KEYS[number];
export type MarketSkillType = typeof MARKET_SKILL_TYPES[number];

export type MarketSkillInput = {
  skillName?: string | null;
  skillType?: MarketSkillType | string | null;
  years?: number | null;
};

export type MarketProjectInput = {
  id: string;
  title?: string | null;
  skills?: MarketSkillInput[] | null;
  unitPriceMin?: number | null;
  unitPriceMax?: number | null;
  upperAmountMin?: number | null;
  upperAmountMax?: number | null;
  recruitingCount?: number | null;
  prefecture?: string | null;
  workLocationText?: string | null;
  remoteType?: WorkStyleKey | string | null;
  workStyleText?: string | null;
  startMonth?: string | Date | null;
  contractType?: ContractTypeKey | string | null;
  isFocus?: boolean | null;
  qualityIssueCount?: number | null;
  needsReview?: boolean | null;
};

export type MarketPersonInput = {
  id: string;
  name?: string | null;
  skills?: MarketSkillInput[] | null;
  desiredUnitPrice?: number | null;
  availableFrom?: string | Date | null;
  preferredLocation?: string | null;
  remotePreference?: string | null;
  qualityIssueCount?: number | null;
  needsReview?: boolean | null;
};

export type MarketMetricBase = {
  projectCount: number;
  recruitingCount: number;
  personCount: number;
  demandSupplyGap: number;
  projectMedianPrice: number | null;
  personDesiredMedianPrice: number | null;
  focusProjectCount: number;
  qualityIssueCount: number;
};

export type SkillMarketMetric = MarketMetricBase & {
  skill: string;
  requiredSkillProjectCount: number;
  preferredSkillProjectCount: number;
  usedTechnologyProjectCount: number;
};

export type PriceBandMetric = MarketMetricBase & {
  priceBand: PriceBandKey;
};

export type RegionMarketMetric = MarketMetricBase & {
  region: string;
  workStyle: WorkStyleKey;
};

export type MarketCellMetric = MarketMetricBase & {
  skill: string;
  priceBand: PriceBandKey;
  region: string;
  workStyle: WorkStyleKey;
  startMonth: string;
  contractType: ContractTypeKey;
};

export type QualityAlert = {
  code:
    | "PROJECT_SKILL_MISSING"
    | "PROJECT_PRICE_MISSING"
    | "PROJECT_REGION_MISSING"
    | "PROJECT_WORK_STYLE_UNKNOWN"
    | "PROJECT_START_MONTH_MISSING"
    | "PERSON_SKILL_MISSING"
    | "PERSON_PRICE_MISSING"
    | "PERSON_REGION_MISSING"
    | "PERSON_WORK_STYLE_UNKNOWN"
    | "NEEDS_REVIEW";
  severity: "info" | "warning" | "critical";
  target: "project" | "person" | "both";
  count: number;
  message: string;
  sampleIds: string[];
};

export type SalesPriorityScore = {
  score: number;
  reasons: string[];
  components: {
    demandScore: number;
    gapScore: number;
    priceScore: number;
    focusScore: number;
    timingScore: number;
    qualityPenalty: number;
  };
};

export type MarketAnonymousExample = {
  kind: "project" | "person";
  anonymousId: string;
  registeredMonth: string | null;
  priceBand: PriceBandKey;
  region: string;
  workStyle: WorkStyleKey;
  skillCount: number;
  requiredSkillCount: number;
  preferredSkillCount: number;
  usedTechnologySkillCount: number;
  isFocus?: boolean;
  status?: string | null;
};

export type MarketAnonymousExamples = {
  projects: MarketAnonymousExample[];
  persons: MarketAnonymousExample[];
};

export type SkillMarketRanking = SkillMarketMetric & {
  anonymousExamples: MarketAnonymousExamples;
};

export type PriceBandRanking = PriceBandMetric & {
  anonymousExamples: MarketAnonymousExamples;
};

export type RegionMarketRanking = RegionMarketMetric & {
  anonymousExamples: MarketAnonymousExamples;
};

export type MarketCellRanking = MarketCellMetric & {
  salesPriorityScore: SalesPriorityScore;
  anonymousExamples: MarketAnonymousExamples;
};
