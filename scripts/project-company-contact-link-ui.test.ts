import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildProjectCompanyContactRoleLinkPayload,
  getProjectCompanyContactRoleLinkGate,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_CONFIRMATION_LABEL,
  PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE,
} from "../lib/project-company-contact-role-link-ui";
import { buildProjectCompanyContactRoleConfirmationToken } from "../lib/project-company-contact-role-link";

const rootDir = process.cwd();
const projectId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";
const updatedAt = "2026-06-20T01:02:03.000Z";

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

function project(overrides = {}) {
  return {
    dbId: projectId,
    projectCompanyContactRoleLinkUpdatedAt: updatedAt,
    companyRoles: [],
    ...overrides,
  };
}

function candidate(overrides = {}) {
  return {
    score: 86,
    company: {
      id: companyId,
      name: "Safe Partner",
      tradeStatus: "OK",
    },
    contact: {
      id: contactId,
      name: "Safe Contact",
      companyId,
      isActive: true,
    },
    ...overrides,
  };
}

function gate(overrides = {}) {
  return getProjectCompanyContactRoleLinkGate({
    currentUserRole: "ADMIN",
    projectCompanyContactRoleLinkWriteAllowed: true,
    project: project(),
    candidate: candidate(),
    ...overrides,
  });
}

assert.equal(gate({ currentUserRole: "SALES" }).visible, true, "SALES should see a disabled notice when candidates exist");
assert.equal(gate({ currentUserRole: "SALES" }).enabled, false, "SALES must not execute the project link action");
assert.equal(gate({ currentUserRole: "ADMIN" }).enabled, true, "ADMIN can open confirmation for a safe candidate");
assert.equal(gate({ currentUserRole: "MANAGER" }).enabled, true, "MANAGER can open confirmation for a safe candidate");
assert.equal(gate({ projectCompanyContactRoleLinkWriteAllowed: false }).reasonCode, "FEATURE_DISABLED");
assert.equal(gate({ project: project({ dbId: "not-a-uuid" }) }).visible, false);
assert.equal(gate({ project: project({ projectCompanyContactRoleLinkUpdatedAt: "" }) }).reasonCode, "PROJECT_UPDATED_AT_MISSING");
assert.equal(gate({ candidate: candidate({ contact: { ...candidate().contact, isActive: false } }) }).reasonCode, "CONTACT_INACTIVE");
assert.equal(gate({ candidate: candidate({ company: { ...candidate().company, tradeStatus: "NG" } }) }).reasonCode, "COMPANY_STATUS_BLOCKED");
assert.equal(gate({ candidate: candidate({ company: { ...candidate().company, tradeStatus: "NEEDS_REVIEW" } }) }).reasonCode, "COMPANY_STATUS_BLOCKED");
assert.equal(gate({ candidate: candidate({ company: { ...candidate().company, tradeStatus: "SUSPENDED" } }) }).reasonCode, "COMPANY_STATUS_BLOCKED");
assert.equal(
  gate({ candidate: candidate({ contact: { ...candidate().contact, companyId: "44444444-4444-4444-8444-444444444444" } }) }).reasonCode,
  "CONTACT_COMPANY_MISMATCH",
);
assert.equal(gate({ candidate: candidate({ score: 46 }) }).reasonCode, "CANDIDATE_SCORE_LOW");
assert.equal(
  gate({ project: project({ companyRoles: [{ role: "UPPER_COMPANY" }] }), role: "UPPER_COMPANY" }).reasonCode,
  "PROJECT_COMPANY_ROLE_ALREADY_EXISTS",
);

const payload = buildProjectCompanyContactRoleLinkPayload(
  project(),
  candidate(),
  "UPPER_COMPANY",
  PROJECT_COMPANY_CONTACT_ROLE_LINK_DEFAULT_REASON_CODE,
);
assert.deepEqual(Object.keys(payload).sort(), [
  "companyId",
  "confirmationToken",
  "contactId",
  "expectedUpdatedAt",
  "reasonCode",
  "role",
].sort());
assert.equal(payload.companyId, companyId);
assert.equal(payload.contactId, contactId);
assert.equal(payload.role, "UPPER_COMPANY");
assert.equal(payload.reasonCode, "candidate_verified");
assert.equal(payload.expectedUpdatedAt, updatedAt);
assert.equal(
  payload.confirmationToken,
  buildProjectCompanyContactRoleConfirmationToken(projectId, "UPPER_COMPANY", companyId, contactId),
);

for (const forbiddenKey of ["note", "notes", "freeNote", "bodyText", "mailBody", "rawBody", "rawText", "email", "contactEmail", "projectUpdatedAt"]) {
  assert(!Object.prototype.hasOwnProperty.call(payload, forbiddenKey), `payload must not include ${forbiddenKey}`);
}

