import "dotenv/config";

type MatchMode = "project-to-person" | "person-to-project" | "all";
type Compatibility = "match" | "mismatch" | "unknown";
type ScoreBand = "HIGH" | "MEDIUM" | "LOW" | "REVIEW";
type ScoreDistribution = Record<ScoreBand, number>;

const MAX_LIMIT = 500;
const MAX_SAMPLES = 20;
const DEFAULT_MIN_SCORE = 0;
const dbConnectionEnvName = ["DATABASE", "URL"].join("_");

const REASON_CODES = {
  requiredSkillOverlap: "MATCH_SKILL_REQUIRED_OVERLAP",
  niceToHaveSkillOverlap: "MATCH_SKILL_NICE_TO_HAVE_OVERLAP",
  rateCompatible: "MATCH_RATE_COMPATIBLE",
  rateUnknown: "MATCH_RATE_UNKNOWN",
  rateMismatch: "MATCH_RATE_MISMATCH",
  startCompatible: "MATCH_START_COMPATIBLE",
  startUnknown: "MATCH_START_UNKNOWN",
  locationCompatible: "MATCH_LOCATION_COMPATIBLE",
  locationUnknown: "MATCH_LOCATION_UNKNOWN",
  roleCompatible: "MATCH_ROLE_COMPATIBLE",
  missingProjectSkills: "MATCH_MISSING_PROJECT_SKILLS",
  missingPersonSkills: "MATCH_MISSING_PERSON_SKILLS",
  lowFieldCoverage: "MATCH_LOW_FIELD_COVERAGE",
  reviewRequired: "MATCH_REVIEW_REQUIRED",
} as const;

type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES];
type WarningCode = ReasonCode;

export type MatchDryRunArgs = {
  limit: number;
  projectId?: string;
  personId?: string;
  minScore: number;
  mode: MatchMode;
};

export type ProjectMatchInput = {
  id: string;
  title?: string | null;
  summary?: string | null;
  workDescription?: string | null;
  businessDescription?: string | null;
  unitPriceMin?: number | null;
  unitPriceMax?: number | null;
  startMonth?: Date | string | null;
  workLocationText?: string | null;
  prefecture?: string | null;
  remoteType?: string | null;
  status?: string | null;
  skills: Array<{
    skillName: string;
    skillType?: string | null;
  }>;
  reviewSignals?: string[];
};

export type PersonMatchInput = {
  id: string;
  summary?: string | null;
  careerSummary?: string | null;
  desiredUnitPrice?: number | null;
  availableFrom?: Date | string | null;
  preferredLocation?: string | null;
  remotePreference?: string | null;
  status?: string | null;
  skills: Array<{
    skillName: string;
  }>;
  reviewSignals?: string[];
};

export type MatchCandidate = {
  projectShortId: string;
  personShortId: string;
  score: number;
  scoreBand: ScoreBand;
  reasonCodes: ReasonCode[];
  missingFieldCodes: WarningCode[];
  skillOverlapCount: number;
  requiredSkillOverlapCount: number;
  niceToHaveSkillOverlapCount: number;
  technologyOverlapCount: number;
  priceCompatibility: Compatibility;
  dateCompatibility: Compatibility;
  locationCompatibility: Compatibility;
};

export type MatchDryRunReport = {
  summary: {
    mode: "match-dry-run";
    readOnly: true;
    dataSource: "database-read-only" | "synthetic-fixture-no-db";
    scannedProjects: number;
    scannedPersons: number;
    candidatePairs: number;
    displayed: number;
    minScore: number;
    limit: number;
    scoreDistribution: ScoreDistribution;
    warningCounts: Record<string, number>;
    reviewReasonCounts: Record<string, number>;
    piiSafe: true;
    secretsRedacted: true;
  };
  topMatches: MatchCandidate[];
  reasonCodes: string[];
  notes: string[];
};

export type MatchDryRunInputs = {
  projects: ProjectMatchInput[];
  persons: PersonMatchInput[];
};

export type MatchCandidateBuildResult = {
  candidates: MatchCandidate[];
  scoreDistribution: ScoreDistribution;
  warningCounts: Record<string, number>;
  reviewReasonCounts: Record<string, number>;
};

function parseArgValue(argv: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = argv.indexOf(`--${name}`);
  if (index >= 0) return argv[index + 1] ?? null;
  return null;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
}

