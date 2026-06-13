export const MATCH_SUGGESTION_UI_DEFAULT_LIMIT = 20;
export const MATCH_SUGGESTION_UI_MAX_LIMIT = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_TOKEN_PATTERN = /^(?:[A-Z0-9_:-]{1,96}|[a-z][a-z0-9_:-]{0,95})$/;
const SAFE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_:-]{0,63}$/;
const SENSITIVE_KEY_PATTERN = /(body|company|connection|customer|database|email|file|host|name|normalized|password|path|payload|raw|secret|subject|text|token|url|value)/i;
const SENSITIVE_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /\b(?:api[_-]?key|password|secret|token)\s*[:=]/i,
  /[A-Za-z]:\\(?:Users|OneDrive|Documents|Desktop|Downloads)\\/i,
  /\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/,
  /https?:\/\/[^\s]+/i,
];
const STATUS_OPTIONS = new Set(["SUGGESTED", "NEEDS_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]);
const SCORE_BAND_OPTIONS = new Set(["HIGH", "MEDIUM", "LOW", "REVIEW"]);
const SORT_OPTIONS = new Set(["newest", "score-desc", "score-asc"]);
const SAVE_SCORING_VERSION = "match-review-ui-v1";
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{1,95}$/;
const REQUIRED_REVIEW_REASON_ACTIONS = new Set(["REJECT", "ARCHIVE", "RESTORE"]);
const REVIEW_ACTIONS = [
  { action: "KEEP_SUGGESTED", label: "Keep suggested", toStatus: "SUGGESTED" },
  { action: "REQUEST_REVIEW", label: "Needs review", toStatus: "NEEDS_REVIEW" },
  { action: "APPROVE", label: "Approve", toStatus: "APPROVED" },
  { action: "REJECT", label: "Reject", toStatus: "REJECTED" },
  { action: "ARCHIVE", label: "Archive", toStatus: "ARCHIVED" },
  { action: "RESTORE", label: "Restore", toStatus: "NEEDS_REVIEW" },
];
const REVIEW_TRANSITIONS: Record<string, Record<string, string>> = {
  SUGGESTED: {
    KEEP_SUGGESTED: "SUGGESTED",
    REQUEST_REVIEW: "NEEDS_REVIEW",
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    ARCHIVE: "ARCHIVED",
  },
  NEEDS_REVIEW: {
    KEEP_SUGGESTED: "SUGGESTED",
    REQUEST_REVIEW: "NEEDS_REVIEW",
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    ARCHIVE: "ARCHIVED",
  },
  APPROVED: {
    REQUEST_REVIEW: "NEEDS_REVIEW",
    APPROVE: "APPROVED",
    ARCHIVE: "ARCHIVED",
  },
  REJECTED: {
    REQUEST_REVIEW: "NEEDS_REVIEW",
    REJECT: "REJECTED",
    ARCHIVE: "ARCHIVED",
  },
  ARCHIVED: {
    ARCHIVE: "ARCHIVED",
    RESTORE: "NEEDS_REVIEW",
  },
};
export const MATCH_SUGGESTION_REVIEW_REASON_CODES = [
  "REVIEWED_OK",
  "NEEDS_MORE_CONTEXT",
  "SKILL_GAP",
  "RATE_MISMATCH",
  "DATE_MISMATCH",
  "LOCATION_MISMATCH",
  "WRONG_ROLE",
  "DUPLICATE",
  "STALE_PROJECT",
  "STALE_PERSON",
  "NO_LONGER_RELEVANT",
  "REVIEW_AGAIN",
  "OTHER",
];

export function isSafeUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function isMatchSuggestionSaveUiEnabled(value: unknown) {
  return value === "true";
}

export function isMatchSuggestionReviewUiEnabled(value: unknown) {
  return value === "true";
}

function safeToken(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 96) return "";
  if (!SAFE_TOKEN_PATTERN.test(trimmed)) return "";
  if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed))) return "";
  return trimmed;
}

function boundedScore(value: unknown) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return String(Math.max(0, Math.min(100, Math.trunc(parsed))));
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

