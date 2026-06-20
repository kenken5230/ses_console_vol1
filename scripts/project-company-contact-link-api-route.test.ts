import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildProjectCompanyContactRoleConfirmationToken,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT,
  type ProjectCompanyContactRoleLinkGuard,
  ProjectCompanyContactRoleLinkRequestError,
} from "../lib/project-company-contact-role-link";
import {
  handleProjectCompanyContactRolePatch,
  type ProjectCompanyContactRolePatchDependencies,
} from "../lib/project-company-contact-role-link-route";

const rootDir = process.cwd();
const projectId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";
const userId = "55555555-5555-4555-8555-555555555555";
const companyRoleId = "66666666-6666-4666-8666-666666666666";

const allowedGuard: ProjectCompanyContactRoleLinkGuard = {
  allowed: true,
  enabled: true,
  target: "staging",
  productionRuntime: false,
};

function validBody() {
  return {
    companyId,
    contactId,
    role: "UPPER_COMPANY",
    expectedUpdatedAt: "2026-06-20T00:00:00.000Z",
    reasonCode: "candidate_verified",
    confirmationToken: buildProjectCompanyContactRoleConfirmationToken(
      projectId,
      "UPPER_COMPANY",
      companyId,
      contactId,
    ),
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

function createContext(id = projectId) {
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
  guard?: ProjectCompanyContactRoleLinkGuard;
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
    projectId,
    companyRoleId,
    companyId,
    contactId,
    role: "UPPER_COMPANY",
  };

  const dependencies: ProjectCompanyContactRolePatchDependencies = {
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
    projectCompanyContactRoleLinkGuard() {
      calls.guard += 1;
      return options.guard ?? allowedGuard;
    },
    async linkExistingProjectCompanyContactRole(db, routeProjectId, body, user, guard) {
      calls.helper += 1;
      observed.db = db;
      observed.routeProjectId = routeProjectId;
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

  const response = await handleProjectCompanyContactRolePatch(
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

  const response = await handleProjectCompanyContactRolePatch(
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

async function assertGuardFailure(guard: ProjectCompanyContactRoleLinkGuard, expectedTarget: string) {
  const request = createRequest();
  const context = createContext();
  const harness = createHarness({ guard });

  const response = await handleProjectCompanyContactRolePatch(
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
    { allowed: false, enabled: false, target: "unsupported", productionRuntime: false },
    "unsupported",
  );
  await assertGuardFailure(
    { allowed: false, enabled: true, target: "production", productionRuntime: true },
    "production",
  );

  const invalidJsonRequest = createRequest(async () => {
    throw new SyntaxError("bad json");
  });
  const invalidJsonContext = createContext();
  const invalidJsonHarness = createHarness();
  const invalidJsonResponse = await handleProjectCompanyContactRolePatch(
    invalidJsonRequest.request,
    invalidJsonContext.context,
    invalidJsonHarness.dependencies,
  );
  const invalidJsonBody = await responseJson(invalidJsonResponse);

  assert.equal(invalidJsonResponse.status, 400);
  assert.equal(invalidJsonBody.status, "error");
  assert.equal(invalidJsonBody.reasonCode, "INVALID_PROJECT_COMPANY_CONTACT_ROLE_LINK_REQUEST");
  assert.equal(invalidJsonBody.writeAttempted, false);
  assert.equal(invalidJsonRequest.jsonCalls, 1);
  assert.equal(invalidJsonHarness.calls.helper, 0);
  assert.equal(invalidJsonContext.paramsAccesses, 0);

  const successRequest = createRequest();
  const successContext = createContext();
  const successHarness = createHarness({ role: "MANAGER" });
  const successResponse = await handleProjectCompanyContactRolePatch(
    successRequest.request,
    successContext.context,
    successHarness.dependencies,
  );

  assert.equal(successResponse.status, 200);
  assert.deepEqual(await responseJson(successResponse), successHarness.helperResult);
  assert.equal(successRequest.jsonCalls, 1);
  assert.equal(successContext.paramsAccesses, 1);
  assert.equal(successHarness.calls.helper, 1);
  assert.equal(successHarness.observed.routeProjectId, projectId);
  assert.deepEqual(successHarness.observed.body, validBody());
  assert.deepEqual(successHarness.observed.guard, allowedGuard);
  assert.deepEqual(successHarness.observed.user, { id: userId, role: "MANAGER" });

  const helperFailureHarness = createHarness({
    helperError: new ProjectCompanyContactRoleLinkRequestError(
      "manual review",
      409,
      "MANUAL_REVIEW_REQUIRED",
    ),
  });
  const helperFailureResponse = await handleProjectCompanyContactRolePatch(
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
  const auditFailureResponse = await handleProjectCompanyContactRolePatch(
    createRequest().request,
    createContext().context,
    auditFailureHarness.dependencies,
  );
  const auditFailureBody = await responseJson(auditFailureResponse);

  assert.equal(auditFailureResponse.status, 500);
  assert.equal(auditFailureBody.status, "error");
  assert.equal(auditFailureBody.linked, false);
  assert.equal(auditFailureBody.writeAttempted, false);
  assert.equal(auditFailureBody.message, "Project company/contact role link failed.");
  assert.equal(JSON.stringify(auditFailureBody).includes("internal detail"), false);
  assert.equal(auditFailureHarness.calls.helper, 1);

  const routeSource = readProjectFile("app/api/projects/[id]/company-contact-role/route.ts");
  const handlerSource = readProjectFile("lib/project-company-contact-role-link-route.ts");
  assert(routeHasHandler(routeSource, "PATCH"));
  for (const method of ["POST", "PUT", "DELETE"]) {
    assert.equal(routeHasHandler(routeSource, method), false, `${method} must not be exported`);
  }
  assert.match(routeSource, /handleProjectCompanyContactRolePatch/);
  assert.match(handlerSource, /requireAnyRole\(request,\s*\["ADMIN",\s*"MANAGER"\]\)/);
  assert.match(handlerSource, /projectCompanyContactRoleLinkGuard/);
  assert.match(handlerSource, /disabledProjectCompanyContactRoleLinkResponse/);
  assert.ok(handlerSource.indexOf("projectCompanyContactRoleLinkGuard") < handlerSource.indexOf("request.json()"));
  assert.match(handlerSource, /ProjectCompanyContactRoleLinkRequestError\("Request body must be valid JSON"\)/);
  assert.equal(PROJECT_COMPANY_CONTACT_ROLE_LINK_INTENT, "LINK_EXISTING_PROJECT_COMPANY_CONTACT_ROLE");

  console.log("project company/contact role link route tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
