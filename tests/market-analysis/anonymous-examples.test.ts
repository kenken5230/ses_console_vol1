import assert from "node:assert/strict";

import { buildMarketAnalysisResponse } from "../../lib/market-analysis/api-adapter";
import { normalizeRegion, normalizeWorkStyle } from "../../lib/market-analysis/normalize";

const dangerousProject = {
  id: "db-project-secret-id",
  title: "SECRET_PROJECT_TITLE",
  companyName: "SECRET_COMPANY",
  rawText: "SECRET_RAW_TEXT",
  sourcePayload: "SECRET_SOURCE_PAYLOAD",
  createdAt: "2026-08-20T00:00:00.000Z",
  status: "ACTIVE",
  isFocus: true,
  condition: {
    upperAmountMax: 75,
    recruitingCount: 2,
    prefecture: "譚ｱ莠ｬ驛ｽ",
    workLocationText: "貂玖ｰｷ 騾ｱ3蜃ｺ遉ｾ",
    remoteType: "UNKNOWN",
    workEnvironment: "騾ｱ3蜃ｺ遉ｾ",
    startMonth: "2026-09",
    contractType: "SEMI_DELEGATION",
  },
  skills: [
    { skillName: "Java", skillType: "REQUIRED" },
    { skillName: "AWS", skillType: "PREFERRED" },
    { skillName: "React", skillType: "USED_TECHNOLOGY" },
  ],
};

const archivedProject = {
  ...dangerousProject,
  id: "archived-project-id",
  createdAt: "2026-08-21T00:00:00.000Z",
  status: "ARCHIVED",
};

const nonFocusProject = {
  ...dangerousProject,
  id: "non-focus-project-id",
  createdAt: "2026-08-19T00:00:00.000Z",
  isFocus: false,
};

const dangerousPerson = {
  id: "db-person-secret-id",
  name: "SECRET_PERSON_NAME",
  email: "SECRET_EMAIL",
  rawText: "SECRET_RAW_TEXT",
  sourcePayload: "SECRET_SOURCE_PAYLOAD",
  createdAt: "2026-08-22T00:00:00.000Z",
  status: "ACTIVE",
  desiredUnitPrice: 75,
  preferredLocation: "譚ｱ莠ｬ",
  remotePreference: "騾ｱ3蜃ｺ遉ｾ",
  availableFrom: "2026-08-01",
  skills: [{ skillName: "Java" }, { skillName: "AWS" }],
};

const archivedPerson = {
  ...dangerousPerson,
  id: "archived-person-id",
  createdAt: "2026-08-23T00:00:00.000Z",
  status: "ARCHIVED",
};

const otherProject = {
  id: "python-project-id",
  createdAt: "2026-06-01T00:00:00.000Z",
  status: "ACTIVE",
  isFocus: true,
  condition: {
    upperAmountMax: 90,
    recruitingCount: 1,
    prefecture: "螟ｧ髦ｪ蠎・",
    workLocationText: "繝輔Ν繝ｪ繝｢繝ｼ繝・",
    remoteType: "FULL_REMOTE",
    workEnvironment: "繝輔Ν繝ｪ繝｢繝ｼ繝・",
    startMonth: "2026-06",
    contractType: "DISPATCH",
  },
  skills: [{ skillName: "Python", skillType: "REQUIRED" }],
};

const otherPerson = {
  id: "python-person-id",
  createdAt: "2026-06-02T00:00:00.000Z",
  status: "ACTIVE",
  desiredUnitPrice: 90,
  preferredLocation: "螟ｧ髦ｪ",
  remotePreference: "繝輔Ν繝ｪ繝｢繝ｼ繝・",
  availableFrom: "2026-06-01",
  skills: [{ skillName: "Python" }],
};

const matchingRegion = normalizeRegion({
  prefecture: dangerousProject.condition.prefecture,
  workLocationText: dangerousProject.condition.workLocationText,
});
const matchingWorkStyle = normalizeWorkStyle(
  dangerousProject.condition.remoteType,
  `${dangerousProject.condition.workEnvironment} ${dangerousProject.condition.workLocationText}`,
);

const response = buildMarketAnalysisResponse(
  [dangerousProject, archivedProject, nonFocusProject, otherProject],
  [dangerousPerson, archivedPerson, otherPerson],
  {
    limit: 100,
    focusOnly: true,
    fromMonth: "2026-08",
    toMonth: "2026-08",
    skill: "Java",
    region: matchingRegion,
    priceBand: "70_80",
    workStyle: matchingWorkStyle,
    contractType: "SEMI_DELEGATION",
    generatedAt: "2026-08-31T00:00:00.000Z",
  },
);

