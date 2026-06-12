import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  assertNoSensitiveMatchSuggestionReviewUpdateOutput,
  disabledMatchSuggestionReviewUpdateResponse,
  isMatchSuggestionReviewUpdateUser,
  matchSuggestionReviewUpdateGuard,
  MatchSuggestionReviewUpdateRequestError,
  updateMatchSuggestionReviewSupervised,
  validateMatchSuggestionReviewUpdateBody,
} from "../lib/match-suggestion-review-update";
import {
  isMatchSuggestionMigrationRequiredError,
  matchSuggestionMigrationRequiredResponse,
} from "../lib/match-suggestions-review";

const suggestionId = "11111111-1111-4111-8111-111111111111";
const otherSuggestionId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const baseDate = new Date("2026-06-09T00:00:00.000Z");
const unsafeAddress = ["person", "example.invalid"].join("@");
const localPath = "C:" + "\\Users\\Owner\\Sensitive.csv";

type StoredSuggestion = {
  id: string;
  status: string;
  score: number;
  scoreBand: string;
  warningCount: number;
  reviewReasonCount: number;
  reviewedAt: Date | null;
  archivedAt: Date | null;
  updatedAt: Date;
  _count: { reviewEvents: number; sourceRecords: number };
};

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    action: "APPROVE",
    toStatus: "APPROVED",
    confirmReviewAction: true,
    reasonCodes: ["REVIEWED_OK"],
    ...overrides,
  };
}

function createMockDb(initialStatus = "SUGGESTED") {
  const calls: Array<[string, any]> = [];
  const events: any[] = [];
  const row: StoredSuggestion = {
    id: suggestionId,
    status: initialStatus,
    score: 75,
    scoreBand: "REVIEW",
    warningCount: 1,
    reviewReasonCount: 1,
    reviewedAt: null,
    archivedAt: null,
    updatedAt: baseDate,
    _count: { reviewEvents: 0, sourceRecords: 0 },
  };

  const db: any = {
    matchSuggestion: {
      async findUnique(args: any) {
        calls.push(["matchSuggestion.findUnique", args]);
        if (args.where.id !== suggestionId) return null;
        return {
          ...row,
          _count: {
            ...row._count,
            reviewEvents: events.length,
          },
        };
      },
      async update(args: any) {
        calls.push(["matchSuggestion.update", args]);
        row.status = args.data.status;
        row.reviewedAt = args.data.reviewedAt ?? row.reviewedAt;
        row.archivedAt = Object.prototype.hasOwnProperty.call(args.data, "archivedAt") ? args.data.archivedAt : row.archivedAt;
        row.updatedAt = new Date("2026-06-09T00:01:00.000Z");
        return row;
      },
    },
    matchSuggestionReviewEvent: {
      async create(args: any) {
        calls.push(["matchSuggestionReviewEvent.create", args]);
        events.push(args.data);
        return args.data;
      },
    },
    async $transaction(fn: any) {
      calls.push(["$transaction", null]);
      return fn(db);
    },
  };

  return { db, calls, events, row };
}

function assertNoForbiddenWriteCalls(calls: Array<[string, any]>) {
  for (const [name] of calls) {
    assert.doesNotMatch(name, /(?:project|person|proposal|distributionLog|import|sourceRecord|mail|draft)\./i);
  }
}

assert.deepEqual(matchSuggestionReviewUpdateGuard({}), {
  allowed: false,
  enabled: false,
  target: "not-staging",
});
assert.deepEqual(matchSuggestionReviewUpdateGuard({
  MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED: "true",
  MATCH_SUGGESTION_REVIEW_WRITE_TARGET: "staging",
}), {
  allowed: true,
  enabled: true,
  target: "staging",
});
assert.deepEqual(matchSuggestionReviewUpdateGuard({
  MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED: "true",
  MATCH_SUGGESTION_REVIEW_WRITE_TARGET: "production",
}), {
  allowed: false,
  enabled: true,
  target: "not-staging",
});
assert.equal(disabledMatchSuggestionReviewUpdateResponse().writeAttempted, false);

