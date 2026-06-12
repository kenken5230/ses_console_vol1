import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildMatchSuggestionReviewUpdateBody,
  buildMatchSuggestionSaveBody,
  buildSavedSuggestionQuery,
  getMatchSuggestionReviewActionOptions,
  interpretMatchSuggestionReviewUpdateResponse,
  interpretMatchSuggestionSaveResponse,
  isMatchSuggestionReviewUiEnabled,
  isMatchSuggestionSaveUiEnabled,
  isSafeUuid,
  requestMatchSuggestionReviewUpdate,
  safeJsonText,
  sanitizeSuggestionUiValue,
} from "../lib/match-suggestion-ui-safe";

const projectId = "11111111-1111-4111-8111-111111111111";
const personId = "22222222-2222-4222-8222-222222222222";
const suggestionId = "33333333-3333-4333-8333-333333333333";
const unsafeAddress = ["person", "example.invalid"].join("@");
const localPath = "C:" + "\\Users\\Owner\\Sensitive.csv";

assert.equal(isSafeUuid(projectId), true);
assert.equal(isSafeUuid("not-a-uuid"), false);
assert.equal(isMatchSuggestionSaveUiEnabled(undefined), false);
assert.equal(isMatchSuggestionSaveUiEnabled("false"), false);
assert.equal(isMatchSuggestionSaveUiEnabled("true"), true);
assert.equal(isMatchSuggestionReviewUiEnabled(undefined), false);
assert.equal(isMatchSuggestionReviewUiEnabled("false"), false);
assert.equal(isMatchSuggestionReviewUiEnabled("true"), true);

const query = new URLSearchParams(buildSavedSuggestionQuery({
  status: "needs_review",
  scoreBand: "high",
  attentionState: "HIGH_SCORE",
  minScore: "12.8",
  maxScore: "200",
  projectId,
  personId,
  sort: "score-desc",
  limit: "500",
}, 2));

assert.equal(query.get("status"), "NEEDS_REVIEW");
assert.equal(query.get("scoreBand"), "HIGH");
assert.equal(query.get("attentionState"), "HIGH_SCORE");
assert.equal(query.get("minScore"), "12");
assert.equal(query.get("maxScore"), "100");
assert.equal(query.get("projectId"), projectId);
assert.equal(query.get("personId"), personId);
assert.equal(query.get("sort"), "score-desc");
assert.equal(query.get("limit"), "100");
assert.equal(query.get("page"), "2");

const invalidQuery = new URLSearchParams(buildSavedSuggestionQuery({
  projectId: "not-a-uuid",
  personId: unsafeAddress,
  sort: "save",
  limit: "0",
}, 0));

assert.equal(invalidQuery.has("projectId"), false);
assert.equal(invalidQuery.has("personId"), false);
assert.equal(invalidQuery.has("sort"), false);
assert.equal(invalidQuery.get("limit"), "20");
assert.equal(invalidQuery.get("page"), "1");

const queueQuery = new URLSearchParams(buildSavedSuggestionQuery({ sort: "score-desc" }, 1, { reviewQueue: true }));
assert.equal(queueQuery.has("sort"), false);

const sanitized = sanitizeSuggestionUiValue({
  score: 92,
  scoreBand: "HIGH",
  companyName: "Sensitive customer",
  rawText: "raw payload",
  nested: {
    locationCompatibility: "match",
    email: unsafeAddress,
    path: localPath,
  },
  codes: ["MATCH_RATE_COMPATIBLE", unsafeAddress],
});

assert.deepEqual(sanitized, {
  score: 92,
  scoreBand: "HIGH",
  nested: {
    locationCompatibility: "match",
  },
  codes: ["MATCH_RATE_COMPATIBLE", "[redacted]"],
});

const safeJson = safeJsonText({
  redactedPreview: {
    scoreBand: "HIGH",
    emailAddress: unsafeAddress,
    localPath,
  },
});
assert.equal(safeJson.includes(unsafeAddress), false);
assert.equal(safeJson.includes(localPath), false);
assert.equal(safeJson.includes("emailAddress"), false);

const candidate = {
  projectShortId: "11111111",
  personShortId: "22222222",
  score: 75,
  scoreBand: "REVIEW",
  attention: "NEEDS_REVIEW",
  warningCount: 1,
  reviewReasonCount: 1,
  reasonCodes: ["STAGING_SMOKE_TEST"],
  missingFieldCodes: ["STAGING_SMOKE_REVIEW_REQUIRED"],
  reviewFlags: ["STAGING_SMOKE_TEST"],
  skillOverlapCount: 2,
  requiredSkillOverlapCount: 1,
  niceToHaveSkillOverlapCount: 1,
  technologyOverlapCount: 0,
  rateCompatibility: "match",
  dateCompatibility: "unknown",
  locationCompatibility: "mismatch",
  roleCompatible: true,
  rawText: "raw payload",
  email: unsafeAddress,
  redactedPreview: {
    project: { shortId: "11111111" },
    person: { shortId: "22222222" },
    match: { score: 75, scoreBand: "REVIEW" },
    rawValue: "hidden",
  },
};

