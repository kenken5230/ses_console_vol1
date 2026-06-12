import type { AuthUser } from "./auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{1,95}$/;
const MAX_REASON_CODES = 20;

const STATUSES = new Set(["SUGGESTED", "NEEDS_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]);
const ACTIONS = new Set(["KEEP_SUGGESTED", "REQUEST_REVIEW", "APPROVE", "REJECT", "ARCHIVE", "RESTORE"]);

const REQUIRED_REASON_ACTIONS = new Set(["REJECT", "ARCHIVE", "RESTORE"]);

const SENSITIVE_KEY_PATTERN = /(body|company|connection|csv|customer|database|email|file|host|name|normalized|note|password|path|payload|person|project|raw|secret|subject|text|token|url|value)/i;
const SENSITIVE_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /\b(?:api[_-]?key|password|secret|token)\s*[:=]/i,
  /[A-Za-z]:\\(?:Users|OneDrive|Documents|Desktop|Downloads)\\/i,
  /\\\\[A-Za-z0-9_.-]+\\[A-Za-z0-9_.-]+/,
  /https?:\/\/[^\s]+/i,
];

const FORBIDDEN_TOP_LEVEL_KEYS = new Set([
  "body",
  "bodyText",
  "company",
  "companyName",
  "connectionString",
  "csvRawValue",
  "customer",
  "customerName",
  "databaseUrl",
  "directUrl",
  "email",
  "emailAddress",
  "fullBody",
  "fullNote",
  "fullNotes",
  "fullSubject",
  "localPath",
  "name",
  "normalizedPayload",
  "note",
  "notes",
  "password",
  "path",
  "personName",
  "rawCsv",
  "rawPersonText",
  "rawProjectText",
  "rawSourcePayload",
  "rawText",
  "rawValue",
  "secret",
  "sourceRawPayload",
  "subject",
  "token",
]);

export type MatchSuggestionReviewUpdateEnv = {
  MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED?: string;
  MATCH_SUGGESTION_REVIEW_WRITE_TARGET?: string;
};

export type MatchSuggestionReviewUpdateUser = Pick<AuthUser, "id" | "role"> & {
  isActive?: boolean;
};

export type MatchSuggestionReviewUpdateDb = {
  matchSuggestion: {
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
    update(args: Record<string, unknown>): Promise<unknown>;
  };
  matchSuggestionReviewEvent: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  $transaction<T>(fn: (tx: MatchSuggestionReviewUpdateDb) => Promise<T>): Promise<T>;
};

type ReviewAction = "KEEP_SUGGESTED" | "REQUEST_REVIEW" | "APPROVE" | "REJECT" | "ARCHIVE" | "RESTORE";
type MatchSuggestionStatus = "SUGGESTED" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
type ReviewEventAction = "REVIEW_REQUESTED" | "APPROVED" | "REJECTED" | "ARCHIVED" | "REOPENED";

type TransitionRule = {
  toStatus: MatchSuggestionStatus;
  eventAction: ReviewEventAction | null;
  noop?: boolean;
};

const TRANSITIONS: Record<MatchSuggestionStatus, Partial<Record<ReviewAction, TransitionRule>>> = {
  SUGGESTED: {
    KEEP_SUGGESTED: { toStatus: "SUGGESTED", eventAction: null, noop: true },
    REQUEST_REVIEW: { toStatus: "NEEDS_REVIEW", eventAction: "REVIEW_REQUESTED" },
    APPROVE: { toStatus: "APPROVED", eventAction: "APPROVED" },
    REJECT: { toStatus: "REJECTED", eventAction: "REJECTED" },
    ARCHIVE: { toStatus: "ARCHIVED", eventAction: "ARCHIVED" },
  },
  NEEDS_REVIEW: {
    KEEP_SUGGESTED: { toStatus: "SUGGESTED", eventAction: "REOPENED" },
    REQUEST_REVIEW: { toStatus: "NEEDS_REVIEW", eventAction: null, noop: true },
    APPROVE: { toStatus: "APPROVED", eventAction: "APPROVED" },
    REJECT: { toStatus: "REJECTED", eventAction: "REJECTED" },
    ARCHIVE: { toStatus: "ARCHIVED", eventAction: "ARCHIVED" },
  },
  APPROVED: {
    REQUEST_REVIEW: { toStatus: "NEEDS_REVIEW", eventAction: "REVIEW_REQUESTED" },
    APPROVE: { toStatus: "APPROVED", eventAction: null, noop: true },
    ARCHIVE: { toStatus: "ARCHIVED", eventAction: "ARCHIVED" },
  },
  REJECTED: {
    REQUEST_REVIEW: { toStatus: "NEEDS_REVIEW", eventAction: "REVIEW_REQUESTED" },
    REJECT: { toStatus: "REJECTED", eventAction: null, noop: true },
    ARCHIVE: { toStatus: "ARCHIVED", eventAction: "ARCHIVED" },
  },
  ARCHIVED: {
    ARCHIVE: { toStatus: "ARCHIVED", eventAction: null, noop: true },
    RESTORE: { toStatus: "NEEDS_REVIEW", eventAction: "REOPENED" },
  },
};

const updateSelect = {
  id: true,
  status: true,
  score: true,
  scoreBand: true,
  warningCount: true,
  reviewReasonCount: true,
  reviewedAt: true,
  archivedAt: true,
  updatedAt: true,
  _count: { select: { reviewEvents: true, sourceRecords: true } },
};

export class MatchSuggestionReviewUpdateRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MatchSuggestionReviewUpdateRequestError";
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isObject(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function shortId(value: unknown) {
  return typeof value === "string" ? value.slice(0, 8) : "";
}

function isoDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
}

function isSafeStatus(value: unknown): value is MatchSuggestionStatus {
  return typeof value === "string" && STATUSES.has(value);
}

function isSafeAction(value: unknown): value is ReviewAction {
  return typeof value === "string" && ACTIONS.has(value);
}

export function isReviewUpdateUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function matchSuggestionReviewUpdateGuard(env: Record<string, string | undefined> = process.env) {
  const enabled = env.MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED === "true";
  const target = env.MATCH_SUGGESTION_REVIEW_WRITE_TARGET;
  const stagingOnly = target === "staging";

  return {
    allowed: enabled && stagingOnly,
    enabled,
    target: stagingOnly ? "staging" : "not-staging",
  };
}

export function disabledMatchSuggestionReviewUpdateResponse() {
  return {
    mode: "saved-match-suggestion-review-update",
    updated: false,
    skippedNoop: false,
    writeAttempted: false,
    guard: {
      allowed: false,
      required: [
        "MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED=true",
        "MATCH_SUGGESTION_REVIEW_WRITE_TARGET=staging",
      ],
    },
    message: "Saved match suggestion review updates are disabled for this environment.",
  };
}

export function isMatchSuggestionReviewUpdateUser(user: unknown): user is MatchSuggestionReviewUpdateUser {
  const record = asRecord(user);
  return typeof record.id === "string"
    && (record.role === "ADMIN" || record.role === "MANAGER")
    && record.isActive !== false;
}

function assertNoForbiddenTopLevelFields(body: Record<string, unknown>) {
  const allowed = new Set([
    "action",
    "toStatus",
    "confirmReviewAction",
    "reasonCodes",
    "expectedStatus",
    "expectedUpdatedAt",
    "suggestionId",
    "noteRedacted",
  ]);

  for (const [key, value] of Object.entries(body)) {
    if (!allowed.has(key)) throw new MatchSuggestionReviewUpdateRequestError("Request contains unsupported fields");
    if (FORBIDDEN_TOP_LEVEL_KEYS.has(key) || SENSITIVE_KEY_PATTERN.test(key) && !["suggestionId", "noteRedacted"].includes(key)) {
      throw new MatchSuggestionReviewUpdateRequestError("Request contains unsafe raw or PII fields");
    }
    if (containsSensitiveValue(value)) throw new MatchSuggestionReviewUpdateRequestError("Request contains unsafe raw or PII values");
  }
}

function containsSensitiveValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  if (Array.isArray(value)) return value.some(containsSensitiveValue);
  if (!isObject(value)) return false;
  return Object.entries(asRecord(value)).some(([key, child]) => SENSITIVE_KEY_PATTERN.test(key) || containsSensitiveValue(child));
}

