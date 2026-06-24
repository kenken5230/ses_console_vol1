import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

type EntrypointContract = {
  filePath: string;
  operationName: string;
  mutationMarker: string;
};

const entrypointContracts: EntrypointContract[] = [
  {
    filePath: "prisma/seed.ts",
    operationName: "prisma seed",
    mutationMarker: "new PrismaClient",
  },
  {
    filePath: "scripts/gmail-sync-mail-notifications.ts",
    operationName: "gmail:sync",
    mutationMarker: "async function main",
  },
  {
    filePath: "scripts/gmail-classify-mail-notifications.ts",
    operationName: "gmail:classify",
    mutationMarker: "async function main",
  },
  {
    filePath: "scripts/gmail-extract-to-entities.ts",
    operationName: "gmail:extract",
    mutationMarker: "async function main",
  },
  {
    filePath: "scripts/gmail-extract-unlinked.ts",
    operationName: "gmail:extract:unlinked",
    mutationMarker: "await applyExtraction(",
  },
  {
    filePath: "scripts/gmail-extract-archive-mismatches.ts",
    operationName: "gmail:extract:archive-mismatches",
    mutationMarker: "async function main",
  },
  {
    filePath: "scripts/csv-import-dry-run.ts",
    operationName: "csv:import:apply",
    mutationMarker: 'const { prisma } = await import("../lib/prisma")',
  },
  {
    filePath: "scripts/set-local-demo-password.ts",
    operationName: "set-local-demo-password",
    mutationMarker: "async function main",
  },
];

const excludedEntrypointFiles = new Set([
  "scripts/csv-import-dry-run.test.ts",
  "scripts/notion-import-dry-run.ts",
  "scripts/notion-import-dry-run.test.ts",
]);

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function stripComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function guardImportPath(filePath: string) {
  return filePath.startsWith("prisma/") ? "../lib/production-guard" : "../lib/production-guard";
}

function assertHasProductionGuard(contract: EntrypointContract) {
  const source = stripComments(readProjectFile(contract.filePath));
  const importPath = guardImportPath(contract.filePath);
  const importPattern = new RegExp(
    `import\\s*\\{[\\s\\S]*\\bassertNotProductionMutation\\b[\\s\\S]*\\}\\s*from\\s*["']${escapeRegExp(importPath)}["']`,
  );
  const callPattern = new RegExp(
    `\\bassertNotProductionMutation\\s*\\(\\s*["']${escapeRegExp(contract.operationName)}["']\\s*\\)`,
  );

  assert.match(
    source,
    importPattern,
    `${contract.filePath} must import assertNotProductionMutation from ${importPath}`,
  );
  assert.match(
    source,
    callPattern,
    `${contract.filePath} must call assertNotProductionMutation("${contract.operationName}")`,
  );

  const guardCallIndex = source.search(callPattern);
  const mutationMarkerIndex = source.indexOf(contract.mutationMarker);
  assert.notEqual(
    mutationMarkerIndex,
    -1,
    `${contract.filePath} must keep the static mutation marker: ${contract.mutationMarker}`,
  );
  assert(
    guardCallIndex < mutationMarkerIndex,
    `${contract.filePath} must call the production guard before the mutation entrypoint reaches ${contract.mutationMarker}`,
  );
}

const existingContracts = entrypointContracts.filter((contract) => existsSync(path.join(rootDir, contract.filePath)));

assert(existingContracts.length > 0, "at least one mutation entrypoint contract must exist");

for (const contract of existingContracts) {
  assert(!excludedEntrypointFiles.has(contract.filePath), `${contract.filePath} is intentionally excluded from this guard contract`);
  assertHasProductionGuard(contract);
}

console.log(`Verified production guard contracts for ${existingContracts.length} mutation entrypoint(s).`);
