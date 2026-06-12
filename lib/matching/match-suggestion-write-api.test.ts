import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS } from "./match-suggestion-schema";
import {
  archiveMatchSuggestion,
  buildSavePayloadHash,
  buildWriteApiErrorResponse,
  createSaveConfirmationToken,
  decideMatchSuggestion,
  MatchSuggestionWriteApiError,
  reopenMatchSuggestion,
  saveMatchSuggestion,
  type MatchSuggestionSavePayload,
} from "./match-suggestion-write-api";

const TENANT_ID = "tenant-a";
const ACTOR = { id: "33333333-3333-4333-8333-333333333333" };
const SUGGESTION_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const PERSON_ID = "22222222-2222-4222-8222-222222222222";

describe("match suggestion write API helpers", () => {
  it("creates a supervised save with a safe SAVED event and no downstream promotion", async () => {
    const payload = withConfirmationToken(
      makeSavePayload({
        score: "0.8",
        scoringVersion: "client-score-v999",
        taxonomyVersion: "client-taxonomy-v999",
        redactionPolicyVersion: "client-redaction-v999",
      }),
    );
    const calls = createSaveCalls();
    const prismaMock = createSavePrismaMock({
      calls,
      existingIdempotency: null,
      duplicateRecord: null,
      savedRecord: makeSuggestionRecord({ status: "SUGGESTED" }),
    });

    const result = await saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders());

    assert.equal(result.duplicate, false);
    assert.equal(result.idempotentReplay, false);
    assert.equal(result.item.status, "SUGGESTED");
    assert.equal(result.item.promotionEligible, false);
    assert.equal(result.item.downstreamReadiness, "BLOCKED");
    assert.equal(calls.createdSuggestions.length, 1);
    assert.equal(calls.createdSuggestions[0].data.score, "0.8000");
    assert.equal(calls.createdSuggestions[0].data.scoringVersion, "manual-v1");
    assert.equal(calls.createdSuggestions[0].data.taxonomyVersion, "match-taxonomy-v1");
    assert.equal(calls.createdSuggestions[0].data.redactionPolicyVersion, "redaction-v1");
    assert.equal(calls.createdSourceRecords.length, 1);
    assert.equal(calls.createdEvents.length, 1);
    assert.equal(calls.createdIdempotencyRecords.length, 1);
    assert.equal(calls.createdEvents[0].data.eventType, "SAVED");
    assert.equal(calls.createdEvents[0].data.systemSnapshot.payloadHash, buildSavePayloadHash(TENANT_ID, payload));
    assert.equal(calls.createdIdempotencyRecords[0].data.requestFingerprint, buildSavePayloadHash(TENANT_ID, payload));
    assert.equal(calls.createdIdempotencyRecords[0].data.resultType, "CREATED");
    assertNoForbiddenKeys(result.item);
  });

  it("replays the same Idempotency-Key and same payload without another transaction", async () => {
    const payload = withConfirmationToken(makeSavePayload());
    const calls = createSaveCalls();
    const prismaMock = createSavePrismaMock({
      calls,
      existingIdempotency: {
        suggestionId: SUGGESTION_ID,
        requestFingerprint: buildSavePayloadHash(TENANT_ID, payload),
        resultType: "CREATED",
      },
      replayRecord: makeSuggestionRecord({ id: SUGGESTION_ID }),
    });

    const result = await saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders());

    assert.equal(result.idempotentReplay, true);
    assert.equal(result.duplicate, false);
    assert.equal(result.item.id, SUGGESTION_ID);
    assert.equal(calls.transactions, 0);
    assert.equal(calls.createdEvents.length, 0);
  });

  it("rejects the same Idempotency-Key with a different payload", async () => {
    const payload = withConfirmationToken(makeSavePayload());
    const prismaMock = createSavePrismaMock({
      calls: createSaveCalls(),
      existingIdempotency: {
        suggestionId: SUGGESTION_ID,
        requestFingerprint: "different-payload",
        resultType: "CREATED",
      },
    });

    await assert.rejects(
      () => saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders()),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "IDEMPOTENCY_PAYLOAD_MISMATCH",
    );
  });

  it("records duplicate saves under the Idempotency-Key without creating suggestion or review event spam", async () => {
    const payload = withConfirmationToken(makeSavePayload());
    const calls = createSaveCalls();
    const duplicateRecord = makeSuggestionRecord({ id: SUGGESTION_ID, status: "NEEDS_REVIEW" });
    const prismaMock = createSavePrismaMock({
      calls,
      existingIdempotency: null,
      duplicateRecord,
      savedRecord: duplicateRecord,
    });

    const result = await saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders());

    assert.equal(result.duplicate, true);
    assert.equal(result.item.id, SUGGESTION_ID);
    assert.equal(calls.createdSuggestions.length, 0);
    assert.equal(calls.createdEvents.length, 0);
    assert.equal(calls.createdIdempotencyRecords.length, 1);
    assert.equal(calls.createdIdempotencyRecords[0].data.suggestionId, SUGGESTION_ID);
    assert.equal(calls.createdIdempotencyRecords[0].data.resultType, "DUPLICATE");
  });

  it("replays duplicate idempotency without adding another review event", async () => {
    const payload = withConfirmationToken(makeSavePayload());
    const calls = createSaveCalls();
    const prismaMock = createSavePrismaMock({
      calls,
      existingIdempotency: {
        suggestionId: SUGGESTION_ID,
        requestFingerprint: buildSavePayloadHash(TENANT_ID, payload),
        resultType: "DUPLICATE",
      },
      replayRecord: makeSuggestionRecord({ id: SUGGESTION_ID, status: "NEEDS_REVIEW" }),
    });

    const result = await saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders());

    assert.equal(result.duplicate, true);
    assert.equal(result.idempotentReplay, true);
    assert.equal(calls.transactions, 0);
    assert.equal(calls.createdEvents.length, 0);
    assert.equal(calls.createdIdempotencyRecords.length, 0);
  });

  it("rejects forbidden PII/raw payload keys before persistence", async () => {
    const payload = withConfirmationToken({
      ...makeSavePayload(),
      sourceRecords: [
        {
          sourceType: "MANUAL",
          sourceRecordId: "source-1",
          evidenceRole: "OPTIONAL",
          safeSummary: "safe summary only",
          rawCsvRow: "must never be accepted",
        },
      ],
    } as unknown as MatchSuggestionSavePayload);
    const calls = createSaveCalls();
    const prismaMock = createSavePrismaMock({ calls });

    await assert.rejects(
      () => saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders()),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "INVALID_PAYLOAD",
    );
    assert.equal(calls.transactions, 0);
    assert.equal(calls.createdSuggestions.length, 0);
  });

  it("rejects PII-like safeSummary text before persistence", async () => {
    const payload = withConfirmationToken({
      ...makeSavePayload(),
      sourceRecords: [
        {
          sourceType: "MANUAL",
          sourceRecordId: "source-1",
          evidenceRole: "OPTIONAL",
          safeSummary: "contact hidden@example.test for raw details",
        },
      ],
    });
    const calls = createSaveCalls();
    const prismaMock = createSavePrismaMock({ calls });

    await assert.rejects(
      () => saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders()),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "INVALID_PAYLOAD",
    );
    assert.equal(calls.transactions, 0);
  });

  it("validates referenced project and person exist before creating a suggestion", async () => {
    const payload = withConfirmationToken(makeSavePayload());
    const calls = createSaveCalls();
    const prismaMock = createSavePrismaMock({
      calls,
      projectRecord: null,
      personRecord: { id: PERSON_ID },
    });

    await assert.rejects(
      () => saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders()),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "PROJECT_NOT_FOUND",
    );
    assert.equal(calls.transactions, 0);
    assert.equal(calls.createdSuggestions.length, 0);
  });

  it("validates source record enums for supervised saves", async () => {
    const payload = withConfirmationToken({
      ...makeSavePayload(),
      sourceRecords: [
        {
          sourceType: "RAW_MAIL" as any,
          sourceRecordId: "source-1",
          evidenceRole: "OPTIONAL",
          safeSummary: "safe summary only",
        },
      ],
    });
    const prismaMock = createSavePrismaMock({ calls: createSaveCalls() });

    await assert.rejects(
      () => saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders()),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "INVALID_PAYLOAD",
    );
  });

  it("rejects out-of-range client scores before persistence", async () => {
    const payload = { ...makeSavePayload({ score: "9.9" }), confirmationToken: "confirm:invalid" };
    const calls = createSaveCalls();
    const prismaMock = createSavePrismaMock({ calls });

    await assert.rejects(
      () => saveMatchSuggestion(prismaMock, TENANT_ID, payload, ACTOR, idempotentHeaders()),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "INVALID_PAYLOAD",
    );
    assert.equal(calls.transactions, 0);
  });

  it("approves with tenant-scoped optimistic locking and an append-only event", async () => {
    const calls = createTransitionCalls();
    const prismaMock = createTransitionPrismaMock({
      calls,
      currentRecord: makeTransitionRecord({
        status: "SUGGESTED",
        lockVersion: 3,
        promotionBlockers: [],
        stalenessState: "FRESH",
        duplicateState: "NONE",
        sourceEvidenceState: "OPTIONAL_PRESENT",
        warningSeverity: "NONE",
      }),
      updatedRecord: makeSuggestionRecord({
        status: "APPROVED",
        lockVersion: 4,
        downstreamReadiness: "NEEDS_CHECK",
      }),
    });

    const result = await decideMatchSuggestion(
      prismaMock,
      TENANT_ID,
      SUGGESTION_ID,
      "approve",
      {},
      ACTOR,
      new Headers({ "If-Match": 'W/"3"', "x-request-id": "req-approve" }),
    );

    assert.equal(result.item.status, "APPROVED");
    assert.deepEqual(calls.updateMany[0].where, {
      id: SUGGESTION_ID,
      tenantId: TENANT_ID,
      lockVersion: 3,
    });
    assert.equal(calls.updateMany[0].data.status, "APPROVED");
    assert.equal(calls.updateMany[0].data.promotionEligible, false);
    assert.equal(calls.updateMany[0].data.downstreamReadiness, "NEEDS_CHECK");
    assert.equal(calls.createdEvents[0].data.eventType, "APPROVED");
    assert.equal(calls.createdEvents[0].data.requestId, "req-approve");
  });

  it("requires a reason for reject and does not start the transaction", async () => {
    const calls = createTransitionCalls();
    const prismaMock = createTransitionPrismaMock({
      calls,
      currentRecord: makeTransitionRecord({ status: "SUGGESTED", lockVersion: 0 }),
    });

    await assert.rejects(
      () =>
        decideMatchSuggestion(
          prismaMock,
          TENANT_ID,
          SUGGESTION_ID,
          "reject",
          { lockVersion: 0 },
          ACTOR,
          new Headers(),
        ),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "REASON_REQUIRED",
    );
    assert.equal(calls.transactions, 0);
  });

  it("rejects illegal transitions and stale lock versions", async () => {
    await assert.rejects(
      () =>
        decideMatchSuggestion(
          createTransitionPrismaMock({
            calls: createTransitionCalls(),
            currentRecord: makeTransitionRecord({ status: "APPROVED", lockVersion: 0 }),
          }),
          TENANT_ID,
          SUGGESTION_ID,
          "approve",
          { lockVersion: 0 },
          ACTOR,
          new Headers(),
        ),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "ILLEGAL_TRANSITION",
    );

    const calls = createTransitionCalls();
    await assert.rejects(
      () =>
        archiveMatchSuggestion(
          createTransitionPrismaMock({
            calls,
            currentRecord: makeTransitionRecord({ status: "NEEDS_REVIEW", lockVersion: 2 }),
          }),
          TENANT_ID,
          SUGGESTION_ID,
          { lockVersion: 1 },
          ACTOR,
          new Headers(),
        ),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "LOCK_VERSION_MISMATCH",
    );
    assert.equal(calls.transactions, 0);
  });

  it("does not append a review event when transaction-time lock update fails", async () => {
    const calls = createTransitionCalls();
    const prismaMock = createTransitionPrismaMock({
      calls,
      currentRecord: makeTransitionRecord({ status: "NEEDS_REVIEW", lockVersion: 2 }),
      updateCount: 0,
    });

    await assert.rejects(
      () =>
        archiveMatchSuggestion(
          prismaMock,
          TENANT_ID,
          SUGGESTION_ID,
          { lockVersion: 2 },
          ACTOR,
          new Headers(),
        ),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "LOCK_VERSION_MISMATCH",
    );
    assert.equal(calls.transactions, 1);
    assert.equal(calls.updateMany.length, 1);
    assert.equal(calls.createdEvents.length, 0);
  });

  it("reopens only with an allowed MVP reason and blocks OTHER", async () => {
    const calls = createTransitionCalls();
    const prismaMock = createTransitionPrismaMock({
      calls,
      currentRecord: makeTransitionRecord({ status: "REJECTED", lockVersion: 1 }),
      updatedRecord: makeSuggestionRecord({ status: "NEEDS_REVIEW", lockVersion: 2 }),
    });

    const result = await reopenMatchSuggestion(
      prismaMock,
      TENANT_ID,
      SUGGESTION_ID,
      { reasonCode: "SOURCE_UPDATED", lockVersion: 1 },
      ACTOR,
      new Headers(),
    );

    assert.equal(result.item.status, "NEEDS_REVIEW");
    assert.equal(calls.createdEvents[0].data.eventType, "REOPENED");
    assert.equal(calls.createdEvents[0].data.reasonCode, "SOURCE_UPDATED");

    await assert.rejects(
      () =>
        reopenMatchSuggestion(
          createTransitionPrismaMock({
            calls: createTransitionCalls(),
            currentRecord: makeTransitionRecord({ status: "ARCHIVED", lockVersion: 1 }),
          }),
          TENANT_ID,
          SUGGESTION_ID,
          { reasonCode: "OTHER", lockVersion: 1 },
          ACTOR,
          new Headers(),
        ),
      (error) => error instanceof MatchSuggestionWriteApiError && error.code === "REASON_NOT_ALLOWED",
    );
  });

  it("maps migration-not-applied write failures to a safe 503", () => {
    assert.deepEqual(buildWriteApiErrorResponse({ code: "P2021" }), {
      status: 503,
      body: {
        message: "Match suggestion schema is not ready",
        code: "MATCH_SUGGESTION_SCHEMA_NOT_READY",
      },
    });
  });

  it("keeps mutation routes ADMIN/MANAGER-only and away from proposal/email/AI integrations", () => {
    const routeFiles = [
      "../../app/api/matches/suggestions/route.ts",
      "../../app/api/matches/suggestions/[id]/decision/route.ts",
      "../../app/api/matches/suggestions/[id]/archive/route.ts",
      "../../app/api/matches/suggestions/[id]/reopen/route.ts",
    ];
    for (const routeFile of routeFiles) {
      const source = readFileSync(new URL(routeFile, import.meta.url), "utf8");
      assert.match(source, /requireAnyRole\(request, \["ADMIN", "MANAGER"\]\)/);
      assert.doesNotMatch(source, /DistributionLog|distributionLog|proposalDraft|emailDraft|emailSend|aiApiCall|openai|mailer|gmail/i);
    }
  });

  it("does not connect the write service to Proposal/email/DistributionLog/AI modules", () => {
    const source = readFileSync(new URL("./match-suggestion-write-api.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /DistributionLog|distributionLog|proposalDraft|emailDraft|emailSend|aiApiCall|openai|mailer|gmail/i);
  });
});

