import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  assertNoSensitiveImportReviewOutput,
  buildImportRunWhere,
  buildSourceRecordWhere,
  getSourceRecordDetail,
  listImportRuns,
  listSourceRecords,
  parseImportReviewPagination,
  safeRawRef,
} from "../lib/import-review";
// @ts-ignore Runtime JSX transform is provided by tsx for this smoke test.
import ImportReviewPage, { ImportReviewEmptyState } from "../components/ImportReviewPage.jsx";

const runId = "11111111-1111-4111-8111-111111111111";
const secondRunId = "22222222-2222-4222-8222-222222222222";
const sourceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const recordId = "33333333-3333-4333-8333-333333333333";
const reviewRecordId = "44444444-4444-4444-8444-444444444444";
const linkId = "55555555-5555-4555-8555-555555555555";
const localPath = "C:" + "\\Users\\Owner\\Sensitive.csv";
const rawValue = "HiddenRawValueSentinel";
const unsafeAddress = "review" + "@example.test";

const csvSource = {
  id: sourceId,
  type: "CSV",
  name: localPath,
  status: "ACTIVE",
};

const runs = [
  {
    id: runId,
    source: csvSource,
    mode: "APPLY",
    status: "PARTIAL",
    startedAt: new Date("2026-06-05T00:00:00.000Z"),
    finishedAt: new Date("2026-06-05T00:01:00.000Z"),
    createdAt: new Date("2026-06-05T00:00:00.000Z"),
    updatedAt: new Date("2026-06-05T00:01:00.000Z"),
    summary: {
      fileRows: 2,
      parsedRows: 2,
      rawValue,
      normalizedPayload: { unsafe: rawValue },
    },
    _count: { sourceRecords: 2 },
  },
  {
    id: secondRunId,
    source: { id: sourceId, type: "MANUAL", name: "Manual Private Source", status: "ACTIVE" },
    mode: "DRY_RUN",
    status: "SUCCEEDED",
    startedAt: null,
    finishedAt: null,
    createdAt: new Date("2026-06-04T00:00:00.000Z"),
    updatedAt: new Date("2026-06-04T00:00:00.000Z"),
    summary: { parsedRows: 0 },
    _count: { sourceRecords: 0 },
  },
];

const sourceRecords = [
  {
    id: recordId,
    sourceId,
    importRunId: runId,
    source: csvSource,
    importRun: runs[0],
    recordType: "PROJECT",
    recordHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    rawRef: { rowIndex: 1, rowNumber: 2, path: localPath },
    normalizedPayload: { rawValue, email: unsafeAddress },
    redactedPreview: {
      action: "would_create",
      detectedType: "project",
      effectiveType: "project",
      warningCount: 0,
      reviewReasonCount: 0,
      rawName: rawValue,
      email: unsafeAddress,
    },
    status: "NEW",
    reviewReasons: [],
    warnings: [],
    entityLinks: [
      {
        id: linkId,
        entityType: "PROJECT",
        entityId: "66666666-6666-4666-8666-666666666666",
        linkType: "CREATED_FROM",
        confidence: "0.9500",
        reasons: ["CSV_WOULD_CREATE"],
        createdAt: new Date("2026-06-05T00:00:30.000Z"),
        updatedAt: new Date("2026-06-05T00:00:30.000Z"),
      },
    ],
    _count: { entityLinks: 1 },
    createdAt: new Date("2026-06-05T00:00:10.000Z"),
    updatedAt: new Date("2026-06-05T00:00:10.000Z"),
  },
  {
    id: reviewRecordId,
    sourceId,
    importRunId: runId,
    source: csvSource,
    importRun: runs[0],
    recordType: "PERSON",
    recordHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    rawRef: { rowIndex: 2, rowNumber: 3 },
    normalizedPayload: { rawValue },
    redactedPreview: {
      action: "would_review",
      detectedType: "person",
      effectiveType: "person",
      warningCount: 1,
      reviewReasonCount: 1,
    },
    status: "NEEDS_REVIEW",
    reviewReasons: ["CSV_DUPLICATE_CANDIDATE"],
    warnings: ["CSV_MISSING_REQUIRED_FIELD"],
    entityLinks: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        entityType: "PERSON",
        entityId: "88888888-8888-4888-8888-888888888888",
        linkType: "DUPLICATE_OF",
        confidence: "0.6500",
        reasons: ["CSV_DUPLICATE_CANDIDATE"],
        createdAt: new Date("2026-06-05T00:00:40.000Z"),
        updatedAt: new Date("2026-06-05T00:00:40.000Z"),
      },
    ],
    _count: { entityLinks: 1 },
    createdAt: new Date("2026-06-05T00:00:20.000Z"),
    updatedAt: new Date("2026-06-05T00:00:20.000Z"),
  },
];

