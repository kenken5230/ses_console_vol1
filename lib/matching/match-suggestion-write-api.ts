import { createHash, randomUUID } from "node:crypto";

import {
  deriveMatchDownstreamReadiness,
  MATCH_ATTENTION_STATES,
  MATCH_DUPLICATE_STATES,
  MATCH_SOURCE_EVIDENCE_STATES,
  MATCH_STALENESS_STATES,
  MATCH_SUGGESTION_EVIDENCE_ROLES,
  MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS,
  MATCH_SUGGESTION_REJECT_REASON_CODES,
  MATCH_SUGGESTION_REOPEN_REASON_CODES,
  MATCH_SUGGESTION_SOURCE_TYPES,
  MATCH_SUGGESTION_TRANSITIONS,
  MATCH_WARNING_SEVERITIES,
  type MatchDuplicateState,
  type MatchSourceEvidenceState,
  type MatchStalenessState,
  type MatchSuggestionAction,
  type MatchSuggestionEvidenceRole,
  type MatchSuggestionReviewEventType,
  type MatchSuggestionSourceType,
  type MatchSuggestionStatus,
  type MatchWarningSeverity,
} from "./match-suggestion-schema";
import {
  MatchSuggestionReadApiError,
  isMatchSuggestionSchemaMissingError,
  parseTenantContext,
  serializeSuggestionDetail,
} from "./match-suggestion-read-api";

type AuthUserLike = {
  id: string;
};

export type MatchSuggestionSavePayload = {
  confirmationToken?: string;
  organizationId?: string | null;
  projectId?: string;
  personId?: string;
  suggestionPairKey?: string;
  suggestionRevisionKey?: string;
  score?: string | number | null;
  scoreBand?: string | null;
  systemReasonCodes?: string[];
  systemWarningCodes?: string[];
  warningSeverity?: MatchWarningSeverity;
  stalenessState?: MatchStalenessState;
  duplicateState?: MatchDuplicateState;
  sourceEvidenceState?: MatchSourceEvidenceState;
  attentionState?: "NORMAL" | "NEEDS_ATTENTION";
  promotionBlockers?: string[];
  scoringVersion?: string;
  taxonomyVersion?: string;
  redactionPolicyVersion?: string;
  sourceRecords?: Array<{
    sourceType: MatchSuggestionSourceType;
    sourceRecordId: string;
    evidenceRole: MatchSuggestionEvidenceRole;
    safeSummary?: string | null;
  }>;
};

export class MatchSuggestionWriteApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "MatchSuggestionWriteApiError";
    this.status = status;
    this.code = code;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCORE_BANDS = ["HIGH", "MEDIUM", "LOW", "REVIEW"] as const;
const CODE_PATTERN = /^[A-Z0-9_:-]{1,80}$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_.:-]{1,180}$/;
const SAFE_TEXT_MAX_LENGTH = 500;
const SERVER_SCORING_VERSION = "manual-v1";
const SERVER_TAXONOMY_VERSION = "match-taxonomy-v1";
const SERVER_REDACTION_POLICY_VERSION = "redaction-v1";
const SAFE_TEXT_FORBIDDEN_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b(?:api[_-]?key|password|secret|token)\b/i,
  /[A-Z]:\\/i,
  /(?:^|[\\/])Users[\\/]/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
];

export function parseMutationTenantContext(request: Request) {
  return parseTenantContext(new URL(request.url), request.headers);
}

export function createSaveConfirmationToken(input: MatchSuggestionSavePayload) {
  return `confirm:${hashStableJson(buildSavePayloadFingerprintInput(input)).slice(0, 20)}`;
}

export function buildSavePayloadHash(tenantId: string, payload: MatchSuggestionSavePayload) {
  return hashStableJson({
    tenantId,
    ...buildSavePayloadFingerprintInput(payload),
  });
}

