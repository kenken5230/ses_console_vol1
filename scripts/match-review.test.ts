import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  assertNoSensitiveMatchReviewOutput,
  buildMatchReviewResponse,
  parseMatchReviewQuery,
} from "../lib/match-review";
import type { MatchDryRunArgs, MatchDryRunInputs } from "./match-dry-run";
// @ts-ignore Runtime JSX transform is provided by tsx for this smoke test.
import MatchingReviewPage, { MatchingReviewEmptyState } from "../components/MatchingReviewPage.jsx";

const rawProjectText = "HiddenProjectNarrativeSentinel";
const rawPersonText = "HiddenPersonNarrativeSentinel";
const unsafeAddress = "hidden" + "@" + "example.test";

const projectHighId = "11111111-1111-4111-8111-111111111111";
const projectReviewId = "22222222-2222-4222-8222-222222222222";
const personHighId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const personMismatchId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const personReviewId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const inputs: MatchDryRunInputs = {
  projects: [
    {
      id: projectHighId,
      title: rawProjectText,
      summary: "backend platform",
      workDescription: "server api development",
      businessDescription: "internal delivery",
      unitPriceMin: 80,
      unitPriceMax: 100,
      startMonth: "2026-07-01",
      workLocationText: "Tokyo",
      prefecture: "Tokyo",
      remoteType: "REMOTE",
      status: "OPEN",
      skills: [
        { skillName: "TypeScript", skillType: "REQUIRED" },
        { skillName: "Node.js", skillType: "REQUIRED" },
        { skillName: "PostgreSQL", skillType: "PREFERRED" },
      ],
    },
    {
      id: projectReviewId,
      title: "coverage review",
      unitPriceMin: null,
      unitPriceMax: null,
      startMonth: null,
      workLocationText: null,
      prefecture: null,
      remoteType: null,
      status: "DRAFT",
      skills: [],
      reviewSignals: ["SYNTHETIC_REVIEW"],
    },
  ],
  persons: [
    {
      id: personHighId,
      summary: rawPersonText,
      careerSummary: "backend api engineer",
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
      id: personMismatchId,
      summary: "visual design",
      careerSummary: unsafeAddress,
      desiredUnitPrice: 140,
      availableFrom: "2026-12-01",
      preferredLocation: "Osaka",
      remotePreference: "onsite",
      status: "AVAILABLE",
      skills: [{ skillName: "Figma" }],
    },
    {
      id: personReviewId,
      summary: "coverage review",
      careerSummary: null,
      desiredUnitPrice: null,
      availableFrom: null,
      preferredLocation: null,
      remotePreference: null,
      status: "AVAILABLE",
      skills: [],
      reviewSignals: ["SYNTHETIC_REVIEW"],
    },
  ],
};

async function loadMockInputs(args: MatchDryRunArgs) {
  return {
    inputs: {
      projects: inputs.projects.filter((project) => !args.projectId || project.id === args.projectId),
      persons: inputs.persons.filter((person) => !args.personId || person.id === args.personId),
    },
    dataSource: "synthetic-fixture-no-db" as const,
  };
}

assert.deepEqual(parseMatchReviewQuery(new URLSearchParams("page=2&limit=500&scanLimit=900")).limit, 100);
assert.deepEqual(parseMatchReviewQuery(new URLSearchParams("page=2&limit=500&scanLimit=900")).scanLimit, 500);
assert.throws(
  () => parseMatchReviewQuery(new URLSearchParams("apply=true")),
  /read-only/,
);