export function boundedLimit(value: unknown, fallback = MATCH_SUGGESTION_UI_DEFAULT_LIMIT) {
  return Math.min(positiveInteger(value, fallback), MATCH_SUGGESTION_UI_MAX_LIMIT);
}

export function buildSavedSuggestionQuery(
  filters: Record<string, unknown>,
  page: unknown,
  { reviewQueue = false }: { reviewQueue?: boolean } = {},
) {
  const params = new URLSearchParams({
    limit: String(boundedLimit(filters.limit)),
    page: String(positiveInteger(page, 1)),
  });

  const status = safeToken(filters.status).toUpperCase();
  if (status && STATUS_OPTIONS.has(status)) params.set("status", status);

  const scoreBand = safeToken(filters.scoreBand).toUpperCase();
  if (scoreBand && SCORE_BAND_OPTIONS.has(scoreBand)) params.set("scoreBand", scoreBand);

  const attentionState = safeToken(filters.attentionState);
  if (attentionState) params.set("attentionState", attentionState);

  const minScore = boundedScore(filters.minScore);
  if (minScore) params.set("minScore", minScore);

  const maxScore = boundedScore(filters.maxScore);
  if (maxScore) params.set("maxScore", maxScore);

  if (isSafeUuid(filters.projectId)) params.set("projectId", String(filters.projectId).trim());
  if (isSafeUuid(filters.personId)) params.set("personId", String(filters.personId).trim());

  const sort = safeToken(filters.sort).toLowerCase();
  if (!reviewQueue && SORT_OPTIONS.has(sort)) params.set("sort", sort);

  return params.toString();
}

function isSafeDisplayString(value: string) {
  if (!value || value.length > 120) return false;
  if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return false;
  return SAFE_TOKEN_PATTERN.test(value) || value === "[redacted]";
}

export function sanitizeSuggestionUiValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[redacted]";
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return isSafeDisplayString(value) ? value : "[redacted]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeSuggestionUiValue(item, depth + 1));
  if (typeof value !== "object") return null;

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!SAFE_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) continue;
    sanitized[key] = sanitizeSuggestionUiValue(child, depth + 1);
  }
  return sanitized;
}

export function safeJsonText(value: unknown) {
  return JSON.stringify(sanitizeSuggestionUiValue(value) || {}, null, 2);
}

function safeCodeArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  for (const item of value.slice(0, 50)) {
    if (typeof item !== "string") continue;
    const code = item.trim();
    if (!SAFE_CODE_PATTERN.test(code)) continue;
    if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(code))) continue;
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

function safeReasonCodeArray(value: unknown) {
  return safeCodeArray(value).filter((code) => MATCH_SUGGESTION_REVIEW_REASON_CODES.includes(code));
}

function safeInteger(value: unknown, fallback = 0, min = 0, max = 1000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function stableHash64(value: unknown) {
  const text = JSON.stringify(value);
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    left ^= code;
    left = Math.imul(left, 16777619);
    right ^= code + index;
    right = Math.imul(right, 2246822519);
  }
  const chunk = `${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0).toString(16).padStart(8, "0")}`;
  return `${chunk}${chunk}${chunk}${chunk}`.slice(0, 64);
}

