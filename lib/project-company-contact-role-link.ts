import type { AuthUser } from "./auth";
import {
  companyLinkTradeStatusReasonCode,
  findUnsafeLinkPayloadField,
  isAllowedNonProductionLinkWriteTarget,
  isCompanyContactLinkWriterRole,
  isLinkProductionRuntime,
  LINK_NON_PRODUCTION_WRITE_TARGETS,
  LINK_SENSITIVE_VALUE_PATTERNS,
} from "./link-safety-policy";
import {
  buildProjectCompanyContactRoleConfirmationToken,
  PROJECT_COMPANY_CONTACT_ROLE_DERIVATION,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT,
  PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES,
  PROJECT_COMPANY_CONTACT_ROLE_VALUES,
  type ProjectCompanyContactRoleReasonCode,
  type ProjectCompanyContactRoleValue,
} from "./project-company-contact-role-link-contract";

export {
  buildProjectCompanyContactRoleConfirmationToken,
  PROJECT_COMPANY_CONTACT_ROLE_DERIVATION,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT,
  PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES,
  PROJECT_COMPANY_CONTACT_ROLE_VALUES,
  type ProjectCompanyContactRoleReasonCode,
  type ProjectCompanyContactRoleValue,
} from "./project-company-contact-role-link-contract";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_BODY_KEYS = new Set([
  "companyId",
  "contactId",
  "role",
  "expectedUpdatedAt",
  "reasonCode",
  "confirmationToken",
]);

const REQUIRED_BODY_KEYS = [
  "companyId",
  "contactId",
  "role",
  "expectedUpdatedAt",
  "reasonCode",
  "confirmationToken",
] as const;

const DERIVED_BODY_KEYS = ["roleOrder", "isPrimary"] as const;

const projectSelect = {
  id: true,
  updatedAt: true,
};

const projectCompanyRoleSelect = {
  id: true,
  projectId: true,
  companyId: true,
  companyContactId: true,
  role: true,
  roleOrder: true,
  isPrimary: true,
  createdAt: true,
};

export type ProjectCompanyContactRoleLinkEnv = {
  NODE_ENV?: string;
  PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED?: string;
  PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET?: string;
  VERCEL_ENV?: string;
  [key: string]: string | undefined;
};

export type ProjectCompanyContactRoleLinkTarget = "local" | "test" | "staging" | "production" | "unsupported";

export type ProjectCompanyContactRoleLinkGuard = {
  allowed: boolean;
  enabled: boolean;
  target: ProjectCompanyContactRoleLinkTarget;
  productionRuntime: boolean;
};

export type ProjectCompanyContactRoleLinkUser = Pick<AuthUser, "id" | "role"> & {
  isActive?: boolean;
};

export type LinkExistingProjectCompanyContactRoleInput = {
  companyId: string;
  contactId: string;
  role: ProjectCompanyContactRoleValue;
  expectedUpdatedAt: string;
  reasonCode: ProjectCompanyContactRoleReasonCode;
  confirmationToken: string;
};