function makeSavePayload(overrides: Partial<MatchSuggestionSavePayload> = {}): MatchSuggestionSavePayload {
  return {
    projectId: PROJECT_ID,
    personId: PERSON_ID,
    suggestionPairKey: `${PROJECT_ID}:${PERSON_ID}`,
    suggestionRevisionKey: `${PROJECT_ID}:${PERSON_ID}:v1`,
    score: "0.8123",
    scoreBand: "HIGH",
    systemReasonCodes: ["RATE_MATCH", "SKILL_MATCH"],
    systemWarningCodes: [],
    warningSeverity: "NONE",
    stalenessState: "UNKNOWN",
    duplicateState: "NONE",
    sourceEvidenceState: "OPTIONAL_PRESENT",
    sourceRecords: [
      {
        sourceType: "MANUAL",
        sourceRecordId: "safe-source-1",
        evidenceRole: "OPTIONAL",
        safeSummary: "skill and rate overlap",
      },
    ],
    ...overrides,
  };
}

function withConfirmationToken<T extends MatchSuggestionSavePayload>(payload: T): T {
  return {
    ...payload,
    confirmationToken: createSaveConfirmationToken(payload),
  };
}

function idempotentHeaders(idempotencyKey = "idem-1") {
  return new Headers({ "Idempotency-Key": idempotencyKey, "x-request-id": "req-1" });
}

