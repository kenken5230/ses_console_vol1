import { createHash } from "node:crypto";

import type { AuthUser } from "./auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const SAFE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_:-]{0,63}$/;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{1,95}$/;
const SAFE_SHORT_STRING_PATTERN = /^[A-Za-z0-9_.:-]{1,80}$/;
const SCORE_BANDS = new Set(["HIGH", "MEDIUM", "LOW", "REVIEW"]);
const SAVE_STATUSES = new Set(["SUGGESTED", "NEEDS_REVIEW"]);
const SOURCE_RECORD_ROLES = new Set(["PROJECT_EVIDENCE", "PERSON_EVIDENCE", "MATCH_EVIDENCE"]);
const MAX_CODE_ITEMS = 50;
const MAX_SOURCE_EVIDENCE = 20;

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
const FORBIDDEN_TOP_LEVEL_KEYS = new Set([
  "body",
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
  "fullSubject",
  "localPath",
  "name",
  "normalizedPayload",
  "note",
  "noteRedacted",
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

export type MatchSuggestionSaveDb = {
  matchSuggestion: {
    create(args: Record<string, unknown>): Promise<unknown>;
    findFirst(args: Record<string, unknown>): Promise<unknown | null>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  };
};

export type MatchSuggestionSaveEnv = {
  MATCH_SUGGESTION_SAVE_ENABLED?: string;
  MATCH_SUGGESTION_WRITE_TARGET?: string;
};

export class MatchSuggestionSaveRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MatchSuggestionSaveRequestError";
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isSafeString(value: unknown, maxLength = 80) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && SAFE_SHORT_STRING_PATTERN.test(value)
    && !SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function assertUuid(value: unknown, field: string) {
  if (!isUuid(value)) throw new MatchSuggestionSaveRequestError(`${field} must be a valid UUID`);
  return value as string;
}

function assertHash(value: unknown, field: string) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new MatchSuggestionSaveRequestError(`${field} must be a safe 64-character hash`);
  }
  return value.toLowerCase();
}

function nonNegativeInteger(value: unknown, field: string, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1000) {
    throw new MatchSuggestionSaveRequestError(`${field} must be a non-negative integer`);
  }
  return parsed;
}

function scoreInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new MatchSuggestionSaveRequestError("score must be an integer between 0 and 100");
  }
  return parsed;
}

function safeShortString(value: unknown, field: string, maxLength = 80, optional = false) {
  if ((value === undefined || value === null || value === "") && optional) return null;
  if (!isSafeString(value, maxLength)) throw new MatchSuggestionSaveRequestError(`${field} must be a safe short string`);
  return value as string;
}

function scoreBand(value: unknown) {
  const band = safeShortString(value, "scoreBand", 24);
  if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(band))) {
    throw new MatchSuggestionSaveRequestError("scoreBand must be safe");
  }
  return SCORE_BANDS.has(band) ? band : band;
}

function safeCodeArray(value: unknown, field: string) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MatchSuggestionSaveRequestError(`${field} must be an array of safe codes`);
  if (value.length > MAX_CODE_ITEMS) throw new MatchSuggestionSaveRequestError(`${field} has too many items`);

  const codes = value.map((item) => {
    if (typeof item !== "string" || !SAFE_CODE_PATTERN.test(item) || SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(item))) {
      throw new MatchSuggestionSaveRequestError(`${field} contains an unsafe code`);
    }
    return item;
  });
  return [...new Set(codes)];
}

function sanitizeJson(value: unknown, field: string, depth = 0): unknown {
  if (depth > 4) return "[redacted]";
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    if (value.length > 96 || SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return "[redacted]";
    return SAFE_SHORT_STRING_PATTERN.test(value) ? value : "[redacted]";
  }
  if (Array.isArray(value)) return value.slice(0, MAX_CODE_ITEMS).map((item) => sanitizeJson(item, field, depth + 1));
  if (typeof value !== "object") return null;

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (!SAFE_KEY_PATTERN.test(key)) throw new MatchSuggestionSaveRequestError(`${field} contains an unsafe key`);
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    sanitized[key] = sanitizeJson(child, field, depth + 1);
  }
  return sanitized;
}

function assertNoForbiddenTopLevelFields(body: Record<string, unknown>) {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_TOP_LEVEL_KEYS.has(key) || SENSITIVE_KEY_PATTERN.test(key) && ![
      "sourceSnapshotHash",
      "sourceEvidence",
    ].includes(key)) {
      throw new MatchSuggestionSaveRequestError("Request contains unsafe raw or PII fields");
    }
  }
}

function deriveSuggestionKey(projectId: string, personId: string, scoringVersion: string, sourceSnapshotHash: string) {
  return createHash("sha256").update(`${projectId}|${personId}|${scoringVersion}|${sourceSnapshotHash}`).digest("hex");
}