export async function saveMatchSuggestion(
  prismaClient: any,
  tenantId: string,
  payload: MatchSuggestionSavePayload,
  actor: AuthUserLike,
  headers: Headers,
) {
  const idempotencyKey = requireIdempotencyKey(headers);
  validateSavePayload(payload);
  const requestFingerprint = buildSavePayloadHash(tenantId, payload);
  const expectedToken = createSaveConfirmationToken(payload);

  if (payload.confirmationToken !== expectedToken) {
    throw new MatchSuggestionWriteApiError(422, "CONFIRMATION_TOKEN_INVALID", "confirmationToken is invalid");
  }

  const existingIdempotency = await prismaClient.matchSuggestionIdempotencyRecord.findFirst({
    where: { tenantId, idempotencyKey },
    select: {
      suggestionId: true,
      requestFingerprint: true,
      resultType: true,
    },
  });
  if (existingIdempotency) {
    if (existingIdempotency.requestFingerprint !== requestFingerprint) {
      throw new MatchSuggestionWriteApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency-Key payload mismatch");
    }

    const replayed = await prismaClient.matchSuggestion.findFirst({
      where: { id: existingIdempotency.suggestionId, tenantId },
      select: detailSelect,
    });
    if (!replayed) {
      throw new MatchSuggestionWriteApiError(409, "IDEMPOTENCY_RESULT_MISSING", "Idempotency result is missing");
    }

    return {
      item: serializeSuggestionDetail(replayed),
      duplicate: existingIdempotency.resultType === "DUPLICATE",
      idempotentReplay: true,
    };
  }

  await assertReferencedEntitiesExist(prismaClient, tenantId, payload);

  const duplicate = await prismaClient.matchSuggestion.findFirst({
    where: {
      tenantId,
      suggestionPairKey: payload.suggestionPairKey,
    },
    select: detailSelect,
  });
  if (duplicate) {
    const replayedDuplicate = await prismaClient.$transaction(async (tx: any) => {
      await tx.matchSuggestionIdempotencyRecord.create({
        data: {
          tenantId,
          organizationId: duplicate.organizationId,
          idempotencyKey,
          requestFingerprint,
          suggestionId: duplicate.id,
          resultType: "DUPLICATE",
        },
      });

      return tx.matchSuggestion.findFirst({
        where: { id: duplicate.id, tenantId },
        select: detailSelect,
      });
    });

    return {
      item: serializeRequiredSuggestion(replayedDuplicate),
      duplicate: true,
      idempotentReplay: false,
    };
  }

  const status = initialStatusFor(payload);
  const promotionBlockers = normalizeStringArray(payload.promotionBlockers);
  const normalizedScore = normalizeScore(payload.score);
  const downstreamReadiness = deriveMatchDownstreamReadiness({
    status,
    promotionBlockers,
    stalenessState: payload.stalenessState || "UNKNOWN",
    duplicateState: payload.duplicateState || "NONE",
    sourceEvidenceState: payload.sourceEvidenceState || "NONE",
    warningSeverity: payload.warningSeverity || "NONE",
    proposalEmailRequirementsSatisfied: false,
    tenantBoundarySatisfied: true,
  });

  const saved = await prismaClient.$transaction(async (tx: any) => {
    const suggestion = await tx.matchSuggestion.create({
      data: {
        tenantId,
        organizationId: optionalString(payload.organizationId),
        projectId: payload.projectId,
        personId: payload.personId,
        suggestionPairKey: payload.suggestionPairKey,
        suggestionRevisionKey: payload.suggestionRevisionKey,
        status,
        score: normalizedScore,
        scoreBand: optionalString(payload.scoreBand),
        systemReasonCodes: normalizeStringArray(payload.systemReasonCodes),
        systemWarningCodes: normalizeStringArray(payload.systemWarningCodes),
        warningSeverity: payload.warningSeverity || "NONE",
        stalenessState: payload.stalenessState || "UNKNOWN",
        duplicateState: payload.duplicateState || "NONE",
        sourceEvidenceState: payload.sourceEvidenceState || "NONE",
        attentionState: payload.attentionState || "NORMAL",
        promotionBlockers,
        promotionEligible: false,
        downstreamReadiness,
        scoringVersion: SERVER_SCORING_VERSION,
        taxonomyVersion: SERVER_TAXONOMY_VERSION,
        redactionPolicyVersion: SERVER_REDACTION_POLICY_VERSION,
        createdByUserId: actor.id,
      },
    });

    if (payload.sourceRecords?.length) {
      await tx.matchSuggestionSourceRecord.createMany({
        data: payload.sourceRecords.map((record) => ({
          tenantId,
          organizationId: optionalString(payload.organizationId),
          suggestionId: suggestion.id,
          sourceType: record.sourceType,
          sourceRecordId: record.sourceRecordId,
          evidenceRole: record.evidenceRole,
          safeSummary: optionalString(record.safeSummary),
        })),
      });
    }

    await tx.matchSuggestionReviewEvent.create({
      data: {
        tenantId,
        organizationId: optionalString(payload.organizationId),
        suggestionId: suggestion.id,
        eventType: "SAVED",
        fromStatus: null,
        toStatus: status,
        actorUserId: actor.id,
        reasonCode: null,
        systemSnapshot: {
          payloadHash: requestFingerprint,
          sourceRecordCount: payload.sourceRecords?.length || 0,
        },
        requestId: headers.get("x-request-id") || randomUUID(),
        idempotencyKey,
      },
    });

    await tx.matchSuggestionIdempotencyRecord.create({
      data: {
        tenantId,
        organizationId: optionalString(payload.organizationId),
        idempotencyKey,
        requestFingerprint,
        suggestionId: suggestion.id,
        resultType: "CREATED",
      },
    });

    return tx.matchSuggestion.findFirst({
      where: { id: suggestion.id, tenantId },
      select: detailSelect,
    });
  });

  return {
    item: serializeRequiredSuggestion(saved),
    duplicate: false,
    idempotentReplay: false,
  };
}