const helperSource = readProjectFile("lib/project-company-contact-role-link-ui.ts");
const projectPaneSource = readProjectFile("components/ProjectDetailPane.jsx");
const appSource = readProjectFile("app/page.jsx");
const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const projectLinkPanelSource = sectionBetween(projectPaneSource, "function ProjectCompanyContactRoleLinkPanel", "export default function ProjectDetailPane");
const projectLinkHandlerSource = sectionBetween(appSource, "const handleProjectCompanyContactRoleLinked", "const handleAuthenticated");

assert(helperSource.includes("PROJECT_COMPANY_CONTACT_ROLE_VALUES"), "UI helper must use the shared project role constants");
assert(helperSource.includes("PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES"), "UI helper must use the shared reasonCode constants");
assert(helperSource.includes("buildProjectCompanyContactRoleConfirmationToken"), "payload builder must use the shared confirmation token builder");
assert(helperSource.includes("isCompanyContactLinkWriterRole"), "UI gate must use the shared ADMIN/MANAGER writer role policy");
assert(helperSource.includes("isBlockedCompanyLinkTradeStatus"), "UI gate must use the shared company trade-status policy");
assert(helperSource.includes(PROJECT_COMPANY_CONTACT_ROLE_LINK_CONFIRMATION_LABEL), "confirmation checkbox label must stay in the UI helper contract");
assert(projectLinkPanelSource.includes("PROJECT_COMPANY_CONTACT_ROLE_LINK_CONFIRMATION_LABEL"), "confirmation checkbox label must be rendered");
assert(projectLinkPanelSource.includes("method: \"PATCH\""), "confirm action must call PATCH");
assert(projectLinkPanelSource.includes("/company-contact-role"), "confirm action must use the narrow project company/contact role route");
assert(!projectLinkPanelSource.includes('fetch("/api/projects"') && !projectLinkPanelSource.includes("fetch('/api/projects'"), "UI must not call the broad /api/projects PATCH route");
assert(projectLinkPanelSource.includes("buildProjectCompanyContactRoleLinkPayload"), "PATCH body must come from the safe payload builder");
assert(projectLinkPanelSource.includes("PROJECT_COMPANY_CONTACT_ROLE_LINK_ROLE_OPTIONS"), "role options must come from the UI helper");
assert(projectLinkPanelSource.includes("PROJECT_COMPANY_CONTACT_ROLE_LINK_REASON_OPTIONS"), "reason options must come from the UI helper");
assert(projectLinkPanelSource.includes("disabled={!canSubmit}"), "final execution must require role/reason/checkbox gate");
assert(projectLinkPanelSource.includes("onChange={handleRoleChange}"), "role changes must go through the confirmation-reset handler");
assert(projectLinkPanelSource.includes("onChange={handleReasonCodeChange}"), "reasonCode changes must go through the confirmation-reset handler");
assert(
  /const\s+handleRoleChange\s*=\s*\(event\)\s*=>\s*\{[\s\S]*?setSelectedRole\(event\.target\.value\);[\s\S]*?setConfirmed\(false\);[\s\S]*?\}/.test(projectLinkPanelSource),
  "role changes after confirmation must clear confirmed=false"
);
assert(
  /const\s+handleReasonCodeChange\s*=\s*\(event\)\s*=>\s*\{[\s\S]*?setSelectedReasonCode\(event\.target\.value\);[\s\S]*?setConfirmed\(false\);[\s\S]*?\}/.test(projectLinkPanelSource),
  "reasonCode changes after confirmation must clear confirmed=false"
);
assert(projectLinkPanelSource.includes("await onCompanyContactRoleLinked?.(project.dbId, result)"), "success path must delegate reload/reselect");
assert(!/setSelectedProject|companyRoles\s*=|projectCompanyContactRoleLinkUpdatedAt\s*=/.test(projectLinkPanelSource), "link UI must not optimistically mutate project state");
assert(projectLinkHandlerSource.includes("reloadDashboardData()"), "success handler must reload dashboard data");
assert(projectLinkHandlerSource.includes("setSelectedProject(nextSelectedProject)"), "success handler must reselect from reloaded data");
assert(dashboardSource.includes("projectCompanyContactRoleLinkWriteAllowed"), "dashboard must expose the project write guard boolean");
assert(dashboardSource.includes("projectCompanyContactRoleLinkGuard().allowed"), "dashboard must respect the existing project API feature guard");
assert(dashboardSource.includes("projectCompanyContactRoleLinkUpdatedAt"), "dashboard must expose Project.updatedAt for stale-write detection");

console.log("project company/contact role link UI tests passed.");