function matchesWhere(record: any, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  if (where.AND && !where.AND.every((condition: any) => matchesWhere(record, condition))) return false;
  if (where.OR && !where.OR.some((condition: any) => matchesWhere(record, condition))) return false;
  if (where.NOT && matchesWhere(record, where.NOT)) return false;
  if (where.source?.type && record.source?.type !== where.source.type) return false;
  if (where.mode && record.mode !== where.mode) return false;
  if (where.status && record.status !== where.status) return false;
  if (where.recordType && record.recordType !== where.recordType) return false;
  if (where.importRunId?.in && !where.importRunId.in.includes(record.importRunId)) return false;
  if (where.importRunId && !where.importRunId.in && record.importRunId !== where.importRunId) return false;
  if (where.entityLinks?.some?.linkType && !record.entityLinks?.some((link: any) => link.linkType === where.entityLinks.some.linkType)) return false;
  if (where.warnings?.not !== undefined && !(Array.isArray(record.warnings) && record.warnings.length > 0)) return false;
  if (where.warnings === null && record.warnings !== null) return false;
  return true;
}

function createMockDb() {
  return {
    importRun: {
      async count({ where }: any) {
        return runs.filter((run) => matchesWhere(run, where)).length;
      },
      async findMany({ where, skip = 0, take = 20 }: any) {
        return runs.filter((run) => matchesWhere(run, where)).slice(skip, skip + take);
      },
    },
    sourceRecord: {
      async count({ where }: any) {
        return sourceRecords.filter((record) => matchesWhere(record, where)).length;
      },
      async findMany({ where, select, skip = 0, take = 20 }: any) {
        const matches = sourceRecords.filter((record) => matchesWhere(record, where));
        if (select?.importRunId) {
          return matches.map((record) => ({
            importRunId: record.importRunId,
            _count: { entityLinks: record.entityLinks.length },
          }));
        }
        return matches.slice(skip, skip + take);
      },
      async findUnique({ where }: any) {
        return sourceRecords.find((record) => record.id === where.id) ?? null;
      },
    },
  };
}

assert.deepEqual(parseImportReviewPagination(new URLSearchParams("page=2&limit=500")), {
  page: 2,
  limit: 100,
  skip: 100,
  maxLimit: 100,
});

assert.deepEqual(buildImportRunWhere({ sourceType: "CSV", mode: "APPLY", status: "PARTIAL" }), {
  source: { type: "CSV" },
  mode: "APPLY",
  status: "PARTIAL",
});

assert.deepEqual(buildSourceRecordWhere({
  sourceType: "CSV",
  recordType: "PERSON",
  status: "NEEDS_REVIEW",
  linkType: "DUPLICATE_OF",
  importRunId: runId,
  reviewNeeded: true,
  warningsPresent: true,
}), {
  source: { type: "CSV" },
  recordType: "PERSON",
  status: "NEEDS_REVIEW",
  importRunId: runId,
  AND: [
    { entityLinks: { some: { linkType: "DUPLICATE_OF" } } },
    { status: "NEEDS_REVIEW" },
    { warnings: { not: [] } },
  ],
});

