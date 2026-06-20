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
const scriptPath = "scripts/project-company-contact-link-contract.test.ts";
const packagePath = "package.json";
const progressPath = "PROGRESS.md";

const allowedTouchedFiles = new Set([
  docsPath,
  scriptPath,
  "scripts/person-company-contact-candidate-ui.test.ts",
  "scripts/project-company-contact-candidate-ui.test.ts",
  "scripts/company-contact-write-contract.test.ts",
  "scripts/person-owner-link-api-contract.test.ts",
  packagePath,
  progressPath
]);

for (const filePath of touchedFilesFromGit()) {
  assert(
    allowedTouchedFiles.has(filePath),
    `project company/contact link contract PR must stay docs/tests only: ${filePath}`
  );
  assert(!filePath.startsWith("app/"), `API/UI route files are out of scope: ${filePath}`);
  assert(!filePath.startsWith("components/"), `UI files are out of scope: ${filePath}`);
  assert(!filePath.startsWith("lib/"), `write helper implementation is out of scope: ${filePath}`);
  assert(!filePath.startsWith("prisma/"), `schema/migration changes are out of scope: ${filePath}`);
}

const docsSource = readProjectFile(docsPath);
const packageSource = readProjectFile(packagePath);
const schemaSource = readProjectFile("prisma/schema.prisma");
const projectRoutePath = "app/api/projects/[id]/company-contact-role/route.ts";

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
  "Allowed roles: `ADMIN` and `MANAGER` only",
  "Forbidden roles: `SALES`",
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true",
  "`local`, `test`, or `staging`",
  "PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=production",
  "Allowed request fields: `companyId`, `contactId`, `role`, `expectedUpdatedAt`, `reasonCode`, `confirmationToken`.",
  "reject raw mail body, free note, customer data",
  "Existing `Company` and existing `CompanyContact` only",
  "never creates or upserts companies or contacts",
  "`contact.companyId` must equal `companyId`",
  "`CompanyContact.isActive=false` returns `409`",
  "Company `tradeStatus` values `NG`, `NEEDS_REVIEW`, and `SUSPENDED` return `409`",
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
  "same transaction",
  "UI must reload/reselect the project from server data",
  "must not apply an optimistic write",
  "Smoke testing and real DB writes require a separate approval and a separate PR"
]) {
  assert(docsSource.includes(requiredText), `${docsPath} must include: ${requiredText}`);
}

assert(packageSource.includes("test:project-company-contact-link-contract"), "package.json must expose the project company/contact link contract test");
assert(packageSource.includes("npm run test:project-company-contact-link-contract"), "npm test must include the project company/contact link contract test");

assert(!existsSync(path.join(rootDir, projectRoutePath)), `${projectRoutePath} must not be implemented in this PR`);

const projectCompanyRoleModel = sectionBetween(schemaSource, "model ProjectCompanyRole {", "model ProjectSkill {");
assert(!projectCompanyRoleModel.includes("updatedAt"), "ProjectCompanyRole has no updatedAt; contract must use Project.updatedAt without migration");
assert(projectCompanyRoleModel.includes("@@index([projectId, role])"), "ProjectCompanyRole must be queryable by projectId + role before enforcing 409");

const projectModel = sectionBetween(schemaSource, "model Project {", "model ProjectCondition {");
assert(projectModel.includes("updatedAt"), "Project.updatedAt must be available for stale write detection");

const roleEnum = sectionBetween(schemaSource, "enum ProjectCompanyRoleType {", "enum ProjectSkillType {");
for (const role of [
  "UPPER_COMPANY",
  "END_USER",
  "PRIME_CONTRACTOR",
  "SECONDARY_CONTRACTOR",
  "TERTIARY_CONTRACTOR",
  "ACCOUNT_MANAGER_COMPANY",
  "PROPOSAL_TARGET",
  "OTHER"
]) {
  assert(roleEnum.includes(role), `schema must include ProjectCompanyRoleType.${role}`);
  assert(docsSource.includes(`\`${role}\``), `${docsPath} must document ProjectCompanyRoleType.${role}`);
}

for (const forbiddenDocText of [
  "PATCH /api/projects will be used",
  "default role is UPPER_COMPANY",
  "production writes are allowed",
  "optimistic write is allowed",
  "schema migration is required"
]) {
  assert(!docsSource.includes(forbiddenDocText), `${docsPath} must not include unsafe policy: ${forbiddenDocText}`);
}

console.log("project company/contact role link contract tests passed.");