export function buildMatchSuggestionSaveBody(candidate: Record<string, unknown> | null | undefined, filters: Record<string, unknown>) {
  if (!candidate) {
    return { canSave: false, disabledReason: "Select a match candidate before supervised save.", body: null };
  }

  const projectId = typeof filters.projectId === "string" ? filters.projectId.trim() : "";
  const personId = typeof filters.personId === "string" ? filters.personId.trim() : "";
  if (!isSafeUuid(projectId) || !isSafeUuid(personId)) {
    return {
      canSave: false,
      disabledReason: "Enter valid Project and Person UUID filters to enable supervised save.",
      body: null,
    };
  }

  const score = safeInteger(candidate.score, -1, 0, 100);
  const scoreBand = safeToken(candidate.scoreBand).toUpperCase();
  if (score < 0 || !SCORE_BAND_OPTIONS.has(scoreBand)) {
    return { canSave: false, disabledReason: "Selected candidate is missing safe score metadata.", body: null };
  }

  const reasonCodes = safeCodeArray(candidate.reasonCodes);
  const warningCodes = safeCodeArray(candidate.missingFieldCodes ?? candidate.warningCodes);
  const reviewFlags = safeCodeArray(candidate.reviewFlags);
  const attentionState = safeToken(candidate.attention ?? candidate.attentionState) || (scoreBand === "HIGH" ? "HIGH_SCORE" : "NEEDS_REVIEW");
  const warningCount = safeInteger(candidate.warningCount, warningCodes.length, 0, 1000);
  const reviewReasonCount = safeInteger(candidate.reviewReasonCount, reasonCodes.length, 0, 1000);

  const compatibilitySummary = sanitizeSuggestionUiValue({
    rateCompatibility: candidate.rateCompatibility,
    dateCompatibility: candidate.dateCompatibility,
    locationCompatibility: candidate.locationCompatibility,
    roleCompatible: Boolean(candidate.roleCompatible),
    scoreBand,
  });
  const skillOverlapSummary = sanitizeSuggestionUiValue({
    skillOverlapCount: candidate.skillOverlapCount,
    requiredSkillOverlapCount: candidate.requiredSkillOverlapCount,
    niceToHaveSkillOverlapCount: candidate.niceToHaveSkillOverlapCount,
    technologyOverlapCount: candidate.technologyOverlapCount,
  });
  const redactedPreview = sanitizeSuggestionUiValue(candidate.redactedPreview ?? {
    project: { shortId: candidate.projectShortId },
    person: { shortId: candidate.personShortId },
    match: { score, scoreBand },
  });

  const sourceSnapshotHash = stableHash64({
    projectId,
    personId,
    score,
    scoreBand,
    scoringVersion: SAVE_SCORING_VERSION,
    attentionState,
    warningCount,
    reviewReasonCount,
    reasonCodes,
    warningCodes,
    reviewFlags,
    compatibilitySummary,
    skillOverlapSummary,
    redactedPreview,
  });

  return {
    canSave: true,
    disabledReason: "",
    body: {
      confirmSave: true,
      projectId,
      personId,
      score,
      scoreBand,
      scoringVersion: SAVE_SCORING_VERSION,
      sourceSnapshotHash,
      attentionState,
      warningCount,
      reviewReasonCount,
      reasonCodes,
      warningCodes,
      reviewFlags,
      compatibilitySummary,
      skillOverlapSummary,
      redactedPreview,
      sourceEvidence: [],
    },
  };
}

export function interpretMatchSuggestionSaveResponse(status: number, result: Record<string, unknown>) {
  if (status === 503 && result?.migrationRequired) {
    return { state: "migrationRequired", message: "Saved suggestion tables are unavailable in this environment.", shortId: null };
  }
  if (status === 403) {
    return { state: "disabled", message: "Server save guard is disabled.", shortId: null };
  }
  if (status === 400) {
    return { state: "validation", message: "Save request was rejected by validation.", shortId: null };
  }
  if (status < 200 || status >= 300) {
    return { state: "error", message: "Supervised save failed.", shortId: null };
  }
  const suggestion = result?.suggestion && typeof result.suggestion === "object" ? result.suggestion as Record<string, unknown> : {};
  const shortId = typeof suggestion.shortId === "string" ? suggestion.shortId : null;
  if (result?.skippedExisting) {
    return { state: "skippedExisting", message: "Already saved.", shortId };
  }
  if (result?.created || result?.saved) {
    return { state: "success", message: "Saved for supervised review.", shortId };
  }
  return { state: "unknown", message: "Supervised save response received.", shortId };
}

function safeSuggestionStatus(value: unknown) {
  const status = safeToken(value).toUpperCase();
  return STATUS_OPTIONS.has(status) ? status : "";
}