export async function decideMatchSuggestion(
  prismaClient: any,
  tenantId: string,
  id: string,
  action: "approve" | "reject",
  payload: { reasonCode?: string; lockVersion?: number },
  actor: AuthUserLike,
  headers: Headers,
) {
  const nextStatus = action === "approve" ? "APPROVED" : "REJECTED";
  const eventType = action === "approve" ? "APPROVED" : "REJECTED";
  return transitionMatchSuggestion(prismaClient, tenantId, id, {
    action,
    nextStatus,
    eventType,
    reasonCode: payload.reasonCode,
    lockVersion: resolveLockVersion(headers, payload.lockVersion),
    actor,
    requestId: headers.get("x-request-id") || randomUUID(),
  });
}

export async function archiveMatchSuggestion(
  prismaClient: any,
  tenantId: string,
  id: string,
  payload: { reasonCode?: string; lockVersion?: number },
  actor: AuthUserLike,
  headers: Headers,
) {
  return transitionMatchSuggestion(prismaClient, tenantId, id, {
    action: "archive",
    nextStatus: "ARCHIVED",
    eventType: "ARCHIVED",
    reasonCode: payload.reasonCode,
    lockVersion: resolveLockVersion(headers, payload.lockVersion),
    actor,
    requestId: headers.get("x-request-id") || randomUUID(),
  });
}

export async function reopenMatchSuggestion(
  prismaClient: any,
  tenantId: string,
  id: string,
  payload: { reasonCode?: string; lockVersion?: number },
  actor: AuthUserLike,
  headers: Headers,
) {
  return transitionMatchSuggestion(prismaClient, tenantId, id, {
    action: "reopen",
    nextStatus: "NEEDS_REVIEW",
    eventType: "REOPENED",
    reasonCode: payload.reasonCode,
    lockVersion: resolveLockVersion(headers, payload.lockVersion),
    actor,
    requestId: headers.get("x-request-id") || randomUUID(),
  });
}

export function buildWriteApiErrorResponse(error: unknown) {
  if (error instanceof MatchSuggestionWriteApiError || error instanceof MatchSuggestionReadApiError) {
    return {
      status: error.status,
      body: { message: error.message, code: error.code },
    };
  }

  if (isMatchSuggestionSchemaMissingError(error)) {
    return {
      status: 503,
      body: {
        message: "Match suggestion schema is not ready",
        code: "MATCH_SUGGESTION_SCHEMA_NOT_READY",
      },
    };
  }

  return {
    status: 500,
    body: {
      message: "Failed to write match suggestion",
      code: "MATCH_SUGGESTION_WRITE_FAILED",
    },
  };
}

