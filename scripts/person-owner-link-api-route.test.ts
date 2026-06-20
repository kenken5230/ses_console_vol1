import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
  type PersonOwnerCompanyContactLinkGuard,
  PersonOwnerCompanyContactLinkRequestError,
} from "../lib/person-owner-company-contact-link";
import {
  handlePersonOwnerCompanyContactPatch,
  type PersonOwnerCompanyContactPatchDependencies,
} from "../lib/person-owner-company-contact-link-route";

const rootDir = process.cwd();
const personId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";
const userId = "55555555-5555-4555-8555-555555555555";

const allowedGuard: PersonOwnerCompanyContactLinkGuard = {
  allowed: true,
  enabled: true,
  target: "staging",
};

function validBody() {
  return {
    intent: PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
    companyId,
    contactId,
    confirmCompanyContactLink: true,
    expectedOwnerCompanyId: null,
    expectedOwnerContactId: null,
    expectedUpdatedAt: "2026-06-20T00:00:00.000Z",
  };
}

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function routeHasHandler(source: string, method: string) {
  return new RegExp(`\\bexport\\s+(?:async\\s+)?function\\s+${method}\\b`).test(source)
    || new RegExp(`\\bexport\\s+const\\s+${method}\\b`).test(source);
}

class MockAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MockAuthError";
    this.status = status;
  }
}

function authErrorResponse(error: unknown) {
  if (error instanceof MockAuthError) {
    return Response.json(
      { message: error.status === 401 ? "Unauthorized" : error.message },
      { status: error.status },
    );
  }

  return null;
}

function createRequest(jsonImpl: () => Promise<unknown> = async () => validBody()) {
  let jsonCalls = 0;
  const request = {
    headers: new Headers(),
    async json() {
      jsonCalls += 1;
      return jsonImpl();
    },
  } as unknown as Request;

  return {
    request,
    get jsonCalls() {
      return jsonCalls;
    },
  };
}

function createContext(id = personId) {
  let paramsAccesses = 0;
  const context = {
    get params() {
      paramsAccesses += 1;
      return Promise.resolve({ id });
    },
  } as any;

  return {
    context,
    get paramsAccesses() {
      return paramsAccesses;
    },
  };
}

type HarnessOptions = {
  authError?: MockAuthError;
  guard?: PersonOwnerCompanyContactLinkGuard;
  helperError?: unknown;
  helperResult?: unknown;
  role?: "ADMIN" | "MANAGER" | "SALES";
};

function createHarness(options: HarnessOptions = {}) {
  const calls = {
    auth: 0,
    guard: 0,
    helper: 0,
  };
  const observed: Record<string, unknown> = {};
  const helperResult = options.helperResult ?? {
    personId,
    ownerCompanyId: companyId,
    ownerContactId: contactId,
    intent: PERSON_OWNER_COMPANY_CONTACT_LINK_INTENT,
  };

  const dependencies: PersonOwnerCompanyContactPatchDependencies = {
    authErrorResponse,
    db: {} as any,
    async requireAnyRole(request, roles) {
      calls.auth += 1;
      observed.authRequest = request;
      assert.deepEqual(roles, ["ADMIN", "MANAGER"]);
      if (options.authError) throw options.authError;
      const role = options.role ?? "ADMIN";
      if (!roles.includes(role as any)) throw new MockAuthError(403, "Forbidden");
      return { id: userId, role: role as any };
    },
    personOwnerCompanyContactLinkGuard() {
      calls.guard += 1;
      return options.guard ?? allowedGuard;
    },
    async linkExistingPersonOwnerCompanyContact(db, routePersonId, body, user, guard) {
      calls.helper += 1;
      observed.db = db;
      observed.routePersonId = routePersonId;
      observed.body = body;
      observed.user = user;
      observed.guard = guard;
      if (options.helperError) throw options.helperError;
      return helperResult;
    },
  };

  return { calls, dependencies, helperResult, observed };
}

async function responseJson(response: Response) {
  return await response.json() as Record<string, unknown>;
}

async function assertAuthFailure(status: 401 | 403, message: string) {
  const request = createRequest();
  const context = createContext();
  const harness = createHarness({ authError: new MockAuthError(status, message) });

  const response = await handlePersonOwnerCompanyContactPatch(
    request.request,
    context.context,
    harness.dependencies,
  );

  assert.equal(response.status, status);
  assert.deepEqual(await responseJson(response), {
    message: status === 401 ? "Unauthorized" : message,
  });
  assert.equal(harness.calls.auth, 1);
  assert.equal(harness.calls.guard, 0);
  assert.equal(harness.calls.helper, 0);
  assert.equal(request.jsonCalls, 0);
  assert.equal(context.paramsAccesses, 0);
}

async function assertSalesForbidden() {
  const request = createRequest();
  const context = createContext();
  const harness = createHarness({ role: "SALES" });

  const response = await handlePersonOwnerCompanyContactPatch(
    request.request,
    context.context,
    harness.dependencies,
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await responseJson(response), { message: "Forbidden" });
  assert.equal(harness.calls.auth, 1);
  assert.equal(harness.calls.guard, 0);
  assert.equal(harness.calls.helper, 0);
  assert.equal(request.jsonCalls, 0);
  assert.equal(context.paramsAccesses, 0);
}

