import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assertNoSensitiveMatchSuggestionSaveOutput,
  disabledMatchSuggestionSaveResponse,
  matchSuggestionSaveGuard,
  MatchSuggestionSaveRequestError,
  saveMatchSuggestionSupervised,
  validateMatchSuggestionSaveBody,
} from "../lib/match-suggestion-save";

const projectId = "11111111-1111-4111-8111-111111111111";
const personId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const sourceRecordId = "44444444-4444-4444-8444-444444444444";
const sourceSnapshotHash = "a".repeat(64);
const suggestionKey = "b".repeat(64);
const unsafeAddress = "person" + "@example.test";
const localPath = "C:" + "\\Users\\Owner\\Sensitive.csv";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    confirmSave: true,
    projectId,
    personId,
    score: 86,
    scoreBand: "HIGH",
    scoringVersion: "match-v1",
    sourceSnapshotHash,
    suggestionKey,
    attentionState: "HIGH_SCORE",
    warningCount: 0,
    reviewReasonCount: 0,
    reasonCodes: ["MATCH_SKILL_REQUIRED_OVERLAP", "MATCH_RATE_COMPATIBLE"],
    warningCodes: [],
    reviewFlags: [],
    compatibilitySummary: {
      rateCompatibility: "match",
      dateCompatibility: "match",
      rawText: "hidden",
    },
    skillOverlapSummary: {
      skillOverlapCount: 4,
      personName: "hidden",
    },
    redactedPreview: {
      scoreBand: "HIGH",
      email: unsafeAddress,
      safeCode: "MATCH_OK",
    },
    sourceEvidence: [{ sourceRecordId, role: "MATCH_EVIDENCE" }],
    ...overrides,
  };
}

function savedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    status: "SUGGESTED",
    score: 86,
    scoreBand: "HIGH",
    scoringVersion: "match-v1",
    attentionState: "HIGH_SCORE",
    warningCount: 0,
    reviewReasonCount: 0,
    createdAt: new Date("2026-06-08T00:00:00.000Z"),
    updatedAt: new Date("2026-06-08T00:00:00.000Z"),
    _count: { reviewEvents: 1, sourceRecords: 1 },
    ...overrides,
  };
}

function createMockDb({ existing = null, createError = null }: { existing?: any; createError?: any } = {}) {
  const calls: any[] = [];
  return {
    calls,
    db: {
      matchSuggestion: {
        async findUnique(args: any) {
          calls.push(["findUnique", args]);
          return existing;
        },
        async findFirst(args: any) {
          calls.push(["findFirst", args]);
          return existing;
        },
        async create(args: any) {
          calls.push(["create", args]);
          if (createError) throw createError;
          return savedRow();
        },
      },
    },
  };
}

assert.deepEqual(matchSuggestionSaveGuard({}), {
  allowed: false,
  enabled: false,
  target: "not-staging",
});
assert.deepEqual(matchSuggestionSaveGuard({
  MATCH_SUGGESTION_SAVE_ENABLED: "true",
  MATCH_SUGGESTION_WRITE_TARGET: "staging",
}), {
  allowed: true,
  enabled: true,
  target: "staging",
});
assert.equal(disabledMatchSuggestionSaveResponse().writeAttempted, false);

const parsed = validateMatchSuggestionSaveBody(validBody({ suggestionKey: undefined }));
assert.equal(parsed.suggestionKey.length, 64);
assert.equal(parsed.status, "SUGGESTED");
assert.deepEqual(parsed.compatibilitySummary, {
  rateCompatibility: "match",
  dateCompatibility: "match",
});
assert.deepEqual(parsed.skillOverlapSummary, {
  skillOverlapCount: 4,
});
assert.deepEqual(parsed.redactedPreview, {
  scoreBand: "HIGH",
  safeCode: "MATCH_OK",
});

const reviewParsed = validateMatchSuggestionSaveBody(validBody({
  scoreBand: "REVIEW",
  warningCount: 1,
  reviewReasonCount: 1,
  reviewFlags: ["MATCH_LOW_FIELD_COVERAGE"],
}));
assert.equal(reviewParsed.status, "NEEDS_REVIEW");

