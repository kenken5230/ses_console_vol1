import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assertNoSensitiveMatchSuggestionOutput,
  buildMatchSuggestionWhere,
  getMatchSuggestionDetail,
  isMatchSuggestionMigrationRequiredError,
  listMatchSuggestionReviewQueue,
  listMatchSuggestions,
  matchSuggestionMigrationRequiredResponse,
  parseMatchSuggestionFilters,
  parseMatchSuggestionPagination,
  sanitizeMatchSuggestionJson,
} from "../lib/match-suggestions-review";

const projectId = "11111111-1111-4111-8111-111111111111";
const personId = "22222222-2222-4222-8222-222222222222";
const suggestionId = "33333333-3333-4333-8333-333333333333";
const needsReviewSuggestionId = "44444444-4444-4444-8444-444444444444";
const approvedWarningSuggestionId = "55555555-5555-4555-8555-555555555555";
const sourceRecordId = "66666666-6666-4666-8666-666666666666";
const sourceId = "77777777-7777-4777-8777-777777777777";
const reviewEventId = "88888888-8888-4888-8888-888888888888";
const actorUserId = "99999999-9999-4999-8999-999999999999";
const rawValue = "HiddenRawValueSentinel";
const unsafeAddress = "person" + "@example.test";
const localPath = "C:" + "\\Users\\Owner\\Sensitive.csv";

const baseDate = new Date("2026-06-08T00:00:00.000Z");

const suggestions = [
  {
    id: suggestionId,
    projectId,
    personId,
    status: "SUGGESTED",
    score: 88,
    scoreBand: "HIGH",
    scoringVersion: "match-v1",
    attentionState: "HIGH_SCORE",
    warningCount: 0,
    reviewReasonCount: 0,
    reasonCodes: ["MATCH_SKILL_REQUIRED_OVERLAP", "MATCH_RATE_COMPATIBLE"],
    warningCodes: [],
    reviewFlags: [],
    compatibilitySummary: {
      rateCompatibility: "match",
      dateCompatibility: "match",
      locationCompatibility: "unknown",
      rawText: rawValue,
    },
    skillOverlapSummary: {
      skillOverlapCount: 4,
      requiredSkillOverlapCount: 2,
      technologyOverlapCount: 2,
      personName: rawValue,
    },
    redactedPreview: {
      projectShortId: projectId.slice(0, 8),
      personShortId: personId.slice(0, 8),
      score: 88,
      scoreBand: "HIGH",
      rawName: rawValue,
      email: unsafeAddress,
    },
    reviewedAt: null,
    archivedAt: null,
    createdAt: baseDate,
    updatedAt: baseDate,
    _count: { reviewEvents: 1, sourceRecords: 1 },
    reviewEvents: [
      {
        id: reviewEventId,
        action: "CREATED",
        fromStatus: null,
        toStatus: "SUGGESTED",
        actorUserId,
        reasonCodes: ["MATCH_SAVED_FROM_DRY_RUN"],
        noteRedacted: `unsafe note ${rawValue} ${unsafeAddress}`,
        createdAt: baseDate,
      },
    ],
    sourceRecords: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "MATCH_EVIDENCE",
        createdAt: baseDate,
        sourceRecord: {
          id: sourceRecordId,
          recordType: "PROJECT",
          recordHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          rawRef: { rowIndex: 1, rowNumber: 2, path: localPath },
          normalizedPayload: { rawValue },
          redactedPreview: { recordType: "project", rowNumber: 2, rawValue },
          status: "LINKED",
          reviewReasons: [],
          warnings: [],
          createdAt: baseDate,
          updatedAt: baseDate,
          source: { id: sourceId, type: "CSV", status: "ACTIVE", name: localPath },
        },
      },
    ],
  },
  {
    id: needsReviewSuggestionId,
    projectId: "aaaaaaaa-1111-4111-8111-111111111111",
    personId: "bbbbbbbb-2222-4222-8222-222222222222",
    status: "NEEDS_REVIEW",
    score: 61,
    scoreBand: "REVIEW",
    scoringVersion: "match-v1",
    attentionState: "NEEDS_REVIEW",
    warningCount: 1,
    reviewReasonCount: 1,
    reasonCodes: ["MATCH_REVIEW_REQUIRED"],
    warningCodes: ["MATCH_MISSING_PROJECT_SKILLS"],
    reviewFlags: ["MATCH_LOW_FIELD_COVERAGE"],
    compatibilitySummary: { rateCompatibility: "unknown" },
    skillOverlapSummary: { skillOverlapCount: 1 },
    redactedPreview: { score: 61, scoreBand: "REVIEW" },
    reviewedAt: null,
    archivedAt: null,
    createdAt: new Date("2026-06-08T00:02:00.000Z"),
    updatedAt: new Date("2026-06-08T00:02:00.000Z"),
    _count: { reviewEvents: 0, sourceRecords: 0 },
    reviewEvents: [],
    sourceRecords: [],
  },
  {
    id: approvedWarningSuggestionId,
    projectId: "cccccccc-1111-4111-8111-111111111111",
    personId: "dddddddd-2222-4222-8222-222222222222",
    status: "APPROVED",
    score: 99,
    scoreBand: "HIGH",
    scoringVersion: "match-v1",
    attentionState: "WARNING",
    warningCount: 2,
    reviewReasonCount: 0,
    reasonCodes: ["MATCH_SKILL_REQUIRED_OVERLAP"],
    warningCodes: ["MATCH_RATE_UNKNOWN", "MATCH_LOCATION_UNKNOWN"],
    reviewFlags: [],
    compatibilitySummary: { rateCompatibility: "unknown" },
    skillOverlapSummary: { skillOverlapCount: 6 },
    redactedPreview: { score: 99, scoreBand: "HIGH" },
    reviewedAt: new Date("2026-06-08T00:03:00.000Z"),
    archivedAt: null,
    createdAt: new Date("2026-06-08T00:03:00.000Z"),
    updatedAt: new Date("2026-06-08T00:03:00.000Z"),
    _count: { reviewEvents: 1, sourceRecords: 0 },
    reviewEvents: [],
    sourceRecords: [],
  },
];

