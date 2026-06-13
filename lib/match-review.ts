import {
  assertNoSensitiveMatchOutput,
  buildMatchCandidates,
  loadMatchDryRunInputs,
} from "../scripts/match-dry-run";
import type {
  MatchCandidate,
  MatchDryRunArgs,
  MatchDryRunInputs,
  MatchDryRunReport,
} from "../scripts/match-dry-run";

export const MATCH_REVIEW_DEFAULT_LIMIT = 20;
export const MATCH_REVIEW_MAX_LIMIT = 100;
export const MATCH_REVIEW_DEFAULT_SCAN_LIMIT = 50;
export const MATCH_REVIEW_MAX_SCAN_LIMIT = 500;

const SCORE_BANDS = new Set(["HIGH", "MEDIUM", "LOW", "REVIEW"]);
const COMPATIBILITY_STATES = new Set(["match", "mismatch", "unknown"]);
const SORT_OPTIONS = new Set(["score-desc", "score-asc", "review-first", "newest"]);
const MUTATION_LIKE_PARAMS = [
  "apply",
  "create",
  "createProposal",
  "draftEmail",
  "email",
  "proposal",
  "save",
  "sendEmail",
  "write",
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ScoreBand = MatchCandidate["scoreBand"];
type Compatibility = MatchCandidate["priceCompatibility"];
type MatchDataSource = MatchDryRunReport["summary"]["dataSource"];

export type MatchReviewInputLoader = (args: MatchDryRunArgs) => Promise<{
  inputs: MatchDryRunInputs;
  dataSource: MatchDataSource;
}>;

export type MatchReviewFilters = {
  scoreBand?: ScoreBand;
  minScore: number;
  hasReviewFlag?: boolean;
  rateCompatibility?: Compatibility;
  dateCompatibility?: Compatibility;
  locationCompatibility?: Compatibility;
  skillOverlapPresent?: boolean;
  projectIdShort?: string;
  personIdShort?: string;
};

export type MatchReviewQuery = {
  page: number;
  limit: number;
  maxLimit: number;
  skip: number;
  scanLimit: number;
  sort: "score-desc" | "score-asc" | "review-first" | "newest";
  filters: MatchReviewFilters;
  dryRunArgs: MatchDryRunArgs;
};

export class MatchReviewRequestError extends Error {
  status = 400;
}

function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
}

function numberParam(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function enumParam<T extends string>(params: URLSearchParams, key: string, allowed: Set<string>) {
  const value = params.get(key)?.trim();
  if (!value) return undefined;
  const normalized = key === "scoreBand" ? value.toUpperCase() : value.toLowerCase();
  return allowed.has(normalized) ? normalized as T : undefined;
}

function booleanParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim().toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return undefined;
}

function uuidParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  if (!value) return undefined;
  return UUID_PATTERN.test(value) ? value : undefined;
}

function shortId(value: string | undefined) {
  return value ? value.slice(0, 8) : undefined;
}

function parseSort(params: URLSearchParams): MatchReviewQuery["sort"] {
  const value = params.get("sort")?.trim().toLowerCase() || "score-desc";
  return SORT_OPTIONS.has(value) ? value as MatchReviewQuery["sort"] : "score-desc";
}

function assertNoMutationLikeParams(params: URLSearchParams) {
  for (const key of MUTATION_LIKE_PARAMS) {
    if (params.has(key)) {
      throw new MatchReviewRequestError("Matching review API is read-only and does not accept mutation-like parameters.");
    }
  }
}

