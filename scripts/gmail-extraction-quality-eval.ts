import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  classifyMailExtractionQuality,
  extractPersonFromMail,
  extractProjectFromMail,
  type ExtractionPredictedType,
  type MailExtractionSource,
} from "./gmail-extraction";
import {
  inferGmailCompanyCandidateForExtraction,
  type KnownCompanyIdentity,
} from "./gmail-company-candidate";
import { assertNoSensitiveOutput, buildAnonymizedIssueRow } from "./gmail-extraction-quality-report";

type Fixture = {
  id: string;
  category: "PROJECT_INTRO" | "PERSON_INTRO" | "OTHER" | "NEWSLETTER" | "SALES_AD";
  subject: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  knownCompanies?: KnownCompanyIdentity[];
  expectedType: ExtractionPredictedType;
  expectedNeedsReview?: boolean;
  expectedWarnings?: string[];
  expectedReviewReasons?: string[];
  expectedNameConfidence?: string;
  expectedNameSource?: string;
  expectedRoleHeadlineSource?: string;
  expectedCompanyCandidateSource?: string;
  expectedCompanyCandidateConfidence?: string;
  expectedCompanyCandidatePresent?: boolean;
  expectedCompanyCandidateReasonCodes?: string[];
  expectedSkillMaxCount?: number;
  expectedShouldNotCreateReason?: string;
};

type Confusion = Record<ExtractionPredictedType, Record<ExtractionPredictedType, number>>;

const labels: ExtractionPredictedType[] = ["project", "person", "other", "excluded"];

function loadFixtures(): Fixture[] {
  const fixturePath = join(process.cwd(), "tests", "fixtures", "gmail-extraction-quality", "golden.json");
  return JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture[];
}

function categoryToLegacyType(category: Fixture["category"]): ExtractionPredictedType {
  if (category === "PROJECT_INTRO") return "project";
  if (category === "PERSON_INTRO") return "person";
  if (category === "NEWSLETTER" || category === "SALES_AD") return "excluded";
  return "other";
}

function mailFromFixture(fixture: Fixture): MailExtractionSource {
  const category = fixture.category === "PROJECT_INTRO" || fixture.category === "PERSON_INTRO" ? fixture.category : "PROJECT_INTRO";
  return {
    id: fixture.id,
    category,
    externalMessageId: `fixture-${fixture.id}`,
    subject: fixture.subject,
    normalizedSubject: fixture.subject,
    bodyText: fixture.bodyText ?? null,
    bodyHtml: fixture.bodyHtml ?? null,
    normalizedBody: fixture.bodyText ?? null,
    fromEmail: fixture.fromEmail ?? "fixture@example.test",
    fromName: fixture.fromName ?? "Fixture Sender",
    receivedAt: new Date("2026-06-04T00:00:00.000Z"),
  };
}

function emptyConfusion(): Confusion {
  return Object.fromEntries(labels.map((actual) => [actual, Object.fromEntries(labels.map((predicted) => [predicted, 0]))])) as Confusion;
}

function metricForLabel(confusion: Confusion, label: ExtractionPredictedType) {
  const tp = confusion[label][label];
  const fp = labels.reduce((sum, actual) => sum + (actual === label ? 0 : confusion[actual][label]), 0);
  const fn = labels.reduce((sum, predicted) => sum + (predicted === label ? 0 : confusion[label][predicted]), 0);
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
  };
}

function summarizeClassification(fixtures: Fixture[], predictor: (fixture: Fixture) => ExtractionPredictedType) {
  const confusion = emptyConfusion();
  let correct = 0;
  for (const fixture of fixtures) {
    const predicted = predictor(fixture);
    confusion[fixture.expectedType][predicted] += 1;
    if (predicted === fixture.expectedType) correct += 1;
  }

  return {
    correct,
    accuracy: Number((correct / fixtures.length).toFixed(4)),
    project: metricForLabel(confusion, "project"),
    person: metricForLabel(confusion, "person"),
    other: metricForLabel(confusion, "other"),
    excluded: metricForLabel(confusion, "excluded"),
    confusion,
  };
}

function includesAll(actual: string[], expected: string[] | undefined): boolean {
  return (expected ?? []).every((value) => actual.includes(value));
}