const disabledSave = buildMatchSuggestionSaveBody(candidate, { projectId: "", personId: "" });
assert.equal(disabledSave.canSave, false);
assert.match(disabledSave.disabledReason, /UUID/);

const saveDraft = buildMatchSuggestionSaveBody(candidate, { projectId, personId });
assert.equal(saveDraft.canSave, true);
assert.equal(saveDraft.body?.confirmSave, true);
assert.equal(saveDraft.body?.projectId, projectId);
assert.equal(saveDraft.body?.personId, personId);
assert.equal(saveDraft.body?.score, 75);
assert.equal(saveDraft.body?.scoreBand, "REVIEW");
assert.equal(saveDraft.body?.sourceSnapshotHash.length, 64);
assert.deepEqual(saveDraft.body?.sourceEvidence, []);

const serializedBody = JSON.stringify(saveDraft.body);
assert.equal(serializedBody.includes("raw payload"), false);
assert.equal(serializedBody.includes(unsafeAddress), false);
assert.equal(serializedBody.includes(localPath), false);
assert.equal(serializedBody.includes("rawText"), false);
assert.equal(serializedBody.includes("rawValue"), false);
assert.equal(serializedBody.includes("confirmSave"), true);

assert.deepEqual(interpretMatchSuggestionSaveResponse(201, {
  saved: true,
  created: true,
  suggestion: { shortId: "abcdef12" },
}), {
  state: "success",
  message: "Saved for supervised review.",
  shortId: "abcdef12",
});
assert.deepEqual(interpretMatchSuggestionSaveResponse(200, {
  skippedExisting: true,
  suggestion: { shortId: "abcdef12" },
}), {
  state: "skippedExisting",
  message: "Already saved.",
  shortId: "abcdef12",
});
assert.equal(interpretMatchSuggestionSaveResponse(403, {}).state, "disabled");
assert.equal(interpretMatchSuggestionSaveResponse(503, { migrationRequired: true }).state, "migrationRequired");
assert.equal(interpretMatchSuggestionSaveResponse(400, { message: "raw server detail" }).state, "validation");

const savedSuggestion = {
  id: suggestionId,
  shortId: "33333333",
  status: "NEEDS_REVIEW",
  updatedAt: "2026-06-12T00:00:00.000Z",
  rawProjectText: "raw payload",
  email: unsafeAddress,
};
const actionOptions = getMatchSuggestionReviewActionOptions(savedSuggestion);
assert.equal(actionOptions.find((option) => option.action === "APPROVE")?.disabled, false);
assert.equal(actionOptions.find((option) => option.action === "RESTORE")?.disabled, true);

const approvedOptions = getMatchSuggestionReviewActionOptions({ ...savedSuggestion, status: "APPROVED" });
assert.equal(approvedOptions.find((option) => option.action === "REJECT")?.disabled, true);
assert.equal(approvedOptions.find((option) => option.action === "REQUEST_REVIEW")?.disabled, false);

const archivedOptions = getMatchSuggestionReviewActionOptions({ ...savedSuggestion, status: "ARCHIVED" });
assert.equal(archivedOptions.find((option) => option.action === "RESTORE")?.disabled, false);
assert.equal(archivedOptions.find((option) => option.action === "APPROVE")?.disabled, true);

const reviewDraft = buildMatchSuggestionReviewUpdateBody(savedSuggestion, "APPROVE", ["REVIEWED_OK"]);
assert.equal(reviewDraft.canSubmit, true);
assert.equal(reviewDraft.body?.action, "APPROVE");
assert.equal(reviewDraft.body?.toStatus, "APPROVED");
assert.equal(reviewDraft.body?.confirmReviewAction, true);
assert.deepEqual(reviewDraft.body?.reasonCodes, ["REVIEWED_OK"]);
assert.equal(reviewDraft.body?.expectedStatus, "NEEDS_REVIEW");
assert.equal(reviewDraft.body?.expectedUpdatedAt, "2026-06-12T00:00:00.000Z");

const rejectWithoutReason = buildMatchSuggestionReviewUpdateBody(savedSuggestion, "REJECT", []);
assert.equal(rejectWithoutReason.canSubmit, false);
assert.match(rejectWithoutReason.disabledReason, /reason code/);

