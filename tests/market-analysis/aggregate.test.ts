import assert from "node:assert/strict";

import {
  aggregateMarketCells,
  aggregatePriceBandMarket,
  aggregateRegionMarket,
  aggregateSkillMarket,
  buildQualityAlerts,
  calculateMedian,
} from "../../lib/market-analysis/aggregate";
import type { MarketPersonInput, MarketProjectInput } from "../../lib/market-analysis/types";

const projects: MarketProjectInput[] = [
  {
    id: "p1",
    skills: [
      { skillName: "JAVA", skillType: "REQUIRED" },
      { skillName: "AWS", skillType: "PREFERRED" },
    ],
    upperAmountMax: 90,
    unitPriceMax: 80,
    recruitingCount: 3,
    prefecture: "東京都",
    workLocationText: "品川 常駐",
    remoteType: "ONSITE",
    startMonth: "2026-07-01",
    contractType: "準委任",
    isFocus: true,
  },
  {
    id: "p2",
    skills: [
      { skillName: "Java", skillType: "REQUIRED" },
      { skillName: "React.js", skillType: "USED_TECHNOLOGY" },
    ],
    unitPriceMax: 70,
    recruitingCount: 2,
    prefecture: "大阪府",
    workLocationText: "梅田 一部リモート",
    remoteType: "HYBRID",
    startMonth: "2026-08",
    contractType: "請負",
  },
  {
    id: "p3",
    skills: [{ skillName: "Python", skillType: "REQUIRED" }],
    unitPriceMax: null,
    recruitingCount: null,
    prefecture: null,
    workLocationText: null,
    remoteType: null,
    startMonth: null,
    contractType: null,
    qualityIssueCount: 2,
  },
];

const persons: MarketPersonInput[] = [
  {
    id: "u1",
    skills: [{ skillName: "Java" }],
    desiredUnitPrice: 90,
    preferredLocation: "新宿",
    remotePreference: "常駐",
    availableFrom: "2026-06-01",
  },
  {
    id: "u2",
    skills: [{ skillName: "AWS" }, { skillName: "React" }],
    desiredUnitPrice: 70,
    preferredLocation: "大阪",
    remotePreference: "一部リモート",
    availableFrom: "2026-08-01",
  },
  {
    id: "u3",
    skills: [{ skillName: "Python" }],
    desiredUnitPrice: null,
    preferredLocation: null,
    remotePreference: null,
    availableFrom: null,
    needsReview: true,
  },
];

assert.equal(calculateMedian([90, 70, null, undefined]), 80);
assert.equal(calculateMedian([]), null);

const skillMetrics = aggregateSkillMarket(projects, persons);
const java = skillMetrics.find((metric) => metric.skill === "Java");
assert.ok(java);
assert.equal(java.projectCount, 2);
assert.equal(java.personCount, 1);
assert.equal(java.recruitingCount, 5);
assert.equal(java.demandSupplyGap, 4);
assert.equal(java.requiredSkillProjectCount, 2);
assert.equal(java.preferredSkillProjectCount, 0);
assert.equal(java.projectMedianPrice, 80);
assert.equal(java.personDesiredMedianPrice, 90);
assert.equal(java.focusProjectCount, 1);

const aws = skillMetrics.find((metric) => metric.skill === "AWS");
assert.ok(aws);
assert.equal(aws.requiredSkillProjectCount, 0);
assert.equal(aws.preferredSkillProjectCount, 1);
assert.equal(aws.personCount, 1);

const priceMetrics = aggregatePriceBandMarket(projects, persons);
const over80 = priceMetrics.find((metric) => metric.priceBand === "80_over");
assert.ok(over80);
assert.equal(over80.projectCount, 1);
assert.equal(over80.personCount, 1);
assert.equal(over80.projectMedianPrice, 90);
assert.equal(over80.personDesiredMedianPrice, 90);

const seventy = priceMetrics.find((metric) => metric.priceBand === "70_80");
assert.ok(seventy);
assert.equal(seventy.projectCount, 1);
assert.equal(seventy.personCount, 1);

const unknownPrice = priceMetrics.find((metric) => metric.priceBand === "unknown");
assert.ok(unknownPrice);
assert.equal(unknownPrice.projectCount, 1);
assert.equal(unknownPrice.personCount, 1);

const regionMetrics = aggregateRegionMarket(projects, persons);
const tokyoOnsite = regionMetrics.find((metric) => metric.region === "東京" && metric.workStyle === "ONSITE");
assert.ok(tokyoOnsite);
assert.equal(tokyoOnsite.projectCount, 1);
assert.equal(tokyoOnsite.personCount, 1);
assert.equal(tokyoOnsite.recruitingCount, 3);

const osakaHybrid = regionMetrics.find((metric) => metric.region === "大阪" && metric.workStyle === "HYBRID");
assert.ok(osakaHybrid);
assert.equal(osakaHybrid.projectCount, 1);
assert.equal(osakaHybrid.personCount, 1);

const cells = aggregateMarketCells(projects, persons, new Date("2026-06-06T00:00:00+09:00"));
const javaCell = cells.find((metric) => (
  metric.skill === "Java"
  && metric.priceBand === "80_over"
  && metric.region === "東京"
  && metric.workStyle === "ONSITE"
  && metric.startMonth === "2026-07"
  && metric.contractType === "SEMI_DELEGATION"
));
assert.ok(javaCell);
assert.equal(javaCell.projectCount, 1);
assert.equal(javaCell.personCount, 1);
assert.equal(javaCell.recruitingCount, 3);
assert.equal(javaCell.demandSupplyGap, 2);
assert.ok(javaCell.salesPriorityScore.score > 0);

const alerts = buildQualityAlerts(
  [
    ...projects,
    {
      id: "p4",
      skills: [],
      unitPriceMax: null,
      prefecture: null,
      workLocationText: null,
      remoteType: null,
      startMonth: null,
      needsReview: true,
    },
  ],
  [
    ...persons,
    {
      id: "u4",
      skills: [],
      desiredUnitPrice: null,
      preferredLocation: null,
      remotePreference: null,
    },
  ],
);
assert.ok(alerts.some((alert) => alert.code === "PROJECT_SKILL_MISSING"));
assert.ok(alerts.some((alert) => alert.code === "PROJECT_PRICE_MISSING"));
assert.ok(alerts.some((alert) => alert.code === "PROJECT_REGION_MISSING"));
assert.ok(alerts.some((alert) => alert.code === "PROJECT_WORK_STYLE_UNKNOWN"));
assert.ok(alerts.some((alert) => alert.code === "PROJECT_START_MONTH_MISSING"));
assert.ok(alerts.some((alert) => alert.code === "PERSON_SKILL_MISSING"));
assert.ok(alerts.some((alert) => alert.code === "PERSON_PRICE_MISSING"));
assert.ok(alerts.some((alert) => alert.code === "PERSON_REGION_MISSING"));
assert.ok(alerts.some((alert) => alert.code === "NEEDS_REVIEW"));

console.log("aggregate market-analysis tests passed");
