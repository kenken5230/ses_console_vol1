import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  assertNoSensitivePersonOwnerCompanyContactLinkOutput,
  disabledPersonOwnerCompanyContactLinkResponse,
  isPersonOwnerCompanyContactLinkUser,
  linkExistingPersonOwnerCompanyContact,
  PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
  personOwnerCompanyContactLinkErrorResponse,
  personOwnerCompanyContactLinkGuard,
  PersonOwnerCompanyContactLinkRequestError,
  validatePersonOwnerCompanyContactLinkBody,
} from "../lib/person-owner-company-contact-link";

const rootDir = process.cwd();
const personId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";
const otherCompanyId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const baseDate = new Date("2026-06-20T00:00:00.000Z");
const updatedDate = new Date("2026-06-20T00:01:00.000Z");
const unsafeAddress = ["owner", "example.invalid"].join("@");

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    intent: PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
    companyId,
    contactId,
    confirmCompanyContactLink: true,
    expectedOwnerCompanyId: null,
    expectedOwnerContactId: null,
    expectedUpdatedAt: baseDate.toISOString(),
    ...overrides,
  };
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
  person?: any;
  updateError?: any;
} = {}) {
  const calls: Array<[string, any]> = [];
  const auditLogs: any[] = [];
  const company = overrides.company === undefined
    ? { id: companyId, tradeStatus: "OK" }
    : overrides.company;
  const contact = overrides.contact === undefined
    ? { id: contactId, companyId, isActive: true }
    : overrides.contact;
  const person = overrides.person === undefined
    ? { id: personId, ownerCompanyId: null, ownerContactId: null, updatedAt: baseDate }
    : overrides.person;

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
    person: {
      async findUnique(args: any) {
        calls.push(["person.findUnique", args]);
        return args.where.id === personId ? person : null;
      },
      async update(args: any) {
        calls.push(["person.update", args]);
        if (overrides.updateError) throw overrides.updateError;
        person.ownerCompanyId = args.data.ownerCompanyId;
        person.ownerContactId = args.data.ownerContactId;
        person.updatedAt = updatedDate;
        return person;
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

  return { db, calls, auditLogs, company, contact, person };
}

function assertNoWriteCalls(calls: Array<[string, any]>) {
  for (const [name] of calls) {
    assert.doesNotMatch(name, /\b(company|companyContact)\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b/);
    assert.doesNotMatch(name, /\bperson\.(?:create|createMany|upsert|delete|deleteMany)\b/);
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
    () => linkExistingPersonOwnerCompanyContact(
      mock.db,
      personId,
      body,
      { id: userId, role: "ADMIN" } as any,
      personOwnerCompanyContactLinkGuard({
        COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
        COMPANY_CONTACT_LINK_WRITE_TARGET: "staging",
      }),
    ),
    (error: unknown) => {
      assert(error instanceof PersonOwnerCompanyContactLinkRequestError);
      assert.equal(error.status, status);
      assert.equal(error.reasonCode, reasonCode);
      return true;
    },
  );
  assert.equal(mock.calls.some(([name]) => name === "person.update"), false);
  assert.equal(mock.calls.some(([name]) => name === "auditLog.create"), false);
  assertNoWriteCalls(mock.calls);
}

assert.deepEqual(personOwnerCompanyContactLinkGuard({}), {
  allowed: false,
  enabled: false,
  target: "not-staging",
});
assert.deepEqual(personOwnerCompanyContactLinkGuard({
  COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
  COMPANY_CONTACT_LINK_WRITE_TARGET: "staging",
}), {
  allowed: true,
  enabled: true,
  target: "staging",
});
assert.deepEqual(personOwnerCompanyContactLinkGuard({
  COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
  COMPANY_CONTACT_LINK_WRITE_TARGET: "production",
}), {
  allowed: false,
  enabled: true,
  target: "production",
});
assert.equal(disabledPersonOwnerCompanyContactLinkResponse().writeAttempted, false);
assert.equal(disabledPersonOwnerCompanyContactLinkResponse(
  personOwnerCompanyContactLinkGuard({
    COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
    COMPANY_CONTACT_LINK_WRITE_TARGET: "production",
  }),
).guard.target, "production");

assert.equal(isPersonOwnerCompanyContactLinkUser({ id: userId, role: "ADMIN" }), true);
assert.equal(isPersonOwnerCompanyContactLinkUser({ id: userId, role: "MANAGER" }), true);
assert.equal(isPersonOwnerCompanyContactLinkUser({ id: userId, role: "SALES" }), false);
assert.equal(isPersonOwnerCompanyContactLinkUser({ id: userId, role: "VIEWER" }), false);
assert.equal(isPersonOwnerCompanyContactLinkUser({ id: userId, role: "ADMIN", isActive: false }), false);

assert.deepEqual(validatePersonOwnerCompanyContactLinkBody(validBody(), personId), validBody());
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody(), "not-a-uuid"), /Invalid person id/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody([], personId), /JSON object/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ intent: "DELETE" }), personId), /intent/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ companyId: "not-a-uuid" }), personId), /companyId/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ contactId: "not-a-uuid" }), personId), /contactId/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ confirmCompanyContactLink: false }), personId), /confirmCompanyContactLink/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ expectedOwnerCompanyId: "not-a-uuid" }), personId), /expectedOwnerCompanyId/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ expectedOwnerContactId: "not-a-uuid" }), personId), /expectedOwnerContactId/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ expectedUpdatedAt: "not-a-date" }), personId), /expectedUpdatedAt/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ rawText: "raw person text" }), personId), /unsupported raw/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ mailBody: "full mail body" }), personId), /unsupported raw/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ note: "free note" }), personId), /unsupported raw/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ extraKey: "value" }), personId), /unsupported raw/);
assert.throws(() => validatePersonOwnerCompanyContactLinkBody(validBody({ expectedUpdatedAt: unsafeAddress }), personId), /expectedUpdatedAt|unsafe/);

