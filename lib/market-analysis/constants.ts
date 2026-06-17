export const UNKNOWN_SKILL = "unknown";
export const UNKNOWN_REGION = "unknown";
export const UNKNOWN_MONTH = "unknown";
export const DEFAULT_RECRUITING_COUNT = 1;

export const PRICE_BANDS = [
  { key: "under_30", label: "30万円以下", min: null, max: 30 },
  { key: "30_35", label: "30〜35万円", min: 30, max: 35 },
  { key: "35_40", label: "35〜40万円", min: 35, max: 40 },
  { key: "40_45", label: "40〜45万円", min: 40, max: 45 },
  { key: "45_50", label: "45〜50万円", min: 45, max: 50 },
  { key: "50_55", label: "50〜55万円", min: 50, max: 55 },
  { key: "55_60", label: "55〜60万円", min: 55, max: 60 },
  { key: "60_65", label: "60〜65万円", min: 60, max: 65 },
  { key: "65_70", label: "65〜70万円", min: 65, max: 70 },
  { key: "70_75", label: "70〜75万円", min: 70, max: 75 },
  { key: "75_80", label: "75〜80万円", min: 75, max: 80 },
  { key: "80_85", label: "80〜85万円", min: 80, max: 85 },
  { key: "85_90", label: "85〜90万円", min: 85, max: 90 },
  { key: "90_95", label: "90〜95万円", min: 90, max: 95 },
  { key: "95_100", label: "95〜100万円", min: 95, max: 100 },
  { key: "100_105", label: "100〜105万円", min: 100, max: 105 },
  { key: "105_110", label: "105〜110万円", min: 105, max: 110 },
  { key: "110_115", label: "110〜115万円", min: 110, max: 115 },
  { key: "115_120", label: "115〜120万円", min: 115, max: 120 },
  { key: "120_over", label: "120万円以上", min: 120, max: null },
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
