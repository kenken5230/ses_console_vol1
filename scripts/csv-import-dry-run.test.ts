import assert from "node:assert/strict";

import {
  assertNoSensitiveCsvOutput,
  buildCsvDryRunReport,
  parseCsv,
  parseCsvDryRunArgs,
} from "./csv-import-dry-run";

const projectCsv = [
  "案件名,会社名,作業内容,必須スキル,単価,開始月,勤務地,未使用列",
  "Synthetic Alpha Project,Synthetic Client Alpha,Build internal workflow,\"Java,Spring,AWS\",85万,2026-04,Remote,fixture-only",
  "Synthetic Alpha Project,Synthetic Client Alpha,Build internal workflow,\"Java,Spring,AWS\",85万,2026-04,Remote,duplicate-fixture",
  "Synthetic Beta Project,Synthetic Client Beta,Support operations,\"Linux,SQL\",invalid-price,not-a-date,Tokyo,fixture-only",
  ",Synthetic Client Gamma,,\"\",70万,2026-05,Osaka,missing-fields",
  "Synthetic Clean Project,Synthetic Client Delta,Build reporting workflow,\"TypeScript,PostgreSQL\",90万,2026-07,Hybrid,clean-fixture",
].join("\n");

const personCsv = [
  "氏名,イニシャル,スキル,職種,稼働開始,希望単価,所属会社,最寄駅,未使用列",
  "Synthetic Person One,S.P,\"Java,Spring\",Backend Engineer,2026-04,75万,Synthetic Partner Alpha,Synthetic Station,fixture-only",
  "Synthetic Person One,S.P,\"Java,Spring\",Backend Engineer,2026-04,75万,Synthetic Partner Alpha,Synthetic Station,duplicate-fixture",
  ",A.B,\"PM,SQL\",Project Manager,bad-date,invalid-price,Synthetic Partner Beta,Synthetic Station,fixture-only",
  "Unknown,,\"\",\"\",2026-06,65万,Synthetic Partner Gamma,Synthetic Station,missing-fields",
  "Synthetic Person Clean,S.C,\"TypeScript,PostgreSQL\",Fullstack Engineer,2026-07,80万,Synthetic Partner Delta,Synthetic Station,clean-fixture",
].join("\n");

assert.deepEqual(parseCsvDryRunArgs(["node", "csv-import", "--file=synthetic.csv", "--type=project"]), {
  file: "synthetic.csv",
  type: "project",
  limit: 5000,
});

assert.deepEqual(parseCsvDryRunArgs(["node", "csv-import", "--file", "synthetic.csv", "--type", "person"]), {
  file: "synthetic.csv",
  type: "person",
  limit: 5000,
});

assert.throws(
  () => parseCsvDryRunArgs(["node", "csv-import", "--type=project"]),
  /Missing required --file/,
);

assert.throws(
  () => parseCsvDryRunArgs(["node", "csv-import", "--file=synthetic.csv", "--type=project", "--apply"]),
  /does not accept --apply/,
);

assert.throws(
  () => parseCsvDryRunArgs(["node", "csv-import", "--file=synthetic.csv", "--type=company"]),
  /--type must be project, person, or auto/,
);

{
  const table = parseCsv("title,skills\n\"Quoted, Title\",\"Java,SQL\"\n");
  assert.deepEqual(table.headers, ["title", "skills"]);
  assert.equal(table.rows[0][0], "Quoted, Title");
  assert.equal(table.rows[0][1], "Java,SQL");
}

