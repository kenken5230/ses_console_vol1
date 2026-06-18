import assert from "node:assert/strict";

import { aggregatePriceBandMarket } from "../../lib/market-analysis/aggregate";
import { buildMarketAnalysisResponse, parseMarketAnalysisQuery } from "../../lib/market-analysis/api-adapter";
import { toPriceBand } from "../../lib/market-analysis/normalize";

const fixedNow = new Date("2026-06-17T00:00:00.000Z");

function priceBandQuery(priceBand: string) {
  return parseMarketAnalysisQuery(new URLSearchParams({ priceBand }), fixedNow);
}

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

const legacyUnder50PriceBands = ["under_30", "30_35", "35_40", "40_45", "45_50"];
const legacyOver80PriceBands = [
  "80_85",
  "85_90",
  "90_95",
  "95_100",
  "100_105",
  "105_110",
  "110_115",
  "115_120",
  "120_over",
];

const under50Query = priceBandQuery("under_50");
assert.deepEqual(under50Query.priceBand, legacyUnder50PriceBands);

const range50To60Query = priceBandQuery("50_60");
assert.deepEqual(range50To60Query.priceBand, ["50_55", "55_60"]);

const range60To70Query = priceBandQuery("60_70");
assert.deepEqual(range60To70Query.priceBand, ["60_65", "65_70"]);

const range70To80Query = priceBandQuery("70_80");
assert.deepEqual(range70To80Query.priceBand, ["70_75", "75_80"]);

const legacy80OverQuery = priceBandQuery("80_over");
assert.deepEqual(legacy80OverQuery.priceBand, legacyOver80PriceBands);

const over80Query = priceBandQuery("over_80");
assert.deepEqual(over80Query.priceBand, legacyOver80PriceBands);

const newPriceBandQuery = priceBandQuery("80_85");
assert.equal(newPriceBandQuery.priceBand, "80_85");

const priceBandRows = [
  { id: "p25", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 25, recruitingCount: 1 } },
  { id: "p34", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 34, recruitingCount: 1 } },
  { id: "p37", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 37, recruitingCount: 1 } },
  { id: "p42", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 42, recruitingCount: 1 } },
  { id: "p47", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 47, recruitingCount: 1 } },
  { id: "p52", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 52, recruitingCount: 1 } },
  { id: "p58", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 58, recruitingCount: 1 } },
  { id: "p62", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 62, recruitingCount: 1 } },
  { id: "p67", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 67, recruitingCount: 1 } },
  { id: "p72", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 72, recruitingCount: 1 } },
  { id: "p76", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 76, recruitingCount: 1 } },
  { id: "p82", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 82, recruitingCount: 1 } },
  { id: "p88", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 88, recruitingCount: 1 } },
  { id: "p121", createdAt: "2026-05-01T00:00:00.000Z", condition: { unitPriceMin: 121, recruitingCount: 1 } },
];

const under50Response = buildMarketAnalysisResponse(priceBandRows, [], under50Query);
assert.equal(under50Response.summary.sampleProjectCount, 5);
assert.deepEqual(
  under50Response.priceBandRankings.map((ranking) => ranking.priceBand),
  legacyUnder50PriceBands,
);

const range50To60Response = buildMarketAnalysisResponse(priceBandRows, [], range50To60Query);
assert.equal(range50To60Response.summary.sampleProjectCount, 2);
assert.deepEqual(
  range50To60Response.priceBandRankings.map((ranking) => ranking.priceBand),
  ["50_55", "55_60"],
);

const range60To70Response = buildMarketAnalysisResponse(priceBandRows, [], range60To70Query);
assert.equal(range60To70Response.summary.sampleProjectCount, 2);
assert.deepEqual(
  range60To70Response.priceBandRankings.map((ranking) => ranking.priceBand),
  ["60_65", "65_70"],
);

const range70To80Response = buildMarketAnalysisResponse(priceBandRows, [], range70To80Query);
assert.equal(range70To80Response.summary.sampleProjectCount, 2);
assert.deepEqual(
  range70To80Response.priceBandRankings.map((ranking) => ranking.priceBand),
  ["70_75", "75_80"],
);

const legacy80OverResponse = buildMarketAnalysisResponse(priceBandRows, [], legacy80OverQuery);
assert.equal(legacy80OverResponse.summary.sampleProjectCount, 3);
assert.deepEqual(
  legacy80OverResponse.priceBandRankings.map((ranking) => ranking.priceBand),
  ["80_85", "85_90", "120_over"],
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