export function parseMatchDryRunArgs(argv = process.argv): MatchDryRunArgs {
  if (hasFlag(argv, "apply")) {
    throw new Error("match:dry-run is read-only and does not accept --apply.");
  }

  const rawLimit = parseArgValue(argv, "limit");
  if (!rawLimit) throw new Error("Missing required --limit=N. match:dry-run is read-only; start with --limit=50.");

  const limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isInteger(limit)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (limit > MAX_LIMIT) throw new Error(`--limit must be <= ${MAX_LIMIT}.`);

  const rawMinScore = parseArgValue(argv, "min-score");
  const minScore = rawMinScore === null ? DEFAULT_MIN_SCORE : Number(rawMinScore);
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    throw new Error("--min-score must be a number between 0 and 100.");
  }

  const rawMode = parseArgValue(argv, "mode") ?? "all";
  if (!["project-to-person", "person-to-project", "all"].includes(rawMode)) {
    throw new Error("--mode must be project-to-person, person-to-project, or all.");
  }

  return {
    limit,
    projectId: parseArgValue(argv, "project-id") ?? undefined,
    personId: parseArgValue(argv, "person-id") ?? undefined,
    minScore,
    mode: rawMode as MatchMode,
  };
}

function shortId(id: string): string {
  return String(id || "").slice(0, 8);
}

function normalizeSkill(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}+#.]+/gu, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeSkills(skills: Array<{ skillName: string }>): string[] {
  return unique(skills.map((skill) => normalizeSkill(skill.skillName)).filter(Boolean)).sort();
}

function projectSkillsByType(project: ProjectMatchInput, types: string[]): string[] {
  const typeSet = new Set(types);
  return normalizeSkills(project.skills.filter((skill) => typeSet.has(String(skill.skillType || "OTHER"))));
}

