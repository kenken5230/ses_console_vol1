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

const over80Query = parseMarketAnalysisQuery(new URLSearchParams("priceBand=over_80"), fixedNow);
assert.deepEqual(over80Query.priceBand, [
  "80_85",
  "85_90",
  "90_95",
  "95_100",
  "100_105",
  "105_110",
  "110_115",
  "115_120",
  "120_over",
]);

const range50To60Query = parseMarketAnalysisQuery(new URLSearchParams("priceBand=50_60"), fixedNow);
assert.deepEqual(range50To60Query.priceBand, ["50_55", "55_60"]);

const newPriceBandQuery = parseMarketAnalysisQuery(new URLSearchParams("priceBand=80_85"), fixedNow);
assert.equal(newPriceBandQuery.priceBand, "80_85");

const priceBandRows = [
  { id: "p52", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 52, recruitingCount: 1 } },
  { id: "p58", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 58, recruitingCount: 1 } },
  { id: "p62", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 62, recruitingCount: 1 } },
  { id: "p82", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 82, recruitingCount: 1 } },
  { id: "p88", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 88, recruitingCount: 1 } },
  { id: "p121", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 121, recruitingCount: 1 } },
];

const range50To60Response = buildMarketAnalysisResponse(priceBandRows, [], range50To60Query);
assert.equal(range50To60Response.summary.sampleProjectCount, 2);
assert.deepEqual(
  range50To60Response.priceBandRankings.map((ranking) => ranking.priceBand),
  ["50_55", "55_60"],
);

const over80Response = buildMarketAnalysisResponse(priceBandRows, [], over80Query);
assert.equal(over80Response.summary.sampleProjectCount, 3);
assert.deepEqual(
  over80Response.priceBandRankings.map((ranking) => ranking.priceBand),
  ["80_85", "85_90", "120_over"],
);

const newPriceBandResponse = buildMarketAnalysisResponse(priceBandRows, [], newPriceBandQuery);
assert.equal(newPriceBandResponse.summary.sampleProjectCount, 1);
assert.deepEqual(
  newPriceBandResponse.priceBandRankings.map((ranking) => ranking.priceBand),
  ["80_85"],
);

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