function deriveStatus(input: {
  attentionState: string | null;
  reviewFlags: string[];
  reviewReasonCount: number;
  scoreBand: string;
  status?: unknown;
  warningCount: number;
}) {
  if (typeof input.status === "string" && SAVE_STATUSES.has(input.status)) return input.status;
  if (
    input.reviewReasonCount > 0
    || input.warningCount > 0
    || input.reviewFlags.length > 0
    || input.scoreBand === "REVIEW"
    || input.attentionState === "NEEDS_REVIEW"
  ) {
    return "NEEDS_REVIEW";
  }
  return "SUGGESTED";
}

function parseSourceEvidence(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new MatchSuggestionSaveRequestError("sourceEvidence must be an array");
  if (value.length > MAX_SOURCE_EVIDENCE) throw new MatchSuggestionSaveRequestError("sourceEvidence has too many items");

  const seen = new Set<string>();
  const evidence = value.map((item) => {
    const record = asRecord(item);
    const sourceRecordId = assertUuid(record.sourceRecordId, "sourceEvidence.sourceRecordId");
    const role = typeof record.role === "string" && SOURCE_RECORD_ROLES.has(record.role) ? record.role : "MATCH_EVIDENCE";
    const key = `${sourceRecordId}:${role}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return { sourceRecordId, role };
  }).filter(Boolean);

  return evidence as Array<{ sourceRecordId: string; role: string }>;
}

export function matchSuggestionSaveGuard(env: Record<string, string | undefined> = process.env) {
  const enabled = env.MATCH_SUGGESTION_SAVE_ENABLED === "true";
  const target = env.MATCH_SUGGESTION_WRITE_TARGET;
  const stagingOnly = target === "staging";

  return {
    allowed: enabled && stagingOnly,
    enabled,
    target: stagingOnly ? "staging" : "not-staging",
  };
}

export function disabledMatchSuggestionSaveResponse() {
  return {
    mode: "saved-match-suggestion-supervised-save",
    saved: false,
    writeAttempted: false,
    guard: {
      allowed: false,
      required: [
        "MATCH_SUGGESTION_SAVE_ENABLED=true",
        "MATCH_SUGGESTION_WRITE_TARGET=staging",
      ],
    },
    message: "Supervised match suggestion save is disabled for this environment.",
  };
}

export function validateMatchSuggestionSaveBody(bodyLike: unknown) {
  const body = asRecord(bodyLike);
  assertNoForbiddenTopLevelFields(body);
  if (body.confirmSave !== true) throw new MatchSuggestionSaveRequestError("confirmSave must be true");

  const projectId = assertUuid(body.projectId, "projectId");
  const personId = assertUuid(body.personId, "personId");
  const score = scoreInteger(body.score);
  const parsedScoreBand = scoreBand(body.scoreBand);
  const scoringVersion = safeShortString(body.scoringVersion, "scoringVersion", 80);
  const sourceSnapshotHash = assertHash(body.sourceSnapshotHash, "sourceSnapshotHash");
  const suggestionKey = body.suggestionKey
    ? assertHash(body.suggestionKey, "suggestionKey")
    : deriveSuggestionKey(projectId, personId, scoringVersion, sourceSnapshotHash);
  const attentionState = safeShortString(body.attentionState, "attentionState", 40, true);
  const warningCount = nonNegativeInteger(body.warningCount, "warningCount");
  const reviewReasonCount = nonNegativeInteger(body.reviewReasonCount, "reviewReasonCount");
  const reasonCodes = safeCodeArray(body.reasonCodes, "reasonCodes");
  const warningCodes = safeCodeArray(body.warningCodes, "warningCodes");
  const reviewFlags = safeCodeArray(body.reviewFlags, "reviewFlags");
  const status = deriveStatus({
    attentionState,
    reviewFlags,
    reviewReasonCount,
    scoreBand: parsedScoreBand,
    status: body.status,
    warningCount,
  });

  return {
    projectId,
    personId,
    status,
    score,
    scoreBand: parsedScoreBand,
    scoringVersion,
    sourceSnapshotHash,
    suggestionKey,
    attentionState,
    warningCount,
    reviewReasonCount,
    reasonCodes,
    warningCodes,
    reviewFlags,
    compatibilitySummary: sanitizeJson(body.compatibilitySummary, "compatibilitySummary"),
    skillOverlapSummary: sanitizeJson(body.skillOverlapSummary, "skillOverlapSummary"),
    redactedPreview: sanitizeJson(body.redactedPreview, "redactedPreview"),
    sourceEvidence: parseSourceEvidence(body.sourceEvidence),
  };
}

const saveSelect = {
  id: true,
  status: true,
  score: true,
  scoreBand: true,
  scoringVersion: true,
  attentionState: true,
  warningCount: true,
  reviewReasonCount: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { reviewEvents: true, sourceRecords: true } },
};

function shortId(value: unknown) {
  return typeof value === "string" ? value.slice(0, 8) : "";
}

function isoDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : null;
}

function safeSuggestionSummary(suggestionLike: unknown, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const suggestion = asRecord(suggestionLike);
  const counts = asRecord(suggestion._count);
  return {
    shortId: shortId(suggestion.id),
    status: suggestion.status,
    score: suggestion.score,
    scoreBand: suggestion.scoreBand,
    scoringVersion: suggestion.scoringVersion,
    attentionState: suggestion.attentionState ?? null,
    warningCount: suggestion.warningCount ?? 0,
    reviewReasonCount: suggestion.reviewReasonCount ?? 0,
    reviewEventCount: counts.reviewEvents ?? 0,
    sourceEvidenceCount: counts.sourceRecords ?? 0,
    createdAt: isoDate(suggestion.createdAt),
    updatedAt: isoDate(suggestion.updatedAt),
    ...extra,
  };
}

function isUniqueConflict(error: unknown) {
  return asRecord(error).code === "P2002";
}

async function findExistingSuggestion(db: MatchSuggestionSaveDb, input: ReturnType<typeof validateMatchSuggestionSaveBody>) {
  const byKey = await db.matchSuggestion.findUnique({
    where: { suggestionKey: input.suggestionKey },
    select: saveSelect,
  });
  if (byKey) return byKey;

  return db.matchSuggestion.findFirst({
    where: {
      projectId: input.projectId,
      personId: input.personId,
      scoringVersion: input.scoringVersion,
      sourceSnapshotHash: input.sourceSnapshotHash,
    },
    select: saveSelect,
  });
}

export async function saveMatchSuggestionSupervised(
  db: MatchSuggestionSaveDb,
  body: unknown,
  user: Pick<AuthUser, "id">,
) {
  const input = validateMatchSuggestionSaveBody(body);
  const existing = await findExistingSuggestion(db, input);
  if (existing) {
    return {
      mode: "saved-match-suggestion-supervised-save",
      saved: false,
      created: false,
      skippedExisting: true,
      writeAttempted: false,
      suggestion: safeSuggestionSummary(existing, { reviewEventCreated: false, sourceEvidenceLinked: 0 }),
      message: "Match suggestion already exists for this suggestion key or source snapshot.",
    };
  }

  const data: Record<string, unknown> = {
    project: { connect: { id: input.projectId } },
    person: { connect: { id: input.personId } },
    status: input.status,
    score: input.score,
    scoreBand: input.scoreBand,
    scoringVersion: input.scoringVersion,
    sourceSnapshotHash: input.sourceSnapshotHash,
    suggestionKey: input.suggestionKey,
    attentionState: input.attentionState,
    warningCount: input.warningCount,
    reviewReasonCount: input.reviewReasonCount,
    reasonCodes: input.reasonCodes,
    warningCodes: input.warningCodes,
    reviewFlags: input.reviewFlags,
    compatibilitySummary: input.compatibilitySummary,
    skillOverlapSummary: input.skillOverlapSummary,
    redactedPreview: input.redactedPreview,
    createdBy: { connect: { id: user.id } },
    reviewEvents: {
      create: {
        action: "CREATED",
        fromStatus: null,
        toStatus: input.status,
        actor: { connect: { id: user.id } },
        reasonCodes: input.reasonCodes,
        noteRedacted: null,
      },
    },
  };

  if (input.sourceEvidence.length > 0) {
    data.sourceRecords = {
      create: input.sourceEvidence.map((evidence) => ({
        role: evidence.role,
        sourceRecord: { connect: { id: evidence.sourceRecordId } },
      })),
    };
  }

  try {
    const created = await db.matchSuggestion.create({
      data,
      select: saveSelect,
    });
    return {
      mode: "saved-match-suggestion-supervised-save",
      saved: true,
      created: true,
      skippedExisting: false,
      writeAttempted: true,
      suggestion: safeSuggestionSummary(created, {
        reviewEventCreated: true,
        sourceEvidenceLinked: input.sourceEvidence.length,
      }),
      message: "Match suggestion saved for supervised review.",
    };
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const duplicate = await findExistingSuggestion(db, input);
    return {
      mode: "saved-match-suggestion-supervised-save",
      saved: false,
      created: false,
      skippedExisting: true,
      writeAttempted: true,
      suggestion: safeSuggestionSummary(duplicate, { reviewEventCreated: false, sourceEvidenceLinked: 0 }),
      message: "Match suggestion already exists for this suggestion key or source snapshot.",
    };
  }
}

export function assertNoSensitiveMatchSuggestionSaveOutput(output: string) {
  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(output)) throw new Error("Sensitive match suggestion save output detected");
  }
}
