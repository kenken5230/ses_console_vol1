import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assertNoSensitiveCsvOutput,
  buildCsvDryRunReport,
  parseCsv,
  parseCsvDryRunArgs,
} from "./csv-import-dry-run";
import type { ExistingPersonCandidate, ExistingProjectCandidate } from "./csv-import-dry-run";

const projectCsv = readFileSync("tests/fixtures/csv-import/synthetic-projects.csv", "utf8");
const personCsv = readFileSync("tests/fixtures/csv-import/synthetic-persons.csv", "utf8");

assert.deepEqual(parseCsvDryRunArgs(["node", "csv-import", "--file=synthetic.csv", "--type=project"]), {
  file: "synthetic.csv",
  type: "project",
  limit: 5000,
  dbDuplicates: "auto",
});

assert.deepEqual(parseCsvDryRunArgs(["node", "csv-import", "--file", "synthetic.csv", "--type", "person", "--db-duplicates=off"]), {
  file: "synthetic.csv",
  type: "person",
  limit: 5000,
  dbDuplicates: "off",
});

assert.deepEqual(parseCsvDryRunArgs(["node", "csv-import", "--file=synthetic.csv", "--type=auto", "--limit=25", "--db-duplicates", "on"]), {
  file: "synthetic.csv",
  type: "auto",
  limit: 25,
  dbDuplicates: "on",
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

assert.throws(
  () => parseCsvDryRunArgs(["node", "csv-import", "--file=synthetic.csv", "--type=project", "--db-duplicates=write"]),
  /--db-duplicates must be auto, off, or on/,
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
  assert.equal(report.outcomes.strongDuplicateCandidateCount, 2);
  assert.equal(report.duplicateMatching.sourceRowDuplicateCount, 2);
  assert.equal(report.warningCounts.CSV_INVALID_PRICE, 1);
  assert.equal(report.warningCounts.CSV_INVALID_DATE, 1);
  assert.ok(report.reviewReasonCounts.CSV_MISSING_REQUIRED_FIELD >= 1);
  assert.equal(report.sampleRows.length, 5);
  assert.equal(report.sampleRows.filter((row) => row.action === "would_create").length, 1);
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_DUPLICATE_BY_SOURCE_ROW")));
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
  assert.equal(report.outcomes.strongDuplicateCandidateCount, 2);
  assert.equal(report.duplicateMatching.sourceRowDuplicateCount, 2);
  assert.equal(report.warningCounts.CSV_INVALID_PRICE, 1);
  assert.equal(report.warningCounts.CSV_INVALID_DATE, 1);
  assert.ok(report.reviewReasonCounts.CSV_PERSON_NAME_LOW_CONFIDENCE >= 1);
  assert.equal(report.sampleRows.filter((row) => row.action === "would_create").length, 1);
  assert.ok(report.sampleRows.some((row) => row.action === "would_need_review" && row.reviewReasonCodes.includes("CSV_DUPLICATE_BY_SOURCE_ROW")));
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
  const existingProjects: ExistingProjectCandidate[] = [{
    title: "Synthetic Strong Project",
    companyName: "Synthetic Existing Client",
    workContent: "Existing internal workflow",
    skills: ["Java", "Spring"],
    unitPrice: 80,
    workLocation: "Remote",
    startMonth: "2026-04",
  }];
  const report = buildCsvDryRunReport({
    csvText: [
      "案件名,会社名,作業内容,必須スキル,単価,開始月,勤務地",
      "Synthetic Strong Project,Synthetic Existing Client,Build duplicate workflow,\"Java,Spring\",80万,2026-04,Remote",
    ].join("\n"),
    type: "project",
    existingProjects,
    dbReadOnlyEnabled: true,
    dbReadOnlyScannedProjects: existingProjects.length,
  });
  assert.equal(report.outcomes.wouldCreate, 0);
  assert.equal(report.outcomes.wouldNeedReview, 1);
  assert.equal(report.outcomes.strongDuplicateCandidateCount, 1);
  assert.equal(report.duplicateMatching.duplicateReasonCounts.CSV_DUPLICATE_BY_PROJECT_TITLE_COMPANY, 1);
  assert.equal(JSON.stringify(report).includes("Synthetic Existing Client"), false);
}

{
  const existingProjects: ExistingProjectCandidate[] = [{
    title: "Synthetic Existing Different Project",
    companyName: "Synthetic Other Client",
    skills: ["TypeScript", "PostgreSQL", "Next.js"],
    unitPrice: 120,
    workLocation: "Hybrid",
  }];
  const report = buildCsvDryRunReport({
    csvText: [
      "案件名,会社名,作業内容,必須スキル,単価,開始月,勤務地",
      "Synthetic Weak Project,Synthetic Client Zeta,Build reporting workflow,\"TypeScript,PostgreSQL\",80万,2026-07,Hybrid",
    ].join("\n"),
    type: "project",
    existingProjects,
    dbReadOnlyEnabled: true,
    dbReadOnlyScannedProjects: existingProjects.length,
  });
  assert.equal(report.outcomes.weakDuplicateCandidateCount, 1);
  assert.equal(report.duplicateMatching.duplicateReasonCounts.CSV_DUPLICATE_BY_PROJECT_SKILL_LOCATION_PRICE, 1);
  assert.equal(report.reviewReasonCounts.CSV_DUPLICATE_WEAK_MATCH, 1);
}

{
  const existingPersons: ExistingPersonCandidate[] = [{
    name: "Synthetic Strong Person",
    initials: "S.S",
    roleHeadline: "Backend Engineer",
    skills: ["Java", "Spring"],
    desiredUnitPrice: 75,
    availableFrom: "2026-04",
    ownerCompany: "Synthetic Existing Partner",
  }];
  const report = buildCsvDryRunReport({
    csvText: [
      "氏名,イニシャル,スキル,職種,稼働開始,希望単価,所属会社,最寄駅",
      "Synthetic Strong Person,S.S,\"Java,Spring\",Backend Engineer,2026-04,75万,Synthetic Existing Partner,Synthetic Station",
    ].join("\n"),
    type: "person",
    existingPersons,
    dbReadOnlyEnabled: true,
    dbReadOnlyScannedPersons: existingPersons.length,
  });
  assert.equal(report.outcomes.wouldCreate, 0);
  assert.equal(report.outcomes.wouldNeedReview, 1);
  assert.equal(report.outcomes.strongDuplicateCandidateCount, 1);
  assert.equal(report.duplicateMatching.duplicateReasonCounts.CSV_DUPLICATE_BY_PERSON_NAME_OWNER, 1);
  assert.equal(JSON.stringify(report).includes("Synthetic Existing Partner"), false);
}

{
  const existingPersons: ExistingPersonCandidate[] = [{
    name: "Synthetic Existing Different Person",
    initials: "E.D",
    skills: ["TypeScript", "PostgreSQL", "React"],
    desiredUnitPrice: 80,
    availableFrom: "2026-08",
    ownerCompany: "Synthetic Other Partner",
  }];
  const report = buildCsvDryRunReport({
    csvText: [
      "氏名,イニシャル,スキル,職種,稼働開始,希望単価,所属会社,最寄駅",
      "Synthetic Weak Person,S.W,\"TypeScript,PostgreSQL\",Fullstack Engineer,2026-07,80万,Synthetic Partner Zeta,Synthetic Station",
    ].join("\n"),
    type: "person",
    existingPersons,
    dbReadOnlyEnabled: true,
    dbReadOnlyScannedPersons: existingPersons.length,
  });
  assert.equal(report.outcomes.weakDuplicateCandidateCount, 1);
  assert.equal(report.duplicateMatching.duplicateReasonCounts.CSV_DUPLICATE_BY_PERSON_SKILL_RATE_AVAILABILITY, 1);
  assert.equal(report.reviewReasonCounts.CSV_DUPLICATE_WEAK_MATCH, 1);
}

{
  const report = buildCsvDryRunReport({ csvText: projectCsv, type: "auto", fileIdentity: "synthetic-projects.csv" });
  assert.equal(report.summary.type, "auto");
  assert.equal(report.summary.effectiveTypes.project, 5);
  assert.equal(report.typeDetection.detectedTypes.project, 5);
  assert.equal(report.typeDetection.typeConflictCount, 0);
  assertNoSensitiveCsvOutput(JSON.stringify(report));
}

{
  const report = buildCsvDryRunReport({ csvText: personCsv, type: "auto", fileIdentity: "synthetic-persons.csv" });
  assert.equal(report.summary.type, "auto");
  assert.equal(report.summary.effectiveTypes.person, 5);
  assert.equal(report.typeDetection.detectedTypes.person, 5);
  assert.equal(report.typeDetection.typeConflictCount, 0);
  assertNoSensitiveCsvOutput(JSON.stringify(report));
}

{
  const report = buildCsvDryRunReport({
    csvText: [
      "案件名,氏名,スキル,職種,単価,開始月,会社名",
      "Synthetic Ambiguous Project,Synthetic Ambiguous Person,\"Java,Spring\",Backend Engineer,80万,2026-04,Synthetic Ambiguous Company",
    ].join("\n"),
    type: "auto",
    fileIdentity: "synthetic-auto-conflict.csv",
  });
  assert.equal(report.summary.detectedTypes.review, 1);
  assert.equal(report.typeDetection.typeConflictCount, 1);
  assert.equal(report.reviewReasonCounts.CSV_TYPE_CONFLICT, 1);
  assertNoSensitiveCsvOutput(JSON.stringify(report));
}

{
  const report = buildCsvDryRunReport({
    csvText: "案件名\nSynthetic Sparse Project\n",
    type: "project",
    fileIdentity: "synthetic-low-coverage.csv",
  });
  assert.equal(report.outcomes.lowCoverageCount, 1);
  assert.equal(report.reviewReasonCounts.CSV_LOW_FIELD_COVERAGE, 1);
  assert.ok(report.fieldCoverage.averageScore < 0.5);
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