async function assertGuardFailure(guard: PersonOwnerCompanyContactLinkGuard, expectedTarget: string) {
  const request = createRequest();
  const context = createContext();
  const harness = createHarness({ guard });

  const response = await handlePersonOwnerCompanyContactPatch(
    request.request,
    context.context,
    harness.dependencies,
  );
  const body = await responseJson(response);

  assert.equal(response.status, 403);
  assert.equal(body.status, "disabled");
  assert.equal(body.linked, false);
  assert.equal(body.writeAttempted, false);
  assert.equal((body.guard as Record<string, unknown>).target, expectedTarget);
  assert.equal(harness.calls.auth, 1);
  assert.equal(harness.calls.guard, 1);
  assert.equal(harness.calls.helper, 0);
  assert.equal(request.jsonCalls, 0);
  assert.equal(context.paramsAccesses, 0);
}

async function main() {
  await assertAuthFailure(401, "Unauthorized");
  await assertSalesForbidden();

  await assertGuardFailure(
    { allowed: false, enabled: false, target: "not-staging" },
    "not-staging",
  );
  await assertGuardFailure(
    { allowed: false, enabled: true, target: "production" },
    "production",
  );

  const invalidJsonRequest = createRequest(async () => {
    throw new SyntaxError("bad json");
  });
  const invalidJsonContext = createContext();
  const invalidJsonHarness = createHarness();
  const invalidJsonResponse = await handlePersonOwnerCompanyContactPatch(
    invalidJsonRequest.request,
    invalidJsonContext.context,
    invalidJsonHarness.dependencies,
  );
  const invalidJsonBody = await responseJson(invalidJsonResponse);

  assert.equal(invalidJsonResponse.status, 400);
  assert.equal(invalidJsonBody.status, "error");
  assert.equal(invalidJsonBody.reasonCode, "INVALID_PERSON_OWNER_LINK_REQUEST");
  assert.equal(invalidJsonBody.writeAttempted, false);
  assert.equal(invalidJsonRequest.jsonCalls, 1);
  assert.equal(invalidJsonHarness.calls.helper, 0);
  assert.equal(invalidJsonContext.paramsAccesses, 0);

  const successRequest = createRequest();
  const successContext = createContext();
  const successHarness = createHarness({ role: "MANAGER" });
  const successResponse = await handlePersonOwnerCompanyContactPatch(
    successRequest.request,
    successContext.context,
    successHarness.dependencies,
  );

  assert.equal(successResponse.status, 200);
  assert.deepEqual(await responseJson(successResponse), successHarness.helperResult);
  assert.equal(successRequest.jsonCalls, 1);
  assert.equal(successContext.paramsAccesses, 1);
  assert.equal(successHarness.calls.helper, 1);
  assert.equal(successHarness.observed.routePersonId, personId);
  assert.deepEqual(successHarness.observed.body, validBody());
  assert.deepEqual(successHarness.observed.guard, allowedGuard);
  assert.deepEqual(successHarness.observed.user, { id: userId, role: "MANAGER" });

  const helperFailureHarness = createHarness({
    helperError: new PersonOwnerCompanyContactLinkRequestError(
      "manual review",
      409,
      "MANUAL_REVIEW_REQUIRED",
    ),
  });
  const helperFailureResponse = await handlePersonOwnerCompanyContactPatch(
    createRequest().request,
    createContext().context,
    helperFailureHarness.dependencies,
  );
  const helperFailureBody = await responseJson(helperFailureResponse);

  assert.equal(helperFailureResponse.status, 409);
  assert.equal(helperFailureBody.status, "manual-review");
  assert.equal(helperFailureBody.reasonCode, "MANUAL_REVIEW_REQUIRED");
  assert.equal(helperFailureBody.writeAttempted, false);
  assert.equal(helperFailureHarness.calls.helper, 1);

  const auditFailureHarness = createHarness({
    helperError: new Error("audit log create failed with internal detail"),
  });
  const auditFailureResponse = await handlePersonOwnerCompanyContactPatch(
    createRequest().request,
    createContext().context,
    auditFailureHarness.dependencies,
  );
  const auditFailureBody = await responseJson(auditFailureResponse);

  assert.equal(auditFailureResponse.status, 500);
  assert.equal(auditFailureBody.status, "error");
  assert.equal(auditFailureBody.linked, false);
  assert.equal(auditFailureBody.writeAttempted, false);
  assert.equal(auditFailureBody.message, "Person owner company/contact link failed.");
  assert.equal(JSON.stringify(auditFailureBody).includes("internal detail"), false);
  assert.equal(auditFailureHarness.calls.helper, 1);

  const routeSource = readProjectFile("app/api/persons/[id]/owner-company-contact/route.ts");
  const handlerSource = readProjectFile("lib/person-owner-company-contact-link-route.ts");
  assert(routeHasHandler(routeSource, "PATCH"));
  for (const method of ["POST", "PUT", "DELETE"]) {
    assert.equal(routeHasHandler(routeSource, method), false, `${method} must not be exported`);
  }
  assert.match(routeSource, /handlePersonOwnerCompanyContactPatch/);
  assert.match(handlerSource, /requireAnyRole\(request,\s*\[\.\.\.LINK_WRITER_ROLES\]\)/);
  assert.match(handlerSource, /personOwnerCompanyContactLinkGuard/);
  assert.match(handlerSource, /disabledPersonOwnerCompanyContactLinkResponse/);
  assert.ok(handlerSource.indexOf("personOwnerCompanyContactLinkGuard") < handlerSource.indexOf("request.json()"));
  assert.match(handlerSource, /PersonOwnerCompanyContactLinkRequestError\("Request body must be valid JSON"\)/);

  console.log("person owner company/contact link route tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