async function main() {
  for (const role of ["ADMIN", "MANAGER"] as const) {
    const mock = createMockDb();
    const result = await linkExistingPersonOwnerCompanyContact(
      mock.db,
      personId,
      validBody(),
      { id: userId, role } as any,
      personOwnerCompanyContactLinkGuard({
        COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
        COMPANY_CONTACT_LINK_WRITE_TARGET: "staging",
      }),
    );

    assert.deepEqual(result, {
      personId,
      ownerCompanyId: companyId,
      ownerContactId: contactId,
      intent: PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
    });
    assert.equal(mock.calls.filter(([name]) => name === "$transaction").length, 1);
    assert.equal(mock.calls.filter(([name]) => name === "person.update").length, 1);
    assert.equal(mock.calls.filter(([name]) => name === "auditLog.create").length, 1);
    const updateCall = mock.calls.find(([name]) => name === "person.update")?.[1];
    assert.equal(updateCall.where.id, personId);
    assert.equal(updateCall.where.ownerCompanyId, null);
    assert.equal(updateCall.where.ownerContactId, null);
    assert.equal(updateCall.where.updatedAt.toISOString(), baseDate.toISOString());
    assert.equal(mock.auditLogs.length, 1);
    assert.equal(mock.auditLogs[0].actorUserId, userId);
    assert.equal(mock.auditLogs[0].action, PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT);
    assert.equal(mock.auditLogs[0].entityType, "Person");
    assert.equal(mock.auditLogs[0].entityId, personId);
    assert.deepEqual(mock.auditLogs[0].beforeData, {
      ownerCompanyId: null,
      ownerContactId: null,
      updatedAt: baseDate.toISOString(),
    });
    assert.equal(mock.auditLogs[0].afterData.ownerCompanyId, companyId);
    assert.equal(mock.auditLogs[0].afterData.ownerContactId, contactId);
    assert.equal(mock.auditLogs[0].afterData.updatedAt, updatedDate.toISOString());
    assert.equal(mock.auditLogs[0].afterData.metadata.intent, PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT);
    assert.equal(mock.auditLogs[0].afterData.metadata.confirmed, true);
    assert.equal(mock.auditLogs[0].afterData.metadata.featureGuard.COMPANY_CONTACT_LINK_WRITE_TARGET, "staging");
    assertNoWriteCalls(mock.calls);
  }

  await assert.rejects(
    () => linkExistingPersonOwnerCompanyContact(
      createMockDb().db,
      personId,
      validBody(),
      { id: userId, role: "SALES" } as any,
      personOwnerCompanyContactLinkGuard({
        COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
        COMPANY_CONTACT_LINK_WRITE_TARGET: "staging",
      }),
    ),
    (error: unknown) => error instanceof PersonOwnerCompanyContactLinkRequestError
      && error.status === 403
      && error.reasonCode === "FORBIDDEN_ROLE",
  );

  await assert.rejects(
    () => linkExistingPersonOwnerCompanyContact(
      createMockDb().db,
      personId,
      validBody(),
      { id: userId, role: "ADMIN" } as any,
      personOwnerCompanyContactLinkGuard({
        COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
        COMPANY_CONTACT_LINK_WRITE_TARGET: "production",
      }),
    ),
    (error: unknown) => error instanceof PersonOwnerCompanyContactLinkRequestError
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

  await assertRejectsWithStatus(validBody(), 404, "PERSON_NOT_FOUND", { person: null });
  await assertRejectsWithStatus(validBody(), 409, "EXISTING_OWNER_LINK_PRESENT", {
    person: { id: personId, ownerCompanyId: otherCompanyId, ownerContactId: null, updatedAt: baseDate },
  });
  await assertRejectsWithStatus(validBody({ expectedOwnerCompanyId: otherCompanyId }), 409, "STALE_OWNER_COMPANY_ID");
  await assertRejectsWithStatus(validBody({ expectedOwnerContactId: contactId }), 409, "STALE_OWNER_CONTACT_ID");
  await assertRejectsWithStatus(validBody({ expectedUpdatedAt: "2026-06-20T09:00:00.000Z" }), 409, "STALE_PERSON_UPDATED_AT");

  const racingUpdateMock = createMockDb({ updateError: { code: "P2025" } });
  await assert.rejects(
    () => linkExistingPersonOwnerCompanyContact(
      racingUpdateMock.db,
      personId,
      validBody(),
      { id: userId, role: "ADMIN" } as any,
      personOwnerCompanyContactLinkGuard({
        COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
        COMPANY_CONTACT_LINK_WRITE_TARGET: "staging",
      }),
    ),
    (error: unknown) => error instanceof PersonOwnerCompanyContactLinkRequestError
      && error.status === 409
      && error.reasonCode === "STALE_PERSON_UPDATED_AT",
  );
  assert.equal(racingUpdateMock.calls.filter(([name]) => name === "person.update").length, 1);
  assert.equal(racingUpdateMock.calls.some(([name]) => name === "auditLog.create"), false);

  const routeSource = readProjectFile("app/api/persons/[id]/owner-company-contact/route.ts");
  const routeHandlerSource = readProjectFile("lib/person-owner-company-contact-link-route.ts");
  assert(routeHasHandler(routeSource, "PATCH"));
  for (const method of ["POST", "PUT", "DELETE"]) {
    assert.equal(routeHasHandler(routeSource, method), false, `${method} must not be exported`);
  }
  assert.match(routeSource, /handlePersonOwnerCompanyContactPatch/);
  assert.match(routeHandlerSource, /requireAnyRole\(request,\s*\[\.\.\.LINK_WRITER_ROLES\]\)/);
  assert.match(routeHandlerSource, /personOwnerCompanyContactLinkGuard/);
  assert.match(routeHandlerSource, /disabledPersonOwnerCompanyContactLinkResponse/);
  assert.ok(routeHandlerSource.indexOf("personOwnerCompanyContactLinkGuard") < routeHandlerSource.indexOf("request.json()"));

  const personsRouteSource = readProjectFile("app/api/persons/route.ts");
  assert.equal(routeHasHandler(personsRouteSource, "PATCH"), false, "PATCH /api/persons must not be introduced");

  for (const forbiddenRouteDir of ["app/api/companies", "app/api/company-contacts"]) {
    for (const filePath of listFilesRecursively(forbiddenRouteDir)) {
      assert(!/\/route\.(ts|tsx|js|jsx)$/.test(filePath), `${forbiddenRouteDir} route files are out of scope: ${filePath}`);
    }
  }

  const helperSource = readProjectFile("lib/person-owner-company-contact-link.ts");
  assert.match(helperSource, /company\.findUnique\(/);
  assert.match(helperSource, /companyContact\.findUnique\(/);
  assert.match(helperSource, /person\.findUnique\(/);
  assert.match(helperSource, /person\.update\(/);
  assert.match(helperSource, /auditLog\.create\(/);
  assert.match(helperSource, /\$transaction\s*\(/);
  assert.doesNotMatch(helperSource, /\bcompany\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(helperSource, /\bcompanyContact\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(helperSource, /\bperson\s*\.\s*(?:create|createMany|upsert|delete|deleteMany)\s*\(/);

  const conflictResponse = personOwnerCompanyContactLinkErrorResponse(
    new PersonOwnerCompanyContactLinkRequestError("manual review", 409, "MANUAL_REVIEW_REQUIRED"),
  );
  assert.equal(conflictResponse.status, "manual-review");

  const serialized = JSON.stringify({
    disabled: disabledPersonOwnerCompanyContactLinkResponse(),
    conflict: conflictResponse,
    success: await linkExistingPersonOwnerCompanyContact(
      createMockDb().db,
      personId,
      validBody(),
      { id: userId, role: "ADMIN" } as any,
      personOwnerCompanyContactLinkGuard({
        COMPANY_CONTACT_LINK_WRITE_ENABLED: "true",
        COMPANY_CONTACT_LINK_WRITE_TARGET: "staging",
      }),
    ),
  });
  assertNoSensitivePersonOwnerCompanyContactLinkOutput(serialized);
  assert.equal(serialized.includes(unsafeAddress), false);

  console.log("person owner company/contact link API tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
