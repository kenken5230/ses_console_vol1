import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS } from "./match-suggestion-schema";
import {
  buildSuggestionOrderBy,
  buildSuggestionWhere,
  computeReviewQueuePriority,
  fetchSuggestionDetail,
  fetchSuggestionList,
  isMatchSuggestionSchemaMissingError,
  MatchSuggestionReadApiError,
  parseSuggestionListQuery,
  parseTenantContext,
  serializeSuggestionDetail,
  serializeSuggestionListItem,
  serializeReviewQueueItem,
} from "./match-suggestion-read-api";

const now = new Date("2026-06-09T00:00:00.000Z");

const baseRecord = {
  id: "suggestion-1",
  tenantId: "tenant-a",
  organizationId: null,
  projectId: "project-1",
  personId: "person-1",
  suggestionPairKey: "project-1:person-1",
  suggestionRevisionKey: "project-1:person-1:v1",
  status: "NEEDS_REVIEW",
  score: { toString: () => "0.8123" },
  scoreBand: "HIGH",
  systemReasonCodes: ["SKILL_MATCH"],
  systemWarningCodes: ["STALE_PROJECT"],
  warningSeverity: "HIGH",
  stalenessState: "STALE",
  duplicateState: "POSSIBLE_DUPLICATE",
  sourceEvidenceState: "OPTIONAL_PRESENT",
  attentionState: "NEEDS_ATTENTION",
  promotionBlockers: ["STALE_PROJECT"],
  promotionEligible: false,
  downstreamReadiness: "NEEDS_CHECK",
  createdAt: new Date("2026-06-07T00:00:00.000Z"),
  updatedAt: new Date("2026-06-08T00:00:00.000Z"),
  lastReviewedAt: null,
  lockVersion: 0,
  scoringVersion: "score-v1",
  taxonomyVersion: "taxonomy-v1",
  redactionPolicyVersion: "redaction-v1",
  createdByUserId: "user-1",
  lastReviewedByUserId: null,
  reviewEvents: [
    {
      id: "event-1",
      eventType: "SAVED",
      fromStatus: null,
      toStatus: "NEEDS_REVIEW",
      actorUserId: "user-1",
      reasonCode: null,
      createdAt: new Date("2026-06-07T00:00:00.000Z"),
      requestId: "req-1",
      idempotencyKey: "idem-1",
      systemSnapshot: { unsafe: "not-selected" },
    },
  ],
  sourceRecords: [
    {
      id: "source-1",
      sourceType: "CSV_IMPORT",
      sourceRecordId: "csv-row-1",
      evidenceRole: "OPTIONAL",
      safeSummary: "skill overlap summary",
      createdAt: new Date("2026-06-07T00:00:00.000Z"),
    },
  ],
};