function evaluateExtractionFixtures(fixtures: Fixture[]) {
  const failures = [];
  let nameConfidenceExpectedMatch = 0;
  let nameConfidenceExpectedTotal = 0;
  let roleHeadlineExpectedMatch = 0;
  let roleHeadlineExpectedTotal = 0;
  let warningExpectedMatch = 0;
  let warningExpectedTotal = 0;
  let reviewReasonExpectedMatch = 0;
  let reviewReasonExpectedTotal = 0;
  let companyCandidateExpectedMatch = 0;
  let companyCandidateExpectedTotal = 0;
  let skillOverExtractionFailures = 0;

  for (const fixture of fixtures) {
    const mail = mailFromFixture(fixture);
    const quality = classifyMailExtractionQuality(mail);
    const extraction = fixture.expectedType === "person" ? extractPersonFromMail(mail) : extractProjectFromMail(mail);
    const companyCandidate = inferGmailCompanyCandidateForExtraction({
      mail,
      extraction,
      knownCompanies: fixture.knownCompanies,
    });
    const warnings = quality.warnings;
    const reviewReasons = extraction.target === "person" ? extraction.reviewReasons : extraction.reviewReasons;

    if (fixture.expectedWarnings) {
      warningExpectedTotal += 1;
      if (includesAll(warnings, fixture.expectedWarnings) || includesAll(extraction.classificationWarnings, fixture.expectedWarnings)) {
        warningExpectedMatch += 1;
      } else {
        failures.push({ id: fixture.id, kind: "warning", expected: fixture.expectedWarnings, actual: [...warnings, ...extraction.classificationWarnings] });
      }
    }

    if (fixture.expectedReviewReasons) {
      reviewReasonExpectedTotal += 1;
      if (includesAll(reviewReasons, fixture.expectedReviewReasons)) {
        reviewReasonExpectedMatch += 1;
      } else {
        failures.push({ id: fixture.id, kind: "reviewReason", expected: fixture.expectedReviewReasons, actual: reviewReasons });
      }
    }

    if (fixture.expectedNameConfidence && extraction.target === "person") {
      nameConfidenceExpectedTotal += 1;
      if (extraction.nameConfidence === fixture.expectedNameConfidence) {
        nameConfidenceExpectedMatch += 1;
      } else {
        failures.push({ id: fixture.id, kind: "nameConfidence", expected: fixture.expectedNameConfidence, actual: extraction.nameConfidence });
      }
    }

    if (fixture.expectedNameSource && extraction.target === "person" && extraction.nameSource !== fixture.expectedNameSource) {
      failures.push({ id: fixture.id, kind: "nameSource", expected: fixture.expectedNameSource, actual: extraction.nameSource });
    }

    if (fixture.expectedRoleHeadlineSource && extraction.target === "person") {
      roleHeadlineExpectedTotal += 1;
      if (extraction.roleHeadlineSource === fixture.expectedRoleHeadlineSource) {
        roleHeadlineExpectedMatch += 1;
      } else {
        failures.push({ id: fixture.id, kind: "roleHeadlineSource", expected: fixture.expectedRoleHeadlineSource, actual: extraction.roleHeadlineSource });
      }
    }

    if (
      fixture.expectedCompanyCandidateSource ||
      fixture.expectedCompanyCandidateConfidence ||
      fixture.expectedCompanyCandidatePresent !== undefined ||
      fixture.expectedCompanyCandidateReasonCodes
    ) {
      companyCandidateExpectedTotal += 1;
      const candidateMatches =
        (!fixture.expectedCompanyCandidateSource || companyCandidate.source === fixture.expectedCompanyCandidateSource) &&
        (!fixture.expectedCompanyCandidateConfidence || companyCandidate.confidence === fixture.expectedCompanyCandidateConfidence) &&
        (fixture.expectedCompanyCandidatePresent === undefined || Boolean(companyCandidate.candidateName) === fixture.expectedCompanyCandidatePresent) &&
        includesAll(companyCandidate.reasonCodes, fixture.expectedCompanyCandidateReasonCodes);

      if (candidateMatches) {
        companyCandidateExpectedMatch += 1;
      } else {
        failures.push({
          id: fixture.id,
          kind: "companyCandidate",
          expected: {
            source: fixture.expectedCompanyCandidateSource,
            confidence: fixture.expectedCompanyCandidateConfidence,
            present: fixture.expectedCompanyCandidatePresent,
            reasonCodes: fixture.expectedCompanyCandidateReasonCodes,
          },
          actual: {
            source: companyCandidate.source,
            confidence: companyCandidate.confidence,
            present: Boolean(companyCandidate.candidateName),
            reasonCodes: companyCandidate.reasonCodes,
          },
        });
      }
    }

    if (fixture.expectedSkillMaxCount && fixture.expectedType !== "other" && fixture.expectedType !== "excluded") {
      const skillCount = extraction.target === "person"
        ? extraction.skills.length
        : new Set([...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.usedTechnologies]).size;
      if (skillCount > fixture.expectedSkillMaxCount) {
        skillOverExtractionFailures += 1;
        failures.push({ id: fixture.id, kind: "skillMaxCount", expected: fixture.expectedSkillMaxCount, actual: skillCount });
      }
    }

    if (fixture.expectedNeedsReview !== undefined && extraction.needsReview !== fixture.expectedNeedsReview && quality.needsReview !== fixture.expectedNeedsReview) {
      failures.push({ id: fixture.id, kind: "needsReview", expected: fixture.expectedNeedsReview, actual: { extraction: extraction.needsReview, classification: quality.needsReview } });
    }
  }

  return {
    nameConfidenceExpectedMatch: `${nameConfidenceExpectedMatch}/${nameConfidenceExpectedTotal}`,
    roleHeadlineExpectedMatch: `${roleHeadlineExpectedMatch}/${roleHeadlineExpectedTotal}`,
    warningExpectedMatch: `${warningExpectedMatch}/${warningExpectedTotal}`,
    reviewReasonExpectedMatch: `${reviewReasonExpectedMatch}/${reviewReasonExpectedTotal}`,
    companyCandidateExpectedMatch: `${companyCandidateExpectedMatch}/${companyCandidateExpectedTotal}`,
    skillOverExtractionFailures,
    failures,
  };
}

