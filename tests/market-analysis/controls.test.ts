import assert from "node:assert/strict";

import { aggregatePriceBandMarket } from "../../lib/market-analysis/aggregate";
import { buildMarketAnalysisResponse, parseMarketAnalysisQuery } from "../../lib/market-analysis/api-adapter";
import { toPriceBand } from "../../lib/market-analysis/normalize";

const fixedNow = new Date("2026-06-17T00:00:00.000Z");
const defaultQuery = parseMarketAnalysisQuery(new URLSearchParams(), fixedNow);
assert.equal(defaultQuery.limit, undefined);
assert.equal(defaultQuery.fromMonth, "2026-04");
assert.equal(defaultQuery.toMonth, "2026-06");

const limitedQuery = parseMarketAnalysisQuery(new URLSearchParams("limit=100"), fixedNow);
assert.equal(limitedQuery.limit, 100);
assert.equal(limitedQuery.fromMonth, "2026-04");
assert.equal(limitedQuery.toMonth, "2026-06");

const blankLimitQuery = parseMarketAnalysisQuery(new URLSearchParams("limit="), fixedNow);
assert.equal(blankLimitQuery.limit, undefined);

const legacyPriceBandMappings = [
  ["under_50", "45_50"],
  ["50_60", "50_55"],
  ["60_70", "60_65"],
  ["70_80", "70_75"],
  ["80_over", "80_85"],
  ["over_80", "80_85"],
];
for (const [legacyKey, expectedPriceBand] of legacyPriceBandMappings) {
  const query = parseMarketAnalysisQuery(new URLSearchParams(`priceBand=${legacyKey}`), fixedNow);
  assert.equal(query.priceBand, expectedPriceBand);
}

assert.equal(toPriceBand(25), "under_30");
assert.equal(toPriceBand(30), "under_30");
assert.equal(toPriceBand(34), "30_35");
assert.equal(toPriceBand(119), "115_120");
assert.equal(toPriceBand(120), "120_over");
assert.equal(toPriceBand(null), "unknown");

const priceBandRankings = aggregatePriceBandMarket([
  { id: "high", recruitingCount: 120, unitPriceMin: 120 },
  { id: "low", recruitingCount: 1, unitPriceMin: 25 },
  { id: "middle", recruitingCount: 80, unitPriceMin: 70 },
  { id: "unknown", recruitingCount: 999, unitPriceMin: null },
], []);
assert.deepEqual(
  priceBandRankings.map((ranking) => ranking.priceBand),
  ["under_30", "70_75", "120_over", "unknown"],
);

const response = buildMarketAnalysisResponse([], [], {
  cumulativeFocusProjectCount: 7,
  cumulativeFromMonth: "2026-01",
  cumulativePersonCount: 23,
  cumulativeProjectCount: 42,
});
assert.equal(response.summary.projectCount, 42);
assert.equal(response.summary.personCount, 23);
assert.equal(response.summary.focusProjectCount, 7);
assert.equal(response.summary.sampleProjectCount, 0);
assert.equal(response.summary.cumulativeFromMonth, "2026-01");
assert.equal(response.summary.limit, null);

console.log("market-analysis controls tests passed");
