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

const allowedTouchedFiles = new Set([
  "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-contract-2026-06-20.md",
  "scripts/person-owner-link-api-contract.test.ts",
  "scripts/company-contact-write-contract.test.ts",
  "scripts/person-company-contact-candidate-ui.test.ts",
  "scripts/project-company-contact-candidate-ui.test.ts",
  "package.json"
]);

for (const filePath of touchedFilesFromGit()) {
  assert(
    allowedTouchedFiles.has(filePath),
    `person owner link API contract PR must stay docs/test/package-only: ${filePath}`
  );
  assert(!filePath.startsWith("prisma/"), `schema/migration changes are out of scope: ${filePath}`);
  assert(!filePath.startsWith("app/api/companies/"), `company API routes are out of scope: ${filePath}`);
  assert(!filePath.startsWith("app/api/company-contacts/"), `company contact API routes are out of scope: ${filePath}`);
}

const docsPath = "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-contract-2026-06-20.md";
const docsSource = readProjectFile(docsPath);
const packageSource = readProjectFile("package.json");
const personsApiSource = readProjectFile("app/api/persons/route.ts");
const ownerLinkRoutePath = "app/api/persons/[id]/owner-company-contact/route.ts";

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
  "409",
  "manual-review",
  "AuditLog",
  "beforeData",
  "afterData",
  "rollback route",
  "実DB write smoke"
]) {
  assert(docsSource.includes(requiredText), `${docsPath} must include: ${requiredText}`);
}

assert(packageSource.includes("test:person-owner-link-api-contract"), "package.json must expose the person owner link API contract test");
assert(packageSource.includes("npm run test:person-owner-link-api-contract"), "npm test must include the person owner link API contract test");

assert(!/export\s+(?:async\s+)?function\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assert(!/\bexport\s+const\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");

if (existsSync(path.join(rootDir, ownerLinkRoutePath))) {
  const ownerLinkRouteSource = readProjectFile(ownerLinkRoutePath);
  assert(!routeHasWriteHandler(ownerLinkRouteSource), `${ownerLinkRoutePath} must not expose a write handler yet`);
}

for (const forbiddenRouteDir of ["app/api/companies", "app/api/company-contacts"]) {
  for (const filePath of listFilesRecursively(forbiddenRouteDir)) {
    assert(!/\/route\.(ts|tsx|js|jsx)$/.test(filePath), `${forbiddenRouteDir} route files are out of scope: ${filePath}`);
  }
}

console.log("person owner company/contact link API contract tests passed.");