async function transitionMatchSuggestion(
  prismaClient: any,
  tenantId: string,
  id: string,
  options: {
    action: MatchSuggestionAction;
    nextStatus: MatchSuggestionStatus;
    eventType: MatchSuggestionReviewEventType;
    reasonCode?: string;
    lockVersion: number;
    actor: AuthUserLike;
    requestId: string;
  },
) {
  const current = await prismaClient.matchSuggestion.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      tenantId: true,
      organizationId: true,
      status: true,
      lockVersion: true,
      promotionBlockers: true,
      stalenessState: true,
      duplicateState: true,
      sourceEvidenceState: true,
      warningSeverity: true,
    },
  });
  if (!current) {
    throw new MatchSuggestionWriteApiError(404, "MATCH_SUGGESTION_NOT_FOUND", "Match suggestion not found");
  }
  if (current.lockVersion !== options.lockVersion) {
    throw new MatchSuggestionWriteApiError(412, "LOCK_VERSION_MISMATCH", "lockVersion mismatch");
  }

  validateTransition(current.status, options.action, options.reasonCode);
  validateReasonCode(options.action, options.reasonCode);

  const downstreamReadiness = deriveMatchDownstreamReadiness({
    status: options.nextStatus,
    promotionBlockers: current.promotionBlockers || [],
    stalenessState: current.stalenessState,
    duplicateState: current.duplicateState,
    sourceEvidenceState: current.sourceEvidenceState,
    warningSeverity: current.warningSeverity,
    proposalEmailRequirementsSatisfied: false,
    tenantBoundarySatisfied: true,
  });

  const updated = await prismaClient.$transaction(async (tx: any) => {
    const updatedCount = await tx.matchSuggestion.updateMany({
      where: {
        id,
        tenantId,
        lockVersion: options.lockVersion,
      },
      data: {
        status: options.nextStatus,
        downstreamReadiness,
        promotionEligible: false,
        lastReviewedAt: new Date(),
        lastReviewedByUserId: options.actor.id,
        lockVersion: { increment: 1 },
      },
    });
    if (updatedCount.count !== 1) {
      throw new MatchSuggestionWriteApiError(412, "LOCK_VERSION_MISMATCH", "lockVersion mismatch");
    }

    await tx.matchSuggestionReviewEvent.create({
      data: {
        tenantId,
        organizationId: current.organizationId,
        suggestionId: id,
        eventType: options.eventType,
        fromStatus: current.status,
        toStatus: options.nextStatus,
        actorUserId: options.actor.id,
        reasonCode: options.reasonCode || null,
        systemSnapshot: null,
        requestId: options.requestId,
        idempotencyKey: null,
      },
    });

    return tx.matchSuggestion.findFirst({
      where: { id, tenantId },
      select: detailSelect,
    });
  });

  return { item: serializeRequiredSuggestion(updated) };
}

function validateSavePayload(payload: MatchSuggestionSavePayload) {
  assertNoForbiddenPayloadKeys(payload);
  if (payload.organizationId) validateSafeIdentifier(payload.organizationId, "organizationId");
  requireUuid(payload.projectId, "projectId");
  requireUuid(payload.personId, "personId");
  requireNonEmpty(payload.suggestionPairKey, "suggestionPairKey");
  validateSafeIdentifier(payload.suggestionPairKey, "suggestionPairKey");
  requireNonEmpty(payload.suggestionRevisionKey, "suggestionRevisionKey");
  validateSafeIdentifier(payload.suggestionRevisionKey, "suggestionRevisionKey");
  normalizeScore(payload.score);
  if (payload.scoreBand) validateEnum(payload.scoreBand, SCORE_BANDS, "scoreBand");
  validateCodeArray(payload.systemReasonCodes, "systemReasonCodes");
  validateCodeArray(payload.systemWarningCodes, "systemWarningCodes");
  validateCodeArray(payload.promotionBlockers, "promotionBlockers");
  validateEnum(payload.warningSeverity || "NONE", MATCH_WARNING_SEVERITIES, "warningSeverity");
  validateEnum(payload.stalenessState || "UNKNOWN", MATCH_STALENESS_STATES, "stalenessState");
  validateEnum(payload.duplicateState || "NONE", MATCH_DUPLICATE_STATES, "duplicateState");
  validateEnum(payload.sourceEvidenceState || "NONE", MATCH_SOURCE_EVIDENCE_STATES, "sourceEvidenceState");
  validateEnum(payload.attentionState || "NORMAL", MATCH_ATTENTION_STATES, "attentionState");
  for (const record of payload.sourceRecords || []) {
    requireNonEmpty(record.sourceRecordId, "sourceRecordId");
    validateSafeIdentifier(record.sourceRecordId, "sourceRecordId");
    validateEnum(record.sourceType, MATCH_SUGGESTION_SOURCE_TYPES, "sourceType");
    validateEnum(record.evidenceRole, MATCH_SUGGESTION_EVIDENCE_ROLES, "evidenceRole");
    validateSafeText(record.safeSummary, "safeSummary");
  }
}

