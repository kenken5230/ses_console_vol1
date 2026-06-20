import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

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

function routeHasWriteHandler(source: string) {
  return /\bexport\s+(?:async\s+)?function\s+(POST|PATCH|PUT|DELETE)\b/.test(source)
    || /\bexport\s+const\s+(POST|PATCH|PUT|DELETE)\b/.test(source);
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

function outputText(value: unknown) {
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return typeof value === "string" ? value : "";
}

function runPreflightClassifyOnly(databaseUrl: string) {
  const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const env = {
    ...process.env,
    AUTH_SECRET: "",
    COMPANY_CONTACT_LINK_WRITE_ENABLED: "false",
    COMPANY_CONTACT_LINK_WRITE_TARGET: "",
    DATABASE_URL: databaseUrl,
    NODE_ENV: undefined,
    VERCEL_ENV: undefined,
  } as unknown as NodeJS.ProcessEnv;

  try {
    const stdout = execSync(
      `${npxCommand} tsx scripts/person-owner-link-http-smoke-preflight.ts --classify-only`,
      { cwd: rootDir, encoding: "utf8", env },
    );
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const execError = error as { status?: number; stdout?: unknown; stderr?: unknown };
    return {
      status: execError.status ?? 1,
      stdout: outputText(execError.stdout),
      stderr: outputText(execError.stderr),
    };
  }
}

function assertPreflightBlocksProductionLike(label: string, databaseUrl: string) {
  const result = runPreflightClassifyOnly(databaseUrl);
  assert.notEqual(result.status, 0, `${label} must stop safely before DB connection`);
  assert(result.stdout.includes("classification: production"), `${label} must classify as production`);
  assert(
    result.stderr.includes("Refusing production-like target before DB connection"),
    `${label} must refuse production-like targets before DB connection`,
  );
  assert(
    result.stderr.includes("No DB write or HTTP smoke request was attempted."),
    `${label} must report that no DB write or HTTP smoke request was attempted`,
  );
}

function assertPreflightAllowsClassifyOnly(label: string, databaseUrl: string, classification: string) {
  const result = runPreflightClassifyOnly(databaseUrl);
  assert.equal(result.status, 0, `${label} classify-only must not fail`);
  assert(result.stdout.includes(`classification: ${classification}`), `${label} must classify as ${classification}`);
  assert(
    result.stdout.includes("Classify-only mode: no DB connection or fixture query was attempted."),
    `${label} must stay in classify-only mode without DB connection`,
  );
}

const allowedTouchedFiles = new Set([
  "app/globals.css",
  "app/api/dashboard-data/route.ts",
  "app/api/persons/[id]/",
  "app/api/persons/[id]/owner-company-contact/route.ts",
  "app/api/projects/[id]/company-contact-role/route.ts",
  "app/api/projects/[id]/",
  "app/page.jsx",
  "components/PersonDetailPane.jsx",
  "docs/themes/ses-sales-console/operations/",
  "docs/themes/ses-sales-console/operations/person-owner-link-http-route-smoke-runbook-2026-06-20.md",
  "docs/themes/ses-sales-console/operations/person-owner-link-db-smoke-preflight-2026-06-20.md",
  "docs/themes/ses-sales-console/operations/project-company-contact-role-link-smoke-runbook-2026-06-20.md",
  "docs/status/person-owner-link-http-smoke-plan-2026-06-20.md",
  "docs/status/link-safety-policy-2026-06-20.md",
  "docs/status/README.md",
  "docs/themes/ses-sales-console/requirements/company-contact-write-contract-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/project-company-contact-link-contract-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-company-contact-candidate-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-link-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/project-company-contact-candidate-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-contract-2026-06-20.md",
  "lib/company-contact-candidates.ts",
  "lib/link-safety-policy.ts",
  "lib/person-owner-company-contact-link.ts",
  "lib/person-owner-company-contact-link-route.ts",
  "lib/project-company-contact-role-link.ts",
  "lib/project-company-contact-role-link-route.ts",
  "lib/person-owner-link-ui.ts",
  "scripts/project-company-contact-link-api-route.test.ts",
  "scripts/project-company-contact-link-api.test.ts",
  "scripts/link-safety-policy.test.ts",
  "scripts/person-owner-link-api-route.test.ts",
  "scripts/person-owner-link-api.test.ts",
  "scripts/person-owner-link-api-contract.test.ts",
  "scripts/person-owner-link-ui.test.ts",
  "scripts/company-contact-write-contract.test.ts",
  "scripts/person-company-contact-candidate-ui.test.ts",
  "scripts/project-company-contact-candidate-ui.test.ts",
  "scripts/person-owner-link-http-smoke-preflight.ts",
  "scripts/project-company-contact-link-contract.test.ts",
  "package.json",
  "PROGRESS.md"
]);

for (const filePath of touchedFilesFromGit()) {
  assert(
    allowedTouchedFiles.has(filePath),
    `person owner link API contract hardening PR must stay in approved docs/test/read-only route files: ${filePath}`
  );
  assert(!filePath.startsWith("prisma/"), `schema/migration changes are out of scope: ${filePath}`);
  assert(!filePath.startsWith("app/api/companies/"), `company API routes are out of scope: ${filePath}`);
  assert(!filePath.startsWith("app/api/company-contacts/"), `company contact API routes are out of scope: ${filePath}`);
}

const docsPath = "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-contract-2026-06-20.md";
const docsSource = readProjectFile(docsPath);
const smokePreflightDocsPath = "docs/themes/ses-sales-console/operations/person-owner-link-db-smoke-preflight-2026-06-20.md";
const smokePreflightDocsSource = readProjectFile(smokePreflightDocsPath);
const packageSource = readProjectFile("package.json");
const personsApiSource = readProjectFile("app/api/persons/route.ts");
const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const ownerLinkRoutePath = "app/api/persons/[id]/owner-company-contact/route.ts";
const ownerLinkRouteHandlerPath = "lib/person-owner-company-contact-link-route.ts";
const ownerLinkHelperPath = "lib/person-owner-company-contact-link.ts";
const ownerLinkDocsPath = "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-2026-06-20.md";
const linkSafetyPolicySource = readProjectFile("lib/link-safety-policy.ts");

for (const requiredText of [
  "PATCH /api/persons/[id]/owner-company-contact",
  "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT",
  "ADMIN",
  "MANAGER",
  "SALES",
  "COMPANY_CONTACT_LINK_WRITE_ENABLED=true",
  "COMPANY_CONTACT_LINK_WRITE_TARGET=staging",
  "production",
  "companyId",
  "contactId",
  "confirmCompanyContactLink",
  "expectedOwnerCompanyId",
  "expectedOwnerContactId",
  "expectedUpdatedAt",
  "新規会社作成",
  "新規担当者作成",
  "既存値上書き",
  "raw本文",
  "メール本文",
  "free note",
  "contact.companyId",
  "低confidence",
  "汎用ドメイン",
  "既存値あり",
  "NG",
  "SUSPENDED",
  "CompanyContact.isActive=false",
  "候補計算用のDB read",
  "409",
  "manual-review",
  "AuditLog",
  "beforeData",
  "afterData",
  "rollback route",
  "実DB write smoke",
  "Future API Implementation Required Case Table",
  "authorized happy path",
  "trade suspended",
  "inactive contact",
  "raw text rejected"
]) {
  assert(docsSource.includes(requiredText), `${docsPath} must include: ${requiredText}`);
}

for (const requiredText of [
  "This document does not approve or execute a real DB write smoke",
  "DATABASE_URL",
  "host",
  "database name",
  "production",
  "COMPANY_CONTACT_LINK_WRITE_ENABLED=true",
  "COMPANY_CONTACT_LINK_WRITE_TARGET=staging",
  "AUTH_SECRET",
  "ADMIN",
  "MANAGER",
  "Fixture Requirements",
  "Pre-Write Verification",
  "Post-Write Verification",
  "Rollback Plan",
  "Expected Success Case",
  "Expected Failure Cases",
  "separately approved write",
]) {
  assert(smokePreflightDocsSource.includes(requiredText), `${smokePreflightDocsPath} must include: ${requiredText}`);
}

assert(packageSource.includes("test:person-owner-link-api-contract"), "package.json must expose the person owner link API contract test");
assert(packageSource.includes("test:person-owner-link-api"), "package.json must expose the person owner link API implementation test");
assert(packageSource.includes("test:person-owner-link-api-route"), "package.json must expose the person owner link API route test");
assert(packageSource.includes("npm run test:person-owner-link-api-contract"), "npm test must include the person owner link API contract test");
assert(packageSource.includes("npm run test:person-owner-link-api"), "npm test must include the person owner link API implementation test");
assert(packageSource.includes("npm run test:person-owner-link-api-route"), "npm test must include the person owner link API route test");

for (const [label, databaseUrl] of [
  ["prod_main DB name", "postgres://safe:safe@localhost:5432/prod_main"],
  ["prod1 DB name", "postgres://safe:safe@localhost:5432/prod1"],
  ["primary_dev DB name", "postgres://safe:safe@localhost:5432/primary_dev"],
]) {
  assertPreflightBlocksProductionLike(label, databaseUrl);
}

assertPreflightAllowsClassifyOnly(
  "product catalog DB name",
  "postgres://safe:safe@localhost:5432/product_catalog_dev",
  "local",
);

assert(!/export\s+(?:async\s+)?function\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assert(!/\bexport\s+const\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");

assert(existsSync(path.join(rootDir, ownerLinkRoutePath)), `${ownerLinkRoutePath} must exist after implementation`);
assert(existsSync(path.join(rootDir, ownerLinkRouteHandlerPath)), `${ownerLinkRouteHandlerPath} must exist after implementation`);
assert(existsSync(path.join(rootDir, ownerLinkHelperPath)), `${ownerLinkHelperPath} must exist after implementation`);
assert(existsSync(path.join(rootDir, ownerLinkDocsPath)), `${ownerLinkDocsPath} must document the implementation`);

const ownerLinkRouteSource = readProjectFile(ownerLinkRoutePath);
const ownerLinkRouteHandlerSource = readProjectFile(ownerLinkRouteHandlerPath);
const ownerLinkHelperSource = readProjectFile(ownerLinkHelperPath);
const ownerLinkDocsSource = readProjectFile(ownerLinkDocsPath);

assert(/\bexport\s+async\s+function\s+PATCH\b/.test(ownerLinkRouteSource), `${ownerLinkRoutePath} must expose PATCH`);
assert(!/\bexport\s+(?:async\s+)?function\s+(POST|PUT|DELETE)\b/.test(ownerLinkRouteSource), `${ownerLinkRoutePath} must expose PATCH only`);
assert(ownerLinkRouteSource.includes("handlePersonOwnerCompanyContactPatch"), "owner link route must delegate to the route handler");
assert(ownerLinkRouteHandlerSource.includes("requireAnyRole(request, [...LINK_WRITER_ROLES])"), "owner link route handler must use the shared ADMIN/MANAGER writer roles");
assert(linkSafetyPolicySource.includes("LINK_WRITER_ROLES") && linkSafetyPolicySource.includes("ADMIN") && linkSafetyPolicySource.includes("MANAGER"), "link safety policy must define shared ADMIN/MANAGER writer roles");
assert(ownerLinkRouteHandlerSource.includes("personOwnerCompanyContactLinkGuard"), "owner link route handler must use the feature guard");
assert(ownerLinkRouteHandlerSource.indexOf("personOwnerCompanyContactLinkGuard") < ownerLinkRouteHandlerSource.indexOf("request.json()"), "feature guard must run before JSON body parsing");

for (const requiredText of [
  "COMPANY_CONTACT_LINK_WRITE_ENABLED",
  "COMPANY_CONTACT_LINK_WRITE_TARGET",
  "production",
  "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT",
  "confirmCompanyContactLink",
  "expectedOwnerCompanyId",
  "expectedOwnerContactId",
  "expectedUpdatedAt",
  "company.findUnique",
  "companyContact.findUnique",
  "person.update",
  "auditLog.create",
  "$transaction",
  "metadata",
]) {
  assert(ownerLinkHelperSource.includes(requiredText), `${ownerLinkHelperPath} must include: ${requiredText}`);
}

for (const forbiddenPattern of [
  /\bcompany\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/,
  /\bcompanyContact\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/,
  /\bperson\s*\.\s*(create|createMany|upsert|delete|deleteMany)\s*\(/,
]) {
  assert(!forbiddenPattern.test(ownerLinkHelperSource), `owner link helper must not create/upsert/delete existing entities: ${forbiddenPattern}`);
}

assert(ownerLinkDocsSource.includes("PATCH /api/persons/[id]/owner-company-contact"), `${ownerLinkDocsPath} must document the route`);
assert(ownerLinkDocsSource.includes("afterData.metadata"), `${ownerLinkDocsPath} must document current AuditLog metadata placement`);

for (const forbiddenRouteDir of ["app/api/companies", "app/api/company-contacts"]) {
  for (const filePath of listFilesRecursively(forbiddenRouteDir)) {
    assert(!/\/route\.(ts|tsx|js|jsx)$/.test(filePath), `${forbiddenRouteDir} route files are out of scope: ${filePath}`);
  }
}

assert(
  /prisma\.company\.findMany\(\{\s*take:\s*COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE,\s*orderBy:\s*\[\s*\{\s*normalizedName:\s*"asc"\s*\},\s*\{\s*id:\s*"asc"\s*\}\s*\]/.test(dashboardSource),
  "candidate company DB read must be bounded and stable before write API implementation"
);

console.log("person owner company/contact link API contract tests passed.");