function matchesWhere(record: any, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  if (where.AND && !where.AND.every((condition: any) => matchesWhere(record, condition))) return false;
  if (where.OR && !where.OR.some((condition: any) => matchesWhere(record, condition))) return false;
  if (where.NOT && matchesWhere(record, where.NOT)) return false;
  if (where.status?.in && !where.status.in.includes(record.status)) return false;
  if (typeof where.status === "string" && record.status !== where.status) return false;
  if (where.scoreBand && record.scoreBand !== where.scoreBand) return false;
  if (where.attentionState && record.attentionState !== where.attentionState) return false;
  if (where.projectId && record.projectId !== where.projectId) return false;
  if (where.personId && record.personId !== where.personId) return false;
  if (where.score?.gte !== undefined && record.score < where.score.gte) return false;
  if (where.score?.lte !== undefined && record.score > where.score.lte) return false;
  if (where.warningCount?.gt !== undefined && !(record.warningCount > where.warningCount.gt)) return false;
  if (where.reviewReasonCount?.gt !== undefined && !(record.reviewReasonCount > where.reviewReasonCount.gt)) return false;
  return true;
}

function applyOrder(items: any[], orderBy: any[] | undefined) {
  const ordered = [...items];
  for (const order of [...(orderBy ?? [])].reverse()) {
    const [[key, direction]] = Object.entries(order);
    ordered.sort((left, right) => {
      const leftValue = left[key] instanceof Date ? left[key].getTime() : left[key];
      const rightValue = right[key] instanceof Date ? right[key].getTime() : right[key];
      if (leftValue === rightValue) return 0;
      const result = leftValue > rightValue ? 1 : -1;
      return direction === "desc" ? -result : result;
    });
  }
  return ordered;
}

function createMockDb() {
  return {
    matchSuggestion: {
      async count({ where }: any) {
        return suggestions.filter((suggestion) => matchesWhere(suggestion, where)).length;
      },
      async findMany({ where, orderBy, skip = 0, take = 20 }: any) {
        return applyOrder(suggestions.filter((suggestion) => matchesWhere(suggestion, where)), orderBy).slice(skip, skip + take);
      },
      async findUnique({ where }: any) {
        return suggestions.find((suggestion) => suggestion.id === where.id) ?? null;
      },
    },
  };
}

assert.deepEqual(parseMatchSuggestionPagination(new URLSearchParams("page=2&limit=500")), {
  page: 2,
  limit: 100,
  skip: 100,
  maxLimit: 100,
});

assert.deepEqual(parseMatchSuggestionFilters(new URLSearchParams(`status=suggested&scoreBand=high&attentionState=HIGH_SCORE&minScore=70&maxScore=90&projectId=${projectId}&personId=${personId}`)), {
  status: "SUGGESTED",
  scoreBand: "HIGH",
  attentionState: "HIGH_SCORE",
  minScore: 70,
  maxScore: 90,
  projectId,
  personId,
});