{
  const report = buildCsvDryRunReport({ csvText: projectCsv, type: "project", fileIdentity: "synthetic-projects.csv" });
  assert.equal(report.summary.readOnly, true);
  assert.equal(report.summary.applySupported, false);
  assert.equal(report.summary.fileRows, 5);
  assert.equal(report.summary.parsedRows, 5);
  assert.equal(report.summary.effectiveTypes.project, 5);
  assert.ok(report.mappedColumns.some((column) => column.field === "title"));
  assert.ok(report.mappedColumns.some((column) => column.field === "requiredSkills"));
  assert.equal(report.unmappedColumns.count, 1);
  assert.equal(report.outcomes.wouldCreate, 1);
  assert.equal(report.outcomes.wouldNeedReview, 4);
  assert.equal(report.outcomes.duplicateCandidateCount, 2);
  assert.equal(report.warningCounts.CSV_INVALID_PRICE, 1);
  assert.equal(report.warningCounts.CSV_INVALID_DATE, 1);
  assert.ok(report.reviewReasonCounts.CSV_MISSING_REQUIRED_FIELD >= 1);
  assert.equal(report.sampleRows.length, 5);
  assert.equal(report.sampleRows.filter((row) => row.action === "would_create").length, 1);
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_DUPLICATE_CANDIDATE")));
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_INVALID_PRICE")));
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_MISSING_REQUIRED_FIELD")));

  const output = JSON.stringify(report);
  assertNoSensitiveCsvOutput(output);
  assert.equal(output.includes("Synthetic Client Alpha"), false);
  assert.equal(output.includes("Synthetic Alpha Project"), false);
  assert.equal(output.includes("Synthetic Clean Project"), false);
  assert.equal(output.includes("Build internal workflow"), false);
  assert.equal(output.includes("Build reporting workflow"), false);
  assert.equal(output.includes("fixture-only"), false);
  assert.equal(output.includes("clean-fixture"), false);
}

{
  const report = buildCsvDryRunReport({ csvText: personCsv, type: "person", fileIdentity: "synthetic-persons.csv" });
  assert.equal(report.summary.effectiveTypes.person, 5);
  assert.ok(report.mappedColumns.some((column) => column.field === "name"));
  assert.ok(report.mappedColumns.some((column) => column.field === "skills"));
  assert.equal(report.unmappedColumns.count, 1);
  assert.equal(report.outcomes.wouldCreate, 1);
  assert.equal(report.outcomes.wouldNeedReview, 4);
  assert.equal(report.outcomes.duplicateCandidateCount, 2);
  assert.equal(report.warningCounts.CSV_INVALID_PRICE, 1);
  assert.equal(report.warningCounts.CSV_INVALID_DATE, 1);
  assert.ok(report.reviewReasonCounts.CSV_PERSON_NAME_LOW_CONFIDENCE >= 1);
  assert.equal(report.sampleRows.filter((row) => row.action === "would_create").length, 1);
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_DUPLICATE_CANDIDATE")));
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_INVALID_DATE")));
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_MISSING_REQUIRED_FIELD")));

  const output = JSON.stringify(report);
  assertNoSensitiveCsvOutput(output);
  assert.equal(output.includes("Synthetic Person One"), false);
  assert.equal(output.includes("Synthetic Person Clean"), false);
  assert.equal(output.includes("Synthetic Partner Alpha"), false);
  assert.equal(output.includes("Synthetic Partner Delta"), false);
  assert.equal(output.includes("Synthetic Station"), false);
  assert.equal(output.includes("Backend Engineer"), false);
  assert.equal(output.includes("Fullstack Engineer"), false);
}

{
  const report = buildCsvDryRunReport({
    csvText: "title,skills\nProject A,\"Java,SQL\"\nname,PM\n",
    type: "auto",
    fileIdentity: "synthetic-auto.csv",
  });
  assert.equal(report.summary.type, "auto");
  assert.equal(report.summary.parsedRows, 2);
  assert.ok(report.warningCounts.CSV_TYPE_CONFLICT >= 0 || report.summary.effectiveTypes.project >= 0);
  assertNoSensitiveCsvOutput(JSON.stringify(report));
}

assert.throws(
  () => assertNoSensitiveCsvOutput(JSON.stringify({ email: "sample@example.test" })),
  /Sensitive CSV dry-run output/,
);

assert.throws(
  () => assertNoSensitiveCsvOutput(JSON.stringify({ url: "postgres" + "ql://user:pass@example/db" })),
  /Sensitive CSV dry-run output/,
);

assert.throws(
  () => assertNoSensitiveCsvOutput(JSON.stringify({ rawRow: ["must not print"] })),
  /Sensitive CSV dry-run output/,
);

console.log("csv import dry-run tests passed");
