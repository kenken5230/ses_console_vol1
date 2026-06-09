import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildMatchSuggestionSaveBody,
  buildSavedSuggestionQuery,
  interpretMatchSuggestionSaveResponse,
  isMatchSuggestionSaveUiEnabled,
  isSafeUuid,
  safeJsonText,
  sanitizeSuggestionUiValue,
} from "../lib/match-suggestion-ui-safe";

const projectId = "11111111-1111-4111-8111-111111111111";
const personId = "22222222-2222-4222-8222-222222222222";
const unsafeAddress = "person" + "@example.test";
const localPath = "C:" + "\\Users\\Owner\\Sensitive.csv";

assert.equal(isSafeUuid(projectId), true);
assert.equal(isSafeUuid("not-a-uuid"), false);
assert.equal(isMatchSuggestionSaveUiEnabled(undefined), false);
assert.equal(isMatchSuggestionSaveUiEnabled("false"), false);
assert.equal(isMatchSuggestionSaveUiEnabled("true"), true);

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

const componentSource = readFileSync("components/MatchingReviewPage.jsx", "utf8");
assert.match(componentSource, /\/api\/matches\/suggestions\?/);
assert.match(componentSource, /\/api\/matches\/suggestions\/review-queue\?/);
assert.match(componentSource, /\/api\/matches\/suggestions\/\$\{selectedSavedSuggestion\.id\}/);
assert.match(componentSource, /NEXT_PUBLIC_MATCH_SUGGESTION_SAVE_UI_ENABLED/);
assert.match(componentSource, /method:\s*"POST"/);
assert.match(componentSource, /confirmSave/);
assert.match(componentSource, /role="dialog"/);
assert.doesNotMatch(componentSource, /export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/);
assert.doesNotMatch(componentSource, /<button[^>]*>\s*(?:Approve|Reject|Archive|Create proposal|Draft email|Send email)\s*<\/button>/i);
assert.doesNotMatch(componentSource, /\b(?:normalizedPayload|noteRedacted|sourceName|rawCsv|rawValue|fullSubject|fullBody)\b/);

console.log("match suggestion UI safety tests passed");