function makeSuggestionRecord(overrides: Record<string, any> = {}) {
  return {
    id: SUGGESTION_ID,
    tenantId: TENANT_ID,
    organizationId: null,
    projectId: PROJECT_ID,
    personId: PERSON_ID,
    suggestionPairKey: `${PROJECT_ID}:${PERSON_ID}`,
    suggestionRevisionKey: `${PROJECT_ID}:${PERSON_ID}:v1`,
    status: "SUGGESTED",
    score: { toString: () => "0.8123" },
    scoreBand: "HIGH",
    systemReasonCodes: ["SKILL_MATCH"],
    systemWarningCodes: [],
    warningSeverity: "NONE",
    stalenessState: "UNKNOWN",
    duplicateState: "NONE",
    sourceEvidenceState: "OPTIONAL_PRESENT",
    attentionState: "NORMAL",
    promotionBlockers: [],
    promotionEligible: false,
    downstreamReadiness: "BLOCKED",
    createdByUserId: ACTOR.id,
    createdAt: new Date("2026-06-09T00:00:00.000Z"),
    updatedAt: new Date("2026-06-09T00:00:00.000Z"),
    lastReviewedAt: null,
    lastReviewedByUserId: null,
    lockVersion: 0,
    scoringVersion: "manual-v1",
    taxonomyVersion: "match-taxonomy-v1",
    redactionPolicyVersion: "redaction-v1",
    reviewEvents: [],
    sourceRecords: [],
    ...overrides,
  };
}