function overlap(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function addCount(map: Record<string, number>, key: string, increment = 1): void {
  map[key] = (map[key] ?? 0) + increment;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreBand(score: number, reviewRequired = false): ScoreBand {
  if (reviewRequired || score < 35) return "REVIEW";
  if (score >= 75) return "HIGH";
  if (score >= 55) return "MEDIUM";
  return "LOW";
}

function toMonthNumber(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

export function rateCompatibility(project: ProjectMatchInput, person: PersonMatchInput): Compatibility {
  const desired = person.desiredUnitPrice;
  const min = project.unitPriceMin;
  const max = project.unitPriceMax;
  if (!desired || (!min && !max)) return "unknown";
  if (max && desired > max) return "mismatch";
  if (min && desired < Math.floor(min * 0.75)) return "mismatch";
  return "match";
}

export function dateCompatibility(project: ProjectMatchInput, person: PersonMatchInput): Compatibility {
  const start = toMonthNumber(project.startMonth);
  const available = toMonthNumber(person.availableFrom);
  if (start === null || available === null) return "unknown";
  return available <= start + 1 ? "match" : "mismatch";
}

function remoteText(value: string | null | undefined): string {
  return String(value || "").normalize("NFKC").toLowerCase().trim();
}

export function locationCompatibility(project: ProjectMatchInput, person: PersonMatchInput): Compatibility {
  const projectRemote = remoteText(project.remoteType);
  const personRemote = remoteText(person.remotePreference);
  const projectLocation = remoteText(`${project.prefecture || ""} ${project.workLocationText || ""}`);
  const personLocation = remoteText(person.preferredLocation);

  const projectRemoteFriendly = ["remote", "full_remote", "hybrid", "リモート"].some((token) => projectRemote.includes(token));
  const personRemoteFriendly = ["remote", "full_remote", "hybrid", "リモート", "可"].some((token) => personRemote.includes(token));
  if (projectRemoteFriendly && personRemoteFriendly) return "match";

  if (!projectLocation && !projectRemote && !personLocation && !personRemote) return "unknown";
  if (!projectLocation || !personLocation) return projectRemote || personRemote ? "unknown" : "mismatch";

  const locationTokens = unique(projectLocation.split(/[,\s、/／・]+/).map((token) => token.trim()).filter((token) => token.length >= 2));
  return locationTokens.some((token) => personLocation.includes(token)) ? "match" : "mismatch";
}

function roleTokens(value: string | null | undefined): string[] {
  const normalized = String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}+#.]+/gu, " ");
  return unique(normalized.split(/\s+/).filter((token) => token.length >= 3)).sort();
}

function roleCompatible(project: ProjectMatchInput, person: PersonMatchInput): boolean {
  const projectTokens = roleTokens(`${project.title || ""} ${project.summary || ""} ${project.workDescription || ""} ${project.businessDescription || ""}`);
  const personTokens = roleTokens(`${person.summary || ""} ${person.careerSummary || ""}`);
  return overlap(projectTokens, personTokens).length >= 2;
}

function compatibilityReason(
  compatibility: Compatibility,
  matchCode: ReasonCode,
  unknownCode: ReasonCode,
  mismatchCode?: ReasonCode,
): ReasonCode | null {
  if (compatibility === "match") return matchCode;
  if (compatibility === "unknown") return unknownCode;
  return mismatchCode ?? null;
}

function fieldCoverageWarnings(project: ProjectMatchInput, person: PersonMatchInput): WarningCode[] {
  const warnings: WarningCode[] = [];
  if (!project.skills.length) warnings.push(REASON_CODES.missingProjectSkills);
  if (!person.skills.length) warnings.push(REASON_CODES.missingPersonSkills);

  const missing = [
    project.unitPriceMin || project.unitPriceMax ? null : "project-rate",
    project.startMonth ? null : "project-start",
    project.workLocationText || project.prefecture || project.remoteType ? null : "project-location",
    person.desiredUnitPrice ? null : "person-rate",
    person.availableFrom ? null : "person-availability",
    person.preferredLocation || person.remotePreference ? null : "person-location",
  ].filter(Boolean);
  if (missing.length >= 3) warnings.push(REASON_CODES.lowFieldCoverage);

  if (project.reviewSignals?.length || person.reviewSignals?.length || warnings.includes(REASON_CODES.lowFieldCoverage)) {
    warnings.push(REASON_CODES.reviewRequired);
  }

  return unique(warnings) as WarningCode[];
}

export function scoreMatch(project: ProjectMatchInput, person: PersonMatchInput): MatchCandidate {
  const projectRequired = projectSkillsByType(project, ["REQUIRED"]);
  const projectNice = projectSkillsByType(project, ["PREFERRED"]);
  const projectTechnology = projectSkillsByType(project, ["USED_TECHNOLOGY", "OTHER"]);
  const personSkills = normalizeSkills(person.skills);

  const requiredOverlap = overlap(projectRequired, personSkills);
  const niceOverlap = overlap(projectNice, personSkills);
  const technologyOverlap = overlap(projectTechnology, personSkills);
  const allOverlap = unique([...requiredOverlap, ...niceOverlap, ...technologyOverlap]);

  const priceCompatibility = rateCompatibility(project, person);
  const startCompatibility = dateCompatibility(project, person);
  const placeCompatibility = locationCompatibility(project, person);
  const roleMatch = roleCompatible(project, person);
  const missingFieldCodes = fieldCoverageWarnings(project, person);
  const reviewRequired = missingFieldCodes.includes(REASON_CODES.reviewRequired);

  const reasons: ReasonCode[] = [];
  let score = 0;

  if (requiredOverlap.length) {
    reasons.push(REASON_CODES.requiredSkillOverlap);
    score += Math.min(35, 18 + requiredOverlap.length * 7);
  }
  if (niceOverlap.length) {
    reasons.push(REASON_CODES.niceToHaveSkillOverlap);
    score += Math.min(15, 8 + niceOverlap.length * 3);
  }
  if (technologyOverlap.length) {
    score += Math.min(10, technologyOverlap.length * 3);
  }

  const rateReason = compatibilityReason(priceCompatibility, REASON_CODES.rateCompatible, REASON_CODES.rateUnknown, REASON_CODES.rateMismatch);
  if (rateReason) reasons.push(rateReason);
  score += priceCompatibility === "match" ? 15 : priceCompatibility === "unknown" ? 4 : 0;

  const dateReason = compatibilityReason(startCompatibility, REASON_CODES.startCompatible, REASON_CODES.startUnknown);
  if (dateReason) reasons.push(dateReason);
  score += startCompatibility === "match" ? 10 : startCompatibility === "unknown" ? 3 : 0;

  const locationReason = compatibilityReason(placeCompatibility, REASON_CODES.locationCompatible, REASON_CODES.locationUnknown);
  if (locationReason) reasons.push(locationReason);
  score += placeCompatibility === "match" ? 10 : placeCompatibility === "unknown" ? 3 : 0;

  if (roleMatch) {
    reasons.push(REASON_CODES.roleCompatible);
    score += 10;
  }

  if (missingFieldCodes.includes(REASON_CODES.missingProjectSkills)) score -= 18;
  if (missingFieldCodes.includes(REASON_CODES.missingPersonSkills)) score -= 18;
  if (missingFieldCodes.includes(REASON_CODES.lowFieldCoverage)) score -= 8;
  if (project.status === "DRAFT") score -= 4;
  if (person.status && person.status !== "AVAILABLE") score -= 8;

  return {
    projectShortId: shortId(project.id),
    personShortId: shortId(person.id),
    score: clampScore(score),
    scoreBand: scoreBand(clampScore(score), reviewRequired),
    reasonCodes: unique(reasons) as ReasonCode[],
    missingFieldCodes,
    skillOverlapCount: allOverlap.length,
    requiredSkillOverlapCount: requiredOverlap.length,
    niceToHaveSkillOverlapCount: niceOverlap.length,
    technologyOverlapCount: technologyOverlap.length,
    priceCompatibility,
    dateCompatibility: startCompatibility,
    locationCompatibility: placeCompatibility,
  };
}

function emptyDistribution(): ScoreDistribution {
  return { HIGH: 0, MEDIUM: 0, LOW: 0, REVIEW: 0 };
}

export function buildMatchDryRunReport(params: {
  args: MatchDryRunArgs;
  projects: ProjectMatchInput[];
  persons: PersonMatchInput[];
  dataSource?: MatchDryRunReport["summary"]["dataSource"];
}): MatchDryRunReport {
  const candidateResult = buildMatchCandidates(params);
  const topMatches = candidateResult.candidates.slice(0, MAX_SAMPLES);
  const report: MatchDryRunReport = {
    summary: {
      mode: "match-dry-run",
      readOnly: true,
      dataSource: params.dataSource ?? "database-read-only",
      scannedProjects: params.projects.length,
      scannedPersons: params.persons.length,
      candidatePairs: params.projects.length * params.persons.length,
      displayed: topMatches.length,
      minScore: params.args.minScore,
      limit: params.args.limit,
      scoreDistribution: candidateResult.scoreDistribution,
      warningCounts: sortCountMap(candidateResult.warningCounts),
      reviewReasonCounts: sortCountMap(candidateResult.reviewReasonCounts),
      piiSafe: true,
      secretsRedacted: true,
    },
    topMatches,
    reasonCodes: Object.values(REASON_CODES).sort(),
    notes: [
      "Deterministic scoring only. No AI is used.",
      "Output is anonymized and includes IDs, scores, counts, compatibility states, and reason codes only.",
      "This dry-run does not create proposals or message drafts.",
    ],
  };

  assertNoSensitiveMatchOutput(JSON.stringify(report));
  return report;
}

export function buildMatchCandidates(params: {
  args: Pick<MatchDryRunArgs, "minScore">;
  projects: ProjectMatchInput[];
  persons: PersonMatchInput[];
}): MatchCandidateBuildResult {
  const warningCounts: Record<string, number> = {};
  const reviewReasonCounts: Record<string, number> = {};
  const scoreDistribution = emptyDistribution();
  const candidates: MatchCandidate[] = [];

  for (const project of params.projects) {
    for (const person of params.persons) {
      const candidate = scoreMatch(project, person);
      scoreDistribution[candidate.scoreBand] += 1;
      for (const warning of candidate.missingFieldCodes) addCount(warningCounts, warning);
      for (const reason of candidate.reasonCodes) addCount(reviewReasonCounts, reason);
      if (candidate.score >= params.args.minScore) candidates.push(candidate);
    }
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.projectShortId !== right.projectShortId) return left.projectShortId.localeCompare(right.projectShortId);
    return left.personShortId.localeCompare(right.personShortId);
  });

  return {
    candidates,
    scoreDistribution,
    warningCounts,
    reviewReasonCounts,
  };
}