export function parseMatchReviewQuery(params: URLSearchParams): MatchReviewQuery {
  assertNoMutationLikeParams(params);

  const page = positiveInteger(params.get("page"), 1);
  const requestedLimit = positiveInteger(params.get("limit") ?? params.get("take"), MATCH_REVIEW_DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MATCH_REVIEW_MAX_LIMIT);
  const scanLimit = Math.min(positiveInteger(params.get("scanLimit"), MATCH_REVIEW_DEFAULT_SCAN_LIMIT), MATCH_REVIEW_MAX_SCAN_LIMIT);
  const minScore = numberParam(params.get("minScore") ?? params.get("min-score"), 0, 0, 100);
  const projectId = uuidParam(params, "projectId");
  const personId = uuidParam(params, "personId");

  const filters: MatchReviewFilters = {
    scoreBand: enumParam<ScoreBand>(params, "scoreBand", SCORE_BANDS),
    minScore,
    hasReviewFlag: booleanParam(params, "hasReviewFlag"),
    rateCompatibility: enumParam<Compatibility>(params, "rateCompatibility", COMPATIBILITY_STATES),
    dateCompatibility: enumParam<Compatibility>(params, "dateCompatibility", COMPATIBILITY_STATES),
    locationCompatibility: enumParam<Compatibility>(params, "locationCompatibility", COMPATIBILITY_STATES),
    skillOverlapPresent: booleanParam(params, "skillOverlapPresent"),
    projectIdShort: shortId(projectId),
    personIdShort: shortId(personId),
  };

  return {
    page,
    limit,
    maxLimit: MATCH_REVIEW_MAX_LIMIT,
    skip: (page - 1) * limit,
    scanLimit,
    sort: parseSort(params),
    filters,
    dryRunArgs: {
      limit: scanLimit,
      minScore,
      mode: "all",
      projectId,
      personId,
    },
  };
}

function hasReviewFlag(candidate: MatchCandidate) {
  return candidate.scoreBand === "REVIEW" || candidate.missingFieldCodes.length > 0;
}

function roleCompatible(candidate: MatchCandidate) {
  return candidate.reasonCodes.includes("MATCH_ROLE_COMPATIBLE");
}

function matchesFilters(candidate: MatchCandidate, filters: MatchReviewFilters) {
  if (filters.scoreBand && candidate.scoreBand !== filters.scoreBand) return false;
  if (filters.hasReviewFlag !== undefined && hasReviewFlag(candidate) !== filters.hasReviewFlag) return false;
  if (filters.rateCompatibility && candidate.priceCompatibility !== filters.rateCompatibility) return false;
  if (filters.dateCompatibility && candidate.dateCompatibility !== filters.dateCompatibility) return false;
  if (filters.locationCompatibility && candidate.locationCompatibility !== filters.locationCompatibility) return false;
  if (filters.skillOverlapPresent !== undefined && (candidate.skillOverlapCount > 0) !== filters.skillOverlapPresent) return false;
  return true;
}

function compareCandidateIds(left: MatchCandidate, right: MatchCandidate) {
  if (left.projectShortId !== right.projectShortId) return left.projectShortId.localeCompare(right.projectShortId);
  return left.personShortId.localeCompare(right.personShortId);
}

function sortCandidates(candidates: MatchCandidate[], sort: MatchReviewQuery["sort"]) {
  candidates.sort((left, right) => {
    if (sort === "score-asc" && left.score !== right.score) return left.score - right.score;
    if (sort === "review-first" && hasReviewFlag(left) !== hasReviewFlag(right)) return hasReviewFlag(left) ? -1 : 1;
    if (sort === "newest") return -compareCandidateIds(left, right);
    if (right.score !== left.score) return right.score - left.score;
    return compareCandidateIds(left, right);
  });
}

function emptyDistribution() {
  return { HIGH: 0, MEDIUM: 0, LOW: 0, REVIEW: 0 } as Record<ScoreBand, number>;
}

function distributionFor(candidates: MatchCandidate[]) {
  const distribution = emptyDistribution();
  for (const candidate of candidates) distribution[candidate.scoreBand] += 1;
  return distribution;
}

function totalPages(total: number, limit: number) {
  return Math.max(1, Math.ceil(total / limit));
}

