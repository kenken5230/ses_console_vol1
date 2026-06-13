import {
  DEFAULT_RECRUITING_COUNT,
  UNKNOWN_MONTH,
  UNKNOWN_REGION,
  UNKNOWN_SKILL,
} from "./constants";
import {
  normalizeContractType,
  normalizeMonthKey,
  normalizeRegion,
  normalizeSkillName,
  normalizeWorkStyle,
  pickProjectPrice,
  toPriceBand,
} from "./normalize";
import { calculateSalesPriorityScore } from "./scoring";
import type {
  ContractTypeKey,
  MarketCellMetric,
  MarketMetricBase,
  MarketPersonInput,
  MarketProjectInput,
  MarketSkillInput,
  PriceBandKey,
  PriceBandMetric,
  QualityAlert,
  RegionMarketMetric,
  SkillMarketMetric,
  WorkStyleKey,
} from "./types";

type MutableMetric = {
  projectIds: Set<string>;
  personIds: Set<string>;
  recruitingCount: number;
  projectPrices: number[];
  personPrices: number[];
  focusProjectIds: Set<string>;
  qualityIssueCount: number;
};

type MutableSkillMetric = MutableMetric & {
  requiredProjectIds: Set<string>;
  preferredProjectIds: Set<string>;
  usedTechnologyProjectIds: Set<string>;
};

type PersonSupplyKey = {
  skill: string;
  priceBand: PriceBandKey;
  region: string;
  workStyle: WorkStyleKey;
  startMonth: string;
};

function positiveInteger(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_RECRUITING_COUNT;
  }
  return Math.trunc(value);
}

function qualityCount(value: { qualityIssueCount?: number | null; needsReview?: boolean | null }) {
  const explicit = typeof value.qualityIssueCount === "number" && Number.isFinite(value.qualityIssueCount)
    ? Math.max(0, Math.trunc(value.qualityIssueCount))
    : 0;
  return explicit + (value.needsReview ? 1 : 0);
}

function createMutableMetric(): MutableMetric {
  return {
    projectIds: new Set(),
    personIds: new Set(),
    recruitingCount: 0,
    projectPrices: [],
    personPrices: [],
    focusProjectIds: new Set(),
    qualityIssueCount: 0,
  };
}

function createMutableSkillMetric(): MutableSkillMetric {
  return {
    ...createMutableMetric(),
    requiredProjectIds: new Set(),
    preferredProjectIds: new Set(),
    usedTechnologyProjectIds: new Set(),
  };
}

function uniqueSkills(skills: MarketSkillInput[] | null | undefined) {
  const seen = new Map<string, MarketSkillInput>();
  for (const skill of skills ?? []) {
    const name = normalizeSkillName(skill.skillName);
    if (name === UNKNOWN_SKILL) continue;
    const type = normalizeSkillType(skill.skillType);
    const key = `${name}:${type}`;
    if (!seen.has(key)) seen.set(key, { ...skill, skillName: name, skillType: type });
  }
  return [...seen.values()];
}

function normalizeSkillType(value: string | null | undefined) {
  const normalized = String(value ?? "OTHER").trim().toUpperCase();
  if (normalized === "REQUIRED" || normalized === "PREFERRED" || normalized === "USED_TECHNOLOGY") {
    return normalized;
  }
  return "OTHER";
}

function addProjectToMetric(metric: MutableMetric, project: MarketProjectInput, price: number | null) {
  if (!metric.projectIds.has(project.id)) {
    metric.projectIds.add(project.id);
    metric.recruitingCount += positiveInteger(project.recruitingCount);
    if (price !== null) metric.projectPrices.push(price);
    if (project.isFocus) metric.focusProjectIds.add(project.id);
    metric.qualityIssueCount += qualityCount(project);
  }
}

