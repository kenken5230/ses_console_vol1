import { readFileSync } from "fs";
import assert from "node:assert/strict";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

const routeSource = readSource("app/api/admin/gmail/sync-run/route.ts");
const adminJobsSource = readSource("lib/gmail-admin-jobs.ts");

assert(routeSource.includes("statusForSecretError(error)"), "sync-run route must handle invalid bearer secrets before generic failure");
assert(routeSource.includes("authErrorResponse(error)"), "sync-run route must preserve auth/RBAC error handling");
assert(routeSource.includes("sanitizeOperationalError(error)"), "sync-run route must sanitize operational failures");
assert(routeSource.includes("error: sanitized.message"), "sync-run response should expose only sanitized message");
assert(!routeSource.includes("error: sanitized.stack"), "sync-run response must not expose sanitized stack");
assert(!routeSource.includes("error: error.message"), "sync-run route must not expose raw error.message");
assert(!routeSource.includes("error.stack"), "sync-run route must not directly expose raw error.stack");

assert(adminJobsSource.includes("sanitizeOperationalError"), "gmail admin jobs must expose sanitizer");
assert(adminJobsSource.includes("[redacted-db-url]"), "sanitizer must redact DB URLs");
assert(adminJobsSource.includes("Bearer [redacted]"), "sanitizer must redact bearer tokens");
assert(adminJobsSource.includes("GOCSPX-[redacted]"), "sanitizer must redact Google client secret fragments");
assert(adminJobsSource.includes("ya29.[redacted]"), "sanitizer must redact Gmail access token fragments");

const dbUrlExamples = [
  "postgresql://user:pass@example.invalid:5432/prod_db?sslmode=require",
  "postgres://stack-user:stack-pass@example.invalid/db",
  "mysql://user:pass@example.invalid/db",
  "sqlserver://user:pass@example.invalid/db",
];

const dbUrlPattern = /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\/[^\s"'`<>]+/gi;
for (const value of dbUrlExamples) {
  assert.equal(value.replace(dbUrlPattern, "[redacted-db-url]"), "[redacted-db-url]", `DB URL must be redacted: ${value}`);
}

const bearerExample = "Bearer raw-bearer-token";
assert.equal(bearerExample.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]"), "Bearer [redacted]");

console.log("gmail sync-run safety tests passed");