describe("match suggestion read API helpers", () => {
  it("parses tenant from query before header", () => {
    const url = new URL("https://example.test/api/matches/suggestions?tenantId=tenant-query");
    const headers = new Headers({ "x-tenant-id": "tenant-header" });

    assert.equal(parseTenantContext(url, headers), "tenant-query");
  });

  it("rejects missing or invalid tenant before DB access", () => {
    assert.throws(
      () => parseTenantContext(new URL("https://example.test/api/matches/suggestions"), new Headers()),
      (error) => error instanceof MatchSuggestionReadApiError && error.code === "TENANT_REQUIRED",
    );

    assert.throws(
      () =>
        parseTenantContext(
          new URL("https://example.test/api/matches/suggestions?tenantId=bad/tenant"),
          new Headers(),
        ),
      (error) => error instanceof MatchSuggestionReadApiError && error.code === "TENANT_INVALID",
    );
  });

  it("parses pagination, filters, and sort", () => {
    const query = parseSuggestionListQuery(
      new URL(
        "https://example.test/api/matches/suggestions?tenantId=tenant-a&page=2&pageSize=101&status=SUGGESTED,NEEDS_REVIEW&warningSeverity=HIGH&createdAtFrom=2026-06-01&sortBy=updatedAt&sortOrder=asc",
      ),
      new Headers(),
    );

    assert.equal(query.page, 2);
    assert.equal(query.pageSize, 100);
    assert.equal(query.skip, 100);
    assert.deepEqual(query.filters.status, ["SUGGESTED", "NEEDS_REVIEW"]);
    assert.deepEqual(query.filters.warningSeverity, ["HIGH"]);
    assert.equal(query.filters.createdAt?.gte?.toISOString(), "2026-06-01T00:00:00.000Z");
    assert.deepEqual(query.sort, { sortBy: "updatedAt", sortOrder: "asc" });
  });

  it("builds tenant-scoped where and deterministic orderBy", () => {
    const query = parseSuggestionListQuery(
      new URL("https://example.test/api/matches/suggestions?tenantId=tenant-a&status=SUGGESTED&sortBy=score"),
      new Headers(),
    );

    assert.deepEqual(buildSuggestionWhere(query), {
      tenantId: "tenant-a",
      status: "SUGGESTED",
    });
    assert.deepEqual(buildSuggestionOrderBy(query), [{ score: "desc" }, { id: "asc" }]);
  });

  it("limits review queue status filters to SUGGESTED and NEEDS_REVIEW", () => {
    const queueQuery = parseSuggestionListQuery(
      new URL("https://example.test/api/matches/suggestions/review-queue?tenantId=tenant-a"),
      new Headers(),
      { reviewQueue: true },
    );

    assert.deepEqual(queueQuery.filters.status, ["SUGGESTED", "NEEDS_REVIEW"]);

    assert.throws(
      () =>
        parseSuggestionListQuery(
          new URL("https://example.test/api/matches/suggestions/review-queue?tenantId=tenant-a&status=APPROVED"),
          new Headers(),
          { reviewQueue: true },
        ),
      (error) => error instanceof MatchSuggestionReadApiError && error.code === "INVALID_QUERY",
    );
  });

  it("serializes list items without PII/raw fields", () => {
    const item = serializeSuggestionListItem(baseRecord);

    assert.deepEqual(item.projectRef, { id: "project-1" });
    assert.deepEqual(item.personRef, { id: "person-1" });
    assert.equal(item.score, "0.8123");
    assert.equal(item.createdAt, "2026-06-07T00:00:00.000Z");
    assertNoForbiddenKeys(item);
  });

  it("serializes detail using safe review event and source record fields only", () => {
    const detail = serializeSuggestionDetail(baseRecord);

    assert.equal(detail.versions.scoringVersion, "score-v1");
    assert.equal(detail.reviewEvents[0].eventType, "SAVED");
    assert.equal(detail.sourceRecords[0].safeSummary, "skill overlap summary");
    assert.equal("systemSnapshot" in detail.reviewEvents[0], false);
    assertNoForbiddenKeys(detail);
  });

  it("computes review queue priority without persistence", () => {
    const item = serializeReviewQueueItem(baseRecord, now);

    assert.equal(item.queuePriority, 105);
    assert.deepEqual(item.queueReasons, [
      "STATUS_NEEDS_REVIEW",
      "WARNING_HIGH",
      "STALE",
      "POSSIBLE_DUPLICATE",
      "REVIEW_AGE_OVER_24H",
    ]);
    assert.equal(item.reviewAgeHours, 48);
  });

  it("keeps fully clean suggestions at zero queue priority", () => {
    assert.deepEqual(
      computeReviewQueuePriority({
        status: "SUGGESTED",
        warningSeverity: "NONE",
        stalenessState: "FRESH",
        duplicateState: "NONE",
        sourceEvidenceState: "OPTIONAL_PRESENT",
        reviewAgeHours: 1,
      }),
      { queuePriority: 0, queueReasons: [] },
    );
  });

  it("uses only read methods for list and detail fetchers", async () => {
    const calls: string[] = [];
    const prismaMock = {
      matchSuggestion: {
        count: async (args: unknown) => {
          calls.push(`count:${JSON.stringify(args)}`);
          return 1;
        },
        findMany: async (args: unknown) => {
          calls.push(`findMany:${JSON.stringify(args)}`);
          return [baseRecord];
        },
        findFirst: async (args: unknown) => {
          calls.push(`findFirst:${JSON.stringify(args)}`);
          return baseRecord;
        },
        create: () => {
          throw new Error("write must not be called");
        },
        update: () => {
          throw new Error("write must not be called");
        },
      },
    };
    const query = parseSuggestionListQuery(
      new URL("https://example.test/api/matches/suggestions?tenantId=tenant-a"),
      new Headers(),
    );

    const list = await fetchSuggestionList(prismaMock, query);
    const detail = await fetchSuggestionDetail(prismaMock, "tenant-a", "suggestion-1");

    assert.equal(list.items.length, 1);
    assert.equal(detail?.id, "suggestion-1");
    assert.equal(calls.some((call) => call.includes("\"tenantId\":\"tenant-a\"")), true);
    assert.equal(calls.some((call) => call.startsWith("count:")), true);
    assert.equal(calls.some((call) => call.startsWith("findMany:")), true);
    assert.equal(calls.some((call) => call.startsWith("findFirst:")), true);
  });

  it("detects migration-not-applied errors as schema missing", () => {
    assert.equal(isMatchSuggestionSchemaMissingError({ code: "P2021" }), true);
    assert.equal(isMatchSuggestionSchemaMissingError({ code: "P2022" }), true);
    assert.equal(isMatchSuggestionSchemaMissingError({ cause: { code: "42P01" } }), true);
    assert.equal(
      isMatchSuggestionSchemaMissingError({ message: 'relation "match_suggestion_idempotency_records" does not exist' }),
      true,
    );
    assert.equal(isMatchSuggestionSchemaMissingError({ code: "P2002" }), false);
  });
});

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
