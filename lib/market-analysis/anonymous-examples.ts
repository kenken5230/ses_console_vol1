import { UNKNOWN_MONTH, UNKNOWN_SKILL } from "./constants";
import {
  normalizeContractType,
  normalizeMonthKey,
  normalizeRegion,
  normalizeSkillName,
  normalizeWorkStyle,
  pickProjectPrice,
  toPriceBand,
} from "./normalize";
import type {
  MarketAnonymousExample,
  MarketAnonymousExamples,
  MarketCellMetric,
  MarketCellRanking,
  MarketPersonInput,
  MarketProjectInput,
  PriceBandMetric,
  PriceBandRanking,
  RegionMarketMetric,
  RegionMarketRanking,
  SkillMarketMetric,
  SkillMarketRanking,
} from "./types";

const MAX_EXAMPLES_PER_KIND = 5;

export type MarketProjectExampleSource = {
  project: MarketProjectInput;
  createdAt?: string | Date | null;
  status?: string | null;
  sourceIndex: number;
};

export type MarketPersonExampleSource = {
  person: MarketPersonInput;
  createdAt?: string | Date | null;
  status?: string | null;
  sourceIndex: number;
};

type ExampleType = "skill" | "priceBand" | "region" | "marketCell";

type ExampleRow = SkillMarketMetric | PriceBandMetric | RegionMarketMetric | MarketCellMetric;

export function attachAnonymousExamplesToSkillRankings(
  rows: SkillMarketMetric[],
  projects: MarketProjectExampleSource[],
  persons: MarketPersonExampleSource[],
): SkillMarketRanking[] {
  return rows.map((row) => ({
    ...row,
    anonymousExamples: buildAnonymousExamples("skill", row, projects, persons),
  }));
}

export function attachAnonymousExamplesToPriceBandRankings(
  rows: PriceBandMetric[],
  projects: MarketProjectExampleSource[],
  persons: MarketPersonExampleSource[],
): PriceBandRanking[] {
  return rows.map((row) => ({
    ...row,
    anonymousExamples: buildAnonymousExamples("priceBand", row, projects, persons),
  }));
}

export function attachAnonymousExamplesToRegionRankings(
  rows: RegionMarketMetric[],
  projects: MarketProjectExampleSource[],
  persons: MarketPersonExampleSource[],
): RegionMarketRanking[] {
  return rows.map((row) => ({
    ...row,
    anonymousExamples: buildAnonymousExamples("region", row, projects, persons),
  }));
}

export function attachAnonymousExamplesToMarketCellRankings(
  rows: Array<MarketCellMetric & Omit<MarketCellRanking, keyof MarketCellMetric | "anonymousExamples">>,
  projects: MarketProjectExampleSource[],
  persons: MarketPersonExampleSource[],
): MarketCellRanking[] {
  return rows.map((row) => ({
    ...row,
    anonymousExamples: buildAnonymousExamples("marketCell", row, projects, persons),
  }));
}

export function buildAnonymousExamples(
  type: ExampleType,
  row: ExampleRow,
  projects: MarketProjectExampleSource[],
  persons: MarketPersonExampleSource[],
): MarketAnonymousExamples {
  return {
    projects: projects
      .filter((source) => projectMatches(type, row, source.project))
      .sort(compareProjectSources)
      .slice(0, MAX_EXAMPLES_PER_KIND)
      .map((source, index) => projectExampleFromSource(source, index)),
    persons: persons
      .filter((source) => personMatches(type, row, source.person))
      .sort(comparePersonSources)
      .slice(0, MAX_EXAMPLES_PER_KIND)
      .map((source, index) => personExampleFromSource(source, index)),
  };
}

function projectMatches(type: ExampleType, row: ExampleRow, project: MarketProjectInput) {
  if (type === "skill" && "skill" in row) return hasSkill(project.skills, row.skill);
  if (type === "priceBand" && "priceBand" in row) return projectPriceBand(project) === row.priceBand;
  if (type === "region" && "region" in row && "workStyle" in row) {
    return projectRegion(project) === row.region && projectWorkStyle(project) === row.workStyle;
  }
  if (type === "marketCell" && isMarketCell(row)) {
    return (
      hasSkill(project.skills, row.skill)
      && projectPriceBand(project) === row.priceBand
      && projectRegion(project) === row.region
      && projectWorkStyle(project) === row.workStyle
      && normalizeMonthKey(project.startMonth) === row.startMonth
      && normalizeContractType(project.contractType) === row.contractType
    );
  }
  return false;
}

function personMatches(type: ExampleType, row: ExampleRow, person: MarketPersonInput) {
  if (type === "skill" && "skill" in row) return hasSkill(person.skills, row.skill);
  if (type === "priceBand" && "priceBand" in row) return personPriceBand(person) === row.priceBand;
  if (type === "region" && "region" in row && "workStyle" in row) {
    return personRegion(person) === row.region && personWorkStyle(person) === row.workStyle;
  }
  if (type === "marketCell" && isMarketCell(row)) {
    const personMonth = normalizeMonthKey(person.availableFrom);
    return (
      hasSkill(person.skills, row.skill)
      && personPriceBand(person) === row.priceBand
      && personRegion(person) === row.region
      && personWorkStyle(person) === row.workStyle
      && (personMonth === UNKNOWN_MONTH || row.startMonth === UNKNOWN_MONTH || personMonth <= row.startMonth)
    );
  }
  return false;
}