assert.equal(isMatchSuggestionReviewUpdateUser({ id: userId, role: "ADMIN" }), true);
assert.equal(isMatchSuggestionReviewUpdateUser({ id: userId, role: "MANAGER" }), true);
assert.equal(isMatchSuggestionReviewUpdateUser({ id: userId, role: "SALES" }), false);
assert.equal(isMatchSuggestionReviewUpdateUser({ id: userId, role: "VIEWER" }), false);
assert.equal(isMatchSuggestionReviewUpdateUser(null), false);
assert.equal(isMatchSuggestionReviewUpdateUser({ id: userId, role: "ADMIN", isActive: false }), false);

assert.deepEqual(validateMatchSuggestionReviewUpdateBody(validBody({ suggestionId }), suggestionId), {
  suggestionId,
  action: "APPROVE",
  toStatus: "APPROVED",
  reasonCodes: ["REVIEWED_OK"],
  expectedStatus: null,
  expectedUpdatedAt: null,
  noteRedacted: null,
});

assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody(), "not-a-uuid"),
  /Invalid match suggestion id/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ suggestionId: otherSuggestionId }), suggestionId),
  /suggestionId/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ confirmReviewAction: false }), suggestionId),
  /confirmReviewAction/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ action: "DELETE" }), suggestionId),
  /action/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ toStatus: "DELETED" }), suggestionId),
  /toStatus/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ reasonCodes: ["bad email " + unsafeAddress] }), suggestionId),
  /reasonCodes|unsafe raw or PII/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ rawProjectText: "raw payload" }), suggestionId),
  /unsupported|unsafe raw or PII/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ localPath }), suggestionId),
  /unsupported|unsafe raw or PII/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ noteRedacted: "free form note" }), suggestionId),
  /noteRedacted/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ action: "REJECT", toStatus: "REJECTED", reasonCodes: [] }), suggestionId),
  /REJECT requires/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ action: "ARCHIVE", toStatus: "ARCHIVED", reasonCodes: [] }), suggestionId),
  /ARCHIVE requires/,
);
assert.throws(
  () => validateMatchSuggestionReviewUpdateBody(validBody({ action: "RESTORE", toStatus: "NEEDS_REVIEW", reasonCodes: [] }), suggestionId),
  /RESTORE requires/,
);

const allowedTransitions = [
  ["SUGGESTED", "REQUEST_REVIEW", "NEEDS_REVIEW", "REVIEW_REQUESTED"],
  ["SUGGESTED", "APPROVE", "APPROVED", "APPROVED"],
  ["SUGGESTED", "REJECT", "REJECTED", "REJECTED"],
  ["SUGGESTED", "ARCHIVE", "ARCHIVED", "ARCHIVED"],
  ["NEEDS_REVIEW", "KEEP_SUGGESTED", "SUGGESTED", "REOPENED"],
  ["NEEDS_REVIEW", "APPROVE", "APPROVED", "APPROVED"],
  ["NEEDS_REVIEW", "REJECT", "REJECTED", "REJECTED"],
  ["NEEDS_REVIEW", "ARCHIVE", "ARCHIVED", "ARCHIVED"],
  ["APPROVED", "REQUEST_REVIEW", "NEEDS_REVIEW", "REVIEW_REQUESTED"],
  ["APPROVED", "ARCHIVE", "ARCHIVED", "ARCHIVED"],
  ["REJECTED", "REQUEST_REVIEW", "NEEDS_REVIEW", "REVIEW_REQUESTED"],
  ["REJECTED", "ARCHIVE", "ARCHIVED", "ARCHIVED"],
  ["ARCHIVED", "RESTORE", "NEEDS_REVIEW", "REOPENED"],
] as const;