async function main() {
  const firstPage = await buildMatchReviewResponse(new URLSearchParams("limit=1&page=1&sort=score-desc"), loadMockInputs);
  const secondPage = await buildMatchReviewResponse(new URLSearchParams("limit=1&page=2&sort=score-desc"), loadMockInputs);
  assert.equal(firstPage.summary.readOnly, true);
  assert.equal(firstPage.summary.limit, 1);
  assert.equal(firstPage.summary.scannedProjects, 2);
  assert.equal(firstPage.summary.scannedPersons, 3);
  assert.equal(firstPage.summary.candidatePairs, 6);
  assert.equal(firstPage.items.length, 1);
  assert.ok(firstPage.totalPages >= 2);
  assert.ok(firstPage.items[0].score >= secondPage.items[0].score);

  const highOnly = await buildMatchReviewResponse(new URLSearchParams("scoreBand=HIGH&limit=20"), loadMockInputs);
  assert.ok(highOnly.items.length >= 1);
  assert.ok(highOnly.items.every((item) => item.scoreBand === "HIGH"));

  const reviewOnly = await buildMatchReviewResponse(new URLSearchParams("hasReviewFlag=true&limit=20"), loadMockInputs);
  assert.ok(reviewOnly.items.length >= 1);
  assert.ok(reviewOnly.items.every((item) => item.hasReviewFlag));

  const mismatchOnly = await buildMatchReviewResponse(new URLSearchParams("rateCompatibility=mismatch&limit=20"), loadMockInputs);
  assert.ok(mismatchOnly.items.length >= 1);
  assert.ok(mismatchOnly.items.every((item) => item.rateCompatibility === "mismatch"));

  const skillOverlapOnly = await buildMatchReviewResponse(new URLSearchParams("skillOverlapPresent=true&limit=20"), loadMockInputs);
  assert.ok(skillOverlapOnly.items.length >= 1);
  assert.ok(skillOverlapOnly.items.every((item) => item.skillOverlapCount > 0));

  const scoreAsc = await buildMatchReviewResponse(new URLSearchParams("sort=score-asc&limit=20"), loadMockInputs);
  for (let index = 1; index < scoreAsc.items.length; index += 1) {
    assert.ok(scoreAsc.items[index - 1].score <= scoreAsc.items[index].score);
  }

  const reviewFirst = await buildMatchReviewResponse(new URLSearchParams("sort=review-first&limit=20"), loadMockInputs);
  assert.equal(reviewFirst.items[0].hasReviewFlag, true);

  const projectFiltered = await buildMatchReviewResponse(new URLSearchParams(`projectId=${projectHighId}&limit=20`), loadMockInputs);
  assert.equal(projectFiltered.filters.projectIdShort, "11111111");
  assert.ok(projectFiltered.items.every((item) => item.projectShortId === "11111111"));

  assert.ok(firstPage.summary.scoreDistribution.HIGH >= 1);
  assert.ok(firstPage.summary.scoreDistribution.REVIEW >= 1);
  assert.ok(Object.keys(firstPage.summary.warningCounts).length >= 1);
  assert.ok(Object.keys(firstPage.summary.reviewReasonCounts).length >= 1);

  const serialized = JSON.stringify({ firstPage, highOnly, reviewOnly, mismatchOnly, skillOverlapOnly, scoreAsc, reviewFirst, projectFiltered });
  assertNoSensitiveMatchReviewOutput(serialized);
  assert.equal(serialized.includes(rawProjectText), false);
  assert.equal(serialized.includes(rawPersonText), false);
  assert.equal(serialized.includes(unsafeAddress), false);
  assert.equal(serialized.includes("TypeScript"), false);
  assert.equal(serialized.includes("Node.js"), false);
  assert.equal(serialized.includes("\"projectId\""), false);
  assert.equal(serialized.includes("\"personId\""), false);

  assert.throws(
    () => assertNoSensitiveMatchReviewOutput(JSON.stringify({ contact: unsafeAddress })),
    /Sensitive match dry-run output/,
  );

  for (const routePath of ["app/api/matches/dry-run/route.ts"]) {
    const route = readFileSync(routePath, "utf8");
    assert.doesNotMatch(route, /export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\b/);
    assert.doesNotMatch(route, /\b(?:project|person|proposal|matchSuggestion|distributionLog|mailNotification)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  }

  for (const helperPath of ["lib/match-review.ts", "scripts/match-dry-run.ts"]) {
    const helper = readFileSync(helperPath, "utf8");
    assert.doesNotMatch(helper, /\b(?:project|person|proposal|matchSuggestion|distributionLog|mailNotification)\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
    assert.doesNotMatch(helper, /\$transaction\s*\(/);
    assert.doesNotMatch(helper, /\b(?:sendMail|openai|anthropic)\b/i);
  }

  const componentSource = readFileSync("components/MatchingReviewPage.jsx", "utf8");
  assert.doesNotMatch(componentSource, /https?:\/\//i);
  assert.doesNotMatch(componentSource, /\b(?:sendMail|openai|anthropic)\b/i);

  const emptyHtml = renderToStaticMarkup(React.createElement(MatchingReviewEmptyState));
  assert.ok(emptyHtml.includes("No match candidates found"));
  assert.ok(emptyHtml.includes("field coverage"));

  const pageHtml = renderToStaticMarkup(React.createElement(MatchingReviewPage, {
    initialSession: { authenticated: true, user: { id: "user-1", name: "Reviewer", role: "ADMIN" } },
    initialResponse: { ...firstPage, items: [highOnly.items[0]] },
  }));
  assert.ok(pageHtml.includes("Match candidates"));
  assert.ok(pageHtml.includes("Score breakdown"));
  assert.ok(pageHtml.includes("MATCH_SKILL_REQUIRED_OVERLAP"));
  assert.equal(pageHtml.includes(rawProjectText), false);
  assert.equal(pageHtml.includes(rawPersonText), false);
  assert.equal(pageHtml.includes(unsafeAddress), false);
  assertNoSensitiveMatchReviewOutput(pageHtml);

  console.log("match review tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