function addPersonToMetric(metric: MutableMetric, person: MarketPersonInput) {
  if (!metric.personIds.has(person.id)) {
    metric.personIds.add(person.id);
    if (typeof person.desiredUnitPrice === "number" && Number.isFinite(person.desiredUnitPrice) && person.desiredUnitPrice > 0) {
      metric.personPrices.push(person.desiredUnitPrice);
    }
    metric.qualityIssueCount += qualityCount(person);
  }
}

function toBaseMetric(metric: MutableMetric): MarketMetricBase {
  const personCount = metric.personIds.size;
  return {
    projectCount: metric.projectIds.size,
    recruitingCount: metric.recruitingCount,
    personCount,
    demandSupplyGap: metric.recruitingCount - personCount,
    projectMedianPrice: calculateMedian(metric.projectPrices),
    personDesiredMedianPrice: calculateMedian(metric.personPrices),
    focusProjectCount: metric.focusProjectIds.size,
    qualityIssueCount: metric.qualityIssueCount,
  };
}

function sortBase<T extends MarketMetricBase>(items: T[]) {
  return items.sort((left, right) => {
    if (right.recruitingCount !== left.recruitingCount) return right.recruitingCount - left.recruitingCount;
    if (right.demandSupplyGap !== left.demandSupplyGap) return right.demandSupplyGap - left.demandSupplyGap;
    return (right.projectMedianPrice ?? 0) - (left.projectMedianPrice ?? 0);
  });
}

