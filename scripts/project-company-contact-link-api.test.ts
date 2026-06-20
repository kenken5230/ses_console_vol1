import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  assertNoSensitiveProjectCompanyContactRoleLinkOutput,
  buildProjectCompanyContactRoleConfirmationToken,
  disabledProjectCompanyContactRoleLinkResponse,
  isProjectCompanyContactRoleLinkUser,
  linkExistingProjectCompanyContactRole,
  PROJECT_COMPANY_CONTACT_ROLE_DERIVATION,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT,
  PROJECT_COMPANY_CONTACT_ROLE_VALUES,
  projectCompanyContactRoleLinkErrorResponse,
  projectCompanyContactRoleLinkGuard,
  ProjectCompanyContactRoleLinkRequestError,
  type ProjectCompanyContactRoleLinkTarget,
  validateProjectCompanyContactRoleLinkBody,
} from "../lib/project-company-contact-role-link";

const rootDir = process.cwd();
const projectId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";
const otherCompanyId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const roleId = "66666666-6666-4666-8666-666666666666";
const baseDate = new Date("2026-06-20T00:00:00.000Z");
const updatedDate = new Date("2026-06-20T00:01:00.000Z");
const unsafeAddress = ["project-owner", "example.invalid"].join("@");

function validBody(overrides: Record<string, unknown> = {}) {
  const body = {
    companyId,
    contactId,
    role: "UPPER_COMPANY",
    expectedUpdatedAt: baseDate.toISOString(),
    reasonCode: "candidate_verified",
    confirmationToken: buildProjectCompanyContactRoleConfirmationToken(
      projectId,
      "UPPER_COMPANY",
      companyId,
      contactId,
    ),
    ...overrides,
  };

  if (
    typeof body.companyId === "string"
    && typeof body.contactId === "string"
    && PROJECT_COMPANY_CONTACT_ROLE_VALUES.includes(body.role as any)
    && !Object.prototype.hasOwnProperty.call(overrides, "confirmationToken")
  ) {
    body.confirmationToken = buildProjectCompanyContactRoleConfirmationToken(
      projectId,
      body.role as any,
      body.companyId,
      body.contactId,
    );
  }

  return body;
}

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function listFilesRecursively(relativeDir: string) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!existsSync(absoluteDir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(absoluteDir)) {
    const absoluteEntry = path.join(absoluteDir, entry);
    const relativeEntry = path.join(relativeDir, entry).replace(/\\/g, "/");
    if (statSync(absoluteEntry).isDirectory()) {
      files.push(...listFilesRecursively(relativeEntry));
    } else {
      files.push(relativeEntry);
    }
  }

  return files;
}

function routeHasHandler(source: string, method: string) {
  return new RegExp(`\\bexport\\s+(?:async\\s+)?function\\s+${method}\\b`).test(source)
    || new RegExp(`\\bexport\\s+const\\s+${method}\\b`).test(source);
}

function createMockDb(overrides: {
  company?: any;
  contact?: any;
  project?: any;
  existingRole?: any;
  projectUpdateError?: any;
} = {}) {
  const calls: Array<[string, any]> = [];
  const auditLogs: any[] = [];
  const createdRoles: any[] = [];
  const company = overrides.company === undefined
    ? { id: companyId, tradeStatus: "OK" }
    : overrides.company;
  const contact = overrides.contact === undefined
    ? { id: contactId, companyId, isActive: true }
    : overrides.contact;
  const project = overrides.project === undefined
    ? { id: projectId, updatedAt: baseDate }
    : overrides.project;
  const existingRole = overrides.existingRole === undefined ? null : overrides.existingRole;

  const db: any = {
    company: {
      async findUnique(args: any) {
        calls.push(["company.findUnique", args]);
        return args.where.id === companyId ? company : null;
      },
    },
    companyContact: {
      async findUnique(args: any) {
        calls.push(["companyContact.findUnique", args]);
        return args.where.id === contactId ? contact : null;
      },
    },
    project: {
      async findUnique(args: any) {
        calls.push(["project.findUnique", args]);
        return args.where.id === projectId ? project : null;
      },
      async update(args: any) {
        calls.push(["project.update", args]);
        if (overrides.projectUpdateError) throw overrides.projectUpdateError;
        project.updatedAt = updatedDate;
        return project;
      },
    },
    projectCompanyRole: {
      async findFirst(args: any) {
        calls.push(["projectCompanyRole.findFirst", args]);
        return existingRole;
      },
      async create(args: any) {
        calls.push(["projectCompanyRole.create", args]);
        const created = {
          id: roleId,
          projectId: args.data.projectId,
          companyId: args.data.companyId,
          companyContactId: args.data.companyContactId,
          role: args.data.role,
          roleOrder: args.data.roleOrder,
          isPrimary: args.data.isPrimary,
          createdAt: new Date("2026-06-20T00:02:00.000Z"),
        };
        createdRoles.push(created);
        return created;
      },
    },
    auditLog: {
      async create(args: any) {
        calls.push(["auditLog.create", args]);
        auditLogs.push(args.data);
        return args.data;
      },
    },
    async $transaction(fn: any) {
      calls.push(["$transaction", null]);
      return fn(db);
    },
  };

  return { db, calls, auditLogs, company, contact, project, createdRoles };
}

