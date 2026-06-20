import {
  isBlockedCompanyLinkTradeStatus,
  isCompanyContactLinkWriterRole,
} from "./link-safety-policy";
import {
  PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES,
  PROJECT_COMPANY_CONTACT_ROLE_VALUES,
  buildProjectCompanyContactRoleConfirmationToken,
  type ProjectCompanyContactRoleReasonCode,
  type ProjectCompanyContactRoleValue,
} from "./project-company-contact-role-link-contract";

export const PROJECT_COMPANY_CONTACT_ROLE_LINK_CONFIRMATION_LABEL =
  "上記の既存会社・既存担当者・ロールが正しいことを確認しました";
export const PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE =
  "candidate_verified" satisfies ProjectCompanyContactRoleReasonCode;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_SAFE_CANDIDATE_SCORE = 60;

type Nullable<T> = T | null | undefined;

export type ProjectCompanyContactRoleLinkUserRole = "ADMIN" | "MANAGER" | "SALES" | "VIEWER" | string;

export type ProjectCompanyContactRoleLinkProjectRole = {
  role?: Nullable<string>;
};

export type ProjectCompanyContactRoleLinkProject = {
  dbId?: Nullable<string>;
  id?: Nullable<string>;
  projectCompanyContactRoleLinkUpdatedAt?: Nullable<string>;
  updatedAt?: Nullable<string>;
  companyRoles?: Nullable<ProjectCompanyContactRoleLinkProjectRole[]>;
};