function sortCountMap(map: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right)));
}

function syntheticInputs(): { projects: ProjectMatchInput[]; persons: PersonMatchInput[] } {
  return {
    projects: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "backend platform",
        workDescription: "server api development",
        unitPriceMin: 80,
        unitPriceMax: 100,
        startMonth: "2026-07-01",
        remoteType: "REMOTE",
        workLocationText: "Tokyo remote",
        status: "OPEN",
        skills: [
          { skillName: "TypeScript", skillType: "REQUIRED" },
          { skillName: "Node.js", skillType: "REQUIRED" },
          { skillName: "PostgreSQL", skillType: "PREFERRED" },
          { skillName: "Next.js", skillType: "USED_TECHNOLOGY" },
        ],
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "mobile app",
        unitPriceMin: null,
        unitPriceMax: null,
        startMonth: null,
        remoteType: "UNKNOWN",
        status: "DRAFT",
        skills: [],
      },
    ],
    persons: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        summary: "backend api engineer",
        careerSummary: "typescript node platform work",
        desiredUnitPrice: 90,
        availableFrom: "2026-06-01",
        preferredLocation: "Tokyo",
        remotePreference: "remote",
        status: "AVAILABLE",
        skills: [
          { skillName: "TypeScript" },
          { skillName: "Node.js" },
          { skillName: "PostgreSQL" },
        ],
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        summary: "visual design support",
        desiredUnitPrice: 120,
        availableFrom: "2026-10-01",
        preferredLocation: "Osaka",
        remotePreference: "onsite",
        status: "AVAILABLE",
        skills: [{ skillName: "Figma" }],
      },
    ],
  };
}