function isMarketCell(row: ExampleRow): row is MarketCellMetric {
  return (
    "skill" in row
    && "priceBand" in row
    && "region" in row
    && "workStyle" in row
    && "startMonth" in row
    && "contractType" in row
  );
}

function projectExampleFromSource(source: MarketProjectExampleSource, index: number): MarketAnonymousExample {
  const project = source.project;
  const counts = projectSkillCounts(project);
  return {
    kind: "project",
    anonymousId: anonymousId("PJ", index),
    registeredMonth: monthKeyFromDate(source.createdAt),
    priceBand: projectPriceBand(project),
    region: projectRegion(project),
    workStyle: projectWorkStyle(project),
    skillCount: counts.skillCount,
    requiredSkillCount: counts.requiredSkillCount,
    preferredSkillCount: counts.preferredSkillCount,
    usedTechnologySkillCount: counts.usedTechnologySkillCount,
    isFocus: Boolean(project.isFocus),
    status: source.status ?? null,
  };
}

function personExampleFromSource(source: MarketPersonExampleSource, index: number): MarketAnonymousExample {
  const person = source.person;
  return {
    kind: "person",
    anonymousId: anonymousId("PS", index),
    registeredMonth: monthKeyFromDate(source.createdAt),
    priceBand: personPriceBand(person),
    region: personRegion(person),
    workStyle: personWorkStyle(person),
    skillCount: uniqueSkillNames(person.skills).length,
    requiredSkillCount: 0,
    preferredSkillCount: 0,
    usedTechnologySkillCount: 0,
    status: source.status ?? null,
  };
}

function anonymousId(prefix: "PJ" | "PS", index: number) {
  return `${prefix}-${String(index + 1).padStart(3, "0")}`;
}

function compareProjectSources(left: MarketProjectExampleSource, right: MarketProjectExampleSource) {
  const dateDiff = dateSortValue(right.createdAt) - dateSortValue(left.createdAt);
  if (dateDiff) return dateDiff;
  const focusDiff = Number(Boolean(right.project.isFocus)) - Number(Boolean(left.project.isFocus));
  if (focusDiff) return focusDiff;
  const skillDiff = projectSkillCounts(right.project).skillCount - projectSkillCounts(left.project).skillCount;
  if (skillDiff) return skillDiff;
  return left.sourceIndex - right.sourceIndex;
}

function comparePersonSources(left: MarketPersonExampleSource, right: MarketPersonExampleSource) {
  const dateDiff = dateSortValue(right.createdAt) - dateSortValue(left.createdAt);
  if (dateDiff) return dateDiff;
  const skillDiff = uniqueSkillNames(right.person.skills).length - uniqueSkillNames(left.person.skills).length;
  if (skillDiff) return skillDiff;
  return left.sourceIndex - right.sourceIndex;
}

function projectSkillCounts(project: MarketProjectInput) {
  const normalized = uniqueProjectSkills(project.skills);
  return {
    skillCount: new Set(normalized.map((skill) => skill.name)).size,
    requiredSkillCount: normalized.filter((skill) => skill.type === "REQUIRED").length,
    preferredSkillCount: normalized.filter((skill) => skill.type === "PREFERRED").length,
    usedTechnologySkillCount: normalized.filter((skill) => skill.type === "USED_TECHNOLOGY").length,
  };
}

function uniqueProjectSkills(skills: MarketProjectInput["skills"]) {
  const seen = new Map<string, { name: string; type: string }>();
  for (const skill of skills ?? []) {
    const name = normalizeSkillName(skill.skillName);
    if (name === UNKNOWN_SKILL) continue;
    const type = normalizeSkillType(skill.skillType);
    const key = `${name}:${type}`;
    if (!seen.has(key)) seen.set(key, { name, type });
  }
  return [...seen.values()];
}

function uniqueSkillNames(skills: MarketPersonInput["skills"] | MarketProjectInput["skills"]) {
  const seen = new Set<string>();
  for (const skill of skills ?? []) {
    const name = normalizeSkillName(skill.skillName);
    if (name !== UNKNOWN_SKILL) seen.add(name);
  }
  return [...seen];
}

function hasSkill(skills: MarketPersonInput["skills"] | MarketProjectInput["skills"], skill: string) {
  return uniqueSkillNames(skills).includes(skill);
}

function normalizeSkillType(value: string | null | undefined) {
  const normalized = String(value ?? "OTHER").trim().toUpperCase();
  if (normalized === "REQUIRED" || normalized === "PREFERRED" || normalized === "USED_TECHNOLOGY") return normalized;
  return "OTHER";
}

function projectPriceBand(project: MarketProjectInput) {
  return toPriceBand(pickProjectPrice(project));
}

function personPriceBand(person: MarketPersonInput) {
  return toPriceBand(person.desiredUnitPrice);
}

function projectRegion(project: MarketProjectInput) {
  return normalizeRegion(project);
}

function personRegion(person: MarketPersonInput) {
  return normalizeRegion(person);
}

function projectWorkStyle(project: MarketProjectInput) {
  return normalizeWorkStyle(project.remoteType, `${project.workStyleText ?? ""} ${project.workLocationText ?? ""}`);
}

function personWorkStyle(person: MarketPersonInput) {
  return normalizeWorkStyle(null, person.remotePreference);
}

function dateValue(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateSortValue(value: string | Date | null | undefined) {
  return dateValue(value)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

function monthKeyFromDate(value: string | Date | null | undefined) {
  const date = dateValue(value);
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