function makeTransitionRecord(overrides: Record<string, any> = {}) {
  return {
    id: SUGGESTION_ID,
    tenantId: TENANT_ID,
    organizationId: null,
    status: "SUGGESTED",
    lockVersion: 0,
    promotionBlockers: [],
    stalenessState: "UNKNOWN",
    duplicateState: "NONE",
    sourceEvidenceState: "OPTIONAL_PRESENT",
    warningSeverity: "NONE",
    ...overrides,
  };
}

function createSaveCalls() {
  return {
    transactions: 0,
    createdSuggestions: [] as any[],
    createdSourceRecords: [] as any[],
    createdEvents: [] as any[],
    createdIdempotencyRecords: [] as any[],
  };
}

function createSavePrismaMock(options: {
  calls: ReturnType<typeof createSaveCalls>;
  existingIdempotency?: any;
  duplicateRecord?: any;
  savedRecord?: any;
  replayRecord?: any;
  projectRecord?: any;
  personRecord?: any;
} = { calls: createSaveCalls() }) {
  const savedRecord = options.savedRecord || makeSuggestionRecord();
  return createGuardedPrismaMock({
    matchSuggestionIdempotencyRecord: {
      findFirst: async () => options.existingIdempotency ?? null,
    },
    project: {
      findFirst: async () => (options.projectRecord === undefined ? { id: PROJECT_ID } : options.projectRecord),
    },
    person: {
      findFirst: async () => (options.personRecord === undefined ? { id: PERSON_ID } : options.personRecord),
    },
    matchSuggestion: {
      findFirst: async (args: any) => {
        if (args.where?.id) return options.replayRecord || savedRecord;
        return options.duplicateRecord ?? null;
      },
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      options.calls.transactions += 1;
      return callback({
        matchSuggestion: {
          create: async (args: any) => {
            options.calls.createdSuggestions.push(args);
            return { id: savedRecord.id };
          },
          findFirst: async () => savedRecord,
        },
        matchSuggestionSourceRecord: {
          createMany: async (args: any) => {
            options.calls.createdSourceRecords.push(args);
            return { count: args.data.length };
          },
        },
        matchSuggestionReviewEvent: {
          create: async (args: any) => {
            options.calls.createdEvents.push(args);
            return { id: "event-1" };
          },
        },
        matchSuggestionIdempotencyRecord: {
          create: async (args: any) => {
            options.calls.createdIdempotencyRecords.push(args);
            return { id: "idempotency-1" };
          },
        },
      });
    },
  });
}