const restoreWithReason = buildMatchSuggestionReviewUpdateBody({ ...savedSuggestion, status: "ARCHIVED" }, "RESTORE", ["REVIEW_AGAIN"]);
assert.equal(restoreWithReason.canSubmit, true);
assert.equal(restoreWithReason.body?.toStatus, "NEEDS_REVIEW");

const unsafeReviewBody = JSON.stringify(reviewDraft.body);
assert.equal(unsafeReviewBody.includes("raw payload"), false);
assert.equal(unsafeReviewBody.includes(unsafeAddress), false);
assert.equal(unsafeReviewBody.includes(localPath), false);
assert.equal(unsafeReviewBody.includes("rawProjectText"), false);
assert.equal(unsafeReviewBody.includes("note"), false);
assert.equal(unsafeReviewBody.includes("confirmReviewAction"), true);

assert.deepEqual(interpretMatchSuggestionReviewUpdateResponse(200, {
  updated: true,
  suggestion: { shortId: "33333333" },
}), {
  state: "success",
  message: "Review status updated.",
  shortId: "33333333",
});
assert.equal(interpretMatchSuggestionReviewUpdateResponse(200, { skippedNoop: true }).state, "skippedNoop");
assert.equal(interpretMatchSuggestionReviewUpdateResponse(403, {}).state, "disabled");
assert.equal(interpretMatchSuggestionReviewUpdateResponse(503, { migrationRequired: true }).state, "migrationRequired");
assert.equal(interpretMatchSuggestionReviewUpdateResponse(400, {}).state, "validation");
assert.equal(interpretMatchSuggestionReviewUpdateResponse(404, {}).state, "notFound");
assert.equal(interpretMatchSuggestionReviewUpdateResponse(409, {}).state, "conflict");
assert.equal(interpretMatchSuggestionReviewUpdateResponse(500, {}).state, "error");

async function assertReviewRequestHelper() {
  let requestedUrl = "";
  let requestedInit: any = null;
  const result = await requestMatchSuggestionReviewUpdate(
    async (url: RequestInfo | URL, init?: RequestInit) => {
      requestedUrl = String(url);
      requestedInit = init;
      return {
        status: 200,
        json: async () => ({ updated: true, suggestion: { shortId: "33333333" } }),
      } as Response;
    },
    suggestionId,
    reviewDraft.body,
  );
  assert.equal(result.state, "success");
  assert.equal(requestedUrl, `/api/matches/suggestions/${suggestionId}/review`);
  assert.equal(requestedInit.method, "PATCH");
  assert.equal(requestedInit.headers["Content-Type"], "application/json");
  const requestBody = JSON.parse(String(requestedInit.body));
  assert.equal(requestBody.confirmReviewAction, true);
  assert.equal(requestBody.action, "APPROVE");
  assert.equal(requestBody.toStatus, "APPROVED");
  assert.deepEqual(requestBody.reasonCodes, ["REVIEWED_OK"]);
  assert.equal(String(requestedInit.body).includes("raw payload"), false);
  assert.equal(String(requestedInit.body).includes(unsafeAddress), false);
}

const componentSource = readFileSync("components/MatchingReviewPage.jsx", "utf8");
const helperSource = readFileSync("lib/match-suggestion-ui-safe.ts", "utf8");
assert.match(componentSource, /\/api\/matches\/suggestions\?/);
assert.match(componentSource, /\/api\/matches\/suggestions\/review-queue\?/);
assert.match(componentSource, /\/api\/matches\/suggestions\/\$\{selectedSavedSuggestion\.id\}/);
assert.match(componentSource, /NEXT_PUBLIC_MATCH_SUGGESTION_SAVE_UI_ENABLED/);
assert.match(componentSource, /NEXT_PUBLIC_MATCH_SUGGESTION_REVIEW_UI_ENABLED/);
assert.match(componentSource, /method:\s*"POST"/);
assert.match(helperSource, /method:\s*"PATCH"/);
assert.match(componentSource, /requestMatchSuggestionReviewUpdate/);
assert.match(componentSource, /confirmSave/);
assert.match(componentSource, /confirmReviewAction/);
assert.match(componentSource, /role="dialog"/);
assert.match(componentSource, /Review update controls are disabled in this environment/);
assert.match(componentSource, /setRefreshToken\(\(current\) => current \+ 1\)/);
assert.doesNotMatch(componentSource, /export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/);
assert.doesNotMatch(componentSource, /<button[^>]*>\s*(?:Create proposal|Draft email|Send email|Bulk approve|Bulk reject|Bulk archive)\s*<\/button>/i);
assert.doesNotMatch(componentSource, /\b(?:normalizedPayload|noteRedacted|sourceName|rawCsv|rawValue|fullSubject|fullBody)\b/);

assertReviewRequestHelper().then(() => {
  console.log("match suggestion UI safety tests passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
