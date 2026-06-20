import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildPersonOwnerLinkPayload,
  getPersonOwnerLinkGate,
  PERSON_OWNER_LINK_CONFIRMATION_LABEL,
  PERSON_OWNER_LINK_INTENT
} from "../lib/person-owner-link-ui";

const rootDir = process.cwd();
const personId = "11111111-1111-4111-8111-111111111111";
const companyId = "22222222-2222-4222-8222-222222222222";
const contactId = "33333333-3333-4333-8333-333333333333";

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

function person(overrides = {}) {
  return {
    dbId: personId,
    ownerCompanyId: null,
    ownerContactId: null,
    ownerLinkUpdatedAt: "2026-06-20T01:02:03.000Z",
    needsReview: false,
    reviewReasons: [],
    ownerLinkReviewStatus: "APPROVED",
    nameConfidence: "HIGH",
    ...overrides
  };
}

function candidate(overrides = {}) {
  return {
    score: 86,
    company: {
      id: companyId,
      name: "Safe Partner",
      tradeStatus: "OK"
    },
    contact: {
      id: contactId,
      name: "Safe Owner",
      companyId,
      isActive: true
    },
    ...overrides
  };
}

function gate(overrides = {}) {
  return getPersonOwnerLinkGate({
    currentUserRole: "ADMIN",
    personOwnerLinkWriteAllowed: true,
    person: person(),
    candidate: candidate(),
    ...overrides
  });
}

assert.equal(gate({ currentUserRole: "SALES" }).visible, false, "SALES must not see the link action");
assert.equal(gate({ currentUserRole: "ADMIN" }).enabled, true, "ADMIN can link a safe existing candidate");
assert.equal(gate({ currentUserRole: "MANAGER" }).enabled, true, "MANAGER can link a safe existing candidate");
assert.equal(gate({ personOwnerLinkWriteAllowed: false }).visible, false, "server write flag must be required");

assert.equal(gate({ person: person({ ownerCompanyId: companyId }) }).reasonCode, "OWNER_LINK_ALREADY_PRESENT");
assert.equal(gate({ candidate: candidate({ contact: { ...candidate().contact, isActive: false } }) }).reasonCode, "CONTACT_INACTIVE");
assert.equal(gate({ candidate: candidate({ company: { ...candidate().company, tradeStatus: "NG" } }) }).reasonCode, "COMPANY_STATUS_BLOCKED");
assert.equal(gate({ candidate: candidate({ company: { ...candidate().company, tradeStatus: "NEEDS_REVIEW" } }) }).reasonCode, "COMPANY_STATUS_BLOCKED");
assert.equal(gate({ candidate: candidate({ company: { ...candidate().company, tradeStatus: "SUSPENDED" } }) }).reasonCode, "COMPANY_STATUS_BLOCKED");
assert.equal(
  gate({ candidate: candidate({ contact: { ...candidate().contact, companyId: "44444444-4444-4444-8444-444444444444" } }) }).reasonCode,
  "CONTACT_COMPANY_MISMATCH"
);
assert.equal(gate({ person: person({ needsReview: true }) }).reasonCode, "PERSON_NEEDS_REVIEW");
assert.equal(gate({ person: person({ reviewReasons: ["name_mismatch"] }) }).reasonCode, "PERSON_REVIEW_REASONS_PRESENT");
assert.equal(gate({ person: person({ ownerLinkReviewStatus: "NEEDS_REVIEW" }) }).reasonCode, "PERSON_REVIEW_STATUS_BLOCKED");
assert.equal(gate({ person: person({ nameConfidence: "LOW" }) }).reasonCode, "PERSON_CONFIDENCE_LOW");
assert.equal(gate({ candidate: candidate({ score: 46 }) }).reasonCode, "CANDIDATE_SCORE_LOW");

const payload = buildPersonOwnerLinkPayload(person(), candidate());
assert.deepEqual(Object.keys(payload).sort(), [
  "companyId",
  "confirmCompanyContactLink",
  "contactId",
  "expectedOwnerCompanyId",
  "expectedOwnerContactId",
  "expectedUpdatedAt",
  "intent"
].sort());
assert.equal(payload.intent, PERSON_OWNER_LINK_INTENT);
assert.equal(payload.confirmCompanyContactLink, true);
assert.equal(payload.companyId, companyId);
assert.equal(payload.contactId, contactId);
assert.equal(payload.expectedOwnerCompanyId, null);
assert.equal(payload.expectedOwnerContactId, null);

for (const forbiddenKey of ["note", "notes", "freeNote", "bodyText", "mailBody", "rawBody", "rawText", "email", "contactEmail"]) {
  assert(!Object.prototype.hasOwnProperty.call(payload, forbiddenKey), `payload must not include ${forbiddenKey}`);
}

const helperSource = readProjectFile("lib/person-owner-link-ui.ts");
const paneSource = readProjectFile("components/PersonDetailPane.jsx");
const appSource = readProjectFile("app/page.jsx");
const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const packageSource = readProjectFile("package.json");
const ownerLinkPanelSource = sectionBetween(paneSource, "function PersonOwnerLinkPanel", "export default function PersonDetailPane");
const ownerLinkHandlerSource = sectionBetween(appSource, "const handlePersonOwnerLinkLinked", "const handleAuthenticated");

assert(helperSource.includes("ADMIN") && helperSource.includes("MANAGER"), "UI gate must explicitly allow ADMIN/MANAGER");
assert(!helperSource.includes("canEditEntities"), "UI gate must not reuse canEditEntities");
assert(ownerLinkPanelSource.includes("method: \"PATCH\""), "confirm action must call PATCH");
assert(ownerLinkPanelSource.includes("buildPersonOwnerLinkPayload"), "PATCH body must come from the safe payload builder");
assert(helperSource.includes(PERSON_OWNER_LINK_CONFIRMATION_LABEL), "confirmation checkbox label must stay in the UI helper contract");
assert(ownerLinkPanelSource.includes("PERSON_OWNER_LINK_CONFIRMATION_LABEL"), "confirmation checkbox label must be rendered");
assert(ownerLinkPanelSource.includes("await onOwnerLinkLinked?.(person.dbId, result)"), "success path must delegate reload/reselect");
assert(!ownerLinkPanelSource.includes("canEditEntities") && !ownerLinkPanelSource.includes("canEdit"), "owner link UI must not gate on canEditEntities");
assert(!/setSelectedPerson|setPerson|ownerCompanyId\s*=|ownerContactId\s*=/.test(ownerLinkPanelSource), "owner link UI must not optimistically mutate person owner state");
assert(ownerLinkHandlerSource.includes("reloadDashboardData()"), "success handler must reload dashboard data");
assert(ownerLinkHandlerSource.includes("setSelectedPerson(nextSelectedPerson)"), "success handler must reselect from reloaded data");

for (const requiredDashboardText of [
  "personOwnerLinkWriteAllowed",
  "ownerLinkUpdatedAt",
  "ownerCompanyId",
  "ownerContactId",
  "ownerLinkReviewStatus",
  "companyId: true"
]) {
  assert(dashboardSource.includes(requiredDashboardText), `dashboard payload must include ${requiredDashboardText}`);
}

assert(packageSource.includes("test:person-owner-link-ui"), "package.json must expose the person owner link UI test");

console.log("person owner link UI tests passed.");
