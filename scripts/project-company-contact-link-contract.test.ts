import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function touchedFilesFromGit() {
  const files = new Set<string>();

  for (const command of [
    "git status --porcelain=v1",
    "git diff --name-only origin/main...HEAD",
    "git diff --name-only",
    "git diff --name-only --cached"
  ]) {
    try {
      const output = execSync(command, { cwd: rootDir, encoding: "utf8" });
      for (const line of output.split(/\r?\n/).filter(Boolean)) {
        const rawPath = command.includes("status") ? line.slice(3) : line;
        const filePath = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() || rawPath : rawPath;
        files.add(filePath.replace(/^"|"$/g, "").replace(/\\/g, "/"));
      }
    } catch {
      // Source guards below still apply when Git metadata is unavailable.
    }
  }

  return [...files];
}

function sectionBetween(source: string, startNeedle: string, endNeedle: string) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} was not found`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `${endNeedle} was not found after ${startNeedle}`);
  return source.slice(start, end);
}

const docsPath = "docs/themes/ses-sales-console/requirements/project-company-contact-link-contract-2026-06-20.md";
const operationsPath = "docs/themes/ses-sales-console/operations/project-company-contact-role-link-smoke-runbook-2026-06-20.md";
const scriptPath = "scripts/project-company-contact-link-contract.test.ts";
const packagePath = "package.json";
const progressPath = "PROGRESS.md";

const allowedReasonCodes = [
  "candidate_verified",
  "manual_admin_review",
  "sales_ops_cleanup",
  "stale_candidate_recheck",
  "duplicate_role_cleanup"
] as const;

const roleDerivationTable = [
  { role: "UPPER_COMPANY", roleOrder: 1, isPrimary: true },
  { role: "END_USER", roleOrder: 2, isPrimary: false },
  { role: "PRIME_CONTRACTOR", roleOrder: 3, isPrimary: false },
  { role: "SECONDARY_CONTRACTOR", roleOrder: 4, isPrimary: false },
  { role: "TERTIARY_CONTRACTOR", roleOrder: 5, isPrimary: false },
  { role: "ACCOUNT_MANAGER_COMPANY", roleOrder: 80, isPrimary: false },
  { role: "PROPOSAL_TARGET", roleOrder: 90, isPrimary: false },
  { role: "OTHER", roleOrder: 99, isPrimary: false }
] as const;

const allowedTouchedFiles = new Set([
  "app/api/projects/[id]/company-contact-role/route.ts",
  "app/api/projects/[id]/",
  docsPath,
  operationsPath,
  scriptPath,
  "lib/project-company-contact-role-link.ts",
  "lib/project-company-contact-role-link-route.ts",
  "scripts/project-company-contact-link-api.test.ts",
  "scripts/project-company-contact-link-api-route.test.ts",
  "docs/status/README.md",
  "docs/status/person-owner-link-http-smoke-plan-2026-06-20.md",
  "docs/themes/ses-sales-console/operations/person-owner-link-http-route-smoke-runbook-2026-06-20.md",
  "scripts/person-company-contact-candidate-ui.test.ts",
  "scripts/project-company-contact-candidate-ui.test.ts",
  "scripts/company-contact-write-contract.test.ts",
  "scripts/person-owner-link-api-contract.test.ts",
  "scripts/person-owner-link-http-smoke-preflight.ts",
  packagePath,
  progressPath
]);

for (const filePath of touchedFilesFromGit()) {
  assert(
    allowedTouchedFiles.has(filePath),
    `project company/contact role link API PR touched an unexpected file: ${filePath}`
  );
  assert(filePath !== "app/api/projects/route.ts", `broad projects PATCH route is out of scope: ${filePath}`);
  assert(!filePath.startsWith("components/"), `UI files are out of scope: ${filePath}`);
  assert(!filePath.startsWith("prisma/"), `schema/migration changes are out of scope: ${filePath}`);
}

const docsSource = readProjectFile(docsPath);
const operationsSource = readProjectFile(operationsPath);
const packageSource = readProjectFile(packagePath);
const schemaSource = readProjectFile("prisma/schema.prisma");
const projectRoutePath = "app/api/projects/[id]/company-contact-role/route.ts";
const helperPath = "lib/project-company-contact-role-link.ts";
const routeHelperPath = "lib/project-company-contact-role-link-route.ts";

for (const requiredText of [
  "PATCH /api/projects/[id]/company-contact-role",
  "Do not use existing `/api/projects` PATCH",
  "broad project edit API",
  "can be used by `SALES`",
  "Initial implementation must require `role` in the payload",
  "must not silently default to `UPPER_COMPANY`",
  "Allowed role enum values are the current `ProjectCompanyRoleType` values",
  "`UPPER_COMPANY`",
  "`END_USER`",
  "`PRIME_CONTRACTOR`",
  "`SECONDARY_CONTRACTOR`",
  "`TERTIARY_CONTRACTOR`",
  "`ACCOUNT_MANAGER_COMPANY`",
  "`PROPOSAL_TARGET`",
  "`OTHER`",
  "`roleOrder` and `isPrimary` are not accepted from the client",
  "Any payload containing `roleOrder` or `isPrimary` returns `400` and must not reach write logic.",
  "Server-derived role decision table:",
  "`END_CLIENT`, `CLIENT`, and `PARTNER` are not accepted role values",
  "Allowed roles: `ADMIN` and `MANAGER` only",
  "Forbidden roles: `SALES`",
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true",
  "`local`, `test`, or `staging`",
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=production",
  "Allowed request fields: `companyId`, `contactId`, `role`, `expectedUpdatedAt`, `reasonCode`, `confirmationToken`.",
  "\"reasonCode\": \"candidate_verified\"",
  "reject raw mail body, free note, customer data",
  "`reasonCode` is required for this write",
  "No raw/free text reason is accepted.",
  "Allowed `reasonCode` enum values are:",
  "Unknown `reasonCode` values return `400` and must not reach write logic.",
  "Existing `Company` and existing `CompanyContact` only",
  "never creates or upserts companies or contacts",
  "`contact.companyId` must equal `companyId`",
  "`CompanyContact.isActive=false` returns `409`",
  "Company `tradeStatus` values `NG`, `NEEDS_REVIEW`, and `SUSPENDED` return `409`",
  "`roleOrder` and `isPrimary` must be derived from the role decision table",
  "Unknown `reasonCode` values are rejected before any create, upsert, update, delete, or AuditLog write.",
  "Existing same `projectId + role` returns `409`",
  "must not overwrite an existing role",
  "Contact-only completion of an existing role",
  "The minimum stale check uses `Project.updatedAt` as `expectedUpdatedAt`",
  "`ProjectCompanyRole` currently has no `updatedAt`",
  "must not add a schema change or migration",
  "`AuditLog` is mandatory",
  "AuditLog rows must never be deleted",
  "projectCompanyRole.create",
  "auditLog.create",
  "project.update",
  "same transaction",
  "Implemented in this PR",
  "real DB write smoke was not executed",
  "UI must reload/reselect the project from server data",
  "must not apply an optimistic write",
  "Unknown `reasonCode` is rejected.",
  "`roleOrder` and `isPrimary` payload fields are rejected.",
  "The role decision table covers every allowed `ProjectCompanyRoleType` value.",
  "Smoke testing and real DB writes require a separate approval and a separate PR"
]) {
  assert(docsSource.includes(requiredText), `${docsPath} must include: ${requiredText}`);
}

for (const requiredText of [
  "PATCH /api/projects/[id]/company-contact-role",
  "real DB write smoke was not executed",
  "No real DB write smoke was executed",
  "production",
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true",
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET",
  "ADMIN",
  "MANAGER",
  "AuditLog",
  "No migration, schema change, deploy, staging operation, production operation, or UI change was performed"
]) {
  assert(operationsSource.includes(requiredText), `${operationsPath} must include: ${requiredText}`);
}

assert(packageSource.includes("test:project-company-contact-link-contract"), "package.json must expose the project company/contact link contract test");
assert(packageSource.includes("test:project-company-contact-link-api"), "package.json must expose the project company/contact link API test");
assert(packageSource.includes("npm run test:project-company-contact-link-contract"), "npm test must include the project company/contact link contract test");
assert(packageSource.includes("npm run test:project-company-contact-link-api"), "npm test must include the project company/contact link API test");

assert(existsSync(path.join(rootDir, projectRoutePath)), `${projectRoutePath} must be implemented in this PR`);
assert(existsSync(path.join(rootDir, helperPath)), `${helperPath} must be implemented in this PR`);
assert(existsSync(path.join(rootDir, routeHelperPath)), `${routeHelperPath} must be implemented in this PR`);

const routeSource = readProjectFile(projectRoutePath);
const helperSource = readProjectFile(helperPath);
const routeHelperSource = readProjectFile(routeHelperPath);
const broadProjectsRouteSource = readProjectFile("app/api/projects/route.ts");

assert(/\bexport\s+async\s+function\s+PATCH\b/.test(routeSource), `${projectRoutePath} must expose PATCH`);
assert(!/\bexport\s+(?:async\s+)?function\s+(POST|PUT|DELETE)\b/.test(routeSource), `${projectRoutePath} must expose PATCH only`);
assert(routeSource.includes("handleProjectCompanyContactRolePatch"), "project company/contact role route must delegate to the route handler");
assert(routeHelperSource.includes("requireAnyRole(request, [\"ADMIN\", \"MANAGER\"])"), "route handler must allow only ADMIN/MANAGER");
assert(routeHelperSource.indexOf("projectCompanyContactRoleLinkGuard") < routeHelperSource.indexOf("request.json()"), "feature guard must run before JSON parsing");
assert(!broadProjectsRouteSource.includes("handleProjectCompanyContactRolePatch"), "broad /api/projects PATCH must not be reused for this flow");
assert(!broadProjectsRouteSource.includes("linkExistingProjectCompanyContactRole"), "broad /api/projects route must not call the guarded project role helper");

for (const requiredText of [
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED",
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET",
  "local",
  "test",
  "staging",
  "production",
  "PROJECT_COMPANY_CONTACT_ROLE_DERIVATION",
  "PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES",
  "expectedUpdatedAt",
  "confirmationToken",
  "project.update",
  "projectCompanyRole.findFirst",
  "projectCompanyRole.create",
  "auditLog.create",
  "$transaction",
  "COMPANY_TRADE_STATUS_",
]) {
  assert(helperSource.includes(requiredText), `${helperPath} must include: ${requiredText}`);
}

for (const forbiddenPattern of [
  /\bcompany\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/,
  /\bcompanyContact\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/,
  /\bprojectCompanyRole\s*\.\s*(update|updateMany|upsert|delete|deleteMany)\s*\(/,
]) {
  assert(!forbiddenPattern.test(helperSource), `project role helper must not create/update/delete unrelated entities: ${forbiddenPattern}`);
}

const projectCompanyRoleModel = sectionBetween(schemaSource, "model ProjectCompanyRole {", "model ProjectSkill {");
assert(!projectCompanyRoleModel.includes("updatedAt"), "ProjectCompanyRole has no updatedAt; contract must use Project.updatedAt without migration");
assert(projectCompanyRoleModel.includes("@@index([projectId, role])"), "ProjectCompanyRole must be queryable by projectId + role before enforcing 409");

const projectModel = sectionBetween(schemaSource, "model Project {", "model ProjectCondition {");
assert(projectModel.includes("updatedAt"), "Project.updatedAt must be available for stale write detection");

const roleEnum = sectionBetween(schemaSource, "enum ProjectCompanyRoleType {", "enum ProjectSkillType {");
const roleDecisionSection = sectionBetween(docsSource, "Server-derived role decision table:", "## Auth");
for (const { role, roleOrder, isPrimary } of roleDerivationTable) {
  assert(roleEnum.includes(role), `schema must include ProjectCompanyRoleType.${role}`);
  assert(docsSource.includes(`\`${role}\``), `${docsPath} must document ProjectCompanyRoleType.${role}`);
  assert(
    roleDecisionSection.includes(`| \`${role}\` | \`${roleOrder}\` | \`${isPrimary}\` |`),
    `${docsPath} must document server-derived roleOrder/isPrimary for ${role}`
  );
}

const reasonCodeSection = sectionBetween(docsSource, "## Reason Code Contract", "## Validation Rules");
for (const reasonCode of allowedReasonCodes) {
  assert(reasonCodeSection.includes(`\`${reasonCode}\``), `${docsPath} must document reasonCode.${reasonCode}`);
}

for (const forbiddenDocText of [
  "PATCH /api/projects will be used",
  "default role is UPPER_COMPANY",
  "production writes are allowed",
  "optimistic write is allowed",
  "schema migration is required",
  "PROJECT_COMPANY_CONTACT_CANDIDATE_CONFIRMED"
]) {
  assert(!docsSource.includes(forbiddenDocText), `${docsPath} must not include unsafe policy: ${forbiddenDocText}`);
}

console.log("project company/contact role link contract tests passed.");
