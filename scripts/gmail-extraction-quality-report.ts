import { createHash } from "node:crypto";

import {
  classificationScoreBucket,
  type ClassificationScoreSummary,
  type MailExtraction,
  type PersonExtraction,
  type ProjectExtraction,
} from "./gmail-extraction";
import { anonymizedCompanyCandidate, type GmailCompanyCandidate } from "./gmail-company-candidate";

export type QualityIssueRow = {
  sampleId: string;
  target: string;
  predictedType: string;
  projectScore: number;
  personScore: number;
  conflictMargin: number;
  reviewReasons: string[];
  classificationWarnings: string[];
  featureFlags: string[];
  nameConfidence?: string;
  nameSource?: string;
  roleHeadlineSource?: string;
  skillCount: number;
  skillOverExtraction: boolean;
  companyCandidate?: ReturnType<typeof anonymizedCompanyCandidate>;
};

export function shortHash(value: string | null | undefined): string {
  return createHash("sha256").update(value ?? "missing").digest("hex").slice(0, 12);
}

export function incrementCounter(target: Record<string, number>, key: string | null | undefined, amount = 1): void {
  const safeKey = key || "none";
  target[safeKey] = (target[safeKey] ?? 0) + amount;
}

export function incrementMany(target: Record<string, number>, keys: Array<string | null | undefined>): void {
  for (const key of keys) incrementCounter(target, key);
}

export function skillCountBucket(count: number): string {
  if (count <= 0) return "0";
  if (count <= 3) return "1-3";
  if (count <= 6) return "4-6";
  if (count <= 10) return "7-10";
  if (count <= 15) return "11-15";
  return "16+";
}

export function qualityWarnings(extraction: MailExtraction): string[] {
  return "classificationWarnings" in extraction ? extraction.classificationWarnings : [];
}

export function qualityReviewReasons(extraction: MailExtraction): string[] {
  if (extraction.target === "person") return extraction.reviewReasons;
  return extraction.reviewReasons;
}

export function qualitySkillCount(extraction: MailExtraction): number {
  if (extraction.target === "person") return extraction.skills.length;
  return new Set([...extraction.requiredSkills, ...extraction.preferredSkills, ...extraction.usedTechnologies]).size;
}

export function qualitySkillOverExtraction(extraction: MailExtraction): boolean {
  return extraction.target === "person" ? extraction.skillOverExtraction : extraction.skillOverExtraction;
}

export function qualityScoreSummary(extraction: MailExtraction): ClassificationScoreSummary {
  return extraction.classificationScoreSummary;
}

export function buildAnonymizedIssueRow(params: {
  id: string;
  extraction: MailExtraction;
  issueCodes?: string[];
  companyCandidate?: GmailCompanyCandidate;
}): QualityIssueRow {
  const { extraction } = params;
  const score = qualityScoreSummary(extraction);
  const reviewReasons = params.issueCodes ?? qualityReviewReasons(extraction);
  const base = {
    sampleId: shortHash(params.id),
    target: extraction.target,
    predictedType: score.predictedType,
    projectScore: score.projectScore,
    personScore: score.personScore,
    conflictMargin: score.conflictMargin,
    reviewReasons,
    classificationWarnings: qualityWarnings(extraction),
    featureFlags: score.featureFlags,
    skillCount: qualitySkillCount(extraction),
    skillOverExtraction: qualitySkillOverExtraction(extraction),
    companyCandidate: params.companyCandidate ? anonymizedCompanyCandidate(params.companyCandidate) : undefined,
  };

  if (extraction.target === "person") {
    const person = extraction as PersonExtraction;
    return {
      ...base,
      nameConfidence: person.nameConfidence,
      nameSource: person.nameSource,
      roleHeadlineSource: person.roleHeadlineSource,
    };
  }

  return base;
}

export function isHighRiskExtraction(extraction: MailExtraction, extraReasons: string[] = []): boolean {
  const score = qualityScoreSummary(extraction);
  const reasons = new Set([...qualityReviewReasons(extraction), ...qualityWarnings(extraction), ...extraReasons, ...score.warnings]);
  return (
    extraction.needsReview ||
    score.needsReview ||
    score.predictedType === "other" ||
    score.predictedType === "excluded" ||
    score.featureFlags.includes("classification_conflict") ||
    score.subjectOnlyFallback ||
    qualitySkillOverExtraction(extraction) ||
    Array.from(reasons).some((reason) => {
      return /LOW_CONFIDENCE|SUBJECT_ONLY|CONFLICT|OVER_EXTRACTION|MISSING|DUPLICATE|EXISTING_ENTITY|REJECTED/.test(reason);
    })
  );
}

export function redactionLeakPatterns(): RegExp[] {
  return [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /postgres(?:ql)?:\/\/\S+/i,
    /mysql:\/\/\S+/i,
    /sqlserver:\/\/\S+/i,
    /(?:token|secret|password|api[_-]?key)=\S+/i,
    /https?:\/\/\S{20,}/i,
  ];
}

export function assertNoSensitiveOutput(text: string): void {
  const matched = redactionLeakPatterns().find((pattern) => pattern.test(text));
  if (matched) {
    throw new Error(`Sensitive output pattern detected: ${matched}`);
  }
}

export function scoreBucketKey(score: number): string {
  return classificationScoreBucket(score);
}

export function projectExtractionReasons(extraction: ProjectExtraction): string[] {
  return extraction.reviewReasons;
}