const noOpTransitions = [
  ["SUGGESTED", "KEEP_SUGGESTED", "SUGGESTED"],
  ["NEEDS_REVIEW", "REQUEST_REVIEW", "NEEDS_REVIEW"],
  ["APPROVED", "APPROVE", "APPROVED"],
  ["REJECTED", "REJECT", "REJECTED"],
  ["ARCHIVED", "ARCHIVE", "ARCHIVED"],
] as const;

async function main() {
  for (const [fromStatus, action, toStatus, eventAction] of allowedTransitions) {
    const mock = createMockDb(fromStatus);
    const result = await updateMatchSuggestionReviewSupervised(
      mock.db,
      suggestionId,
      validBody({ action, toStatus, reasonCodes: ["REVIEW_REASON"] }),
      { id: userId, role: "ADMIN" } as any,
    );
    assert.equal(result.updated, true, `${fromStatus} ${action}`);
    assert.equal(result.skippedNoop, false);
    assert.equal(result.writeAttempted, true);
    assert.equal(result.suggestion.status, toStatus);
    assert.equal(mock.events.length, 1);
    assert.equal(mock.events[0].action, eventAction);
    assert.equal(mock.events[0].fromStatus, fromStatus);
    assert.equal(mock.events[0].toStatus, toStatus);
    assert.equal(mock.events[0].actor.connect.id, userId);
    assert.equal(mock.events[0].noteRedacted, null);
    assert.equal(mock.calls.filter(([name]) => name === "$transaction").length, 1);
    assert.equal(mock.calls.filter(([name]) => name === "matchSuggestion.update").length, 1);
    assert.equal(mock.calls.filter(([name]) => name === "matchSuggestionReviewEvent.create").length, 1);
    assertNoForbiddenWriteCalls(mock.calls);
  }

  for (const [fromStatus, action, toStatus] of noOpTransitions) {
    const mock = createMockDb(fromStatus);
    const result = await updateMatchSuggestionReviewSupervised(
      mock.db,
      suggestionId,
      validBody({ action, toStatus, reasonCodes: ["NOOP_REASON"] }),
      { id: userId, role: "MANAGER" } as any,
    );
    assert.equal(result.updated, false, `${fromStatus} ${action}`);
    assert.equal(result.skippedNoop, true);
    assert.equal(result.writeAttempted, false);
    assert.equal(mock.events.length, 0);
    assert.equal(mock.calls.some(([name]) => name === "$transaction"), false);
    assert.equal(mock.calls.some(([name]) => name === "matchSuggestion.update"), false);
    assert.equal(mock.calls.some(([name]) => name === "matchSuggestionReviewEvent.create"), false);
    assertNoForbiddenWriteCalls(mock.calls);
  }

  for (const [fromStatus, action, toStatus] of [
    ["APPROVED", "REJECT", "REJECTED"],
    ["REJECTED", "APPROVE", "APPROVED"],
    ["ARCHIVED", "APPROVE", "APPROVED"],
    ["SUGGESTED", "RESTORE", "NEEDS_REVIEW"],
  ] as const) {
    const mock = createMockDb(fromStatus);
    await assert.rejects(
      () => updateMatchSuggestionReviewSupervised(
        mock.db,
        suggestionId,
        validBody({ action, toStatus, reasonCodes: ["INVALID_REASON"] }),
        { id: userId, role: "ADMIN" } as any,
      ),
      (error: unknown) => error instanceof MatchSuggestionReviewUpdateRequestError && error.status === 409,
      `${fromStatus} ${action} should be invalid`,
    );
    assert.equal(mock.events.length, 0);
    assert.equal(mock.calls.some(([name]) => name === "$transaction"), false);
  }

  const mismatchMock = createMockDb("SUGGESTED");
  await assert.rejects(
    () => updateMatchSuggestionReviewSupervised(
      mismatchMock.db,
      suggestionId,
      validBody({ action: "APPROVE", toStatus: "NEEDS_REVIEW" }),
      { id: userId, role: "ADMIN" } as any,
    ),
    /toStatus/,
  );
  assert.equal(mismatchMock.events.length, 0);

  const staleStatusMock = createMockDb("SUGGESTED");
  await assert.rejects(
    () => updateMatchSuggestionReviewSupervised(
      staleStatusMock.db,
      suggestionId,
      validBody({ expectedStatus: "NEEDS_REVIEW" }),
      { id: userId, role: "ADMIN" } as any,
    ),
    /status changed/,
  );

  const staleTimeMock = createMockDb("SUGGESTED");
  await assert.rejects(
    () => updateMatchSuggestionReviewSupervised(
      staleTimeMock.db,
      suggestionId,
      validBody({ expectedUpdatedAt: "2026-06-09T10:00:00.000Z" }),
      { id: userId, role: "ADMIN" } as any,
    ),
    /changed before/,
  );

  const missingMock = createMockDb("SUGGESTED");
  await assert.rejects(
    () => updateMatchSuggestionReviewSupervised(
      missingMock.db,
      otherSuggestionId,
      validBody({ suggestionId: otherSuggestionId }),
      { id: userId, role: "ADMIN" } as any,
    ),
    (error: unknown) => error instanceof MatchSuggestionReviewUpdateRequestError && error.status === 404,
  );

  const forbiddenMock = createMockDb("SUGGESTED");
  await assert.rejects(
    () => updateMatchSuggestionReviewSupervised(
      forbiddenMock.db,
      suggestionId,
      validBody(),
      { id: userId, role: "SALES" } as any,
    ),
    (error: unknown) => error instanceof MatchSuggestionReviewUpdateRequestError && error.status === 403,
  );
  assert.equal(forbiddenMock.calls.length, 0);

  const route = readFileSync("app/api/matches/suggestions/[id]/review/route.ts", "utf8");
  assert.match(route, /export\s+async\s+function\s+PATCH\b/);
  assert.doesNotMatch(route, /export\s+async\s+function\s+(?:POST|PUT|DELETE)\b/);
  assert.match(route, /matchSuggestionReviewUpdateGuard/);
  assert.match(route, /request\.json\(\)/);
  assert.ok(route.indexOf("matchSuggestionReviewUpdateGuard") < route.indexOf("request.json()"));
  assert.match(route, /matchSuggestionMigrationRequiredResponse\("suggestion-review-update"\)/);

  const helperSource = readFileSync("lib/match-suggestion-review-update.ts", "utf8");
  assert.match(helperSource, /matchSuggestion\.update\(/);
  assert.match(helperSource, /matchSuggestionReviewEvent\.create\(/);
  assert.match(helperSource, /\$transaction\s*\(/);
  assert.doesNotMatch(helperSource, /\b(?:project|person|proposal|distributionLog|importRun|importSource|sourceRecord|mailNotification)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(helperSource, /\b(?:draft|email|message)\w*\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/i);

  const migrationRequired = matchSuggestionMigrationRequiredResponse("suggestion-review-update");
  assert.equal(migrationRequired.migrationRequired, true);
  assert.equal(isMatchSuggestionMigrationRequiredError({ code: "P2021", message: "table does not exist" }), true);

  const serialized = JSON.stringify({
    disabled: disabledMatchSuggestionReviewUpdateResponse(),
    migrationRequired,
    example: await updateMatchSuggestionReviewSupervised(
      createMockDb("SUGGESTED").db,
      suggestionId,
      validBody(),
      { id: userId, role: "ADMIN" } as any,
    ),
  });
  assertNoSensitiveMatchSuggestionReviewUpdateOutput(serialized);
  assert.equal(serialized.includes(unsafeAddress), false);
  assert.equal(serialized.includes(localPath), false);
  assert.equal(serialized.includes("raw payload"), false);

  console.log("match suggestion review update tests passed");
}

main().catch((error) => {
  if (!(error instanceof MatchSuggestionReviewUpdateRequestError)) {
    console.error(error);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