function assertNoUnexpectedWriteCalls(calls: Array<[string, any]>) {
  for (const [name] of calls) {
    assert.doesNotMatch(name, /\bcompany\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b/);
    assert.doesNotMatch(name, /\bcompanyContact\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b/);
    assert.doesNotMatch(name, /\bproject\.(?:create|createMany|upsert|delete|deleteMany)\b/);
    assert.doesNotMatch(name, /\bprojectCompanyRole\.(?:createMany|update|updateMany|upsert|delete|deleteMany)\b/);
    assert.doesNotMatch(name, /\bauditLog\.(?:update|upsert|delete|deleteMany)\b/);
  }
}

async function assertRejectsWithStatus(
  body: Record<string, unknown>,
  status: number,
  reasonCode: string,
  mockOverrides: Parameters<typeof createMockDb>[0] = {},
) {
  const mock = createMockDb(mockOverrides);
  await assert.rejects(
    () => linkExistingProjectCompanyContactRole(
      mock.db,
      projectId,
      body,
      { id: userId, role: "ADMIN" } as any,
      projectCompanyContactRoleLinkGuard({
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "staging",
      }),
    ),
    (error: unknown) => {
      assert(error instanceof ProjectCompanyContactRoleLinkRequestError);
      assert.equal(error.status, status);
      assert.equal(error.reasonCode, reasonCode);
      return true;
    },
  );
  assert.equal(mock.calls.some(([name]) => name === "projectCompanyRole.create"), false);
  assert.equal(mock.calls.some(([name]) => name === "auditLog.create"), false);
  assertNoUnexpectedWriteCalls(mock.calls);
}

assert.deepEqual(projectCompanyContactRoleLinkGuard({}), {
  allowed: false,
  enabled: false,
  target: "unsupported",
  productionRuntime: false,
});

for (const target of ["local", "test", "staging"] as ProjectCompanyContactRoleLinkTarget[]) {
  assert.deepEqual(projectCompanyContactRoleLinkGuard({
    PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
    PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: target,
  }), {
    allowed: true,
    enabled: true,
    target,
    productionRuntime: false,
  });
}

assert.deepEqual(projectCompanyContactRoleLinkGuard({
  PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
  PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "production",
}), {
  allowed: false,
  enabled: true,
  target: "production",
  productionRuntime: true,
});
assert.deepEqual(projectCompanyContactRoleLinkGuard({
  NODE_ENV: "production",
  PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
  PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "staging",
}), {
  allowed: false,
  enabled: true,
  target: "staging",
  productionRuntime: true,
});
assert.equal(disabledProjectCompanyContactRoleLinkResponse().writeAttempted, false);
assert.equal(disabledProjectCompanyContactRoleLinkResponse(
  projectCompanyContactRoleLinkGuard({
    PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
    PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "production",
  }),
).guard.target, "production");

assert.equal(isProjectCompanyContactRoleLinkUser({ id: userId, role: "ADMIN" }), true);
assert.equal(isProjectCompanyContactRoleLinkUser({ id: userId, role: "MANAGER" }), true);
assert.equal(isProjectCompanyContactRoleLinkUser({ id: userId, role: "SALES" }), false);
assert.equal(isProjectCompanyContactRoleLinkUser({ id: userId, role: "VIEWER" }), false);
assert.equal(isProjectCompanyContactRoleLinkUser({ id: userId, role: "ADMIN", isActive: false }), false);

