import assert from "node:assert/strict";

import { calculateSalesPriorityScore } from "../../lib/market-analysis/scoring";
import type { MarketMetricBase } from "../../lib/market-analysis/types";

const baseMetric: MarketMetricBase = {
  projectCount: 3,
  recruitingCount: 8,
  personCount: 1,
  demandSupplyGap: 7,
  projectMedianPrice: 85,
  personDesiredMedianPrice: 75,
  focusProjectCount: 2,
  qualityIssueCount: 0,
};

const strong = calculateSalesPriorityScore({
  ...baseMetric,
  priceBand: "80_over",
  region: "東京",
  workStyle: "REMOTE",
  startMonth: "2026-06",
}, new Date("2026-06-06T00:00:00+09:00"));

assert.ok(strong.score >= 50);
assert.ok(strong.components.demandScore > 0);
assert.ok(strong.components.gapScore > 0);
assert.equal(strong.components.priceScore, 10);
assert.equal(strong.components.focusScore, 4);
assert.equal(strong.components.timingScore, 6);
assert.ok(strong.reasons.includes("案件需要が多い"));
assert.ok(strong.reasons.includes("要員供給が不足"));
assert.ok(strong.reasons.includes("高単価帯"));
assert.ok(strong.reasons.includes("注力案件を含む"));
assert.ok(strong.reasons.includes("開始月が近い"));

const nextMonth = calculateSalesPriorityScore({
  ...baseMetric,
  recruitingCount: 1,
  demandSupplyGap: 0,
  projectMedianPrice: 70,
  focusProjectCount: 0,
  priceBand: "70_80",
  region: "大阪",
  workStyle: "HYBRID",
  startMonth: "2026-07",
}, new Date("2026-06-06T00:00:00+09:00"));
assert.equal(nextMonth.components.priceScore, 6);
assert.equal(nextMonth.components.timingScore, 4);
assert.ok(nextMonth.reasons.includes("開始月が近い"));

const missing = calculateSalesPriorityScore({
  ...baseMetric,
  recruitingCount: 1,
  personCount: 2,
  demandSupplyGap: -1,
  projectMedianPrice: null,
  focusProjectCount: 0,
  qualityIssueCount: 3,
  priceBand: "unknown",
  region: "unknown",
  workStyle: "UNKNOWN",
  startMonth: "unknown",
}, new Date("2026-06-06T00:00:00+09:00"));

assert.equal(missing.components.gapScore, 0);
assert.equal(missing.components.priceScore, 0);
assert.equal(missing.components.timingScore, 0);
assert.ok(missing.components.qualityPenalty >= 9);
assert.ok(missing.score < strong.score);
assert.ok(missing.reasons.includes("単価未設定が多い"));
assert.ok(missing.reasons.includes("地域未設定が多い"));
assert.ok(missing.reasons.includes("勤務形態未設定が多い"));

console.log("scoring market-analysis tests passed");