export type ProjectCompanyContactRoleLinkCandidate = {
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

export type ProjectCompanyContactRoleLinkGateInput = {
  currentUserRole?: Nullable<ProjectCompanyContactRoleLinkUserRole>;
  projectCompanyContactRoleLinkWriteAllowed?: Nullable<boolean>;
  project?: Nullable<ProjectCompanyContactRoleLinkProject>;
  candidate?: Nullable<ProjectCompanyContactRoleLinkCandidate>;
  role?: Nullable<string>;
};

export type ProjectCompanyContactRoleLinkGateResult = {
  visible: boolean;
  enabled: boolean;
  reasonCode: string | null;
  reason: string | null;
};

export type ProjectCompanyContactRoleLinkPayload = {
  companyId: string;
  contactId: string;
  role: ProjectCompanyContactRoleValue;
  expectedUpdatedAt: string;
  reasonCode: ProjectCompanyContactRoleReasonCode;
  confirmationToken: string;
};

const projectCompanyRoleLabels: Record<ProjectCompanyContactRoleValue, string> = {
  UPPER_COMPANY: "上位会社",
  END_USER: "エンドユーザー",
  PRIME_CONTRACTOR: "元請",
  SECONDARY_CONTRACTOR: "二次請け",
  TERTIARY_CONTRACTOR: "三次請け",
  ACCOUNT_MANAGER_COMPANY: "営業担当会社",
  PROPOSAL_TARGET: "提案先",
  OTHER: "その他",
};

const reasonCodeLabels: Record<ProjectCompanyContactRoleReasonCode, string> = {
  candidate_verified: "候補を確認済み",
  manual_admin_review: "管理者確認済み",
  sales_ops_cleanup: "営業運用整理",
  stale_candidate_recheck: "候補再確認済み",
  duplicate_role_cleanup: "重複ロール整理",
};

export const PROJECT_COMPANY_CONTACT_ROLE_LINK_ROLE_OPTIONS = PROJECT_COMPANY_CONTACT_ROLE_VALUES.map((value) => ({
  value,
  label: projectCompanyRoleLabels[value] || value,
}));

export const PROJECT_COMPANY_CONTACT_ROLE_LINK_REASON_OPTIONS = PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES.map((value) => ({
  value,
  label: reasonCodeLabels[value] || value,
}));

function isUuid(value: Nullable<string>) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isTimestamp(value: Nullable<string>) {
  if (typeof value !== "string" || !value.trim()) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function disabled(reasonCode: string, reason: string, visible = true): ProjectCompanyContactRoleLinkGateResult {
  return { visible, enabled: false, reasonCode, reason };
}

function enabled(): ProjectCompanyContactRoleLinkGateResult {
  return { visible: true, enabled: true, reasonCode: null, reason: null };
}

function projectId(project: ProjectCompanyContactRoleLinkProject) {
  return project.dbId || project.id || "";
}

function projectUpdatedAt(project: ProjectCompanyContactRoleLinkProject) {
  return project.projectCompanyContactRoleLinkUpdatedAt || project.updatedAt || "";
}

function isKnownRole(role: Nullable<string>): role is ProjectCompanyContactRoleValue {
  return PROJECT_COMPANY_CONTACT_ROLE_VALUES.includes(role as ProjectCompanyContactRoleValue);
}

function isKnownReasonCode(reasonCode: Nullable<string>): reasonCode is ProjectCompanyContactRoleReasonCode {
  return PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES.includes(reasonCode as ProjectCompanyContactRoleReasonCode);
}

export function getProjectCompanyContactRoleLinkGate(
  input: ProjectCompanyContactRoleLinkGateInput,
): ProjectCompanyContactRoleLinkGateResult {
  const project = input.project || {};
  const candidate = input.candidate || {};
  const company = candidate.company || {};
  const contact = candidate.contact || {};

  if (!isUuid(projectId(project))) {
    return disabled("PROJECT_ID_MISSING", "案件の DB ID が確認できないため、リンクできません。", false);
  }

  if (!isCompanyContactLinkWriterRole(input.currentUserRole)) {
    return disabled("ROLE_NOT_ALLOWED", "既存会社・担当者リンクは ADMIN/MANAGER のみ実行できます。");
  }

  if (input.projectCompanyContactRoleLinkWriteAllowed !== true) {
    return disabled("FEATURE_DISABLED", "この環境では案件の会社・担当者リンク書き込みが無効です。");
  }

  if (!isTimestamp(projectUpdatedAt(project))) {
    return disabled("PROJECT_UPDATED_AT_MISSING", "案件の更新時刻が確認できないため、競合検知付きリンクを実行できません。");
  }

  if (!isUuid(company.id)) {
    return disabled("COMPANY_ID_MISSING", "候補会社の既存 Company ID がないため、リンクできません。");
  }

  if (!isUuid(contact.id)) {
    return disabled("CONTACT_ID_MISSING", "候補担当者の既存 CompanyContact ID がないため、リンクできません。");
  }

  if (contact.isActive !== true) {
    return disabled("CONTACT_INACTIVE", "候補担当者が有効ではないため、手動確認が必要です。");
  }

  if (!isUuid(contact.companyId)) {
    return disabled("CONTACT_COMPANY_ID_MISSING", "候補担当者の所属 Company ID が確認できません。");
  }

  if (contact.companyId !== company.id) {
    return disabled("CONTACT_COMPANY_MISMATCH", "候補担当者が候補会社に所属していないため、リンクできません。");
  }

  if (isBlockedCompanyLinkTradeStatus(company.tradeStatus)) {
    return disabled("COMPANY_STATUS_BLOCKED", "候補会社の取引ステータスが手動確認対象のため、リンクできません。");
  }

  if (typeof candidate.score === "number" && candidate.score < MIN_SAFE_CANDIDATE_SCORE) {
    return disabled("CANDIDATE_SCORE_LOW", "候補スコアが低いため、リンク前に手動確認が必要です。");
  }

  if (input.role) {
    if (!isKnownRole(input.role)) {
      return disabled("ROLE_INVALID", "ロールは既存の ProjectCompanyRoleType から選択してください。");
    }

    if ((project.companyRoles || []).some((entry) => entry?.role === input.role)) {
      return disabled("PROJECT_COMPANY_ROLE_ALREADY_EXISTS", "この案件には同じロールの会社リンクが既にあります。");
    }
  }

  return enabled();
}

export function buildProjectCompanyContactRoleLinkPayload(
  project: ProjectCompanyContactRoleLinkProject,
  candidate: ProjectCompanyContactRoleLinkCandidate,
  role: string,
  reasonCode: string,
): ProjectCompanyContactRoleLinkPayload {
  const routeProjectId = projectId(project);
  const companyId = candidate.company?.id || "";
  const contactId = candidate.contact?.id || "";
  const expectedUpdatedAt = projectUpdatedAt(project);

  if (!isUuid(routeProjectId) || !isUuid(companyId) || !isUuid(contactId) || !isTimestamp(expectedUpdatedAt)) {
    throw new Error("Cannot build project company/contact role link payload from an unsafe candidate.");
  }

  if (!isKnownRole(role)) {
    throw new Error("Cannot build project company/contact role link payload without a bounded role.");
  }

  if (!isKnownReasonCode(reasonCode)) {
    throw new Error("Cannot build project company/contact role link payload without a bounded reasonCode.");
  }

  return {
    companyId,
    contactId,
    role,
    expectedUpdatedAt,
    reasonCode,
    confirmationToken: buildProjectCompanyContactRoleConfirmationToken(routeProjectId, role, companyId, contactId),
  };
}
