import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deriveMatchDownstreamReadiness,
  MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS,
  MATCH_SUGGESTION_PHASE_1A_FORBIDDEN_CAPABILITIES,
  MATCH_SUGGESTION_REVIEW_EVENT_TYPES,
  MATCH_SUGGESTION_STATUSES,
  MATCH_SUGGESTION_TRANSITIONS,
  MATCH_SUGGESTION_VERSION_FIELDS,
} from "./match-suggestion-schema";

describe("match suggestion Phase 1-A schema contract", () => {
  it("keeps the MVP primary statuses explicit", () => {
    assert.deepEqual(MATCH_SUGGESTION_STATUSES, [
      "SUGGESTED",
      "NEEDS_REVIEW",
      "APPROVED",
      "REJECTED",
      "ARCHIVED",
    ]);
  });

  it("keeps review events append-only ready, including PII detail audit", () => {
    assert.deepEqual(MATCH_SUGGESTION_REVIEW_EVENT_TYPES, [
      "SAVED",
      "APPROVED",
      "REJECTED",
      "ARCHIVED",
      "REOPENED",
      "VIEWED_PII_DETAIL",
    ]);
  });

  it("does not treat APPROVED as downstream-ready by itself", () => {
    assert.equal(
      deriveMatchDownstreamReadiness({
        status: "APPROVED",
        promotionBlockers: ["TARGET_CONTACT_MISSING"],
        stalenessState: "FRESH",
        duplicateState: "NONE",
        sourceEvidenceState: "OPTIONAL_PRESENT",
        warningSeverity: "NONE",
        proposalEmailRequirementsSatisfied: true,
        tenantBoundarySatisfied: true,
      }),
      "NEEDS_CHECK",
    );
  });

  it("marks a fully clean approved suggestion as downstream-ready", () => {
    assert.equal(
      deriveMatchDownstreamReadiness({
        status: "APPROVED",
        promotionBlockers: [],
        stalenessState: "FRESH",
        duplicateState: "NONE",
        sourceEvidenceState: "OPTIONAL_PRESENT",
        warningSeverity: "NONE",
        proposalEmailRequirementsSatisfied: true,
        tenantBoundarySatisfied: true,
      }),
      "READY",
    );
  });

  it("blocks downstream readiness on tenant boundary failures", () => {
    assert.equal(
      deriveMatchDownstreamReadiness({
        status: "APPROVED",
        promotionBlockers: [],
        stalenessState: "FRESH",
        duplicateState: "NONE",
        sourceEvidenceState: "OPTIONAL_PRESENT",
        warningSeverity: "NONE",
        proposalEmailRequirementsSatisfied: true,
        tenantBoundarySatisfied: false,
      }),
      "BLOCKED",
    );
  });

  it("requires reasons for reject and reopen transitions only", () => {
    const reasonRequiredActions = MATCH_SUGGESTION_TRANSITIONS.filter(
      (transition) => transition.reasonRequired,
    ).map((transition) => transition.action);

    assert.deepEqual([...new Set(reasonRequiredActions)].sort(), [
      "reject",
      "reopen",
    ]);
  });

  it("keeps Phase 1-A away from proposal, email, AI, and seed/import work", () => {
    assert.deepEqual(MATCH_SUGGESTION_PHASE_1A_FORBIDDEN_CAPABILITIES, [
      "proposalDraft",
      "emailDraft",
      "emailSend",
      "distributionLogWrite",
      "aiApiCall",
      "seedImport",
      "rawProjectTextCopy",
      "rawPersonTextCopy",
    ]);
  });

  it("keeps PII and raw data out of match suggestion persistence", () => {
    assert.ok(MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS.includes("mailBody"));
    assert.ok(MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS.includes("rawCsvRow"));
    assert.ok(MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS.includes("localPath"));
    assert.ok(MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS.includes("secret"));
  });

  it("requires version fields for scoring, taxonomy, and redaction policies", () => {
    assert.deepEqual(MATCH_SUGGESTION_VERSION_FIELDS, [
      "scoringVersion",
      "taxonomyVersion",
      "redactionPolicyVersion",
    ]);
  });
});

