import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  mapPersonOwnerReadOnly,
  mapProjectCompanyRolesReadOnly,
  mapSafeCompany,
  mapSafeCompanyContact
} from "../lib/dashboard-company-readonly";

const rootDir = process.cwd();

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function hasOwn(value: object, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

const companyFixture = {
  id: "company-1",
  name: "  Example Partner  ",
  normalizedName: "examplepartner",
  corporateNumber: "1234567890123",
  websiteUrl: "https://example.test/private",
  mainEmailDomain: "example.test",
  tradeStatus: "OK",
  tdbScore: { toString: () => "72.50" },
  bankruptcyRiskScore: "secret-risk",
  notes: "long internal note"
};

const contactFixture = {
  id: "contact-1",
  name: "  Sales Owner  ",
  email: "owner@example.test",
  phone: "03-0000-0000",
  department: "Sales",
  position: "Manager",
  isActive: true,
  contactPolicy: "private policy",
  notes: "private contact note"
};

const safeCompany = mapSafeCompany(companyFixture);
assert.deepEqual(safeCompany, {
  id: "company-1",
  name: "Example Partner",
  tradeStatus: "OK",
  mainEmailDomain: "example.test",
  tdbScore: "72.50"
});
assert(!hasOwn(safeCompany!, "normalizedName"), "company safe shape must not expose normalizedName");
assert(!hasOwn(safeCompany!, "corporateNumber"), "company safe shape must not expose corporateNumber");
assert(!hasOwn(safeCompany!, "websiteUrl"), "company safe shape must not expose websiteUrl");
assert(!hasOwn(safeCompany!, "bankruptcyRiskScore"), "company safe shape must not expose bankruptcyRiskScore");
assert(!hasOwn(safeCompany!, "notes"), "company safe shape must not expose notes");

const safeContact = mapSafeCompanyContact(contactFixture);
assert.deepEqual(safeContact, {
  id: "contact-1",
  name: "Sales Owner",
  email: "owner@example.test",
  phone: "03-0000-0000",
  department: "Sales",
  position: "Manager",
  isActive: true
});
assert(!hasOwn(safeContact!, "contactPolicy"), "contact safe shape must not expose contactPolicy");
assert(!hasOwn(safeContact!, "notes"), "contact safe shape must not expose notes");

assert.equal(mapSafeCompany({ id: "empty-name", name: " " }), null, "empty company names are not useful in the dashboard contract");
assert.equal(mapSafeCompanyContact({ name: " ", email: " ", phone: " " }), null, "empty contacts are not useful in the dashboard contract");

const projectRoles = mapProjectCompanyRolesReadOnly([
  {
    id: "role-2",
    role: "END_USER",
    roleOrder: 2,
    company: { id: "company-2", name: "End User", tradeStatus: "UNKNOWN" }
  },
  {
    id: "role-1",
    role: "UPPER_COMPANY",
    roleOrder: 1,
    isPrimary: true,
    company: companyFixture,
    companyContact: contactFixture
  },
  {
    id: "empty-role",
    role: "OTHER",
    roleOrder: 3,
    company: null,
    companyContact: null
  }
]);

assert.equal(projectRoles.length, 2, "empty project company roles must be dropped");
assert.deepEqual(
  projectRoles.map((role) => role.role),
  ["UPPER_COMPANY", "END_USER"],
  "project company roles must keep roleOrder sorting"
);
assert.deepEqual(projectRoles[0].company, safeCompany, "project role company must use safe company shape");
assert.deepEqual(projectRoles[0].contact, safeContact, "project role contact must use safe contact shape");

const personOwner = mapPersonOwnerReadOnly({
  ownerCompany: companyFixture,
  ownerContact: contactFixture
});
assert.deepEqual(personOwner, {
  ownerCompany: safeCompany,
  ownerContact: safeContact
});

const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const mapperSource = readProjectFile("lib/dashboard-company-readonly.ts");
const projectPaneSource = readProjectFile("components/ProjectDetailPane.jsx");
const personPaneSource = readProjectFile("components/PersonDetailPane.jsx");
const packageSource = readProjectFile("package.json");
const personsApiSource = readProjectFile("app/api/persons/route.ts");

assert(dashboardSource.includes("mapProjectCompanyRolesReadOnly"), "dashboard route must use the read-only project company mapper");
assert(dashboardSource.includes("mapPersonOwnerReadOnly"), "dashboard route must use the read-only person owner mapper");
assert(dashboardSource.includes("companyRoles,"), "project response must expose read-only companyRoles");
assert(dashboardSource.includes("ownerCompany,"), "person response must expose read-only ownerCompany");
assert(dashboardSource.includes("ownerContact,"), "person response must expose read-only ownerContact");
assert(dashboardSource.includes('type: "companyContacts"'), "detail groups must include read-only company/contact rows");

assert(!dashboardSource.includes("company: true"), "dashboard route must not load full company records for project roles");
assert(!dashboardSource.includes("companyContact: true"), "dashboard route must not load full company contact records for project roles");
assert(!dashboardSource.includes("ownerCompany: true"), "dashboard route must not load full owner company records");
assert(!dashboardSource.includes("ownerContact: true"), "dashboard route must not load full owner contact records");

for (const sensitiveField of ["corporateNumber", "websiteUrl", "bankruptcyRiskScore", "contactPolicy"]) {
  assert(!dashboardSource.includes(sensitiveField), `dashboard route must not select ${sensitiveField}`);
  assert(!mapperSource.includes(sensitiveField), `mapper must not expose ${sensitiveField}`);
}

const dashboardWritePatterns = [
  /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)\b/,
  /prisma\.(company|companyContact|projectCompanyRole)\.(create|createMany|update|upsert|delete|deleteMany)\b/,
  /prisma\.\$transaction\b/
];
for (const pattern of dashboardWritePatterns) {
  assert(!pattern.test(dashboardSource), `dashboard route must remain read-only: ${pattern}`);
}

assert(!/export\s+async\s+function\s+PATCH\b/.test(personsApiSource), "PATCH /api/persons must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/companies")), "company CRUD API routes must not be introduced");
assert(!existsSync(path.join(rootDir, "app/api/company-contacts")), "company contact CRUD API routes must not be introduced");
assert(projectPaneSource.includes("companyContacts"), "project detail pane must render read-only company/contact rows");
assert(personPaneSource.includes("companyContacts"), "person detail pane must render read-only company/contact rows");
assert(packageSource.includes("test:company-contact-readonly"), "package.json must expose the read-only mapper contract test");

console.log("company/contact read-only contract tests passed.");