function validateTransition(fromStatus: MatchSuggestionStatus, action: MatchSuggestionAction, reasonCode?: string) {
  const transition = MATCH_SUGGESTION_TRANSITIONS.find(
    (candidate) => candidate.from === fromStatus && candidate.action === action,
  );
  if (!transition) {
    throw new MatchSuggestionWriteApiError(422, "ILLEGAL_TRANSITION", "Illegal match suggestion transition");
  }
  if (transition.reasonRequired && !reasonCode) {
    throw new MatchSuggestionWriteApiError(422, "REASON_REQUIRED", "reasonCode is required");
  }
}

function validateReasonCode(action: MatchSuggestionAction, reasonCode?: string) {
  if (!reasonCode) return;
  if (reasonCode === "OTHER") {
    throw new MatchSuggestionWriteApiError(422, "REASON_NOT_ALLOWED", "OTHER reason is not allowed in MVP");
  }
  if (action === "reject" && !MATCH_SUGGESTION_REJECT_REASON_CODES.includes(reasonCode as any)) {
    throw new MatchSuggestionWriteApiError(422, "REASON_NOT_ALLOWED", "reasonCode is not allowed");
  }
  if (action === "reopen" && !MATCH_SUGGESTION_REOPEN_REASON_CODES.includes(reasonCode as any)) {
    throw new MatchSuggestionWriteApiError(422, "REASON_NOT_ALLOWED", "reasonCode is not allowed");
  }
}

function resolveLockVersion(headers: Headers, bodyLockVersion: number | undefined) {
  const headerValue = headers.get("if-match");
  const rawValue = headerValue ? headerValue.replace(/^W\//, "").replaceAll("\"", "") : bodyLockVersion;
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    throw new MatchSuggestionWriteApiError(428, "LOCK_VERSION_REQUIRED", "lockVersion or If-Match is required");
  }
  const parsed = Number(rawValue);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new MatchSuggestionWriteApiError(400, "LOCK_VERSION_INVALID", "lockVersion is invalid");
  }
  return parsed;
}

function requireIdempotencyKey(headers: Headers) {
  const value = headers.get("idempotency-key")?.trim();
  if (!value) {
    throw new MatchSuggestionWriteApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key is required");
  }
  if (value.length > 160) {
    throw new MatchSuggestionWriteApiError(400, "IDEMPOTENCY_KEY_INVALID", "Idempotency-Key is too long");
  }
  if (!SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new MatchSuggestionWriteApiError(400, "IDEMPOTENCY_KEY_INVALID", "Idempotency-Key contains unsafe text");
  }
  return value;
}

function initialStatusFor(payload: MatchSuggestionSavePayload): MatchSuggestionStatus {
  const severity = payload.warningSeverity || "NONE";
  const hasWarnings = Boolean(payload.systemWarningCodes?.length) || severity !== "NONE";
  return hasWarnings ? "NEEDS_REVIEW" : "SUGGESTED";
}

function buildSavePayloadFingerprintInput(payload: MatchSuggestionSavePayload) {
  return {
    organizationId: optionalString(payload.organizationId),
    projectId: payload.projectId,
    personId: payload.personId,
    suggestionPairKey: payload.suggestionPairKey,
    suggestionRevisionKey: payload.suggestionRevisionKey,
    score: normalizeScore(payload.score),
    scoreBand: optionalString(payload.scoreBand),
    systemReasonCodes: normalizeStringArray(payload.systemReasonCodes).sort(),
    systemWarningCodes: normalizeStringArray(payload.systemWarningCodes).sort(),
    warningSeverity: payload.warningSeverity || "NONE",
    stalenessState: payload.stalenessState || "UNKNOWN",
    duplicateState: payload.duplicateState || "NONE",
    sourceEvidenceState: payload.sourceEvidenceState || "NONE",
    attentionState: payload.attentionState || "NORMAL",
    promotionBlockers: normalizeStringArray(payload.promotionBlockers).sort(),
    scoringVersion: SERVER_SCORING_VERSION,
    taxonomyVersion: SERVER_TAXONOMY_VERSION,
    redactionPolicyVersion: SERVER_REDACTION_POLICY_VERSION,
    sourceRecords: (payload.sourceRecords || []).map((record) => ({
      sourceType: record.sourceType,
      sourceRecordId: record.sourceRecordId,
      evidenceRole: record.evidenceRole,
      safeSummary: optionalString(record.safeSummary),
    })),
  };
}

