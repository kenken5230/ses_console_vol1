import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import {
  assertNoSensitiveNotionOutput,
  buildNotionImportDryRunReport,
  parseNotionImportDryRunArgs,
} from "./notion-import-dry-run";

const projectCsv = readFileSync("tests/fixtures/notion-import/synthetic-projects.csv", "utf8");
const personCsv = readFileSync("tests/fixtures/notion-import/synthetic-persons.csv", "utf8");
const requireFromTest = createRequire(import.meta.url);
const tsxCli = requireFromTest.resolve("tsx/cli");

assert.deepEqual(parseNotionImportDryRunArgs(["node", "notion-import", "--file=synthetic.csv", "--type=project"]), {
  file: "synthetic.csv",
  type: "project",
  limit: 100,
});

assert.deepEqual(parseNotionImportDryRunArgs(["node", "notion-import", "--file", "synthetic.csv", "--type", "person", "--limit", "25"]), {
  file: "synthetic.csv",
  type: "person",
  limit: 25,
});

assert.throws(
  () => parseNotionImportDryRunArgs(["node", "notion-import", "--file=synthetic.csv", "--type=project", "--apply"]),
  /rejects --apply/,
);

assert.throws(
  () => parseNotionImportDryRunArgs(["node", "notion-import", "--file=synthetic.csv", "--type=project", "--limit=0"]),
  /--limit must be an integer from 1 to 1000/,
);

assert.throws(
  () => parseNotionImportDryRunArgs(["node", "notion-import", "--file=synthetic.csv", "--type=project", "--limit=1001"]),
  /--limit must be an integer from 1 to 1000/,
);

assert.throws(
  () => parseNotionImportDryRunArgs(["node", "notion-import", "--file=synthetic.csv", "--type=company"]),
  /--type must be project, person, or auto/,
);

function runNotionDryRunCli(args: string[]) {
  const output = execFileSync(process.execPath, [tsxCli, "scripts/notion-import-dry-run.ts", ...args], {
    encoding: "utf8",
  });
  const jsonStart = output.indexOf("{");
  const jsonEnd = output.lastIndexOf("}");
  assert.ok(jsonStart >= 0 && jsonEnd > jsonStart);
  return JSON.parse(output.slice(jsonStart, jsonEnd + 1));
}

const projectReport = buildNotionImportDryRunReport({
  csvText: projectCsv,
  type: "project",
  fileIdentity: "synthetic-projects.csv",
});

assert.equal(projectReport.summary.readOnly, true);
assert.equal(projectReport.summary.dbAccess, false);
assert.equal(projectReport.summary.sourceType, "notion_csv");
assert.equal(projectReport.summary.parsedRows, 2);
assert.ok(projectReport.mappedColumns.some((column) => column.target.model === "Project" && column.target.field === "title"));
assert.ok(projectReport.mappedColumns.some((column) => column.target.model === "ProjectCondition" && column.target.field === "unitPriceText"));
assert.ok(projectReport.unmappedColumns.some((column) => column.columnName === "未使用列"));
assert.equal(projectReport.targetFieldCoverage["Project.title"].mapped, true);
assert.equal(projectReport.targetFieldCoverage["Project.title"].presentRows, 1);
assert.equal(projectReport.targetFieldCoverage["ProjectSkill.skillName"].presentRows, 1);
assert.equal(projectReport.rows[0].rowNumber, 2);
assert.equal(projectReport.rows[0].action, "would_create");
assert.deepEqual(projectReport.rows[0].reviewReasons, []);
assert.equal(projectReport.rows[0].targetPreview.model, "Project");
assert.equal(projectReport.rows[0].targetPreview.counts.skillCount, 3);
assert.equal(projectReport.rows[1].action, "would_need_review");
assert.ok(projectReport.rows[1].reviewReasons.includes("NOTION_MISSING_REQUIRED_FIELD"));
assert.ok(projectReport.rows[1].reviewReasons.includes("NOTION_INVALID_AMOUNT"));
assert.ok(projectReport.rows[1].reviewReasons.includes("NOTION_INVALID_DATE"));
assert.ok(projectReport.rows[1].reviewReasons.includes("NOTION_UNMAPPED_VALUE_PRESENT"));

const personReport = buildNotionImportDryRunReport({
  csvText: personCsv,
  type: "person",
  fileIdentity: "synthetic-persons.csv",
});