function safeCandidate(candidate: MatchCandidate) {
  const reviewFlag = hasReviewFlag(candidate);
  const warningCount = candidate.missingFieldCodes.length;
  const reviewReasonCount = candidate.reasonCodes.length;
  const attention = reviewFlag
    ? "NEEDS_REVIEW"
    : candidate.scoreBand === "HIGH"
      ? "HIGH_SCORE"
      : warningCount > 0
        ? "WARNING"
        : "STANDARD";

  return {
    projectShortId: candidate.projectShortId,
    personShortId: candidate.personShortId,
    score: candidate.score,
    scoreBand: candidate.scoreBand,
    attention,
    hasReviewFlag: reviewFlag,
    warningCount,
    reviewReasonCount,
    reviewFlags: reviewFlag ? candidate.missingFieldCodes : [],
    reasonCodes: candidate.reasonCodes,
    missingFieldCodes: candidate.missingFieldCodes,
    skillOverlapCount: candidate.skillOverlapCount,
    requiredSkillOverlapCount: candidate.requiredSkillOverlapCount,
    niceToHaveSkillOverlapCount: candidate.niceToHaveSkillOverlapCount,
    technologyOverlapCount: candidate.technologyOverlapCount,
    rateCompatibility: candidate.priceCompatibility,
    dateCompatibility: candidate.dateCompatibility,
    locationCompatibility: candidate.locationCompatibility,
    roleCompatible: roleCompatible(candidate),
    scoreBreakdown: {
      requiredSkillOverlapCount: candidate.requiredSkillOverlapCount,
      niceToHaveSkillOverlapCount: candidate.niceToHaveSkillOverlapCount,
      technologyOverlapCount: candidate.technologyOverlapCount,
      rateCompatibility: candidate.priceCompatibility,
      dateCompatibility: candidate.dateCompatibility,
      locationCompatibility: candidate.locationCompatibility,
      roleCompatible: roleCompatible(candidate),
      scoreBand: candidate.scoreBand,
    },
    redactedPreview: {
      project: { shortId: candidate.projectShortId },
      person: { shortId: candidate.personShortId },
      match: { score: candidate.score, scoreBand: candidate.scoreBand, hasReviewFlag: reviewFlag },
    },
  };
}

export async function buildMatchReviewResponse(
  params: URLSearchParams,
  loadInputs: MatchReviewInputLoader = loadMatchDryRunInputs,
) {
  const query = parseMatchReviewQuery(params);
  const loaded = await loadInputs(query.dryRunArgs);
  const candidateResult = buildMatchCandidates({
    args: query.dryRunArgs,
    ...loaded.inputs,
  });

  const filteredCandidates = candidateResult.candidates.filter((candidate) => matchesFilters(candidate, query.filters));
  sortCandidates(filteredCandidates, query.sort);

  const pageItems = filteredCandidates.slice(query.skip, query.skip + query.limit).map(safeCandidate);
  const result = {
    summary: {
      mode: "matching-review-dry-run",
      readOnly: true,
      dataSource: loaded.dataSource,
      scannedProjects: loaded.inputs.projects.length,
      scannedPersons: loaded.inputs.persons.length,
      candidatePairs: loaded.inputs.projects.length * loaded.inputs.persons.length,
      totalCandidates: filteredCandidates.length,
      displayed: pageItems.length,
      page: query.page,
      limit: query.limit,
      maxLimit: query.maxLimit,
      scanLimit: query.scanLimit,
      minScore: query.filters.minScore,
      scoreDistribution: candidateResult.scoreDistribution,
      filteredScoreDistribution: distributionFor(filteredCandidates),
      warningCounts: candidateResult.warningCounts,
      reviewReasonCounts: candidateResult.reviewReasonCounts,
      piiSafe: true,
      secretsRedacted: true,
    },
    filters: query.filters,
    sort: query.sort,
    totalPages: totalPages(filteredCandidates.length, query.limit),
    items: pageItems,
    notes: [
      "Read-only deterministic matching review.",
      "No proposals, suggestions, drafts, messages, external APIs, or AI APIs are invoked.",
      loaded.dataSource === "synthetic-fixture-no-db" ? "Synthetic fallback data is in use because database inputs are unavailable." : "Database inputs were read without mutation.",
    ],
  };

  assertNoSensitiveMatchReviewOutput(JSON.stringify(result));
  return result;
}

export function assertNoSensitiveMatchReviewOutput(output: string) {
  assertNoSensitiveMatchOutput(output);
  const forbiddenPatterns = [
    /\b(?:projectId|personId|projectTitle|personTitle|careerSummary|workDescription|businessDescription|skillName)\b/i,
    /\b(?:rawText|fullText|companyName|personName|email|fullSubject|fullBody|bodyText)\b/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(output)) throw new Error("Sensitive match review output detected");
  }
}
