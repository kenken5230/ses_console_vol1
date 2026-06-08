import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  MARKET_ANALYSIS_MAX_LIMIT,
  buildFocusInsights,
  buildMarketAnalysisResponse,
  marketPersonFromDb,
  marketProjectFromDb,
  parseMarketAnalysisQuery,
} from "../../lib/market-analysis/api-adapter";

const project = marketProjectFromDb({
  id: "project-1",
  isFocus: true,
  condition: {
    unitPriceMin: 70,
    unitPriceMax: 80,
    upperAmountMin: 75,
    upperAmountMax: 90,
    recruitingCount: 3,
    prefecture: "東京都",
    workLocationText: "品川 常駐",
    remoteType: "UNKNOWN",
    workEnvironment: "週3出社",
    startMonth: new Date("2026-07-01T00:00:00.000Z"),
    contractType: "SEMI_DELEGATION",
  },
  skills: [
    { skillName: "JAVA", skillType: "REQUIRED", yearsRequired: { toNumber: () => 3.5 } },
    { skillName: "AWS", skillType: "PREFERRED", yearsRequired: "2" },
  ],
});

assert.equal(project.id, "project-1");
assert.equal("title" in project, false);
assert.equal(project.isFocus, true);
assert.equal(project.unitPriceMax, 80);
assert.equal(project.upperAmountMax, 90);
assert.equal(project.recruitingCount, 3);
assert.equal(project.prefecture, "東京都");
assert.equal(project.workLocationText, "品川 常駐");
assert.equal(project.remoteType, "UNKNOWN");
assert.equal(project.workStyleText, "週3出社");
assert.equal(project.startMonth instanceof Date, true);
assert.equal(project.contractType, "SEMI_DELEGATION");
assert.equal(project.skills?.[0].skillName, "JAVA");
assert.equal(project.skills?.[0].skillType, "REQUIRED");
assert.equal(project.skills?.[0].years, 3.5);
assert.equal(project.skills?.[1].years, 2);

const sparseProject = marketProjectFromDb({
  id: "project-2",
  condition: null,
  skills: null,
});
assert.equal(sparseProject.unitPriceMax, null);
assert.equal(sparseProject.prefecture, null);
assert.equal(sparseProject.remoteType, null);
assert.equal(sparseProject.startMonth, null);
assert.deepEqual(sparseProject.skills, []);

const person = marketPersonFromDb({
  id: "person-1",
  desiredUnitPrice: 80,
  availableFrom: new Date("2026-06-01T00:00:00.000Z"),
  preferredLocation: "東京",
  remotePreference: "常駐",
  skills: [{ skillName: "Java", years: { toNumber: () => 4 } }],
});
assert.equal(person.id, "person-1");
assert.equal("name" in person, false);
assert.equal(person.desiredUnitPrice, 80);
assert.equal(person.availableFrom instanceof Date, true);
assert.equal(person.preferredLocation, "東京");
assert.equal(person.remotePreference, "常駐");
assert.equal(person.skills?.[0].skillName, "Java");
assert.equal(person.skills?.[0].years, 4);

const sparsePerson = marketPersonFromDb({
  id: "person-2",
  skills: null,
});
assert.equal(sparsePerson.desiredUnitPrice, null);
assert.equal(sparsePerson.availableFrom, null);
assert.equal(sparsePerson.preferredLocation, null);
assert.deepEqual(sparsePerson.skills, []);

assert.deepEqual(parseMarketAnalysisQuery(new URLSearchParams("")), {
  limit: MARKET_ANALYSIS_MAX_LIMIT,
  focusOnly: false,
});
assert.deepEqual(parseMarketAnalysisQuery(new URLSearchParams("limit=25&focusOnly=true")), {
  limit: 25,
  focusOnly: true,
});
assert.deepEqual(parseMarketAnalysisQuery(new URLSearchParams("limit=99999&focusOnly=1")), {
  limit: MARKET_ANALYSIS_MAX_LIMIT,
  focusOnly: true,
});

const response = buildMarketAnalysisResponse(
  [{
    id: "project-1",
    isFocus: true,
    condition: {
      upperAmountMax: 90,
      recruitingCount: 3,
      prefecture: "東京都",
      workLocationText: "品川 常駐",
      remoteType: "UNKNOWN",
      workEnvironment: "週3出社",
      startMonth: "2026-07",
      contractType: "SEMI_DELEGATION",
    },
    skills: [{ skillName: "Java", skillType: "REQUIRED" }],
  }],
  [{
    id: "person-1",
    desiredUnitPrice: 90,
    preferredLocation: "東京",
    remotePreference: "一部リモート",
    availableFrom: "2026-06-01",
    skills: [{ skillName: "Java" }],
  }],
  { limit: 25, focusOnly: true, generatedAt: "2026-06-08T00:00:00.000Z" },
);

assert.equal(response.summary.projectCount, 1);
assert.equal(response.summary.personCount, 1);
assert.equal(response.summary.focusProjectCount, 1);
assert.equal(response.summary.limit, 25);
assert.equal(response.summary.focusOnly, true);
assert.equal(response.generatedAt, "2026-06-08T00:00:00.000Z");
assert.equal(response.skillRankings[0].skill, "Java");
assert.equal(response.priceBandRankings[0].priceBand, "80_over");
assert.ok(response.regionRankings.some((metric) => metric.region === "東京"));
assert.ok(response.marketCellRankings.length > 0);
assert.ok(Array.isArray(response.qualityAlerts));

const insights = buildFocusInsights(response);
assert.equal(insights.topSkill, "Java");
assert.equal(insights.topPriceBand, "80_over");
assert.equal(insights.topRegion, "東京");

const routeSource = readFileSync("app/api/market-analysis/route.ts", "utf8");
assert.doesNotMatch(routeSource, /matchSuggestion/i);
assert.doesNotMatch(routeSource, /\b(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
assert.doesNotMatch(routeSource, /\$executeRaw|\$queryRaw|db push|migrate deploy|seed/i);
assert.match(routeSource, /ProjectStatus\.ARCHIVED/);
assert.match(routeSource, /PersonStatus\.ARCHIVED/);

console.log("market analysis api adapter tests passed");