assert.equal(personReport.summary.readOnly, true);
assert.equal(personReport.summary.dbAccess, false);
assert.equal(personReport.summary.sourceType, "notion_csv");
assert.ok(personReport.mappedColumns.some((column) => column.target.model === "Person" && column.target.field === "name"));
assert.ok(personReport.mappedColumns.some((column) => column.target.model === "PersonSkill" && column.target.field === "skillName"));
assert.equal(personReport.targetFieldCoverage["Person.name"].presentRows, 1);
assert.equal(personReport.targetFieldCoverage["PersonSkill.skillName"].presentRows, 1);
assert.equal(personReport.rows[0].action, "would_create");
assert.equal(personReport.rows[0].targetPreview.model, "Person");
assert.equal(personReport.rows[0].targetPreview.counts.skillCount, 2);
assert.equal(personReport.rows[1].action, "would_need_review");
assert.ok(personReport.rows[1].reviewReasons.includes("NOTION_MISSING_REQUIRED_FIELD"));
assert.ok(personReport.rows[1].reviewReasons.includes("NOTION_INVALID_AMOUNT"));
assert.ok(personReport.rows[1].reviewReasons.includes("NOTION_INVALID_DATE"));
assert.ok(personReport.rows[1].reviewReasons.includes("NOTION_INVALID_AGE"));
assert.ok(personReport.rows[1].reviewReasons.includes("NOTION_PERSON_FOCUS_REVIEW_ONLY"));

const autoProjectReport = buildNotionImportDryRunReport({
  csvText: projectCsv,
  type: "auto",
  fileIdentity: "synthetic-projects.csv",
});
assert.equal(autoProjectReport.summary.resolvedType, "project");
assert.equal(autoProjectReport.typeDetection.detectedType, "project");

const ambiguousReport = buildNotionImportDryRunReport({
  csvText: "スキル,ステータス,注力\nJava,OPEN,該当\n",
  type: "auto",
  fileIdentity: "synthetic-auto-ambiguous.csv",
});
assert.equal(ambiguousReport.summary.resolvedType, "review");
assert.equal(ambiguousReport.rows[0].action, "would_need_review");
assert.ok(ambiguousReport.rows[0].reviewReasons.includes("NOTION_AUTO_TYPE_AMBIGUOUS"));

const skipReport = buildNotionImportDryRunReport({
  csvText: "案件名,作業内容,スキル\n,,\nSynthetic Skip Anchor,Build,Java\n",
  type: "project",
  fileIdentity: "synthetic-skip-row.csv",
});
assert.equal(skipReport.rows[0].action, "would_skip");
assert.ok(skipReport.rows[0].reviewReasons.includes("NOTION_EMPTY_ROW"));

const cliReport = runNotionDryRunCli([
  "--file=tests/fixtures/notion-import/synthetic-projects.csv",
  "--type=project",
  "--limit=1",
]);
assert.equal(cliReport.summary.parsedRows, 1);
assert.equal(cliReport.rows.length, 1);
assert.equal(cliReport.summary.readOnly, true);
assert.equal(cliReport.summary.dbAccess, false);

const applyRejection = spawnSync(process.execPath, [
  tsxCli,
  "scripts/notion-import-dry-run.ts",
  "--file=tests/fixtures/notion-import/synthetic-projects.csv",
  "--type=project",
  "--apply",
], { encoding: "utf8" });
assert.notEqual(applyRejection.status, 0);
const applyJson = JSON.parse(applyRejection.stdout);
assert.equal(applyJson.summary.readOnly, true);
assert.equal(applyJson.summary.dbAccess, false);
assert.match(applyJson.error.message, /rejects --apply/);

const localPathHeader = "C:" + "\\Users\\Owner\\secret.csv";
const longRawValue = "LONG_RAW_SENTINEL_".repeat(20);
const sensitiveCsv = [
  `案件名,作業内容,スキル,${localPathHeader}`,
  `Synthetic Secret,DATABASE_URL=postgres://user:pass@example.invalid/db,"Java,SQL",${longRawValue}`,
].join("\n");
const sensitiveOutput = JSON.stringify(buildNotionImportDryRunReport({
  csvText: sensitiveCsv,
  type: "project",
  fileIdentity: localPathHeader,
}));
assertNoSensitiveNotionOutput(sensitiveOutput);
assert.equal(sensitiveOutput.includes("DATABASE_URL"), false);
assert.equal(sensitiveOutput.includes("postgres://"), false);
assert.equal(sensitiveOutput.includes("example.invalid"), false);
assert.equal(sensitiveOutput.includes(localPathHeader), false);
assert.equal(sensitiveOutput.includes(longRawValue), false);
assert.equal(sensitiveOutput.includes("Synthetic Secret"), false);

const scriptSource = readFileSync("scripts/notion-import-dry-run.ts", "utf8");
assert.doesNotMatch(scriptSource, /\bprisma\.(?:project|person|importSource|importRun|sourceRecord|entitySourceLink)?\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/i);
assert.doesNotMatch(scriptSource, /from\s+["']\.\.\/lib\/prisma["']/);
assert.doesNotMatch(scriptSource, /\bfetch\s*\(/);
assert.doesNotMatch(scriptSource, /api\.notion\.com|@notionhq|NotionAPI/i);
assert.doesNotMatch(scriptSource, /\b(?:OpenAI|Anthropic)\b/i);
assert.doesNotMatch(scriptSource, /\b(?:sendMail|nodemailer)\b/i);

console.log("notion import dry-run tests passed");