function safeReasonCodes(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MatchSuggestionReviewUpdateRequestError("reasonCodes must be an array of safe codes");
  if (value.length > MAX_REASON_CODES) throw new MatchSuggestionReviewUpdateRequestError("reasonCodes has too many items");

  const codes = value.map((item) => {
    if (typeof item !== "string" || !SAFE_CODE_PATTERN.test(item) || SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(item))) {
      throw new MatchSuggestionReviewUpdateRequestError("reasonCodes contains an unsafe code");
    }
    return item;
  });
  return [...new Set(codes)];
}

function safeTimestamp(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new MatchSuggestionReviewUpdateRequestError("expectedUpdatedAt must be a safe timestamp");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new MatchSuggestionReviewUpdateRequestError("expectedUpdatedAt must be a valid timestamp");
  return parsed.toISOString();
}

function statusValue(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return null;
  if (!isSafeStatus(value)) throw new MatchSuggestionReviewUpdateRequestError(`${field} must be a supported match suggestion status`);
  return value;
}

function getTransition(fromStatus: MatchSuggestionStatus, action: ReviewAction, toStatus: MatchSuggestionStatus) {
  const rule = TRANSITIONS[fromStatus]?.[action];
  if (!rule) {
    throw new MatchSuggestionReviewUpdateRequestError("Invalid match suggestion review status transition", 409);
  }
  if (rule.toStatus !== toStatus) {
    throw new MatchSuggestionReviewUpdateRequestError("toStatus does not match the requested review action");
  }
  return rule;
}