function safeIsoTimestamp(value: unknown) {
  if (typeof value !== "string" || SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

export function getMatchSuggestionReviewActionOptions(suggestion: Record<string, unknown> | null | undefined) {
  const status = safeSuggestionStatus(suggestion?.status);
  return REVIEW_ACTIONS.map((option) => {
    const toStatus = REVIEW_TRANSITIONS[status]?.[option.action] || option.toStatus;
    const transitionAllowed = Boolean(status && REVIEW_TRANSITIONS[status]?.[option.action] === option.toStatus);
    const reasonRequired = REQUIRED_REVIEW_REASON_ACTIONS.has(option.action);
    return {
      ...option,
      toStatus,
      reasonRequired,
      disabled: !transitionAllowed,
      disabledReason: transitionAllowed ? "" : "This transition is not available for the current status.",
    };
  });
}

export function buildMatchSuggestionReviewUpdateBody(
  suggestion: Record<string, unknown> | null | undefined,
  action: unknown,
  reasonCodesLike: unknown,
) {
  if (!suggestion) {
    return { canSubmit: false, disabledReason: "Select a saved suggestion before review update.", body: null };
  }

  const suggestionId = typeof suggestion.id === "string" ? suggestion.id.trim() : "";
  if (!isSafeUuid(suggestionId)) {
    return { canSubmit: false, disabledReason: "Saved suggestion detail is missing a safe review identifier.", body: null };
  }

  const status = safeSuggestionStatus(suggestion.status);
  const requestedAction = safeToken(action).toUpperCase();
  const toStatus = REVIEW_TRANSITIONS[status]?.[requestedAction];
  if (!status || !toStatus) {
    return { canSubmit: false, disabledReason: "This review action is not valid for the current status.", body: null };
  }

  const reasonCodes = safeReasonCodeArray(reasonCodesLike);
  if (REQUIRED_REVIEW_REASON_ACTIONS.has(requestedAction) && reasonCodes.length === 0) {
    return { canSubmit: false, disabledReason: "Select at least one safe reason code before this review action.", body: null };
  }

  const expectedUpdatedAt = safeIsoTimestamp(suggestion.updatedAt);
  const body: Record<string, unknown> = {
    action: requestedAction,
    toStatus,
    confirmReviewAction: true,
    reasonCodes,
    expectedStatus: status,
  };
  if (expectedUpdatedAt) body.expectedUpdatedAt = expectedUpdatedAt;

  return {
    canSubmit: true,
    disabledReason: "",
    body,
  };
}

export function interpretMatchSuggestionReviewUpdateResponse(status: number, result: Record<string, unknown>) {
  if (status === 503 && result?.migrationRequired) {
    return { state: "migrationRequired", message: "Saved suggestion review tables are unavailable in this environment.", shortId: null };
  }
  if (status === 403) {
    return { state: "disabled", message: "Server review update guard is disabled.", shortId: null };
  }
  if (status === 400) {
    return { state: "validation", message: "Review update request was rejected by validation.", shortId: null };
  }
  if (status === 404) {
    return { state: "notFound", message: "Saved suggestion was not found.", shortId: null };
  }
  if (status === 409) {
    return { state: "conflict", message: "Saved suggestion changed before review update.", shortId: null };
  }
  if (status < 200 || status >= 300) {
    return { state: "error", message: "Review update failed.", shortId: null };
  }
  const suggestion = result?.suggestion && typeof result.suggestion === "object" ? result.suggestion as Record<string, unknown> : {};
  const shortId = typeof suggestion.shortId === "string" && SAFE_TOKEN_PATTERN.test(suggestion.shortId) ? suggestion.shortId : null;
  if (result?.skippedNoop) {
    return { state: "skippedNoop", message: "Review status was already current.", shortId };
  }
  if (result?.updated) {
    return { state: "success", message: "Review status updated.", shortId };
  }
  return { state: "unknown", message: "Review update response received.", shortId };
}

export async function requestMatchSuggestionReviewUpdate(
  fetchImpl: typeof fetch,
  suggestionId: unknown,
  body: Record<string, unknown> | null | undefined,
) {
  if (!isSafeUuid(suggestionId) || !body) {
    return { state: "validation", message: "Review update request is missing safe identifiers.", shortId: null };
  }

  const response = await fetchImpl(`/api/matches/suggestions/${String(suggestionId).trim()}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  return interpretMatchSuggestionReviewUpdateResponse(response.status, result);
}

export function countLabel(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "0";
}

export function shortDate(value: unknown) {
  if (!value || typeof value !== "string") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().replace("T", " ").slice(0, 16);
}