function hashStableJson(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function assertReferencedEntitiesExist(prismaClient: any, tenantId: string, payload: MatchSuggestionSavePayload) {
  const [project, person] = await Promise.all([
    prismaClient.project.findFirst({
      where: { id: payload.projectId, tenantId },
      select: { id: true },
    }),
    prismaClient.person.findFirst({
      where: { id: payload.personId, tenantId },
      select: { id: true },
    }),
  ]);

  if (!project) {
    throw new MatchSuggestionWriteApiError(422, "PROJECT_NOT_FOUND", "projectId does not exist");
  }
  if (!person) {
    throw new MatchSuggestionWriteApiError(422, "PERSON_NOT_FOUND", "personId does not exist");
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
}

function normalizeScore(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", "score must be a number between 0 and 1");
  }
  return (Math.round(parsed * 10000) / 10000).toFixed(4);
}

function optionalString(value: unknown) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

function requireNonEmpty(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", `${label} is required`);
  }
}

function requireUuid(value: unknown, label: string) {
  requireNonEmpty(value, label);
  if (!UUID_PATTERN.test(String(value))) {
    throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", `${label} must be a UUID`);
  }
}

function validateEnum<T extends readonly string[]>(value: string, allowed: T, label: string) {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", `${label} is invalid`);
  }
}

function validateCodeArray(value: unknown, label: string) {
  for (const item of normalizeStringArray(value)) {
    if (!CODE_PATTERN.test(item)) {
      throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", `${label} contains invalid code`);
    }
  }
}

function validateSafeIdentifier(value: unknown, label: string, maxLength = 180) {
  const text = optionalString(value);
  if (!text || text.length > maxLength || !SAFE_IDENTIFIER_PATTERN.test(text)) {
    throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", `${label} contains unsafe identifier text`);
  }
}

function validateSafeText(value: unknown, label: string) {
  const text = optionalString(value);
  if (!text) return;
  if (text.length > SAFE_TEXT_MAX_LENGTH) {
    throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", `${label} is too long`);
  }
  if (SAFE_TEXT_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", `${label} contains forbidden raw or PII-like text`);
  }
}

function assertNoForbiddenPayloadKeys(value: unknown, path = "payload") {
  if (!value || typeof value !== "object") return;
  const forbiddenKeys = new Set<string>(MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS as readonly string[]);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeys.has(key)) {
      throw new MatchSuggestionWriteApiError(422, "INVALID_PAYLOAD", "payload contains forbidden raw or PII field");
    }
    assertNoForbiddenPayloadKeys(child, `${path}.${key}`);
  }
}

function serializeRequiredSuggestion(record: any) {
  if (!record) {
    throw new MatchSuggestionWriteApiError(409, "MATCH_SUGGESTION_RESULT_MISSING", "Match suggestion result is missing");
  }
  return serializeSuggestionDetail(record);
}

const detailSelect = {
  id: true,
  tenantId: true,
  organizationId: true,
  projectId: true,
  personId: true,
  suggestionPairKey: true,
  suggestionRevisionKey: true,
  status: true,
  score: true,
  scoreBand: true,
  systemReasonCodes: true,
  systemWarningCodes: true,
  warningSeverity: true,
  stalenessState: true,
  duplicateState: true,
  sourceEvidenceState: true,
  attentionState: true,
  promotionBlockers: true,
  promotionEligible: true,
  downstreamReadiness: true,
  scoringVersion: true,
  taxonomyVersion: true,
  redactionPolicyVersion: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  lastReviewedAt: true,
  lastReviewedByUserId: true,
  lockVersion: true,
  reviewEvents: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      eventType: true,
      fromStatus: true,
      toStatus: true,
      actorUserId: true,
      reasonCode: true,
      createdAt: true,
      requestId: true,
    },
  },
  sourceRecords: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      sourceType: true,
      sourceRecordId: true,
      evidenceRole: true,
      safeSummary: true,
      createdAt: true,
    },
  },
};
