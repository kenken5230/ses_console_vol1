import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function sectionBetween(source: string, startNeedle: string, endNeedle: string) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} was not found`);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `${endNeedle} was not found after ${startNeedle}`);
  return source.slice(start, end);
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
    `project candidate display PR must stay in the approved read-only file set: ${filePath}`
  );
}

const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const projectPaneSource = readProjectFile("components/ProjectDetailPane.jsx");
const packageSource = readProjectFile("package.json");
const personsApiSource = readProjectFile("app/api/persons/route.ts");
const docsSource = readProjectFile(
  "docs/themes/ses-sales-console/requirements/project-company-contact-candidate-ui-2026-06-20.md"
);

assert(dashboardSource.includes("findCompanyContactCandidates"), "dashboard project detail must use the shared candidate helper");
assert(dashboardSource.includes("projectCompanyContactCandidateInput"), "dashboard must build project candidate input explicitly");
assert(dashboardSource.includes('type: "companyContactCandidates"'), "dashboard detail must expose candidate display items");
assert(dashboardSource.includes("会社/担当者候補（表示のみ）"), "dashboard detail must carry the explicit read-only candidate label");
assert(dashboardSource.includes("projects.map((project) => mapProject(project, companyContactCandidateSources))"));
assert(dashboardSource.includes("persons.map((person) => mapPerson(person, companyContactCandidateSources))"));
assert(
  /prisma\.company\.findMany\(\{\s*take:\s*COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE,\s*orderBy:\s*\[\s*\{\s*normalizedName:\s*"asc"\s*\},\s*\{\s*id:\s*"asc"\s*\}\s*\]/.test(dashboardSource),
  "candidate company DB read must use a bounded stable query"
);

const dashboardWritePatterns = [
  /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/,
  /prisma\.(company|companyContact|project|projectCompanyRole|person)\.(create|createMany|update|upsert|delete|deleteMany)\b/,
  /prisma\.\$transaction\b/
];
for (const pattern of dashboardWritePatterns) {
  assert(!pattern.test(dashboardSource), `dashboard route must remain read-only: ${pattern}`);
}

assert(!/export\s+async\s+function\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/companies")), "company write/API routes must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/company-contacts")), "company contact write/API routes must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/company-contact-candidates")), "company contact candidate write/API routes must not be introduced");

const candidateUiSource = sectionBetween(
  projectPaneSource,
  "function CompanyContactCandidateList",
  "function DetailItemValue"
);
assert(candidateUiSource.includes("会社/担当者候補（表示のみ）"), "candidate UI must show the explicit read-only label");
assert(candidateUiSource.includes("DBには保存されません"), "candidate UI must state that DB is not updated");
assert(candidateUiSource.includes("自動反映なし"), "candidate UI must state that no auto-apply happens");

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
  assert(!forbiddenUiPattern.test(candidateUiSource), `project candidate UI must remain display-only: ${forbiddenUiPattern}`);
}

assert(projectPaneSource.includes('item.type === "companyContactCandidates"'), "ProjectDetailPane must render candidate items");
assert(projectPaneSource.includes("readonly-candidate-panel"), "ProjectDetailPane must use the shared candidate display styling");
assert(projectPaneSource.includes('|| item.type === "companyContactCandidates"'), "candidate display must use the wide detail layout");
assert(packageSource.includes("test:project-company-contact-candidate-ui"), "package.json must expose the project candidate UI test");
assert(docsSource.includes("DBには保存されません") && docsSource.includes("自動反映なし"));
assert(docsSource.includes("保存payload変更なし") && docsSource.includes("API write追加なし"));
assert(docsSource.includes("候補UI部分に限定") && docsSource.includes("既存read-only通常行"));

console.log("project company/contact candidate UI read-only tests passed.");