assert.deepEqual(buildMatchSuggestionWhere({
  status: "SUGGESTED",
  scoreBand: "HIGH",
  attentionState: "HIGH_SCORE",
  minScore: 70,
  maxScore: 90,
  projectId,
  personId,
}), {
  status: "SUGGESTED",
  scoreBand: "HIGH",
  attentionState: "HIGH_SCORE",
  projectId,
  personId,
  score: { gte: 70, lte: 90 },
});

assert.deepEqual(sanitizeMatchSuggestionJson({ projectShortId: "11111111", personShortId: "22222222", companyName: rawValue, safeCode: "MATCH_OK" }), {
  projectShortId: "11111111",
  personShortId: "22222222",
  safeCode: "MATCH_OK",
});

async function main() {
  const db = createMockDb();

  const empty = await listMatchSuggestions(db, new URLSearchParams("status=ARCHIVED"));
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.items, []);

  const list = await listMatchSuggestions(db, new URLSearchParams(`status=SUGGESTED&scoreBand=HIGH&attentionState=HIGH_SCORE&minScore=80&projectId=${projectId}&limit=10`));
  assert.equal(list.total, 1);
  assert.equal(list.items[0].projectShortId, projectId.slice(0, 8));
  assert.equal(list.items[0].personShortId, personId.slice(0, 8));
  assert.equal("projectId" in list.items[0], false);
  assert.equal("personId" in list.items[0], false);

  const queue = await listMatchSuggestionReviewQueue(db, new URLSearchParams("limit=10"));
  assert.equal(queue.total, 3);
  assert.equal(queue.items[0].status, "NEEDS_REVIEW");
  assert.equal(queue.items[1].status, "SUGGESTED");
  assert.equal(queue.items[2].status, "APPROVED");
  assert.equal(queue.sort, "needs-review-first-score-desc-newest");

  const detail = await getMatchSuggestionDetail(db, suggestionId);
  assert.ok(detail);
  assert.equal(detail.item.projectShortId, projectId.slice(0, 8));
  assert.equal(detail.item.reviewEvents[0].notePresent, true);
  assert.equal("noteRedacted" in detail.item.reviewEvents[0], false);
  assert.equal(detail.item.sourceEvidence[0].sourceRecord.rawRef.rowNumber, 2);
  assert.equal("path" in detail.item.sourceEvidence[0].sourceRecord.rawRef, false);
  assert.equal("sourceName" in detail.item.sourceEvidence[0].sourceRecord, false);
  assert.equal("normalizedPayload" in detail.item.sourceEvidence[0].sourceRecord, false);

  assert.equal(await getMatchSuggestionDetail(db, "not-a-uuid"), null);
  assert.equal(await getMatchSuggestionDetail(db, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), null);

  const migrationRequired = matchSuggestionMigrationRequiredResponse("suggestions");
  assert.equal(migrationRequired.migrationRequired, true);
  assert.equal(migrationRequired.readOnly, true);
  assert.equal(isMatchSuggestionMigrationRequiredError({ code: "P2021", message: "table does not exist" }), true);
  assert.equal(isMatchSuggestionMigrationRequiredError({ message: "relation match_suggestions does not exist" }), true);

  const serialized = JSON.stringify({ list, queue, detail, migrationRequired });
  assertNoSensitiveMatchSuggestionOutput(serialized);
  assert.equal(serialized.includes(rawValue), false);
  assert.equal(serialized.includes(unsafeAddress), false);
  assert.equal(serialized.includes(localPath), false);
  assert.equal(serialized.includes("companyName"), false);
  assert.equal(serialized.includes("normalizedPayload"), false);
  assert.equal(serialized.includes("noteRedacted"), false);

  assert.throws(
    () => assertNoSensitiveMatchSuggestionOutput(JSON.stringify({ contact: unsafeAddress })),
    /Sensitive match suggestion output/,
  );

  assert.throws(
    () => parseMatchSuggestionPagination(new URLSearchParams("save=true")),
    /read-only/,
  );

  for (const routePath of [
    "app/api/matches/suggestions/route.ts",
    "app/api/matches/suggestions/[id]/route.ts",
    "app/api/matches/suggestions/review-queue/route.ts",
  ]) {
    const route = readFileSync(routePath, "utf8");
    assert.doesNotMatch(route, /export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/);
    assert.doesNotMatch(route, /\b(?:matchSuggestion|matchSuggestionReviewEvent|matchSuggestionSourceRecord|project|person|proposal)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  }

  const helperSource = readFileSync("lib/match-suggestions-review.ts", "utf8");
  assert.doesNotMatch(helperSource, /\b(?:matchSuggestion|matchSuggestionReviewEvent|matchSuggestionSourceRecord|project|person|proposal)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(helperSource, /\$transaction\s*\(/);

  console.log("match suggestions review tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
