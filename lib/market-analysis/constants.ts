export const UNKNOWN_SKILL = "unknown";
export const UNKNOWN_REGION = "unknown";
export const UNKNOWN_MONTH = "unknown";
export const DEFAULT_RECRUITING_COUNT = 1;

export const PRICE_BANDS = [
  { key: "under_50", label: "〜50万円", min: null, max: 50 },
  { key: "50_60", label: "50〜60万円", min: 50, max: 60 },
  { key: "60_70", label: "60〜70万円", min: 60, max: 70 },
  { key: "70_80", label: "70〜80万円", min: 70, max: 80 },
  { key: "80_over", label: "80万円〜", min: 80, max: null },
  { key: "unknown", label: "未設定", min: null, max: null },
] as const;

export const WORK_STYLE_KEYS = [
  "ONSITE",
  "HYBRID",
  "REMOTE",
  "FULL_REMOTE",
  "UNKNOWN",
] as const;

export const CONTRACT_TYPE_KEYS = [
  "SEMI_DELEGATION",
  "DISPATCH",
  "CONTRACT",
  "OTHER",
  "UNKNOWN",
] as const;

export const MARKET_SKILL_TYPES = [
  "REQUIRED",
  "PREFERRED",
  "USED_TECHNOLOGY",
  "OTHER",
] as const;

export const PRICE_BAND_LABELS = Object.fromEntries(
  PRICE_BANDS.map((band) => [band.key, band.label]),
) as Record<typeof PRICE_BANDS[number]["key"], string>;