function main(): void {
  const fixtures = loadFixtures();
  assert.equal(fixtures.length >= 50, true, "Expected at least 50 golden fixtures.");

  const baseline = summarizeClassification(fixtures, (fixture) => categoryToLegacyType(fixture.category));
  const current = summarizeClassification(fixtures, (fixture) => classifyMailExtractionQuality(mailFromFixture(fixture)).predictedType);
  const extraction = evaluateExtractionFixtures(fixtures);
  const sampleFailures = extraction.failures.slice(0, 20);
  const highRiskSamples = fixtures
    .map((fixture) => {
      const mail = mailFromFixture(fixture);
      const predicted = classifyMailExtractionQuality(mail).predictedType;
      if (predicted === "project") {
        const extraction = extractProjectFromMail(mail);
        return buildAnonymizedIssueRow({
          id: fixture.id,
          extraction,
          companyCandidate: inferGmailCompanyCandidateForExtraction({ mail, extraction, knownCompanies: fixture.knownCompanies }),
        });
      }
      if (predicted === "person") {
        const extraction = extractPersonFromMail(mail);
        return buildAnonymizedIssueRow({
          id: fixture.id,
          extraction,
          companyCandidate: inferGmailCompanyCandidateForExtraction({ mail, extraction, knownCompanies: fixture.knownCompanies }),
        });
      }
      return null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, 10);

  const output = {
    definitions: {
      classificationCorrect: "Number of fixtures whose expectedType matches the classifier predictedType.",
      failures: "Hard regression assertion failures for expected warnings, reviewReasons, source fields, name confidence, skill limits, or CLI safety checks. Classification mismatches are reported separately in classificationCorrect/confusion metrics.",
    },
    totalFixtures: fixtures.length,
    baseline: {
      classificationCorrect: baseline.correct,
      accuracy: baseline.accuracy,
      projectPrecision: baseline.project.precision,
      projectRecall: baseline.project.recall,
      projectF1: baseline.project.f1,
      personPrecision: baseline.person.precision,
      personRecall: baseline.person.recall,
      personF1: baseline.person.f1,
      otherPrecision: baseline.other.precision,
      otherRecall: baseline.other.recall,
      otherF1: baseline.other.f1,
      excludedPrecision: baseline.excluded.precision,
      excludedRecall: baseline.excluded.recall,
      excludedF1: baseline.excluded.f1,
    },
    current: {
      classificationCorrect: current.correct,
      accuracy: current.accuracy,
      projectPrecision: current.project.precision,
      projectRecall: current.project.recall,
      projectF1: current.project.f1,
      personPrecision: current.person.precision,
      personRecall: current.person.recall,
      personF1: current.person.f1,
      otherPrecision: current.other.precision,
      otherRecall: current.other.recall,
      otherF1: current.other.f1,
      excludedPrecision: current.excluded.precision,
      excludedRecall: current.excluded.recall,
      excludedF1: current.excluded.f1,
    },
    extraction,
    sampleFailures,
    highRiskSamples,
  };
  const serialized = JSON.stringify(output, null, 2);
  assertNoSensitiveOutput(serialized);
  console.log(serialized);

  if (sampleFailures.length > 0) {
    process.exitCode = 1;
  }
}

main();