for (const role of PROJECT_COMPANY_CONTACT_ROLE_VALUES) {
  const body = validBody({ role });
  const validated = validateProjectCompanyContactRoleLinkBody(body, projectId);
  assert.equal(validated.role, role);
}

assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody(), "not-a-uuid"), /Invalid project id/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody([], projectId), /JSON object/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ companyId: "not-a-uuid" }), projectId), /companyId/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ contactId: "not-a-uuid" }), projectId), /contactId/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ role: "END_CLIENT" }), projectId), /role/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ role: "CLIENT" }), projectId), /role/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ reasonCode: "raw_free_text" }), projectId), /reasonCode/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ expectedUpdatedAt: "not-a-date" }), projectId), /expectedUpdatedAt/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ expectedUpdatedAt: unsafeAddress }), projectId), /expectedUpdatedAt|unsafe/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ rawMailBody: "full mail body" }), projectId), /unsupported raw/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ freeNote: "manual note" }), projectId), /unsupported raw/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ customerData: "private customer data" }), projectId), /unsupported raw/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ roleOrder: 1 }), projectId), /unsupported raw/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ isPrimary: true }), projectId), /unsupported raw/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ projectId }), projectId), /unsupported raw/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ extraKey: "value" }), projectId), /unsupported raw/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody({ ...validBody(), reasonCode: undefined }, projectId), /reasonCode/);
assert.throws(() => validateProjectCompanyContactRoleLinkBody(validBody({ confirmationToken: "wrong" }), projectId), /confirmationToken/);

