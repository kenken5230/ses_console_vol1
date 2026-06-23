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

function assertRouteTreeAbsentOrReadOnly(relativeDir: string) {
  for (const filePath of listFilesRecursively(relativeDir)) {
    if (!/\/route\.(ts|tsx|js|jsx)$/.test(filePath)) continue;
    assert(!routeHasWriteHandler(readProjectFile(filePath)), `${relativeDir} must not expose DB write handlers: ${filePath}`);
  }
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

const allowedTouchedFiles = new Set([
  "app/globals.css",
  "app/api/dashboard-data/route.ts",
  "app/api/mail-notifications/[id]/body/",
  "app/api/mail-notifications/[id]/body/route.ts",
  "app/api/persons/[id]/",
  "app/api/persons/[id]/company-contact-candidates/",
  "app/api/persons/[id]/company-contact-candidates/route.ts",
  "app/api/persons/[id]/owner-company-contact/route.ts",
  "app/api/projects/[id]/company-contact-role/route.ts",
  "app/api/projects/[id]/",
  "app/api/projects/[id]/company-contact-candidates/",
  "app/api/projects/[id]/company-contact-candidates/route.ts",
  "app/page.jsx",
  "components/PersonDetailPane.jsx",
  "components/ProjectDetailPane.jsx",
  "components/UnclassifiedMailDetailPane.jsx",
  "docs/themes/ses-sales-console/operations/",
  "docs/themes/ses-sales-console/operations/person-owner-link-http-route-smoke-runbook-2026-06-20.md",
  "docs/themes/ses-sales-console/operations/person-owner-link-db-smoke-preflight-2026-06-20.md",
  "docs/themes/ses-sales-console/operations/project-company-contact-role-link-smoke-runbook-2026-06-20.md",
  "docs/status/person-owner-link-http-smoke-plan-2026-06-20.md",
  "docs/status/link-safety-policy-2026-06-20.md",
  "docs/status/pm-handoff-2026-06-21.md",
  "docs/status/project-company-contact-role-link-ready-checklist-2026-06-21.md",
  "docs/status/README.md",
  "docs/themes/ses-sales-console/requirements/person-company-contact-candidate-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/project-company-contact-candidate-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/project-company-contact-link-contract-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/company-contact-write-contract-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-link-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-contract-2026-06-20.md",
  "lib/company-contact-candidates.ts",
  "lib/company-contact-candidate-loader.ts",
  "lib/link-safety-policy.ts",
  "lib/person-owner-company-contact-link.ts",
  "lib/person-owner-company-contact-link-route.ts",
  "lib/project-company-contact-role-link.ts",
  "lib/project-company-contact-role-link-contract.ts",
  "lib/project-company-contact-role-link-route.ts",
  "lib/project-company-contact-role-link-ui.ts",
  "lib/person-owner-link-ui.ts",
  "scripts/project-company-contact-link-api-route.test.ts",
  "scripts/project-company-contact-link-api.test.ts",
  "scripts/project-company-contact-link-ui.test.ts",
  "scripts/link-safety-policy.test.ts",
  "scripts/person-owner-link-api-route.test.ts",
  "scripts/person-owner-link-api.test.ts",
  "scripts/person-owner-link-ui.test.ts",
  "scripts/project-company-contact-candidate-ui.test.ts",
  "scripts/project-company-contact-link-contract.test.ts",
  "scripts/person-company-contact-candidate-ui.test.ts",
  "scripts/company-contact-write-contract.test.ts",
  "scripts/person-owner-link-api-contract.test.ts",
  "scripts/person-owner-link-http-smoke-preflight.ts",
  "package.json",
  "PROGRESS.md"
]);

for (const filePath of touchedFilesFromGit()) {
  assert(
    allowedTouchedFiles.has(filePath),
    `company/contact write contract PR must not touch route/schema/migration/UI files: ${filePath}`
  );
}

const docsSource = readProjectFile(
  "docs/themes/ses-sales-console/requirements/company-contact-write-contract-2026-06-20.md"
);
const personCandidateDocsSource = readProjectFile(
  "docs/themes/ses-sales-console/requirements/person-company-contact-candidate-ui-2026-06-20.md"
);
const projectCandidateDocsSource = readProjectFile(
  "docs/themes/ses-sales-console/requirements/project-company-contact-candidate-ui-2026-06-20.md"
);
const packageSource = readProjectFile("package.json");
const personsApiSource = readProjectFile("app/api/persons/route.ts");
const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const candidateLoaderSource = readProjectFile("lib/company-contact-candidate-loader.ts");
const personPaneSource = readProjectFile("components/PersonDetailPane.jsx");
const projectPaneSource = readProjectFile("components/ProjectDetailPane.jsx");

for (const requiredText of [
  "Person owner existing link API は実装済み",
  "Project の既存 Company/CompanyContact role link narrow route/UI は実装済み",
  "generic Company/Contact create/update route/UI は未実装",
  "候補表示は自動反映しない",
  "ADMIN/MANAGER",
  "SALESは要検討",
  "既存会社紐づけ",
  "新規会社作成",
  "低confidence",
  "汎用ドメイン",
  "既存値あり",
  "人間確認必須",
  "上書き禁止",
  "確認必須",
  "監査ログ",
  "rollback",
  "変更履歴",
  "実DB write smokeは別承認",
  "SUSPENDED",
  "CompanyContact.isActive=false",
  "候補計算用のDB read",
  "候補UI部分に限定",
  "既存の会社/担当者 read-only 通常行"
]) {
  assert(docsSource.includes(requiredText), `write contract docs must include: ${requiredText}`);
}

assert(packageSource.includes("test:company-contact-write-contract"), "package.json must expose the write contract test");
assert(!/export\s+(?:async\s+)?function\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assert(!/\bexport\s+const\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assertRouteTreeAbsentOrReadOnly("app/api/companies");
assertRouteTreeAbsentOrReadOnly("app/api/company-contacts");
assertRouteTreeAbsentOrReadOnly("app/api/company-contact-candidates");
assertRouteTreeAbsentOrReadOnly("app/api/mail-notifications/[id]/body");
assertRouteTreeAbsentOrReadOnly("app/api/persons/[id]/company-contact-candidates");
assertRouteTreeAbsentOrReadOnly("app/api/projects/[id]/company-contact-candidates");

for (const pattern of [
  /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/,
  /prisma\.(company|companyContact|project|projectCompanyRole|person)\.(create|createMany|update|upsert|delete|deleteMany)\b/,
  /prisma\.\$transaction\b/
]) {
  for (const source of [dashboardSource, candidateLoaderSource]) {
    assert(!pattern.test(source), `candidate display code must remain read-only: ${pattern}`);
  }
}
assert(
  /const\s+COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE\s*=\s*\d+/.test(candidateLoaderSource),
  "candidate company read must define a bounded take constant"
);
assert(
  /db\.company\.findMany\(\{\s*take:\s*COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE,\s*orderBy:\s*\[\s*\{\s*normalizedName:\s*"asc"\s*\},\s*\{\s*id:\s*"asc"\s*\}\s*\],[\s\S]*contacts:\s*\{\s*orderBy:\s*\[\s*\{\s*name:\s*"asc"\s*\},\s*\{\s*id:\s*"asc"\s*\}\s*\]/.test(candidateLoaderSource),
  "candidate company/contact DB read must use take and stable orderBy"
);

const candidateUiSources = [
  sectionBetween(
    personPaneSource,
    "function CompanyContactCandidateList",
    "function DetailItemValue"
  ),
  sectionBetween(
    projectPaneSource,
    "function CompanyContactCandidateList",
    "function DetailItemValue"
  )
];

for (const forbiddenUiPattern of [
  /<button\b/i,
  /<input\b/i,
  /<select\b/i,
  /type=["']checkbox["']/i,
  /onClick\s*=/i,
  /mailto:/i,
  /tel:/i,
  /method:\s*["'](POST|PATCH|PUT|DELETE)["']/i
]) {
  for (const candidateUiSource of candidateUiSources) {
    assert(!forbiddenUiPattern.test(candidateUiSource), `candidate UI must not expose save/apply controls: ${forbiddenUiPattern}`);
  }
}

for (const candidateDocsSource of [personCandidateDocsSource, projectCandidateDocsSource]) {
  assert(candidateDocsSource.includes("候補UI部分に限定"), "candidate UI link ban must be scoped to candidate UI only");
  assert(candidateDocsSource.includes("既存read-only通常行"), "candidate UI docs must not redefine regular read-only mailto/tel rows");
}

console.log("company/contact write contract tests passed.");