assert.throws(
  () => validateMatchSuggestionSaveBody(validBody({ confirmSave: false })),
  /confirmSave/,
);
assert.throws(
  () => validateMatchSuggestionSaveBody(validBody({ projectId: "not-a-uuid" })),
  /projectId/,
);
assert.throws(
  () => validateMatchSuggestionSaveBody(validBody({ sourceSnapshotHash: "short" })),
  /sourceSnapshotHash/,
);
assert.throws(
  () => validateMatchSuggestionSaveBody(validBody({ reasonCodes: ["bad email " + unsafeAddress] })),
  /reasonCodes/,
);
assert.throws(
  () => validateMatchSuggestionSaveBody(validBody({ rawProjectText: "raw payload" })),
  /unsafe raw or PII/,
);
assert.throws(
  () => validateMatchSuggestionSaveBody(validBody({ localPath })),
  /unsafe raw or PII/,
);

async function main() {
  const createMock = createMockDb();
  const created = await saveMatchSuggestionSupervised(createMock.db, validBody(), { id: userId } as any);
  assert.equal(created.saved, true);
  assert.equal(created.created, true);
  assert.equal(created.writeAttempted, true);
  assert.equal(created.suggestion.reviewEventCreated, true);
  assert.equal(created.suggestion.sourceEvidenceLinked, 1);
  assert.equal(createMock.calls.filter(([name]) => name === "create").length, 1);

  const createArgs = createMock.calls.find(([name]) => name === "create")[1];
  assert.equal(createArgs.data.project.connect.id, projectId);
  assert.equal(createArgs.data.person.connect.id, personId);
  assert.equal(createArgs.data.reviewEvents.create.action, "CREATED");
  assert.equal(createArgs.data.reviewEvents.create.fromStatus, null);
  assert.equal(createArgs.data.reviewEvents.create.toStatus, "SUGGESTED");
  assert.equal(createArgs.data.reviewEvents.create.noteRedacted, null);
  assert.equal(createArgs.data.sourceRecords.create[0].sourceRecord.connect.id, sourceRecordId);
  assert.equal(createArgs.data.sourceRecords.create[0].role, "MATCH_EVIDENCE");

  const existingMock = createMockDb({ existing: savedRow() });
  const skipped = await saveMatchSuggestionSupervised(existingMock.db, validBody(), { id: userId } as any);
  assert.equal(skipped.saved, false);
  assert.equal(skipped.created, false);
  assert.equal(skipped.skippedExisting, true);
  assert.equal(skipped.writeAttempted, false);
  assert.equal(existingMock.calls.some(([name]) => name === "create"), false);

  const uniqueConflictMock = createMockDb({
    existing: null,
    createError: { code: "P2002" },
  });
  let findFirstCalls = 0;
  uniqueConflictMock.db.matchSuggestion.findFirst = async (args: any) => {
    uniqueConflictMock.calls.push(["findFirst", args]);
    findFirstCalls += 1;
    return findFirstCalls > 1 ? savedRow() : null;
  };
  const conflict = await saveMatchSuggestionSupervised(uniqueConflictMock.db, validBody(), { id: userId } as any);
  assert.equal(conflict.skippedExisting, true);
  assert.equal(conflict.writeAttempted, true);

  const serialized = JSON.stringify({ created, skipped, conflict });
  assertNoSensitiveMatchSuggestionSaveOutput(serialized);
  assert.equal(serialized.includes(unsafeAddress), false);
  assert.equal(serialized.includes(localPath), false);
  assert.equal(serialized.includes("raw payload"), false);

  const route = readFileSync("app/api/matches/suggestions/route.ts", "utf8");
  assert.match(route, /export\s+async\s+function\s+POST\b/);
  assert.doesNotMatch(route, /export\s+async\s+function\s+(?:PUT|PATCH|DELETE)\b/);

  const ui = readFileSync("components/MatchingReviewPage.jsx", "utf8");
  assert.match(ui, /NEXT_PUBLIC_MATCH_SUGGESTION_SAVE_UI_ENABLED/);
  assert.doesNotMatch(ui, /<button[^>]*>\s*(?:Approve|Reject|Archive|Create proposal|Draft email|Send email)\s*<\/button>/i);

  console.log("match suggestion save tests passed");
}

main().catch((error) => {
  if (!(error instanceof MatchSuggestionSaveRequestError)) {
    console.error(error);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
