import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { aggregatePriceBandMarket } from "../../lib/market-analysis/aggregate";
import {
  MARKET_ANALYSIS_DEFAULT_LIMIT,
  MARKET_ANALYSIS_MAX_LIMIT,
  buildCreatedAtWhere,
  buildMarketAnalysisResponse,
  parseMarketAnalysisQuery,
} from "../../lib/market-analysis/api-adapter";
import { toPriceBand } from "../../lib/market-analysis/normalize";
import { normalizeMarketAnalysisLimitInput, visibleMarketRankingRows } from "../../lib/market-analysis/ui-controls";

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

const invalidLimitQuery = parseMarketAnalysisQuery(new URLSearchParams("limit=not-a-number"), fixedNow);
assert.equal(invalidLimitQuery.limit, MARKET_ANALYSIS_DEFAULT_LIMIT);

const decimalLimitQuery = parseMarketAnalysisQuery(new URLSearchParams("limit=12.9"), fixedNow);
assert.equal(decimalLimitQuery.limit, 12);

const underMinLimitQuery = parseMarketAnalysisQuery(new URLSearchParams("limit=0"), fixedNow);
assert.equal(underMinLimitQuery.limit, MARKET_ANALYSIS_DEFAULT_LIMIT);

const overMaxLimitQuery = parseMarketAnalysisQuery(new URLSearchParams("limit=1001"), fixedNow);
assert.equal(overMaxLimitQuery.limit, MARKET_ANALYSIS_MAX_LIMIT);

assert.equal(normalizeMarketAnalysisLimitInput(""), "");
assert.equal(normalizeMarketAnalysisLimitInput("0"), "1");
assert.equal(normalizeMarketAnalysisLimitInput("1"), "1");
assert.equal(normalizeMarketAnalysisLimitInput("1000"), "1000");
assert.equal(normalizeMarketAnalysisLimitInput("1001"), "1000");
assert.equal(normalizeMarketAnalysisLimitInput("12.9"), "12");
assert.equal(normalizeMarketAnalysisLimitInput("not-a-number", "100"), "100");

const explicitMonthQuery = parseMarketAnalysisQuery(new URLSearchParams("fromMonth=2026-02&toMonth=2026-04"), fixedNow);
assert.equal(explicitMonthQuery.fromMonth, "2026-02");
assert.equal(explicitMonthQuery.toMonth, "2026-04");

const reversedMonthQuery = parseMarketAnalysisQuery(new URLSearchParams("fromMonth=2026-09&toMonth=2026-07"), fixedNow);
assert.equal(reversedMonthQuery.fromMonth, "2026-07");
assert.equal(reversedMonthQuery.toMonth, "2026-09");

const invalidMonthQuery = parseMarketAnalysisQuery(new URLSearchParams("fromMonth=2026-13&toMonth=2026-00"), fixedNow);
assert.equal(invalidMonthQuery.fromMonth, "2026-04");
assert.equal(invalidMonthQuery.toMonth, "2026-06");

const fromOnlyWhere = buildCreatedAtWhere({ fromMonth: "2026-02" });
assert.equal(fromOnlyWhere?.gte?.toISOString(), "2026-02-01T00:00:00.000Z");
assert.equal("lt" in (fromOnlyWhere ?? {}), false);

const toOnlyWhere = buildCreatedAtWhere({ toMonth: "2026-04" });
assert.equal("gte" in (toOnlyWhere ?? {}), false);
assert.equal(toOnlyWhere?.lt?.toISOString(), "2026-05-01T00:00:00.000Z");

const closedRangeWhere = buildCreatedAtWhere({ fromMonth: "2026-02", toMonth: "2026-04" });
assert.equal(closedRangeWhere?.gte?.toISOString(), "2026-02-01T00:00:00.000Z");
assert.equal(closedRangeWhere?.lt?.toISOString(), "2026-05-01T00:00:00.000Z");

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

const allPriceBandRows = Array.from({ length: 21 }, (_, index) => ({ priceBand: index === 20 ? "unknown" : `band_${index}` }));
assert.equal(visibleMarketRankingRows(allPriceBandRows).length, 20);
assert.equal(visibleMarketRankingRows(allPriceBandRows, null).length, 21);
assert.equal(visibleMarketRankingRows(allPriceBandRows, null).at(-1)?.priceBand, "unknown");
assert.equal(visibleMarketRankingRows(allPriceBandRows, 2.9).length, 2);
assert.equal(visibleMarketRankingRows(allPriceBandRows, 0).length, 0);
assert.equal(visibleMarketRankingRows(allPriceBandRows, Number.NaN).length, 0);

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

const routeSource = readFileSync("app/api/market-analysis/route.ts", "utf8");
assert.match(routeSource, /parseMarketAnalysisQuery\(new URL\(request\.url\)\.searchParams\)/);
assert.match(routeSource, /buildCreatedAtWhere\(query\)/);
assert.match(routeSource, /\.\.\.\(query\.limit \? \{ take: query\.limit \} : \{\}\)/);
assert.match(routeSource, /orderBy: \{ createdAt: "desc" as const \}/);
assert.match(routeSource, /createdAt: cumulativeCreatedAtWhere/);

const pageSource = readFileSync("app/market-analysis/page.jsx", "utf8");
assert.match(pageSource, /const DEFAULT_LIMIT = "100"/);
assert.match(pageSource, /normalizeMarketAnalysisLimitInput\(value, DEFAULT_LIMIT\)/);
assert.match(pageSource, /if \(limit\.trim\(\)\) params\.set\("limit", limit\.trim\(\)\)/);
assert.match(pageSource, /appendOptionalParam\(params, "fromMonth", filters\.fromMonth\)/);
assert.match(pageSource, /appendOptionalParam\(params, "toMonth", filters\.toMonth\)/);
assert.match(pageSource, /appendOptionalParam\(params, "priceBand", filters\.priceBand\)/);
assert.match(pageSource, /rowLimit=\{null\}/);

const filterBarSource = readFileSync("components/market-analysis/MarketFilterBar.jsx", "utf8");
assert.match(filterBarSource, /min="1"/);
assert.match(filterBarSource, /max="1000"/);
assert.match(filterBarSource, /onChange=\{\(event\) => onLimitChange\(normalizeMarketAnalysisLimitInput\(event\.target\.value\)\)\}/);
assert.match(filterBarSource, /PRICE_BAND_LEGACY_LABELS/);

const rankingTableSource = readFileSync("components/market-analysis/MarketRankingTable.jsx", "utf8");
assert.match(rankingTableSource, /rowLimit = MARKET_ANALYSIS_VISIBLE_RANKING_LIMIT/);
assert.match(rankingTableSource, /visibleMarketRankingRows\(rows, rowLimit\)/);

console.log("market-analysis controls tests passed");
