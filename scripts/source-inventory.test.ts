import assert from "node:assert/strict";

import {
  assertNoSensitiveInventoryOutput,
  buildSourceInventoryReport,
  parseSourceInventoryArgs,
} from "./source-inventory";

assert.deepEqual(parseSourceInventoryArgs(["node", "source-inventory", "--limit=500"]), { limit: 500 });

assert.throws(
  () => parseSourceInventoryArgs(["node", "source-inventory"]),
  /Missing required --limit/,
);

assert.throws(
  () => parseSourceInventoryArgs(["node", "source-inventory", "--limit=500", "--apply"]),
  /does not accept --apply/,
);

assert.throws(
  () => parseSourceInventoryArgs(["node", "source-inventory", "--limit=5001"]),
  /must be <= 5000/,
);

const report = buildSourceInventoryReport({
  limit: 500,
  sourceMailsTotal: 100,
  sourceMailsByProvider: { GMAIL: 90, OUTLOOK: 10 },
  sourceMailsByClassification: { PERSON_INTRO: 40, PROJECT_INTRO: 60 },
  extractionResultsTotal: 80,
  extractionResultsByTargetType: { PERSON: 30, PROJECT: 50 },
  extractionResultsByExtractionType: { PERSON_EXTRACTION: 30, PROJECT_EXTRACTION: 50 },
  extractionResultsByReviewStatus: { NEEDS_REVIEW: 20, PENDING: 60 },
  mailEntityLinksTotal: 70,
  mailEntityLinksByEntityType: { PERSON: 20, PROJECT: 50 },
  mailEntityLinksByLinkType: { EXTRACTED: 40, RELATED: 30 },
  projectsTotal: 55,
  projectsWithSourceMailId: 50,
  projectsWithoutSourceMailId: 5,
  projectsGmailDerived: 48,
  personsTotal: 45,
  personsWithSourceMailId: 40,
  personsWithoutSourceMailId: 5,
  personsGmailDerived: 39,
  mailsWithAnyEntityLink: 65,
  mailsWithExtractedEntityLink: 40,
  mailsWithExtractionTarget: 60,
  projectSourceRelationshipSample: {
    scanned: 50,
    withSourceMailId: 50,
    withAnyMailEntityLink: 45,
    withSourceLink: 2,
    withExtractedLink: 43,
    sourceMailIdWithoutAnyLink: 5,
    sampleLimit: 500,
  },
  personSourceRelationshipSample: {
    scanned: 40,
    withSourceMailId: 40,
    withAnyMailEntityLink: 30,
    withSourceLink: 1,
    withExtractedLink: 29,
    sourceMailIdWithoutAnyLink: 10,
    sampleLimit: 500,
  },
  orphanLikeCounts: {
    projectsWithMissingSourceMail: 0,
    personsWithMissingSourceMail: 0,
  },
});

assert.equal(report.summary.mode, "source-inventory");
assert.equal(report.summary.readOnly, true);
assert.equal(report.totals.sourceMails, 100);
assert.equal(report.entitySourceCoverage.projects.withSourceMailId, 50);
assert.equal(report.entitySourceCoverage.persons.gmailDerived, 39);
assert.equal(report.trackingGaps.sourceMailIdWithoutAnyLinkInSample.projects, 5);
assert.equal(report.trackingGaps.duplicateOrRelatedMailCandidateSignal.relatedMailLinks, 30);
assert.ok(report.recommendedNextSteps.some((step) => step.includes("CSV import dry-run")));

const serialized = JSON.stringify(report);
assertNoSensitiveInventoryOutput(serialized);
assert.equal(serialized.includes("\"subject\":"), false);
assert.equal(serialized.includes("bodyText"), false);
assert.equal(serialized.includes("sample@example.test"), false);

assert.throws(
  () => assertNoSensitiveInventoryOutput(JSON.stringify({ email: "sample@example.test" })),
  /Sensitive source inventory output/,
);

assert.throws(
  () => assertNoSensitiveInventoryOutput(JSON.stringify({ connection: "postgres" + "ql://user:pass@example/db" })),
  /Sensitive source inventory output/,
);

assert.throws(
  () => assertNoSensitiveInventoryOutput(JSON.stringify({ subject: "full subject must not appear" })),
  /Sensitive source inventory output/,
);

console.log("source inventory tests passed");