export function validateMatchSuggestionReviewUpdateBody(bodyLike: unknown, routeId: string) {
  if (!isReviewUpdateUuid(routeId)) throw new MatchSuggestionReviewUpdateRequestError("Invalid match suggestion id");

  const body = asRecord(bodyLike);
  assertNoForbiddenTopLevelFields(body);

  if (body.confirmReviewAction !== true) {
    throw new MatchSuggestionReviewUpdateRequestError("confirmReviewAction must be true");
  }

  if (body.suggestionId !== undefined && body.suggestionId !== routeId) {
    throw new MatchSuggestionReviewUpdateRequestError("suggestionId must match the route id");
  }

  if (!isSafeAction(body.action)) throw new MatchSuggestionReviewUpdateRequestError("action must be a supported review action");
  if (!isSafeStatus(body.toStatus)) throw new MatchSuggestionReviewUpdateRequestError("toStatus must be a supported match suggestion status");
  if (body.noteRedacted !== undefined && body.noteRedacted !== null) {
    throw new MatchSuggestionReviewUpdateRequestError("noteRedacted must be omitted or null");
  }

  const reasonCodes = safeReasonCodes(body.reasonCodes);
  if (REQUIRED_REASON_ACTIONS.has(body.action) && reasonCodes.length === 0) {
    throw new MatchSuggestionReviewUpdateRequestError(`${body.action} requires at least one reason code`);
  }

  return {
    suggestionId: routeId,
    action: body.action,
    toStatus: body.toStatus,
    reasonCodes,
    expectedStatus: statusValue(body.expectedStatus, "expectedStatus"),
    expectedUpdatedAt: safeTimestamp(body.expectedUpdatedAt),
    noteRedacted: null,
  };
}

