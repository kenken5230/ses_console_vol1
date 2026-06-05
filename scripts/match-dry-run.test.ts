import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import {
  assertNoSensitiveMatchOutput,
  buildMatchDryRunReport,
  dateCompatibility,
  locationCompatibility,
  parseMatchDryRunArgs,
  rateCompatibility,
  scoreBand,
  scoreMatch,
} from "./match-dry-run";
import type { MatchDryRunArgs, PersonMatchInput, ProjectMatchInput } from "./match-dry-run";

const requireFromTest = createRequire(import.meta.url);
const tsxCli = requireFromTest.resolve("tsx/cli");
const databaseUrlEnvName = ["DATABASE", "URL"].join("_");
const directUrlEnvName = ["DIRECT", "URL"].join("_");

const baseArgs: MatchDryRunArgs = {
  limit: 50,
  minScore: 0,
  mode: "all",
  personId: undefined,
  projectId: undefined,
};

const project: ProjectMatchInput = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "backend platform",
  summary: "api server modernization",
  workDescription: "typescript node api work",
  unitPriceMin: 80,
  unitPriceMax: 100,
  startMonth: "2026-07-01",
  workLocationText: "Tokyo",
  prefecture: "Tokyo",
  remoteType: "REMOTE",
  status: "OPEN",
  skills: [
    { skillName: "TypeScript", skillType: "REQUIRED" },
    { skillName: "Node.js", skillType: "REQUIRED" },
    { skillName: "PostgreSQL", skillType: "PREFERRED" },
    { skillName: "Next.js", skillType: "USED_TECHNOLOGY" },
  ],
};

const person: PersonMatchInput = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  summary: "backend api engineer",
  careerSummary: "typescript node api platform",
  desiredUnitPrice: 90,
  availableFrom: "2026-06-01",
  preferredLocation: "Tokyo",
  remotePreference: "remote",
  status: "AVAILABLE",
  skills: [
    { skillName: "TypeScript" },
    { skillName: "Node.js" },
    { skillName: "PostgreSQL" },
  ],
};

const weakPerson: PersonMatchInput = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  summary: "visual design",
  careerSummary: "presentation work",
  desiredUnitPrice: 140,
  availableFrom: "2026-12-01",
  preferredLocation: "Osaka",
  remotePreference: "onsite",
  status: "AVAILABLE",
  skills: [{ skillName: "Figma" }],
};

assert.deepEqual(parseMatchDryRunArgs(["node", "match-dry-run", "--limit=50"]), baseArgs);
assert.deepEqual(parseMatchDryRunArgs([
  "node",
  "match-dry-run",
  "--limit",
  "25",
  "--min-score",
  "60",
  "--mode",
  "project-to-person",
  "--project-id",
  "11111111-1111-4111-8111-111111111111",
  "--person-id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
]), {
  limit: 25,
  minScore: 60,
  mode: "project-to-person",
  projectId: "11111111-1111-4111-8111-111111111111",
  personId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
});

assert.throws(
  () => parseMatchDryRunArgs(["node", "match-dry-run", "--limit=50", "--apply"]),
  /does not accept --apply/,
);
assert.throws(
  () => parseMatchDryRunArgs(["node", "match-dry-run"]),
  /Missing required --limit/,
);
assert.throws(
  () => parseMatchDryRunArgs(["node", "match-dry-run", "--limit=501"]),
  /--limit must be <= 500/,
);

const strong = scoreMatch(project, person);
assert.equal(strong.requiredSkillOverlapCount, 2);
assert.equal(strong.niceToHaveSkillOverlapCount, 1);
assert.equal(strong.priceCompatibility, "match");
assert.equal(strong.dateCompatibility, "match");
assert.equal(strong.locationCompatibility, "match");
assert.equal(strong.scoreBand, "HIGH");
assert.ok(strong.reasonCodes.includes("MATCH_SKILL_REQUIRED_OVERLAP"));
assert.ok(strong.reasonCodes.includes("MATCH_SKILL_NICE_TO_HAVE_OVERLAP"));
assert.ok(strong.reasonCodes.includes("MATCH_RATE_COMPATIBLE"));
assert.ok(strong.reasonCodes.includes("MATCH_START_COMPATIBLE"));
assert.ok(strong.reasonCodes.includes("MATCH_LOCATION_COMPATIBLE"));
assert.ok(strong.reasonCodes.includes("MATCH_ROLE_COMPATIBLE"));

