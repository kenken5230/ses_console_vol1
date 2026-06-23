export const PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT = "LINK_EXISTING_PROJECT_COMPANY_CONTACT_ROLE";

export const PROJECT_COMPANY_CONTACT_ROLE_VALUES = [
  "UPPER_COMPANY",
  "END_USER",
  "PRIME_CONTRACTOR",
  "SECONDARY_CONTRACTOR",
  "TERTIARY_CONTRACTOR",
  "ACCOUNT_MANAGER_COMPANY",
  "PROPOSAL_TARGET",
  "OTHER",
] as const;

export type ProjectCompanyContactRoleValue = (typeof PROJECT_COMPANY_CONTACT_ROLE_VALUES)[number];
export type ProjectCompanyContactRoleReasonCode =
  | "candidate_verified"
  | "manual_admin_review"
  | "sales_ops_cleanup"
  | "stale_candidate_recheck"
  | "duplicate_role_cleanup";

export const PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES: ProjectCompanyContactRoleReasonCode[] = [
  "candidate_verified",
  "manual_admin_review",
  "sales_ops_cleanup",
  "stale_candidate_recheck",
  "duplicate_role_cleanup",
];

export const PROJECT_COMPANY_CONTACT_ROLE_DERIVATION: Record<
  ProjectCompanyContactRoleValue,
  { roleOrder: number; isPrimary: boolean }
> = {
  UPPER_COMPANY: { roleOrder: 1, isPrimary: true },
  END_USER: { roleOrder: 2, isPrimary: false },
  PRIME_CONTRACTOR: { roleOrder: 3, isPrimary: false },
  SECONDARY_CONTRACTOR: { roleOrder: 4, isPrimary: false },
  TERTIARY_CONTRACTOR: { roleOrder: 5, isPrimary: false },
  ACCOUNT_MANAGER_COMPANY: { roleOrder: 80, isPrimary: false },
  PROPOSAL_TARGET: { roleOrder: 90, isPrimary: false },
  OTHER: { roleOrder: 99, isPrimary: false },
};

export function buildProjectCompanyContactRoleConfirmationToken(
  routeProjectId: string,
  role: ProjectCompanyContactRoleValue,
  companyId: string,
  contactId: string,
) {
  return `project-company-contact-role-link:${routeProjectId}:${role}:${companyId}:${contactId}`;
}