assert.deepEqual(safeRawRef({ rowIndex: 4, rowNumber: 5, path: localPath }), { rowIndex: 4, rowNumber: 5 });

async function main() {
  const db = createMockDb();

  const importRuns = await listImportRuns(db, new URLSearchParams("limit=1&sourceType=CSV"));
  assert.equal(importRuns.limit, 1);
  assert.equal(importRuns.total, 1);
  assert.equal(importRuns.items[0].source.type, "CSV");
  assert.equal(importRuns.items[0].sourceRecordCount, 2);
  assert.equal(importRuns.items[0].entityLinkCount, 2);

  const recordList = await listSourceRecords(
    db,
    new URLSearchParams(`sourceType=CSV&recordType=PERSON&status=NEEDS_REVIEW&linkType=DUPLICATE_OF&importRunId=${runId}&reviewNeeded=true&warningsPresent=true`),
  );
  assert.equal(recordList.total, 1);
  assert.equal(recordList.items[0].recordType, "PERSON");
  assert.equal(recordList.items[0].status, "NEEDS_REVIEW");
  assert.equal(recordList.items[0].reviewReasonCount, 1);
  assert.equal(recordList.items[0].warningCount, 1);
  assert.equal(recordList.items[0].entitySourceLinks[0].linkType, "DUPLICATE_OF");

  const detail = await getSourceRecordDetail(db, recordId);
  assert.ok(detail);
  assert.equal(detail.item.rawRef.rowNumber, 2);
  assert.equal(detail.item.rawRef.rowIndex, 1);
  assert.equal("normalizedPayload" in detail.item, false);
  assert.equal(detail.item.payloadRedacted, true);

  const serialized = JSON.stringify({ importRuns, recordList, detail });
  assertNoSensitiveImportReviewOutput(serialized);
  assert.equal(serialized.includes(rawValue), false);
  assert.equal(serialized.includes(unsafeAddress), false);
  assert.equal(serialized.includes(localPath), false);
  assert.equal(serialized.includes("normalizedPayload"), false);
  assert.equal(serialized.includes("rawName"), false);

  assert.throws(
    () => assertNoSensitiveImportReviewOutput(JSON.stringify({ contact: unsafeAddress })),
    /Sensitive import review output/,
  );

  for (const routePath of [
    "app/api/imports/route.ts",
    "app/api/imports/source-records/route.ts",
    "app/api/imports/source-records/[id]/route.ts",
  ]) {
    const route = readFileSync(routePath, "utf8");
    assert.doesNotMatch(route, /export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/);
    assert.doesNotMatch(route, /\b(?:importSource|importRun|sourceRecord|entitySourceLink|project|person)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  }

  const helperSource = readFileSync("lib/import-review.ts", "utf8");
  assert.doesNotMatch(helperSource, /\b(?:importSource|importRun|sourceRecord|entitySourceLink|project|person)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(helperSource, /\$transaction\s*\(/);

  const emptyHtml = renderToStaticMarkup(React.createElement(ImportReviewEmptyState));
  assert.ok(emptyHtml.includes("No import records yet"));

  const pageHtml = renderToStaticMarkup(React.createElement(ImportReviewPage, {
    initialSession: { authenticated: true, user: { id: "user-1", name: "Reviewer", role: "ADMIN" } },
    initialRunsResponse: importRuns,
    initialRecordsResponse: { ...recordList, items: [detail.item] },
  }));
  assert.ok(pageHtml.includes("ImportRun review"));
  assert.ok(pageHtml.includes("SourceRecord review"));
  assert.ok(pageHtml.includes("CREATED_FROM"));
  assert.equal(pageHtml.includes(rawValue), false);
  assert.equal(pageHtml.includes(unsafeAddress), false);
  assertNoSensitiveImportReviewOutput(pageHtml);

  console.log("import review tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