export type ProjectCompanyContactRoleLinkDb = {
  company: {
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  };
  companyContact: {
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  };
  project: {
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
    update(args: Record<string, unknown>): Promise<unknown>;
  };
  projectCompanyRole: {
    findFirst(args: Record<string, unknown>): Promise<unknown | null>;
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  auditLog: {
    create(args: Record<string, unknown>): Promise<unknown>;
  };
  $transaction<T>(fn: (tx: ProjectCompanyContactRoleLinkDb) => Promise<T>): Promise<T>;
};

export class ProjectCompanyContactRoleLinkRequestError extends Error {
  status: number;
  reasonCode: string;
  manualReview: boolean;

  constructor(message: string, status = 400, reasonCode = "INVALID_PROJECT_COMPANY_CONTACT_ROLE_LINK_REQUEST") {
    super(message);
    this.name = "ProjectCompanyContactRoleLinkRequestError";
    this.status = status;
    this.reasonCode = reasonCode;
    this.manualReview = status === 409;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isObject(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isoDate(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function uuidValue(value: unknown, field: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ProjectCompanyContactRoleLinkRequestError(`${field} must be a valid UUID`);
  }
  return value;
}

function requiredTimestampValue(body: Record<string, unknown>, field: string) {
  if (!hasOwn(body, field)) {
    throw new ProjectCompanyContactRoleLinkRequestError(`${field} is required`);
  }

  const value = body[field];
  if (typeof value !== "string" || LINK_SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new ProjectCompanyContactRoleLinkRequestError(`${field} must be a valid timestamp`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ProjectCompanyContactRoleLinkRequestError(`${field} must be a valid timestamp`);
  }

  return parsed.toISOString();
}

function roleValue(value: unknown) {
  if (typeof value !== "string" || !PROJECT_COMPANY_CONTACT_ROLE_VALUES.includes(value as ProjectCompanyContactRoleValue)) {
    throw new ProjectCompanyContactRoleLinkRequestError("role must be a valid ProjectCompanyRoleType");
  }
  return value as ProjectCompanyContactRoleValue;
}

function reasonCodeValue(value: unknown) {
  if (typeof value !== "string" || !PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES.includes(value as ProjectCompanyContactRoleReasonCode)) {
    throw new ProjectCompanyContactRoleLinkRequestError("reasonCode must be a bounded enum value");
  }
  return value as ProjectCompanyContactRoleReasonCode;
}

function isPrismaRecordNotFoundError(error: unknown) {
  return asRecord(error).code === "P2025";
}

function assertNoUnsupportedOrRawFields(body: Record<string, unknown>) {
  const unsafeField = findUnsafeLinkPayloadField(body, ALLOWED_BODY_KEYS, {
    extraForbiddenKeys: DERIVED_BODY_KEYS,
  });
  if (!unsafeField) return;

  if (unsafeField.kind === "unsupported-key") {
    throw new ProjectCompanyContactRoleLinkRequestError("Request contains unsupported raw, note, or customer data fields");
  }

  throw new ProjectCompanyContactRoleLinkRequestError("Request contains unsafe raw or customer data values");
}

function safeRecordId(record: unknown) {
  const id = asRecord(record).id;
  return typeof id === "string" ? id : null;
}

function safeTradeStatus(record: unknown) {
  const tradeStatus = asRecord(record).tradeStatus;
  return typeof tradeStatus === "string" ? tradeStatus : "UNKNOWN";
}

function safeCompanyId(record: unknown) {
  const companyId = asRecord(record).companyId;
  return typeof companyId === "string" ? companyId : null;
}

function safeIsActive(record: unknown) {
  return asRecord(record).isActive !== false;
}

function safeRoleId(record: unknown) {
  const id = asRecord(record).id;
  return typeof id === "string" ? id : null;
}

function auditMetadata(
  input: LinkExistingProjectCompanyContactRoleInput,
  guard: ProjectCompanyContactRoleLinkGuard,
) {
  return {
    intent: PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT,
    reasonCode: input.reasonCode,
    confirmationTokenMatched: true,
    featureGuard: {
      PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: guard.enabled ? "true" : "not-true",
      PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: guard.target,
      productionRuntime: guard.productionRuntime,
    },
  };
}

function assertExpectedProjectState(
  project: unknown,
  routeProjectId: string,
  input: LinkExistingProjectCompanyContactRoleInput,
) {
  if (!project || safeRecordId(project) !== routeProjectId) {
    throw new ProjectCompanyContactRoleLinkRequestError("Project was not found", 404, "PROJECT_NOT_FOUND");
  }

  const currentUpdatedAt = isoDate(asRecord(project).updatedAt);
  if (!currentUpdatedAt || input.expectedUpdatedAt !== currentUpdatedAt) {
    throw new ProjectCompanyContactRoleLinkRequestError(
      "Project updatedAt changed before company/contact role link.",
      409,
      "STALE_PROJECT_UPDATED_AT",
    );
  }
}

export function projectCompanyContactRoleLinkGuard(
  env: ProjectCompanyContactRoleLinkEnv = process.env,
): ProjectCompanyContactRoleLinkGuard {
  const enabled = env.PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED === "true";
  const rawTarget = env.PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET;
  const target: ProjectCompanyContactRoleLinkTarget = isAllowedNonProductionLinkWriteTarget(rawTarget)
    ? rawTarget
    : rawTarget === "production"
      ? "production"
      : "unsupported";
  const productionRuntime = isLinkProductionRuntime(env, target);

  return {
    allowed: enabled && LINK_NON_PRODUCTION_WRITE_TARGETS.includes(target as (typeof LINK_NON_PRODUCTION_WRITE_TARGETS)[number]) && !productionRuntime,
    enabled,
    target,
    productionRuntime,
  };
}

export function disabledProjectCompanyContactRoleLinkResponse(guard = projectCompanyContactRoleLinkGuard()) {
  return {
    status: "disabled",
    linked: false,
    writeAttempted: false,
    guard: {
      allowed: false,
      enabled: guard.enabled,
      target: guard.target,
      productionRuntime: guard.productionRuntime,
      required: [
        "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true",
        "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=local|test|staging",
      ],
    },
    message: guard.productionRuntime
      ? "Project company/contact role link writes are not allowed for production target."
      : "Project company/contact role link writes are disabled for this environment.",
  };
}

export function projectCompanyContactRoleLinkErrorResponse(error: ProjectCompanyContactRoleLinkRequestError) {
  return {
    status: error.manualReview ? "manual-review" : "error",
    reasonCode: error.reasonCode,
    message: error.message,
    linked: false,
    writeAttempted: false,
  };
}

export function isProjectCompanyContactRoleLinkUser(user: unknown): user is ProjectCompanyContactRoleLinkUser {
  const record = asRecord(user);
  return typeof record.id === "string"
    && isCompanyContactLinkWriterRole(record.role)
    && record.isActive !== false;
}

export function validateProjectCompanyContactRoleLinkBody(
  bodyLike: unknown,
  routeProjectId: string,
): LinkExistingProjectCompanyContactRoleInput {
  if (!UUID_PATTERN.test(routeProjectId)) {
    throw new ProjectCompanyContactRoleLinkRequestError("Invalid project id");
  }

  if (!isObject(bodyLike)) {
    throw new ProjectCompanyContactRoleLinkRequestError("Request body must be a JSON object");
  }

  const body = asRecord(bodyLike);
  assertNoUnsupportedOrRawFields(body);

  for (const key of REQUIRED_BODY_KEYS) {
    if (!hasOwn(body, key)) {
      throw new ProjectCompanyContactRoleLinkRequestError(`${key} is required`);
    }
  }

  const companyId = uuidValue(body.companyId, "companyId");
  const contactId = uuidValue(body.contactId, "contactId");
  const role = roleValue(body.role);
  const expectedUpdatedAt = requiredTimestampValue(body, "expectedUpdatedAt");
  const reasonCode = reasonCodeValue(body.reasonCode);
  const confirmationToken = typeof body.confirmationToken === "string" ? body.confirmationToken : "";
  const expectedToken = buildProjectCompanyContactRoleConfirmationToken(routeProjectId, role, companyId, contactId);

  if (confirmationToken !== expectedToken) {
    throw new ProjectCompanyContactRoleLinkRequestError("confirmationToken does not match the requested project/company/contact role link");
  }

  return {
    companyId,
    contactId,
    role,
    expectedUpdatedAt,
    reasonCode,
    confirmationToken,
  };
}

export async function linkExistingProjectCompanyContactRole(
  db: ProjectCompanyContactRoleLinkDb,
  routeProjectId: string,
  body: unknown,
  user: ProjectCompanyContactRoleLinkUser,
  guard: ProjectCompanyContactRoleLinkGuard = projectCompanyContactRoleLinkGuard(),
) {
  if (!guard.allowed) {
    throw new ProjectCompanyContactRoleLinkRequestError("Project company/contact role link writes are disabled", 403, "FEATURE_DISABLED");
  }

  if (!isProjectCompanyContactRoleLinkUser(user)) {
    throw new ProjectCompanyContactRoleLinkRequestError("Forbidden", 403, "FORBIDDEN_ROLE");
  }

  const input = validateProjectCompanyContactRoleLinkBody(body, routeProjectId);

  const company = await db.company.findUnique({
    where: { id: input.companyId },
    select: { id: true, tradeStatus: true },
  });
  if (!company || safeRecordId(company) !== input.companyId) {
    throw new ProjectCompanyContactRoleLinkRequestError("Company was not found", 404, "COMPANY_NOT_FOUND");
  }

  const contact = await db.companyContact.findUnique({
    where: { id: input.contactId },
    select: { id: true, companyId: true, isActive: true },
  });
  if (!contact || safeRecordId(contact) !== input.contactId) {
    throw new ProjectCompanyContactRoleLinkRequestError("Company contact was not found", 404, "COMPANY_CONTACT_NOT_FOUND");
  }

  if (safeCompanyId(contact) !== input.companyId) {
    throw new ProjectCompanyContactRoleLinkRequestError(
      "Company contact does not belong to the requested company.",
      409,
      "CONTACT_COMPANY_MISMATCH",
    );
  }

  if (!safeIsActive(contact)) {
    throw new ProjectCompanyContactRoleLinkRequestError(
      "Company contact is inactive and requires manual review.",
      409,
      "INACTIVE_COMPANY_CONTACT",
    );
  }

  const tradeStatus = safeTradeStatus(company);
  const tradeStatusReasonCode = companyLinkTradeStatusReasonCode(tradeStatus);
  if (tradeStatusReasonCode) {
    throw new ProjectCompanyContactRoleLinkRequestError(
      "Company trade status requires manual review before linking.",
      409,
      tradeStatusReasonCode,
    );
  }

  const roleDerivation = PROJECT_COMPANY_CONTACT_ROLE_DERIVATION[input.role];
  const result = await db.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: routeProjectId },
      select: projectSelect,
    });

    assertExpectedProjectState(project, routeProjectId, input);

    const existingRole = await tx.projectCompanyRole.findFirst({
      where: { projectId: routeProjectId, role: input.role },
      select: { id: true, projectId: true, role: true, companyId: true, companyContactId: true },
    });

    if (existingRole) {
      throw new ProjectCompanyContactRoleLinkRequestError(
        "Project already has a company/contact link for this role.",
        409,
        "PROJECT_COMPANY_ROLE_ALREADY_EXISTS",
      );
    }

    let touchedProject: unknown;
    try {
      touchedProject = await tx.project.update({
        where: {
          id: routeProjectId,
          updatedAt: new Date(input.expectedUpdatedAt),
        },
        data: {
          updatedAt: new Date(),
        },
        select: projectSelect,
      });
    } catch (error) {
      if (isPrismaRecordNotFoundError(error)) {
        throw new ProjectCompanyContactRoleLinkRequestError(
          "Project changed before company/contact role link.",
          409,
          "STALE_PROJECT_UPDATED_AT",
        );
      }
      throw error;
    }

    const companyRole = await tx.projectCompanyRole.create({
      data: {
        projectId: routeProjectId,
        companyId: input.companyId,
        companyContactId: input.contactId,
        role: input.role,
        roleOrder: roleDerivation.roleOrder,
        isPrimary: roleDerivation.isPrimary,
      },
      select: projectCompanyRoleSelect,
    });

    const beforeData = {
      projectId: routeProjectId,
      role: input.role,
      projectUpdatedAt: input.expectedUpdatedAt,
      existingProjectCompanyRoleId: null,
    };
    const afterData = {
      projectId: routeProjectId,
      projectUpdatedAt: isoDate(asRecord(touchedProject).updatedAt),
      companyRoleId: safeRoleId(companyRole),
      companyId: input.companyId,
      contactId: input.contactId,
      role: input.role,
      roleOrder: roleDerivation.roleOrder,
      isPrimary: roleDerivation.isPrimary,
      metadata: auditMetadata(input, guard),
    };

    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT,
        entityType: "Project",
        entityId: routeProjectId,
        beforeData,
        afterData,
      },
    });

    return { companyRole, touchedProject };
  });

  const companyRoleRecord = asRecord(result.companyRole);
  return {
    projectId: routeProjectId,
    companyRoleId: safeRoleId(result.companyRole),
    companyId: typeof companyRoleRecord.companyId === "string" ? companyRoleRecord.companyId : input.companyId,
    contactId: typeof companyRoleRecord.companyContactId === "string" ? companyRoleRecord.companyContactId : input.contactId,
    role: typeof companyRoleRecord.role === "string" ? companyRoleRecord.role : input.role,
  };
}

export function assertNoSensitiveProjectCompanyContactRoleLinkOutput(output: string) {
  for (const pattern of LINK_SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(output)) {
      throw new Error("Sensitive project company/contact role link output detected");
    }
  }
}
