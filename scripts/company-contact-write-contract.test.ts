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
  "app/api/dashboard-data/route.ts",
  "app/api/persons/[id]/",
  "app/api/persons/[id]/owner-company-contact/route.ts",
  "components/ProjectDetailPane.jsx",
  "docs/themes/ses-sales-console/requirements/person-company-contact-candidate-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/project-company-contact-candidate-ui-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/company-contact-write-contract-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-2026-06-20.md",
  "docs/themes/ses-sales-console/requirements/person-owner-company-contact-link-api-contract-2026-06-20.md",
  "lib/person-owner-company-contact-link.ts",
  "scripts/person-owner-link-api.test.ts",
  "scripts/project-company-contact-candidate-ui.test.ts",
  "scripts/person-company-contact-candidate-ui.test.ts",
  "scripts/company-contact-write-contract.test.ts",
  "scripts/person-owner-link-api-contract.test.ts",
  "package.json"
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
const personPaneSource = readProjectFile("components/PersonDetailPane.jsx");
const projectPaneSource = readProjectFile("components/ProjectDetailPane.jsx");

for (const requiredText of [
  "DB write routeはまだ未実装",
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

for (const pattern of [
  /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/,
  /prisma\.(company|companyContact|project|projectCompanyRole|person)\.(create|createMany|update|upsert|delete|deleteMany)\b/,
  /prisma\.\$transaction\b/
]) {
  assert(!pattern.test(dashboardSource), `dashboard candidate display route must remain read-only: ${pattern}`);
}
assert(
  /const\s+COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE\s*=\s*\d+/.test(dashboardSource),
  "dashboard candidate company read must define a bounded take constant"
);
assert(
  /prisma\.company\.findMany\(\{\s*take:\s*COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE,\s*orderBy:\s*\[\s*\{\s*normalizedName:\s*"asc"\s*\},\s*\{\s*id:\s*"asc"\s*\}\s*\],[\s\S]*contacts:\s*\{\s*orderBy:\s*\[\s*\{\s*name:\s*"asc"\s*\},\s*\{\s*id:\s*"asc"\s*\}\s*\]/.test(dashboardSource),
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
  /\bfetch\s*\(/i,
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
