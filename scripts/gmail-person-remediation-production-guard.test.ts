import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("scripts/gmail-person-remediation-preview.ts", "utf8").replace(/\r\n/g, "\n");

function requiredIndex(text: string, needle: string): number {
  const index = text.indexOf(needle);
  assert.notEqual(index, -1, `Expected source to include: ${needle}`);
  return index;
}

assert.match(
  source,
  /import \{ assertNotProductionMutation \} from "\.\.\/lib\/production-guard";/,
);

assert.match(
  source,
  /function assertGmailPersonRemediationWriteAllowed\(mode: Extract<RunMode, "apply" \| "batch-apply">\): void \{\s*assertNotProductionMutation\(`gmail:extract:person-remediation:\$\{mode\}`\);\s*\}/,
);

const applyCandidateStart = requiredIndex(source, "async function applyCandidate(");
const applyCandidateEnd = requiredIndex(source, "\nasync function runSingle");
const applyCandidateSource = source.slice(applyCandidateStart, applyCandidateEnd);

const skipWithoutWriteIndex = requiredIndex(applyCandidateSource, "if (!person.sourceMail) return \"skipped\";");
const guardIndex = requiredIndex(applyCandidateSource, "assertGmailPersonRemediationWriteAllowed(mode);");
const prismaIndex = requiredIndex(applyCandidateSource, "const db = await getPrisma();");
const updateIndex = requiredIndex(applyCandidateSource, "tx.person.updateMany({");
const extractionIndex = requiredIndex(applyCandidateSource, "tx.extractionResult.create({");

assert.ok(skipWithoutWriteIndex < guardIndex);
assert.ok(guardIndex < prismaIndex);
assert.ok(guardIndex < updateIndex);
assert.ok(guardIndex < extractionIndex);

requiredIndex(source, "applyCandidate(candidate, \"apply\")");
requiredIndex(source, "const writeMode = options.mode === \"batch-apply\" ? \"batch-apply\" : \"apply\";");
requiredIndex(source, "applyCandidate(candidate, writeMode)");

const runBatchStart = requiredIndex(source, "async function runBatch(args: Args): Promise<void> {");
const batchPreviewBranchStart = requiredIndex(source.slice(runBatchStart), "if (!args.batchApply)") + runBatchStart;
const batchPreviewReturn = requiredIndex(source.slice(batchPreviewBranchStart), "\n    return;\n") + batchPreviewBranchStart;
const batchPreviewBranchSource = source.slice(batchPreviewBranchStart, batchPreviewReturn);

assert.equal(batchPreviewBranchSource.includes("assertGmailPersonRemediationWriteAllowed"), false);
assert.equal(batchPreviewBranchSource.includes("apply: true"), false);

const mainSource = source.slice(requiredIndex(source, "async function main(): Promise<void> {"));
assert.equal(mainSource.includes("assertGmailPersonRemediationWriteAllowed"), false);

console.log("gmail person remediation production guard tests passed");