assert.equal(response.summary.projectCount, 1, "filtered response keeps one active focus project");
assert.equal(response.summary.personCount, 1, "filtered response keeps one active matching person");
const javaRanking = response.skillRankings.find((ranking) => ranking.skill === "Java");
assert.ok(javaRanking);
assert.equal(response.priceBandRankings[0].priceBand, "70_80");
assert.equal(response.regionRankings[0].region, matchingRegion);
assert.equal(response.regionRankings[0].workStyle, matchingWorkStyle);
assert.equal(response.marketCellRankings[0].contractType, "SEMI_DELEGATION");

const skillExamples = javaRanking.anonymousExamples;
assert.equal(skillExamples.projects.length, 1, "skill examples include one project");
assert.equal(skillExamples.persons.length, 1, "skill examples include one person");
assert.deepEqual(skillExamples.projects[0], {
  kind: "project",
  anonymousId: "PJ-001",
  registeredMonth: "2026-08",
  priceBand: "70_80",
  region: matchingRegion,
  workStyle: matchingWorkStyle,
  skillCount: 3,
  requiredSkillCount: 1,
  preferredSkillCount: 1,
  usedTechnologySkillCount: 1,
  isFocus: true,
  status: "ACTIVE",
});
assert.deepEqual(skillExamples.persons[0], {
  kind: "person",
  anonymousId: "PS-001",
  registeredMonth: "2026-08",
  priceBand: "70_80",
  region: matchingRegion,
  workStyle: matchingWorkStyle,
  skillCount: 2,
  requiredSkillCount: 0,
  preferredSkillCount: 0,
  usedTechnologySkillCount: 0,
  status: "ACTIVE",
});

const responseJson = JSON.stringify(response);
for (const forbidden of [
  "SECRET_PROJECT_TITLE",
  "SECRET_PERSON_NAME",
  "SECRET_COMPANY",
  "SECRET_EMAIL",
  "SECRET_RAW_TEXT",
  "SECRET_SOURCE_PAYLOAD",
]) {
  assert.equal(responseJson.includes(forbidden), false, `${forbidden} leaked`);
}

const exampleJson = JSON.stringify([
  ...response.skillRankings.map((ranking) => ranking.anonymousExamples),
  ...response.priceBandRankings.map((ranking) => ranking.anonymousExamples),
  ...response.regionRankings.map((ranking) => ranking.anonymousExamples),
  ...response.marketCellRankings.map((ranking) => ranking.anonymousExamples),
]);
for (const forbidden of [
  "db-project-secret-id",
  "db-person-secret-id",
  "archived-project-id",
  "archived-person-id",
  "non-focus-project-id",
]) {
  assert.equal(exampleJson.includes(forbidden), false, `${forbidden} leaked from anonymous examples`);
}

const manyProjects = Array.from({ length: 7 }, (_, index) => ({
  ...dangerousProject,
  id: `many-project-${index}`,
  createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
}));
const manyPersons = Array.from({ length: 7 }, (_, index) => ({
  ...dangerousPerson,
  id: `many-person-${index}`,
  createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
}));
const limitedResponse = buildMarketAnalysisResponse(manyProjects, manyPersons, {
  limit: 100,
  skill: "Java",
});
const limitedJavaRanking = limitedResponse.skillRankings.find((ranking) => ranking.skill === "Java");
assert.ok(limitedJavaRanking);
assert.equal(limitedJavaRanking.anonymousExamples.projects.length, 5);
assert.equal(limitedJavaRanking.anonymousExamples.persons.length, 5);
assert.deepEqual(
  limitedJavaRanking.anonymousExamples.projects.map((example) => example.anonymousId),
  ["PJ-001", "PJ-002", "PJ-003", "PJ-004", "PJ-005"],
);
assert.deepEqual(
  limitedJavaRanking.anonymousExamples.persons.map((example) => example.anonymousId),
  ["PS-001", "PS-002", "PS-003", "PS-004", "PS-005"],
);
assert.equal(JSON.stringify(limitedJavaRanking.anonymousExamples).includes("many-project-0"), false);
assert.equal(JSON.stringify(limitedJavaRanking.anonymousExamples).includes("many-person-0"), false);

const baseWithoutExamples = buildMarketAnalysisResponse([dangerousProject], [dangerousPerson], { limit: 100 });
const sameInputWithExamples = buildMarketAnalysisResponse([dangerousProject], [dangerousPerson], { limit: 100 });
assert.equal(sameInputWithExamples.skillRankings[0].projectCount, baseWithoutExamples.skillRankings[0].projectCount);
assert.equal(sameInputWithExamples.skillRankings[0].personCount, baseWithoutExamples.skillRankings[0].personCount);
assert.equal(sameInputWithExamples.skillRankings[0].recruitingCount, baseWithoutExamples.skillRankings[0].recruitingCount);
assert.equal(sameInputWithExamples.skillRankings[0].demandSupplyGap, baseWithoutExamples.skillRankings[0].demandSupplyGap);

console.log("anonymous market-analysis example tests passed");
