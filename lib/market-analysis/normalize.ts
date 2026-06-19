import {
  CONTRACT_TYPE_KEYS,
  PRICE_BANDS,
  UNKNOWN_MONTH,
  UNKNOWN_REGION,
  UNKNOWN_SKILL,
  WORK_STYLE_KEYS,
} from "./constants";
import type {
  ContractTypeKey,
  MarketPersonInput,
  MarketProjectInput,
  PriceBandKey,
  WorkStyleKey,
} from "./types";

const SKILL_ALIASES = new Map<string, string>([
  ["java", "Java"],
  ["javascript", "JavaScript"],
  ["js", "JavaScript"],
  ["typescript", "TypeScript"],
  ["ts", "TypeScript"],
  ["aws", "AWS"],
  ["amazonwebservices", "AWS"],
  ["amazon web services", "AWS"],
  ["react", "React"],
  ["reactjs", "React"],
  ["react.js", "React"],
  ["python", "Python"],
  ["php", "PHP"],
]);

const REGION_RULES: Array<[string, string[]]> = [
  ["東京", ["東京", "東京都", "渋谷", "新宿", "品川"]],
  ["大阪", ["大阪", "大阪府", "梅田", "淀屋橋"]],
  ["愛知", ["愛知", "名古屋"]],
  ["福岡", ["福岡", "博多"]],
  ["神奈川", ["神奈川", "横浜", "川崎"]],
  ["千葉", ["千葉"]],
  ["埼玉", ["埼玉"]],
];

function compact(value: unknown) {
  return String(value ?? "").trim();
}

function compactLower(value: unknown) {
  return compact(value).toLowerCase();
}

function canonicalSkillKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[＿_－—–-]/g, "")
    .replace(/\s+/g, " ");
}

function isFinitePositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function detectRegion(value: string | null | undefined) {
  const text = compact(value);
  if (!text) return UNKNOWN_REGION;

  for (const [region, tokens] of REGION_RULES) {
    if (tokens.some((token) => text.includes(token))) return region;
  }

  return UNKNOWN_REGION;
}

export function normalizeSkillName(value: string | null | undefined) {
  const raw = compact(value);
  if (!raw) return UNKNOWN_SKILL;

  const alias = SKILL_ALIASES.get(canonicalSkillKey(raw));
  if (alias) return alias;

  return raw;
}

export function normalizeRegion(
  input:
    | string
    | Pick<MarketProjectInput, "prefecture" | "workLocationText">
    | Pick<MarketPersonInput, "preferredLocation">
    | null
    | undefined,
) {
  const source = input as Partial<Pick<MarketProjectInput, "prefecture" | "workLocationText"> & Pick<MarketPersonInput, "preferredLocation">> | null | undefined;
  if (typeof input === "string") return detectRegion(input);

  const prefectureRegion = detectRegion(source?.prefecture);
  if (prefectureRegion !== UNKNOWN_REGION) return prefectureRegion;

  const workLocationRegion = detectRegion(source?.workLocationText);
  if (workLocationRegion !== UNKNOWN_REGION) return workLocationRegion;

  return detectRegion(source?.preferredLocation);
}

export function normalizeWorkStyle(remoteType?: string | null, text?: string | null): WorkStyleKey {
  const direct = compact(remoteType).toUpperCase();
  if (direct && direct !== "UNKNOWN" && WORK_STYLE_KEYS.includes(direct as WorkStyleKey)) {
    return direct as WorkStyleKey;
  }

  const searchable = compact(text).toLowerCase();
  if (!searchable.trim()) return "UNKNOWN";

  if (
    searchable.includes("full remote")
    || searchable.includes("full_remote")
    || searchable.includes("フルリモート")
    || searchable.includes("完全リモート")
  ) {
    return "FULL_REMOTE";
  }

  if (
    searchable.includes("一部リモート")
    || searchable.includes("週2出社")
    || searchable.includes("週3出社")
    || searchable.includes("ハイブリッド")
    || searchable.includes("hybrid")
  ) {
    return "HYBRID";
  }

  if (
    searchable.includes("リモート可")
    || searchable.includes("リモート中心")
    || searchable.includes("remote")
    || searchable.includes("リモート")
  ) {
    return "REMOTE";
  }

  if (
    searchable.includes("常駐")
    || searchable.includes("出社")
    || searchable.includes("オンサイト")
    || searchable.includes("onsite")
  ) {
    return "ONSITE";
  }

  return "UNKNOWN";
}

export function toPriceBand(value: number | null | undefined): PriceBandKey {
  if (!isFinitePositiveNumber(value)) return "unknown";

  for (const band of PRICE_BANDS) {
    if (band.key === "unknown") continue;
    if (band.max === null) {
      if (band.min !== null && value >= band.min) return band.key;
      continue;
    }
    if (band.min === null) {
      if (value <= band.max) return band.key;
      continue;
    }
    if (value >= band.min && value < band.max) return band.key;
  }

  return "unknown";
}

export function pickProjectPrice(project: Pick<MarketProjectInput, "upperAmountMax" | "upperAmountMin" | "unitPriceMax" | "unitPriceMin">) {
  if (isFinitePositiveNumber(project.upperAmountMax)) return project.upperAmountMax;
  if (isFinitePositiveNumber(project.upperAmountMin)) return project.upperAmountMin;
  if (isFinitePositiveNumber(project.unitPriceMax)) return project.unitPriceMax;
  if (isFinitePositiveNumber(project.unitPriceMin)) return project.unitPriceMin;
  return null;
}

export function normalizeContractType(value: string | null | undefined): ContractTypeKey {
  const direct = compact(value).toUpperCase();
  if (CONTRACT_TYPE_KEYS.includes(direct as ContractTypeKey)) return direct as ContractTypeKey;

  const text = compactLower(value);
  if (!text) return "UNKNOWN";
  if (text.includes("準委任") || text.includes("semi")) return "SEMI_DELEGATION";
  if (text.includes("派遣") || text.includes("dispatch")) return "DISPATCH";
  if (text.includes("請負") || text.includes("contract")) return "CONTRACT";
  if (text.includes("業務委託") || text.includes("outsourc")) return "OTHER";
  return "OTHER";
}

export function normalizeMonthKey(value: string | Date | null | undefined) {
  if (!value) return UNKNOWN_MONTH;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return UNKNOWN_MONTH;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  }

  const text = compact(value);
  if (!text) return UNKNOWN_MONTH;

  const isoLike = text.match(/^(\d{4})[-/年](\d{1,2})/);
  if (isoLike) return `${isoLike[1]}-${isoLike[2].padStart(2, "0")}`;

  const compactLike = text.match(/^(\d{4})(\d{2})$/);
  if (compactLike) return `${compactLike[1]}-${compactLike[2]}`;

  return UNKNOWN_MONTH;
}

export function priceBandLabel(key: PriceBandKey) {
  return PRICE_BANDS.find((band) => band.key === key)?.label ?? key;
}