export function calculateMedian(values: Array<number | null | undefined>) {
  const sorted = values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

export function aggregateSkillMarket(projects: MarketProjectInput[], persons: MarketPersonInput[]) {
  const metrics = new Map<string, MutableSkillMetric>();

  for (const project of projects) {
    const price = pickProjectPrice(project);
    for (const skill of uniqueSkills(project.skills)) {
      const name = normalizeSkillName(skill.skillName);
      const metric = metrics.get(name) ?? createMutableSkillMetric();
      addProjectToMetric(metric, project, price);
      if (skill.skillType === "REQUIRED") metric.requiredProjectIds.add(project.id);
      if (skill.skillType === "PREFERRED") metric.preferredProjectIds.add(project.id);
      if (skill.skillType === "USED_TECHNOLOGY") metric.usedTechnologyProjectIds.add(project.id);
      metrics.set(name, metric);
    }
  }

  for (const person of persons) {
    const personSkills = new Set(uniqueSkills(person.skills).map((skill) => normalizeSkillName(skill.skillName)));
    for (const skill of personSkills) {
      const metric = metrics.get(skill) ?? createMutableSkillMetric();
      addPersonToMetric(metric, person);
      metrics.set(skill, metric);
    }
  }

  return sortBase([...metrics.entries()].map(([skill, metric]): SkillMarketMetric => ({
    skill,
    ...toBaseMetric(metric),
    requiredSkillProjectCount: metric.requiredProjectIds.size,
    preferredSkillProjectCount: metric.preferredProjectIds.size,
    usedTechnologyProjectCount: metric.usedTechnologyProjectIds.size,
  })));
}

export function aggregatePriceBandMarket(projects: MarketProjectInput[], persons: MarketPersonInput[]) {
  const metrics = new Map<PriceBandKey, MutableMetric>();

  for (const project of projects) {
    const price = pickProjectPrice(project);
    const key = toPriceBand(price);
    const metric = metrics.get(key) ?? createMutableMetric();
    addProjectToMetric(metric, project, price);
    metrics.set(key, metric);
  }

  for (const person of persons) {
    const key = toPriceBand(person.desiredUnitPrice);
    const metric = metrics.get(key) ?? createMutableMetric();
    addPersonToMetric(metric, person);
    metrics.set(key, metric);
  }

  return sortBase([...metrics.entries()].map(([priceBand, metric]): PriceBandMetric => ({
    priceBand,
    ...toBaseMetric(metric),
  })));
}

export function aggregateRegionMarket(projects: MarketProjectInput[], persons: MarketPersonInput[]) {
  const metrics = new Map<string, MutableMetric>();

  for (const project of projects) {
    const region = normalizeRegion(project);
    const workStyle = normalizeWorkStyle(project.remoteType, `${project.workStyleText ?? ""} ${project.workLocationText ?? ""}`);
    const key = `${region}:${workStyle}`;
    const metric = metrics.get(key) ?? createMutableMetric();
    addProjectToMetric(metric, project, pickProjectPrice(project));
    metrics.set(key, metric);
  }

  for (const person of persons) {
    const region = normalizeRegion(person);
    const workStyle = normalizeWorkStyle(null, person.remotePreference);
    const key = `${region}:${workStyle}`;
    const metric = metrics.get(key) ?? createMutableMetric();
    addPersonToMetric(metric, person);
    metrics.set(key, metric);
  }

  return sortBase([...metrics.entries()].map(([key, metric]): RegionMarketMetric => {
    const [region, workStyle] = key.split(":") as [string, WorkStyleKey];
    return {
      region,
      workStyle,
      ...toBaseMetric(metric),
    };
  }));
}

export function aggregateMarketCells(projects: MarketProjectInput[], persons: MarketPersonInput[], today = new Date()) {
  const metrics = new Map<string, MutableMetric>();
  const personSupply = buildPersonSupply(persons);

  for (const project of projects) {
    const price = pickProjectPrice(project);
    const base = {
      priceBand: toPriceBand(price),
      region: normalizeRegion(project),
      workStyle: normalizeWorkStyle(project.remoteType, `${project.workStyleText ?? ""} ${project.workLocationText ?? ""}`),
      startMonth: normalizeMonthKey(project.startMonth),
      contractType: normalizeContractType(project.contractType),
    };

    for (const skill of uniqueSkills(project.skills)) {
      const normalizedSkill = normalizeSkillName(skill.skillName);
      const key = cellKey({ skill: normalizedSkill, ...base });
      const metric = metrics.get(key) ?? createMutableMetric();
      addProjectToMetric(metric, project, price);
      metrics.set(key, metric);
    }
  }

  for (const [key, metric] of metrics) {
    const parsed = parseCellKey(key);
    for (const person of matchingSupply(personSupply, parsed)) {
      addPersonToMetric(metric, person);
    }
  }

  return sortBase([...metrics.entries()].map(([key, metric]): MarketCellMetric & { salesPriorityScore: ReturnType<typeof calculateSalesPriorityScore> } => {
    const cell = parseCellKey(key);
    const baseMetric = toBaseMetric(metric);
    return {
      ...cell,
      ...baseMetric,
      salesPriorityScore: calculateSalesPriorityScore({ ...cell, ...baseMetric }, today),
    };
  }));
}

function buildPersonSupply(persons: MarketPersonInput[]) {
  const entries: Array<PersonSupplyKey & { person: MarketPersonInput }> = [];
  for (const person of persons) {
    const base = {
      priceBand: toPriceBand(person.desiredUnitPrice),
      region: normalizeRegion(person),
      workStyle: normalizeWorkStyle(null, person.remotePreference),
      startMonth: normalizeMonthKey(person.availableFrom),
    };
    const personSkills = new Set(uniqueSkills(person.skills).map((skill) => normalizeSkillName(skill.skillName)));
    for (const skill of personSkills) {
      entries.push({ skill, ...base, person });
    }
  }
  return entries;
}

function matchingSupply(
  entries: Array<PersonSupplyKey & { person: MarketPersonInput }>,
  cell: Omit<MarketCellMetric, keyof MarketMetricBase>,
) {
  return entries
    .filter((entry) => {
      if (entry.skill !== cell.skill) return false;
      if (entry.priceBand !== cell.priceBand) return false;
      if (entry.region !== cell.region) return false;
      if (entry.workStyle !== cell.workStyle) return false;
      if (entry.startMonth === UNKNOWN_MONTH || cell.startMonth === UNKNOWN_MONTH) return true;
      return entry.startMonth <= cell.startMonth;
    })
    .map((entry) => entry.person);
}

function cellKey(cell: Omit<MarketCellMetric, keyof MarketMetricBase>) {
  return [
    cell.skill,
    cell.priceBand,
    cell.region,
    cell.workStyle,
    cell.startMonth,
    cell.contractType,
  ].join("\u001f");
}

function parseCellKey(key: string): Omit<MarketCellMetric, keyof MarketMetricBase> {
  const [skill, priceBand, region, workStyle, startMonth, contractType] = key.split("\u001f");
  return {
    skill,
    priceBand: priceBand as PriceBandKey,
    region,
    workStyle: workStyle as WorkStyleKey,
    startMonth,
    contractType: contractType as ContractTypeKey,
  };
}

export function buildQualityAlerts(projects: MarketProjectInput[], persons: MarketPersonInput[]) {
  const alerts = new Map<QualityAlert["code"], QualityAlert>();

  function addAlert(alert: Omit<QualityAlert, "count" | "sampleIds">, id: string) {
    const current = alerts.get(alert.code) ?? { ...alert, count: 0, sampleIds: [] };
    current.count += 1;
    if (current.sampleIds.length < 5) current.sampleIds.push(id);
    alerts.set(alert.code, current);
  }

  for (const project of projects) {
    if (!uniqueSkills(project.skills).length) {
      addAlert({ code: "PROJECT_SKILL_MISSING", severity: "critical", target: "project", message: "案件スキルが未設定です。" }, project.id);
    }
    if (pickProjectPrice(project) === null) {
      addAlert({ code: "PROJECT_PRICE_MISSING", severity: "warning", target: "project", message: "案件単価が未設定です。" }, project.id);
    }
    if (normalizeRegion(project) === UNKNOWN_REGION) {
      addAlert({ code: "PROJECT_REGION_MISSING", severity: "warning", target: "project", message: "案件地域が未判定です。" }, project.id);
    }
    if (normalizeWorkStyle(project.remoteType, `${project.workStyleText ?? ""} ${project.workLocationText ?? ""}`) === "UNKNOWN") {
      addAlert({ code: "PROJECT_WORK_STYLE_UNKNOWN", severity: "info", target: "project", message: "案件勤務形態が未判定です。" }, project.id);
    }
    if (normalizeMonthKey(project.startMonth) === UNKNOWN_MONTH) {
      addAlert({ code: "PROJECT_START_MONTH_MISSING", severity: "info", target: "project", message: "案件開始月が未設定です。" }, project.id);
    }
    if (project.needsReview || qualityCount(project) > 0) {
      addAlert({ code: "NEEDS_REVIEW", severity: "warning", target: "both", message: "確認が必要なレコードがあります。" }, project.id);
    }
  }

  for (const person of persons) {
    if (!uniqueSkills(person.skills).length) {
      addAlert({ code: "PERSON_SKILL_MISSING", severity: "critical", target: "person", message: "要員スキルが未設定です。" }, person.id);
    }
    if (toPriceBand(person.desiredUnitPrice) === "unknown") {
      addAlert({ code: "PERSON_PRICE_MISSING", severity: "warning", target: "person", message: "要員希望単価が未設定です。" }, person.id);
    }
    if (normalizeRegion(person) === UNKNOWN_REGION) {
      addAlert({ code: "PERSON_REGION_MISSING", severity: "warning", target: "person", message: "要員希望勤務地が未判定です。" }, person.id);
    }
    if (normalizeWorkStyle(null, person.remotePreference) === "UNKNOWN") {
      addAlert({ code: "PERSON_WORK_STYLE_UNKNOWN", severity: "info", target: "person", message: "要員勤務形態希望が未判定です。" }, person.id);
    }
    if (person.needsReview || qualityCount(person) > 0) {
      addAlert({ code: "NEEDS_REVIEW", severity: "warning", target: "both", message: "確認が必要なレコードがあります。" }, person.id);
    }
  }

  return [...alerts.values()].sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
}
