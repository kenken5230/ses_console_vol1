import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildSavedSuggestionQuery,
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

const componentSource = readFileSync("components/MatchingReviewPage.jsx", "utf8");
assert.match(componentSource, /\/api\/matches\/suggestions\?/);
assert.match(componentSource, /\/api\/matches\/suggestions\/review-queue\?/);
assert.match(componentSource, /\/api\/matches\/suggestions\/\$\{selectedSavedSuggestion\.id\}/);
assert.doesNotMatch(componentSource, /export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/);
assert.doesNotMatch(componentSource, /<button[^>]*>\s*(?:Save|Approve|Reject|Archive|Create proposal|Draft email|Send email)\s*<\/button>/i);
assert.doesNotMatch(componentSource, /\b(?:normalizedPayload|noteRedacted|sourceName|rawCsv|rawValue|fullSubject|fullBody)\b/);

console.log("match suggestion UI safety tests passed");
