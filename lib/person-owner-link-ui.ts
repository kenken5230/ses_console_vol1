export const PERSON_OWNER_LINK_INTENT = "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT";
export const PERSON_OWNER_LINK_CONFIRMATION_LABEL = "上記の会社・担当者が正しいことを確認しました";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOCKED_COMPANY_STATUSES = new Set(["NG", "NEEDS_REVIEW", "SUSPENDED"]);
const BLOCKED_REVIEW_STATUSES = new Set(["NEEDS_REVIEW", "FAILED", "ERROR", "REJECTED"]);
const MIN_SAFE_CANDIDATE_SCORE = 60;

type Nullable<T> = T | null | undefined;

export type PersonOwnerLinkRole = "ADMIN" | "MANAGER" | "SALES" | "VIEWER" | string;

export type PersonOwnerLinkPerson = {
  dbId?: Nullable<string>;
  ownerCompanyId?: Nullable<string>;
  ownerContactId?: Nullable<string>;
  ownerLinkUpdatedAt?: Nullable<string>;
  needsReview?: Nullable<boolean>;
  reviewReasons?: Nullable<string[]>;
  ownerLinkReviewStatus?: Nullable<string>;
  nameConfidence?: Nullable<string>;
};

export type PersonOwnerLinkCandidate = {
  score?: Nullable<number>;
  company?: Nullable<{
    id?: Nullable<string>;
    name?: Nullable<string>;
    tradeStatus?: Nullable<string>;
  }>;
  contact?: Nullable<{
    id?: Nullable<string>;
    name?: Nullable<string>;
    companyId?: Nullable<string>;
    isActive?: Nullable<boolean>;
  }>;
};

export type PersonOwnerLinkGateInput = {
  currentUserRole?: Nullable<PersonOwnerLinkRole>;
  personOwnerLinkWriteAllowed?: Nullable<boolean>;
  person?: Nullable<PersonOwnerLinkPerson>;
  candidate?: Nullable<PersonOwnerLinkCandidate>;
};

export type PersonOwnerLinkGateResult = {
  visible: boolean;
  enabled: boolean;
  reasonCode: string | null;
  reason: string | null;
};

export type PersonOwnerLinkPayload = {
  intent: typeof PERSON_OWNER_LINK_INTENT;
  companyId: string;
  contactId: string;
  confirmCompanyContactLink: true;
  expectedOwnerCompanyId: string | null;
  expectedOwnerContactId: string | null;
  expectedUpdatedAt: string;
};

function isAdminOrManager(role: Nullable<PersonOwnerLinkRole>) {
  return role === "ADMIN" || role === "MANAGER";
}

function isUuid(value: Nullable<string>) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isTimestamp(value: Nullable<string>) {
  if (typeof value !== "string" || !value.trim()) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function disabled(reasonCode: string, reason: string, visible = true): PersonOwnerLinkGateResult {
  return { visible, enabled: false, reasonCode, reason };
}

function enabled(): PersonOwnerLinkGateResult {
  return { visible: true, enabled: true, reasonCode: null, reason: null };
}

function isLowConfidence(value: Nullable<string>) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes("low") || normalized.includes("uncertain") || normalized.includes("needs_review");
}

function isReviewRisky(person: PersonOwnerLinkPerson) {
  if (person.needsReview) {
    return disabled("PERSON_NEEDS_REVIEW", "要員抽出が要確認のため、リンク前に内容確認が必要です。");
  }

  const reviewStatus = String(person.ownerLinkReviewStatus || "").trim().toUpperCase();
  if (BLOCKED_REVIEW_STATUSES.has(reviewStatus)) {
    return disabled("PERSON_REVIEW_STATUS_BLOCKED", "抽出レビュー状態が安全ではないため、リンクできません。");
  }

  if (Array.isArray(person.reviewReasons) && person.reviewReasons.length > 0) {
    return disabled("PERSON_REVIEW_REASONS_PRESENT", "要確認理由が残っているため、リンク前に手動確認が必要です。");
  }

  if (isLowConfidence(person.nameConfidence)) {
    return disabled("PERSON_CONFIDENCE_LOW", "人名 confidence が低いため、リンク前に手動確認が必要です。");
  }

  return null;
}

export function getPersonOwnerLinkGate(input: PersonOwnerLinkGateInput): PersonOwnerLinkGateResult {
  const person = input.person || {};
  const candidate = input.candidate || {};
  const company = candidate.company || {};
  const contact = candidate.contact || {};

  if (!isAdminOrManager(input.currentUserRole) || input.personOwnerLinkWriteAllowed !== true) {
    return disabled("ROLE_NOT_ALLOWED", "会社・担当者リンクは ADMIN/MANAGER のみ実行できます。", false);
  }

  if (!isUuid(person.dbId)) {
    return disabled("PERSON_ID_MISSING", "要員の DB ID が確認できないため、リンクできません。", false);
  }

  if (person.ownerCompanyId || person.ownerContactId) {
    return disabled("OWNER_LINK_ALREADY_PRESENT", "既存の所属会社または担当者が設定済みのため、上書きしません。");
  }

  if (!isTimestamp(person.ownerLinkUpdatedAt)) {
    return disabled("PERSON_UPDATED_AT_MISSING", "更新日時が確認できないため、競合検知付きリンクを実行できません。");
  }

  if (!isUuid(company.id)) {
    return disabled("COMPANY_ID_MISSING", "候補会社の既存 Company ID がないため、リンクできません。");
  }

  if (!isUuid(contact.id)) {
    return disabled("CONTACT_ID_MISSING", "候補担当者の既存 CompanyContact ID がないため、リンクできません。");
  }

  if (contact.isActive !== true) {
    return disabled("CONTACT_INACTIVE", "候補担当者が有効ではないため、リンクできません。");
  }

  if (!isUuid(contact.companyId)) {
    return disabled("CONTACT_COMPANY_ID_MISSING", "候補担当者の所属 Company ID が確認できません。");
  }

  if (contact.companyId !== company.id) {
    return disabled("CONTACT_COMPANY_MISMATCH", "候補担当者が候補会社に所属していないため、リンクできません。");
  }

  const tradeStatus = String(company.tradeStatus || "UNKNOWN").trim().toUpperCase();
  if (BLOCKED_COMPANY_STATUSES.has(tradeStatus)) {
    return disabled("COMPANY_STATUS_BLOCKED", "候補会社の取引ステータスが手動確認対象のため、リンクできません。");
  }

  const reviewRisk = isReviewRisky(person);
  if (reviewRisk) return reviewRisk;

  if (typeof candidate.score === "number" && candidate.score < MIN_SAFE_CANDIDATE_SCORE) {
    return disabled("CANDIDATE_SCORE_LOW", "候補スコアが低いため、リンク前に手動確認が必要です。");
  }

  return enabled();
}

export function buildPersonOwnerLinkPayload(
  person: PersonOwnerLinkPerson,
  candidate: PersonOwnerLinkCandidate,
): PersonOwnerLinkPayload {
  const companyId = candidate.company?.id || "";
  const contactId = candidate.contact?.id || "";
  const expectedUpdatedAt = person.ownerLinkUpdatedAt || "";

  if (!isUuid(companyId) || !isUuid(contactId) || !expectedUpdatedAt) {
    throw new Error("Cannot build person owner link payload from an unsafe candidate.");
  }

  return {
    intent: PERSON_OWNER_LINK_INTENT,
    companyId,
    contactId,
    confirmCompanyContactLink: true,
    expectedOwnerCompanyId: person.ownerCompanyId || null,
    expectedOwnerContactId: person.ownerContactId || null,
    expectedUpdatedAt,
  };
}