const weak = scoreMatch(project, weakPerson);
assert.equal(weak.requiredSkillOverlapCount, 0);
assert.equal(weak.priceCompatibility, "mismatch");
assert.equal(weak.dateCompatibility, "mismatch");
assert.equal(weak.locationCompatibility, "mismatch");
assert.ok(weak.score < strong.score);
assert.ok(weak.reasonCodes.includes("MATCH_RATE_MISMATCH"));

assert.equal(rateCompatibility(project, { ...person, desiredUnitPrice: null }), "unknown");
assert.equal(rateCompatibility(project, { ...person, desiredUnitPrice: 140 }), "mismatch");
assert.equal(dateCompatibility(project, { ...person, availableFrom: null }), "unknown");
assert.equal(dateCompatibility(project, { ...person, availableFrom: "2026-10-01" }), "mismatch");
assert.equal(locationCompatibility({ ...project, workLocationText: null, prefecture: null, remoteType: null }, { ...person, preferredLocation: null, remotePreference: null }), "unknown");
assert.equal(scoreBand(80), "HIGH");
assert.equal(scoreBand(60), "MEDIUM");
assert.equal(scoreBand(40), "LOW");
assert.equal(scoreBand(20), "REVIEW");
assert.equal(scoreBand(80, true), "REVIEW");

const missingProject = scoreMatch({ ...project, skills: [], unitPriceMin: null, unitPriceMax: null, startMonth: null, workLocationText: null, prefecture: null, remoteType: null }, { ...person, skills: [] });
assert.ok(missingProject.missingFieldCodes.includes("MATCH_MISSING_PROJECT_SKILLS"));
assert.ok(missingProject.missingFieldCodes.includes("MATCH_MISSING_PERSON_SKILLS"));
assert.ok(missingProject.missingFieldCodes.includes("MATCH_LOW_FIELD_COVERAGE"));
assert.ok(missingProject.missingFieldCodes.includes("MATCH_REVIEW_REQUIRED"));
assert.equal(missingProject.scoreBand, "REVIEW");

const report = buildMatchDryRunReport({
  args: { ...baseArgs, minScore: 30 },
  projects: [project],
  persons: [weakPerson, person],
  dataSource: "synthetic-fixture-no-db",
});
assert.equal(report.summary.readOnly, true);
assert.equal(report.summary.scannedProjects, 1);
assert.equal(report.summary.scannedPersons, 2);
assert.equal(report.summary.candidatePairs, 2);
assert.equal(report.summary.displayed, 1);
assert.equal(report.topMatches[0].projectShortId, "11111111");
assert.equal(report.topMatches[0].personShortId, "aaaaaaaa");
assert.equal("projectId" in report.topMatches[0], false);
assert.equal("personId" in report.topMatches[0], false);
assertNoSensitiveMatchOutput(JSON.stringify(report));

const serialized = JSON.stringify(report);
assert.equal(serialized.includes("TypeScript"), false);
assert.equal(serialized.includes("Node.js"), false);
assert.equal(serialized.includes("backend platform"), false);
assert.equal(serialized.includes("api engineer"), false);
assert.equal(serialized.includes("example.test"), false);

assert.throws(
  () => assertNoSensitiveMatchOutput(JSON.stringify({ email: "sample" + "@example.test" })),
  /Sensitive match dry-run output/,
);

const scriptSource = readFileSync("scripts/match-dry-run.ts", "utf8");
assert.doesNotMatch(scriptSource, /\b(?:project|person|proposal|distributionLog|mailNotification)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
assert.doesNotMatch(scriptSource, /\$transaction\s*\(/);
assert.doesNotMatch(scriptSource, /\b(?:fetch|sendMail|openai|anthropic)\b/i);

const output = execFileSync(process.execPath, [tsxCli, "scripts/match-dry-run.ts", "--limit=50"], {
  encoding: "utf8",
  env: {
    ...process.env,
    [databaseUrlEnvName]: "",
    [directUrlEnvName]: "",
  },
});
assertNoSensitiveMatchOutput(output);
const cliReport = JSON.parse(output);
assert.equal(cliReport.summary.dataSource, "synthetic-fixture-no-db");
assert.equal(cliReport.summary.readOnly, true);
assert.ok(cliReport.summary.candidatePairs > 0);

const rejection = spawnSync(process.execPath, [tsxCli, "scripts/match-dry-run.ts", "--limit=50", "--apply"], {
  encoding: "utf8",
  env: {
    ...process.env,
    [databaseUrlEnvName]: "",
    [directUrlEnvName]: "",
  },
});
assert.equal(rejection.status, 1);
assert.match(rejection.stderr, /does not accept --apply/);
assert.equal(rejection.stdout, "");
