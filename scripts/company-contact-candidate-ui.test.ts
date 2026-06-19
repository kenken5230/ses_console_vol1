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
      // Git metadata can be absent in exported environments; source guards below still apply.
    }
  }

  return [...files];
}

const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const personPaneSource = readProjectFile("components/PersonDetailPane.jsx");
const packageSource = readProjectFile("package.json");
const personsApiSource = readProjectFile("app/api/persons/route.ts");
const personCreateDrawerSource = readProjectFile("components/PersonCreateDrawer.jsx");
const projectCreateDrawerSource = readProjectFile("components/ProjectCreateDrawer.jsx");

assert(dashboardSource.includes("findCompanyContactCandidates"), "dashboard detail must use the pure candidate helper");
assert(dashboardSource.includes("makeCompanyContactCandidateSources(companies)"), "dashboard detail must derive read-only candidate sources");
assert(dashboardSource.includes('type: "companyContactCandidates"'), "person detail groups must expose candidate item type");
assert(dashboardSource.includes('title: "会社/担当者候補（表示のみ）"'), "candidate group title must make display-only scope explicit");
assert(dashboardSource.includes("companyContactCandidates:"), "candidate item must carry read-only candidates only");

assert(personPaneSource.includes('item.type === "companyContactCandidates"'), "person detail pane must render candidate item type");
assert(
  personPaneSource.includes("元メール・送信元情報から推定した候補です。DBには保存されません。"),
  "candidate UI must explain that candidates are inferred and not saved"
);
assert(personPaneSource.includes("自動反映なし"), "candidate UI must make auto-apply absence explicit");
assert(
  personPaneSource.includes("候補はありません。現在の保存値は変更されません。"),
  "candidate empty state must say saved values are unchanged"
);

const candidateBranchStart = personPaneSource.indexOf('if (item.type === "companyContactCandidates")');
const candidateBranchEnd = personPaneSource.indexOf("return <strong", candidateBranchStart);
assert(candidateBranchStart >= 0 && candidateBranchEnd > candidateBranchStart, "candidate UI branch must be isolated for static checks");
const candidateBranch = personPaneSource.slice(candidateBranchStart, candidateBranchEnd);
for (const forbiddenPattern of [/<button\b/, /type="button"/, /<input\b/, /checkbox/i, /onClick=/, /<a\b/, /href=/, /mailto:/, /tel:/]) {
  assert(!forbiddenPattern.test(candidateBranch), `candidate UI must remain display-only: ${forbiddenPattern}`);
}

assert(!personCreateDrawerSource.includes("companyContactCandidates"), "person save payload must not include candidate UI data");
assert(!projectCreateDrawerSource.includes("companyContactCandidates"), "project save payload must not include candidate UI data");
assert(!/export\s+async\s+function\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/companies")), "company CRUD API routes must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/company-contacts")), "company contact CRUD API routes must not be introduced");

for (const pattern of [
  /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/,
  /prisma\.(company|companyContact|projectCompanyRole|person)\.(create|createMany|update|upsert|delete|deleteMany)\b/,
  /prisma\.\$transaction\b/
]) {
  assert(!pattern.test(dashboardSource), `dashboard route must remain read-only: ${pattern}`);
}

for (const filePath of touchedFilesFromGit()) {
  assert.notEqual(filePath, "prisma/schema.prisma", "candidate UI PR must not touch Prisma schema");
  assert(!filePath.startsWith("prisma/migrations/"), "candidate UI PR must not add migrations");
  assert.notEqual(filePath, "app/api/projects/route.ts", "candidate UI PR must not change project writes");
  assert.notEqual(filePath, "app/api/persons/route.ts", "candidate UI PR must not change person writes");
  assert.notEqual(filePath, "components/PersonCreateDrawer.jsx", "candidate UI PR must not change person save payload");
  assert.notEqual(filePath, "components/ProjectCreateDrawer.jsx", "candidate UI PR must not change project save payload");
}

assert(packageSource.includes("test:company-contact-candidate-ui"), "package.json must expose the candidate UI contract test");

console.log("company/contact candidate UI read-only contract tests passed.");