async function main() {
  for (const role of ["ADMIN", "MANAGER"] as const) {
    for (const target of ["local", "test", "staging"] as const) {
      const mock = createMockDb();
      const result = await linkExistingProjectCompanyContactRole(
        mock.db,
        projectId,
        validBody(),
        { id: userId, role } as any,
        projectCompanyContactRoleLinkGuard({
          PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
          PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: target,
        }),
      );

      assert.deepEqual(result, {
        projectId,
        companyRoleId: roleId,
        companyId,
        contactId,
        role: "UPPER_COMPANY",
      });
      assert.equal(mock.calls.filter(([name]) => name === "$transaction").length, 1);
      assert.equal(mock.calls.filter(([name]) => name === "project.update").length, 1);
      assert.equal(mock.calls.filter(([name]) => name === "projectCompanyRole.create").length, 1);
      assert.equal(mock.calls.filter(([name]) => name === "auditLog.create").length, 1);
      const updateCall = mock.calls.find(([name]) => name === "project.update")?.[1];
      assert.equal(updateCall.where.id, projectId);
      assert.equal(updateCall.where.updatedAt.toISOString(), baseDate.toISOString());
      const createCall = mock.calls.find(([name]) => name === "projectCompanyRole.create")?.[1];
      assert.deepEqual(createCall.data, {
        projectId,
        companyId,
        companyContactId: contactId,
        role: "UPPER_COMPANY",
        roleOrder: PROJECT_COMPANY_CONTACT_ROLE_DERIVATION.UPPER_COMPANY.roleOrder,
        isPrimary: PROJECT_COMPANY_CONTACT_ROLE_DERIVATION.UPPER_COMPANY.isPrimary,
      });
      assert.equal(mock.auditLogs.length, 1);
      assert.equal(mock.auditLogs[0].actorUserId, userId);
      assert.equal(mock.auditLogs[0].action, PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT);
      assert.equal(mock.auditLogs[0].entityType, "Project");
      assert.equal(mock.auditLogs[0].entityId, projectId);
      assert.deepEqual(mock.auditLogs[0].beforeData, {
        projectId,
        role: "UPPER_COMPANY",
        projectUpdatedAt: baseDate.toISOString(),
        existingProjectCompanyRoleId: null,
      });
      assert.equal(mock.auditLogs[0].afterData.projectId, projectId);
      assert.equal(mock.auditLogs[0].afterData.companyRoleId, roleId);
      assert.equal(mock.auditLogs[0].afterData.companyId, companyId);
      assert.equal(mock.auditLogs[0].afterData.contactId, contactId);
      assert.equal(mock.auditLogs[0].afterData.role, "UPPER_COMPANY");
      assert.equal(mock.auditLogs[0].afterData.roleOrder, 1);
      assert.equal(mock.auditLogs[0].afterData.isPrimary, true);
      assert.equal(mock.auditLogs[0].afterData.projectUpdatedAt, updatedDate.toISOString());
      assert.equal(mock.auditLogs[0].afterData.metadata.intent, PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT);
      assert.equal(mock.auditLogs[0].afterData.metadata.reasonCode, "candidate_verified");
      assert.equal(mock.auditLogs[0].afterData.metadata.confirmationTokenMatched, true);
      assert.equal(mock.auditLogs[0].afterData.metadata.featureGuard.PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET, target);
      assertNoUnexpectedWriteCalls(mock.calls);
    }
  }

  for (const projectRole of PROJECT_COMPANY_CONTACT_ROLE_VALUES) {
    const mock = createMockDb();
    const result = await linkExistingProjectCompanyContactRole(
      mock.db,
      projectId,
      validBody({ role: projectRole }),
      { id: userId, role: "ADMIN" } as any,
      projectCompanyContactRoleLinkGuard({
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "staging",
      }),
    );
    const createCall = mock.calls.find(([name]) => name === "projectCompanyRole.create")?.[1];
    assert.equal(result.role, projectRole);
    assert.equal(createCall.data.roleOrder, PROJECT_COMPANY_CONTACT_ROLE_DERIVATION[projectRole].roleOrder);
    assert.equal(createCall.data.isPrimary, PROJECT_COMPANY_CONTACT_ROLE_DERIVATION[projectRole].isPrimary);
  }

  await assert.rejects(
    () => linkExistingProjectCompanyContactRole(
      createMockDb().db,
      projectId,
      validBody(),
      { id: userId, role: "SALES" } as any,
      projectCompanyContactRoleLinkGuard({
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "staging",
      }),
    ),
    (error: unknown) => error instanceof ProjectCompanyContactRoleLinkRequestError
      && error.status === 403
      && error.reasonCode === "FORBIDDEN_ROLE",
  );

  await assert.rejects(
    () => linkExistingProjectCompanyContactRole(
      createMockDb().db,
      projectId,
      validBody(),
      { id: userId, role: "ADMIN" } as any,
      projectCompanyContactRoleLinkGuard({
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "production",
      }),
    ),
    (error: unknown) => error instanceof ProjectCompanyContactRoleLinkRequestError
      && error.status === 403
      && error.reasonCode === "FEATURE_DISABLED",
  );

  await assertRejectsWithStatus(validBody({ companyId: otherCompanyId }), 404, "COMPANY_NOT_FOUND");
  await assertRejectsWithStatus(validBody(), 404, "COMPANY_CONTACT_NOT_FOUND", { contact: null });
  await assertRejectsWithStatus(validBody(), 409, "CONTACT_COMPANY_MISMATCH", {
    contact: { id: contactId, companyId: otherCompanyId, isActive: true },
  });
  await assertRejectsWithStatus(validBody(), 409, "INACTIVE_COMPANY_CONTACT", {
    contact: { id: contactId, companyId, isActive: false },
  });

  for (const tradeStatus of ["NG", "NEEDS_REVIEW", "SUSPENDED"]) {
    await assertRejectsWithStatus(validBody(), 409, `COMPANY_TRADE_STATUS_${tradeStatus}`, {
      company: { id: companyId, tradeStatus },
    });
  }

  await assertRejectsWithStatus(validBody(), 404, "PROJECT_NOT_FOUND", { project: null });
  await assertRejectsWithStatus(validBody({ expectedUpdatedAt: "2026-06-20T09:00:00.000Z" }), 409, "STALE_PROJECT_UPDATED_AT");
  await assertRejectsWithStatus(validBody(), 409, "PROJECT_COMPANY_ROLE_ALREADY_EXISTS", {
    existingRole: { id: roleId, projectId, role: "UPPER_COMPANY", companyId, companyContactId: contactId },
  });

  const racingUpdateMock = createMockDb({ projectUpdateError: { code: "P2025" } });
  await assert.rejects(
    () => linkExistingProjectCompanyContactRole(
      racingUpdateMock.db,
      projectId,
      validBody(),
      { id: userId, role: "ADMIN" } as any,
      projectCompanyContactRoleLinkGuard({
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "staging",
      }),
    ),
    (error: unknown) => error instanceof ProjectCompanyContactRoleLinkRequestError
      && error.status === 409
      && error.reasonCode === "STALE_PROJECT_UPDATED_AT",
  );
  assert.equal(racingUpdateMock.calls.filter(([name]) => name === "project.update").length, 1);
  assert.equal(racingUpdateMock.calls.some(([name]) => name === "projectCompanyRole.create"), false);
  assert.equal(racingUpdateMock.calls.some(([name]) => name === "auditLog.create"), false);

  const routeSource = readProjectFile("app/api/projects/[id]/company-contact-role/route.ts");
  const routeHandlerSource = readProjectFile("lib/project-company-contact-role-link-route.ts");
  const helperSource = readProjectFile("lib/project-company-contact-role-link.ts");
  assert(routeHasHandler(routeSource, "PATCH"));
  for (const method of ["POST", "PUT", "DELETE"]) {
    assert.equal(routeHasHandler(routeSource, method), false, `${method} must not be exported`);
  }
  assert.match(routeSource, /handleProjectCompanyContactRolePatch/);
  assert.match(routeHandlerSource, /requireAnyRole\(request,\s*\[\.\.\.LINK_WRITER_ROLES\]\)/);
  assert.match(routeHandlerSource, /projectCompanyContactRoleLinkGuard/);
  assert.match(routeHandlerSource, /disabledProjectCompanyContactRoleLinkResponse/);
  assert.ok(routeHandlerSource.indexOf("projectCompanyContactRoleLinkGuard") < routeHandlerSource.indexOf("request.json()"));

  const projectsRouteSource = readProjectFile("app/api/projects/route.ts");
  assert.doesNotMatch(projectsRouteSource, /company-contact-role|handleProjectCompanyContactRolePatch|linkExistingProjectCompanyContactRole/);

  for (const forbiddenRouteDir of ["app/api/companies", "app/api/company-contacts"]) {
    for (const filePath of listFilesRecursively(forbiddenRouteDir)) {
      assert(!/\/route\.(ts|tsx|js|jsx)$/.test(filePath), `${forbiddenRouteDir} route files are out of scope: ${filePath}`);
    }
  }

  assert.match(helperSource, /company\.findUnique\(/);
  assert.match(helperSource, /companyContact\.findUnique\(/);
  assert.match(helperSource, /project\.findUnique\(/);
  assert.match(helperSource, /projectCompanyRole\.findFirst\(/);
  assert.match(helperSource, /project\.update\(/);
  assert.match(helperSource, /projectCompanyRole\.create\(/);
  assert.match(helperSource, /auditLog\.create\(/);
  assert.match(helperSource, /\$transaction\s*\(/);
  assert.doesNotMatch(helperSource, /\bcompany\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(helperSource, /\bcompanyContact\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(helperSource, /\bprojectCompanyRole\s*\.\s*(?:update|updateMany|upsert|delete|deleteMany)\s*\(/);

  const conflictResponse = projectCompanyContactRoleLinkErrorResponse(
    new ProjectCompanyContactRoleLinkRequestError("manual review", 409, "MANUAL_REVIEW_REQUIRED"),
  );
  assert.equal(conflictResponse.status, "manual-review");

  const serialized = JSON.stringify({
    disabled: disabledProjectCompanyContactRoleLinkResponse(),
    conflict: conflictResponse,
    success: await linkExistingProjectCompanyContactRole(
      createMockDb().db,
      projectId,
      validBody(),
      { id: userId, role: "ADMIN" } as any,
      projectCompanyContactRoleLinkGuard({
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED: "true",
        PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET: "staging",
      }),
    ),
  });
  assertNoSensitiveProjectCompanyContactRoleLinkOutput(serialized);
  assert.equal(serialized.includes(unsafeAddress), false);

  console.log("project company/contact role link API tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