function createTransitionCalls() {
  return {
    transactions: 0,
    updateMany: [] as any[],
    createdEvents: [] as any[],
  };
}

function createTransitionPrismaMock(options: {
  calls: ReturnType<typeof createTransitionCalls>;
  currentRecord: any;
  updatedRecord?: any;
  updateCount?: number;
}) {
  return createGuardedPrismaMock({
    matchSuggestion: {
      findFirst: async () => options.currentRecord,
    },
    $transaction: async (callback: (tx: any) => Promise<unknown>) => {
      options.calls.transactions += 1;
      return callback({
        matchSuggestion: {
          updateMany: async (args: any) => {
            options.calls.updateMany.push(args);
            return { count: options.updateCount ?? 1 };
          },
          findFirst: async () => options.updatedRecord || makeSuggestionRecord(),
        },
        matchSuggestionReviewEvent: {
          create: async (args: any) => {
            options.calls.createdEvents.push(args);
            return { id: "event-1" };
          },
        },
      });
    },
  });
}

function createGuardedPrismaMock(base: Record<string, unknown>) {
  return new Proxy(base, {
    get(target, property) {
      if (["proposal", "distributionLog", "mailNotification", "ai"].includes(String(property))) {
        throw new Error(`${String(property)} must not be touched by match suggestion Phase 1 mutations`);
      }
      return (target as Record<string, unknown>)[String(property)];
    },
  });
}

function assertNoForbiddenKeys(value: unknown) {
  const keys = collectKeys(value);
  const forbiddenKeys = new Set<string>(MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS as readonly string[]);
  for (const key of keys) {
    assert.equal(forbiddenKeys.has(key), false, `${key} must not be present in API response`);
  }
}

function collectKeys(value: unknown, result = new Set<string>()) {
  if (!value || typeof value !== "object") return result;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, result);
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    result.add(key);
    collectKeys(child, result);
  }
  return result;
}
