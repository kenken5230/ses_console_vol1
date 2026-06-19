import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  emailDomainForCandidate,
  findCompanyContactCandidates,
  normalizeCompanyNameForCandidate,
  normalizeContactNameForCandidate
} from "../lib/company-contact-candidates";

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

function assertNoForbiddenTouchedFiles() {
  const touchedFiles = touchedFilesFromGit();
  const forbiddenMatchers = [
    (filePath: string) => filePath === "prisma/schema.prisma",
    (filePath: string) => filePath.startsWith("prisma/migrations/"),
    (filePath: string) => filePath === "app/api/projects/route.ts",
    (filePath: string) => filePath === "app/api/persons/route.ts",
    (filePath: string) => filePath.startsWith("app/api/companies/"),
    (filePath: string) => filePath.startsWith("app/api/company-contacts/"),
    (filePath: string) => filePath === "components/PersonCreateDrawer.jsx",
    (filePath: string) => filePath === "components/ProjectCreateDrawer.jsx"
  ];

  for (const filePath of touchedFiles) {
    assert(
      !forbiddenMatchers.some((matches) => matches(filePath)),
      `company/contact candidate PR must not touch forbidden write/schema/UI file: ${filePath}`
    );
  }
}

function assertNoOwnKeyDeep(value: unknown, forbiddenKey: string) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoOwnKeyDeep(item, forbiddenKey);
    return;
  }

  assert(
    !Object.prototype.hasOwnProperty.call(value, forbiddenKey),
    `candidate output must not expose ${forbiddenKey}`
  );
  for (const nestedValue of Object.values(value)) assertNoOwnKeyDeep(nestedValue, forbiddenKey);
}

assert.equal(normalizeCompanyNameForCandidate("株式会社 ＡＢＣテクノロジー"), "abcテクノロジー");
assert.equal(normalizeCompanyNameForCandidate("ABC Technology Co., Ltd."), "abctechnology");
assert.equal(normalizeCompanyNameForCandidate("（株）ABC-Technology"), "abctechnology");
assert.equal(normalizeContactNameForCandidate("山田 太郎 様"), "山田太郎");
assert.equal(emailDomainForCandidate("Sales Owner <OWNER@PARTNER.TEST>"), "partner.test");

const sources = [
  {
    company: {
      id: "company-domain",
      name: "Partner Systems",
      mainEmailDomain: "partner.test",
      tradeStatus: "OK",
      tdbScore: { toString: () => "71.25" },
      normalizedName: "partnersystems",
      corporateNumber: "1234567890123",
      bankruptcyRiskScore: "private-risk",
      notes: "private company note"
    },
    contact: {
      id: "contact-domain",
      name: "Domain Owner",
      email: "owner@partner.test",
      phone: "03-0000-0000",
      department: "Sales",
      position: "Manager",
      isActive: true,
      contactPolicy: "private policy",
      notes: "private contact note"
    }
  },
  {
    company: {
      id: "company-name",
      name: "株式会社 ABCテクノロジー",
      mainEmailDomain: "abc-tech.test",
      tradeStatus: "NEEDS_REVIEW"
    },
    contact: {
      id: "contact-name",
      name: "山田 太郎",
      email: "taro@abc-tech.test",
      isActive: true
    }
  },
  {
    company: {
      id: "company-other",
      name: "Other Vendor",
      mainEmailDomain: "other.test"
    },
    contact: {
      id: "contact-other",
      name: "Other Owner",
      email: "other@other.test"
    }
  }
];

const domainCandidates = findCompanyContactCandidates(
  { email: "new.sender@sub.partner.test" },
  sources,
  { maxCandidates: 5 }
);
assert.equal(domainCandidates[0].company?.id, "company-domain");
assert(domainCandidates[0].reasonCodes.includes("email_domain_match"));
assert.equal(domainCandidates[0].score, 34);

const contactCandidates = findCompanyContactCandidates(
  {
    companyName: "ABCテクノロジ",
    contactEmail: "TARO@ABC-TECH.TEST",
    contactName: "山田太郎"
  },
  sources,
  { maxCandidates: 5 }
);
assert.equal(contactCandidates[0].company?.id, "company-name");
assert.deepEqual(contactCandidates[0].reasonCodes, [
  "company_name_variant",
  "contact_email_match",
  "email_domain_match",
  "contact_name_exact"
]);
assert.equal(contactCandidates[0].score, 100);

const exactCompanyCandidates = findCompanyContactCandidates(
  { companyName: "ABCテクノロジー合同会社" },
  sources,
  { maxCandidates: 5 }
);
assert.equal(exactCompanyCandidates[0].company?.id, "company-name");
assert(exactCompanyCandidates[0].reasonCodes.includes("company_name_exact"));

const contactNameVariantCandidates = findCompanyContactCandidates(
  { contactName: "Owner Domain" },
  sources,
  { maxCandidates: 5 }
);
assert.equal(contactNameVariantCandidates[0].contact?.id, "contact-domain");
assert(contactNameVariantCandidates[0].reasonCodes.includes("contact_name_variant"));

const limitedCandidates = findCompanyContactCandidates(
  { email: "person@partner.test", contactName: "Other Owner" },
  sources,
  { maxCandidates: 1, maxRecordsToInspect: 2 }
);
assert.equal(limitedCandidates.length, 1, "candidate output must honor maxCandidates");
assert.notEqual(limitedCandidates[0].contact?.id, "contact-other", "candidate scan must honor maxRecordsToInspect");

const serializedCandidate = JSON.stringify(domainCandidates[0]);
for (const forbiddenKey of ["notes", "contactPolicy", "corporateNumber", "bankruptcyRiskScore", "normalizedName"]) {
  assertNoOwnKeyDeep(domainCandidates[0], forbiddenKey);
  assert(!serializedCandidate.includes(forbiddenKey), `candidate JSON must not include ${forbiddenKey}`);
}
for (const privateValue of ["private-risk", "private company note", "private contact note", "1234567890123"]) {
  assert(!serializedCandidate.includes(privateValue), `candidate JSON must not include sensitive source value: ${privateValue}`);
}

const helperSource = readProjectFile("lib/company-contact-candidates.ts");
const packageSource = readProjectFile("package.json");
const personsApiSource = readProjectFile("app/api/persons/route.ts");

assert(!/@prisma\/client|lib\/prisma|from\s+["'][^"']*prisma|prisma\.|\bfetch\s*\(/i.test(helperSource), "candidate helper must stay DB/fetch/Prisma free");
assert(packageSource.includes("test:company-contact-candidates"), "package.json must expose the candidate contract test");
assert(!/export\s+async\s+function\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/companies")), "company CRUD API routes must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/company-contacts")), "company contact CRUD API routes must not be introduced");
assertNoForbiddenTouchedFiles();

console.log("company/contact candidate read-only contract tests passed.");
