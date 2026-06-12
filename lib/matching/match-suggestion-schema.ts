export const MATCH_SUGGESTION_STATUSES = [
  "SUGGESTED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const;

export type MatchSuggestionStatus = (typeof MATCH_SUGGESTION_STATUSES)[number];

export const MATCH_SUGGESTION_REVIEW_EVENT_TYPES = [
  "SAVED",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
  "REOPENED",
  "VIEWED_PII_DETAIL",
] as const;

export type MatchSuggestionReviewEventType =
  (typeof MATCH_SUGGESTION_REVIEW_EVENT_TYPES)[number];

export const MATCH_STALENESS_STATES = ["FRESH", "STALE", "UNKNOWN"] as const;
export type MatchStalenessState = (typeof MATCH_STALENESS_STATES)[number];

export const MATCH_DUPLICATE_STATES = [
  "NONE",
  "POSSIBLE_DUPLICATE",
  "DUPLICATE_CONFIRMED",
] as const;
export type MatchDuplicateState = (typeof MATCH_DUPLICATE_STATES)[number];

export const MATCH_SOURCE_EVIDENCE_STATES = [
  "NONE",
  "OPTIONAL_PRESENT",
  "OPTIONAL_MISSING",
  "REQUIRED_MISSING",
  "STALE",
] as const;
export type MatchSourceEvidenceState =
  (typeof MATCH_SOURCE_EVIDENCE_STATES)[number];

export const MATCH_WARNING_SEVERITIES = [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type MatchWarningSeverity = (typeof MATCH_WARNING_SEVERITIES)[number];

export const MATCH_ATTENTION_STATES = ["NORMAL", "NEEDS_ATTENTION"] as const;
export type MatchAttentionState = (typeof MATCH_ATTENTION_STATES)[number];

export const MATCH_DOWNSTREAM_READINESS_STATES = [
  "READY",
  "BLOCKED",
  "NEEDS_CHECK",
] as const;
export type MatchDownstreamReadiness =
  (typeof MATCH_DOWNSTREAM_READINESS_STATES)[number];

export const MATCH_SUGGESTION_SOURCE_TYPES = [
  "CSV_IMPORT",
  "MANUAL",
  "SYSTEM",
  "EXTERNAL",
] as const;
export type MatchSuggestionSourceType =
  (typeof MATCH_SUGGESTION_SOURCE_TYPES)[number];

export const MATCH_SUGGESTION_EVIDENCE_ROLES = [
  "PRIMARY",
  "SUPPORTING",
  "OPTIONAL",
] as const;
export type MatchSuggestionEvidenceRole =
  (typeof MATCH_SUGGESTION_EVIDENCE_ROLES)[number];

export const MATCH_SUGGESTION_VERSION_FIELDS = [
  "scoringVersion",
  "taxonomyVersion",
  "redactionPolicyVersion",
] as const;

export const MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS = [
  "companyName",
  "personName",
  "email",
  "phone",
  "address",
  "mailSubject",
  "mailBody",
  "skillSheetText",
  "attachmentText",
  "rawCsvRow",
  "rawNotionPayload",
  "localPath",
  "token",
  "password",
  "apiKey",
  "connectionString",
  "secret",
] as const;

export const MATCH_SUGGESTION_PHASE_1A_FORBIDDEN_CAPABILITIES = [
  "proposalDraft",
  "emailDraft",
  "emailSend",
  "distributionLogWrite",
  "aiApiCall",
  "seedImport",
  "rawProjectTextCopy",
  "rawPersonTextCopy",
] as const;

export const MATCH_SUGGESTION_REJECT_REASON_CODES = [
  "SKILL_MISMATCH",
  "RATE_MISMATCH",
  "AVAILABILITY_MISMATCH",
  "LOCATION_MISMATCH",
  "CONTRACT_CONDITION_MISMATCH",
  "DUPLICATE",
  "STALE_INFORMATION",
  "INSUFFICIENT_EVIDENCE",
  "BUSINESS_PRIORITY_LOW",
  "DO_NOT_CONTACT",
] as const;

export type MatchSuggestionRejectReasonCode =
  (typeof MATCH_SUGGESTION_REJECT_REASON_CODES)[number];

export const MATCH_SUGGESTION_REOPEN_REASON_CODES = [
  "SOURCE_UPDATED",
  "MATCHING_RULE_UPDATED",
  "HUMAN_RECONSIDERATION",
  "DUPLICATE_RESOLVED",
  "STALE_RESOLVED",
] as const;

export type MatchSuggestionReopenReasonCode =
  (typeof MATCH_SUGGESTION_REOPEN_REASON_CODES)[number];

export type MatchSuggestionAction =
  | "save"
  | "saveWithWarnings"
  | "approve"
  | "reject"
  | "archive"
  | "reopen";

export type MatchSuggestionTransition = Readonly<{
  from: MatchSuggestionStatus | null;
  action: MatchSuggestionAction;
  to: MatchSuggestionStatus;
  eventType: MatchSuggestionReviewEventType;
  reasonRequired: boolean;
}>;

export const MATCH_SUGGESTION_TRANSITIONS = [
  {
    from: null,
    action: "save",
    to: "SUGGESTED",
    eventType: "SAVED",
    reasonRequired: false,
  },
  {
    from: null,
    action: "saveWithWarnings",
    to: "NEEDS_REVIEW",
    eventType: "SAVED",
    reasonRequired: false,
  },
  {
    from: "SUGGESTED",
    action: "approve",
    to: "APPROVED",
    eventType: "APPROVED",
    reasonRequired: false,
  },
  {
    from: "NEEDS_REVIEW",
    action: "approve",
    to: "APPROVED",
    eventType: "APPROVED",
    reasonRequired: false,
  },
  {
    from: "SUGGESTED",
    action: "reject",
    to: "REJECTED",
    eventType: "REJECTED",
    reasonRequired: true,
  },
  {
    from: "NEEDS_REVIEW",
    action: "reject",
    to: "REJECTED",
    eventType: "REJECTED",
    reasonRequired: true,
  },
  {
    from: "SUGGESTED",
    action: "archive",
    to: "ARCHIVED",
    eventType: "ARCHIVED",
    reasonRequired: false,
  },
  {
    from: "NEEDS_REVIEW",
    action: "archive",
    to: "ARCHIVED",
    eventType: "ARCHIVED",
    reasonRequired: false,
  },
  {
    from: "APPROVED",
    action: "archive",
    to: "ARCHIVED",
    eventType: "ARCHIVED",
    reasonRequired: false,
  },
  {
    from: "REJECTED",
    action: "reopen",
    to: "NEEDS_REVIEW",
    eventType: "REOPENED",
    reasonRequired: true,
  },
  {
    from: "ARCHIVED",
    action: "reopen",
    to: "NEEDS_REVIEW",
    eventType: "REOPENED",
    reasonRequired: true,
  },
] as const satisfies readonly MatchSuggestionTransition[];

export type MatchSuggestionReadinessInput = Readonly<{
  status: MatchSuggestionStatus;
  promotionBlockers: readonly string[];
  stalenessState: MatchStalenessState;
  duplicateState: MatchDuplicateState;
  sourceEvidenceState: MatchSourceEvidenceState;
  warningSeverity: MatchWarningSeverity;
  proposalEmailRequirementsSatisfied: boolean;
  tenantBoundarySatisfied: boolean;
}>;

export function deriveMatchDownstreamReadiness(
  input: MatchSuggestionReadinessInput,
): MatchDownstreamReadiness {
  if (
    input.status === "APPROVED" &&
    input.promotionBlockers.length === 0 &&
    input.stalenessState === "FRESH" &&
    input.duplicateState !== "DUPLICATE_CONFIRMED" &&
    input.sourceEvidenceState !== "REQUIRED_MISSING" &&
    input.warningSeverity !== "CRITICAL" &&
    input.proposalEmailRequirementsSatisfied &&
    input.tenantBoundarySatisfied
  ) {
    return "READY";
  }

  if (
    input.status === "APPROVED" &&
    input.tenantBoundarySatisfied &&
    input.warningSeverity !== "CRITICAL"
  ) {
    return "NEEDS_CHECK";
  }

  return "BLOCKED";
}