function safeSuggestionSummary(suggestionLike: unknown, extra: Record<string, unknown> = {}) {
  const suggestion = asRecord(suggestionLike);
  const counts = asRecord(suggestion._count);
  return {
    shortId: shortId(suggestion.id),
    status: suggestion.status,
    score: suggestion.score,
    scoreBand: suggestion.scoreBand,
    warningCount: suggestion.warningCount ?? 0,
    reviewReasonCount: suggestion.reviewReasonCount ?? 0,
    reviewEventCount: counts.reviewEvents ?? 0,
    sourceEvidenceCount: counts.sourceRecords ?? 0,
    reviewedAt: isoDate(suggestion.reviewedAt),
    archivedAt: isoDate(suggestion.archivedAt),
    updatedAt: isoDate(suggestion.updatedAt),
    ...extra,
  };
}

export async function updateMatchSuggestionReviewSupervised(
  db: MatchSuggestionReviewUpdateDb,
  routeId: string,
  body: unknown,
  user: MatchSuggestionReviewUpdateUser,
) {
  if (!isMatchSuggestionReviewUpdateUser(user)) {
    throw new MatchSuggestionReviewUpdateRequestError("Forbidden", 403);
  }

  const input = validateMatchSuggestionReviewUpdateBody(body, routeId);
  const current = await db.matchSuggestion.findUnique({
    where: { id: input.suggestionId },
    select: updateSelect,
  });

  if (!current) throw new MatchSuggestionReviewUpdateRequestError("Match suggestion not found", 404);

  const currentRecord = asRecord(current);
  if (!isSafeStatus(currentRecord.status)) {
    throw new MatchSuggestionReviewUpdateRequestError("Current match suggestion status is unsupported", 409);
  }

  if (input.expectedStatus && input.expectedStatus !== currentRecord.status) {
    throw new MatchSuggestionReviewUpdateRequestError("Match suggestion status changed before review update", 409);
  }

  const currentUpdatedAt = isoDate(currentRecord.updatedAt);
  if (input.expectedUpdatedAt && input.expectedUpdatedAt !== currentUpdatedAt) {
    throw new MatchSuggestionReviewUpdateRequestError("Match suggestion changed before review update", 409);
  }

  const transition = getTransition(currentRecord.status, input.action, input.toStatus);
  if (transition.noop || currentRecord.status === input.toStatus) {
    return {
      mode: "saved-match-suggestion-review-update",
      updated: false,
      skippedNoop: true,
      writeAttempted: false,
      suggestion: safeSuggestionSummary(current),
      message: "Match suggestion review update was already in the requested state.",
    };
  }

  const now = new Date();
  const updateData: Record<string, unknown> = {
    status: input.toStatus,
    reviewedBy: { connect: { id: user.id } },
    reviewedAt: now,
  };

  if (input.toStatus === "ARCHIVED") updateData.archivedAt = now;
  if (input.action === "RESTORE") updateData.archivedAt = null;

  const updated = await db.$transaction(async (tx) => {
    await tx.matchSuggestion.update({
      where: { id: input.suggestionId },
      data: updateData,
    });

    await tx.matchSuggestionReviewEvent.create({
      data: {
        matchSuggestion: { connect: { id: input.suggestionId } },
        action: transition.eventAction,
        fromStatus: currentRecord.status,
        toStatus: input.toStatus,
        actor: { connect: { id: user.id } },
        reasonCodes: input.reasonCodes,
        noteRedacted: null,
      },
    });

    return tx.matchSuggestion.findUnique({
      where: { id: input.suggestionId },
      select: updateSelect,
    });
  });

  return {
    mode: "saved-match-suggestion-review-update",
    updated: true,
    skippedNoop: false,
    writeAttempted: true,
    suggestion: safeSuggestionSummary(updated, { reviewEventCreated: true }),
    message: "Match suggestion review status updated.",
  };
}

export function assertNoSensitiveMatchSuggestionReviewUpdateOutput(output: string) {
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(output)) throw new Error("Sensitive match suggestion review update output detected");
  }
}