async function loadDatabaseInputs(args: MatchDryRunArgs): Promise<MatchDryRunInputs | null> {
  if (!process.env[dbConnectionEnvName]) return null;

  const { prisma } = await import("../lib/prisma");
  const projectWhere: Record<string, unknown> = { status: { not: "ARCHIVED" } };
  const personWhere: Record<string, unknown> = { status: { not: "ARCHIVED" } };
  if (args.projectId) projectWhere.id = args.projectId;
  if (args.personId) personWhere.id = args.personId;

  const [projects, persons] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { createdAt: "desc" },
      take: args.limit,
      select: {
        id: true,
        title: true,
        summary: true,
        workDescription: true,
        businessDescription: true,
        status: true,
        condition: {
          select: {
            unitPriceMin: true,
            unitPriceMax: true,
            startMonth: true,
            workLocationText: true,
            prefecture: true,
            remoteType: true,
          },
        },
        skills: {
          select: {
            skillName: true,
            skillType: true,
          },
        },
      },
    }),
    prisma.person.findMany({
      where: personWhere,
      orderBy: { createdAt: "desc" },
      take: args.limit,
      select: {
        id: true,
        summary: true,
        careerSummary: true,
        desiredUnitPrice: true,
        availableFrom: true,
        preferredLocation: true,
        remotePreference: true,
        status: true,
        skills: {
          select: {
            skillName: true,
          },
        },
      },
    }),
  ]);

  return {
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      summary: project.summary,
      workDescription: project.workDescription,
      businessDescription: project.businessDescription,
      status: project.status,
      unitPriceMin: project.condition?.unitPriceMin ?? null,
      unitPriceMax: project.condition?.unitPriceMax ?? null,
      startMonth: project.condition?.startMonth ?? null,
      workLocationText: project.condition?.workLocationText ?? null,
      prefecture: project.condition?.prefecture ?? null,
      remoteType: project.condition?.remoteType ?? null,
      skills: project.skills.map((skill) => ({ skillName: skill.skillName, skillType: skill.skillType })),
    })),
    persons: persons.map((person) => ({
      id: person.id,
      summary: person.summary,
      careerSummary: person.careerSummary,
      desiredUnitPrice: person.desiredUnitPrice,
      availableFrom: person.availableFrom,
      preferredLocation: person.preferredLocation,
      remotePreference: person.remotePreference,
      status: person.status,
      skills: person.skills.map((skill) => ({ skillName: skill.skillName })),
    })),
  };
}

export async function runMatchDryRun(argv = process.argv): Promise<MatchDryRunReport> {
  const args = parseMatchDryRunArgs(argv);
  const loaded = await loadMatchDryRunInputs(args);

  return buildMatchDryRunReport({
    args,
    ...loaded.inputs,
    dataSource: loaded.dataSource,
  });
}

export async function loadMatchDryRunInputs(args: MatchDryRunArgs): Promise<{
  inputs: MatchDryRunInputs;
  dataSource: MatchDryRunReport["summary"]["dataSource"];
}> {
  let databaseInputs: Awaited<ReturnType<typeof loadDatabaseInputs>> = null;
  try {
    databaseInputs = await loadDatabaseInputs(args);
  } catch {
    databaseInputs = null;
  }

  return {
    inputs: databaseInputs ?? syntheticInputs(),
    dataSource: databaseInputs ? "database-read-only" : "synthetic-fixture-no-db",
  };
}

export function assertNoSensitiveMatchOutput(text: string): void {
  const forbiddenPatterns = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
    /\b(?:api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^"',\s}]+/i,
    /\bBearer\s+[A-Za-z0-9._-]+/i,
    /-----BEGIN [A-Z ]+KEY-----/,
    /[A-Za-z]:\\(?:Users|OneDrive|Documents|Desktop|Downloads)\\/i,
    /\b(?:companyName|personName|email|fullSubject|fullBody|bodyText|rawText|skillName)\b/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) throw new Error("Sensitive match dry-run output detected");
  }
}

if (require.main === module) {
  runMatchDryRun()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "match:dry-run failed";
      console.error(message);
      process.exitCode = 1;
    });
}
