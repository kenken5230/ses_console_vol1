import { readFileSync } from "fs";
import assert from "node:assert/strict";

import { sanitizeOperationalError } from "../lib/gmail-admin-jobs";

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

const routeSource = readSource("app/api/admin/gmail/sync-run/route.ts");
const adminJobsSource = readSource("lib/gmail-admin-jobs.ts");

assert(routeSource.includes("statusForSecretError(error)"), "sync-run route must handle invalid bearer secrets before generic failure");
assert(routeSource.includes("authErrorResponse(error)"), "sync-run route must preserve auth/RBAC error handling");
assert(routeSource.includes("sanitizeOperationalError(error)"), "sync-run route must sanitize operational failures");
assert(routeSource.includes('error: sanitized.message'), "sync-run response should expose only sanitized message");
assert(!routeSource.includes("error: sanitized.stack"), "sync-run response must not expose sanitized stack");
assert(!routeSource.includes("error: error"), "sync-run response must not expose raw error");
assert(!routeSource.includes("error: error.message"), "sync-run route must not expose raw error.message");
assert(!routeSource.includes("error.stack"), "sync-run route must not directly expose raw error.stack");
assert(!/NextResponse\.json\([^)]*(?:CRON_SECRET|ADMIN_SECRET|AUTH_SECRET|DATABASE_URL|GMAIL_REFRESH_TOKEN|SMTP_PASSWORD)/s.test(routeSource), "sync-run route must not JSON-return secret-bearing values");

assert(adminJobsSource.includes("sanitizeOperationalError"), "gmail admin jobs must expose sanitizer");
assert(adminJobsSource.includes("[redacted-db-url]"), "sanitizer must redact DB URLs");
assert(adminJobsSource.includes("Bearer [redacted]"), "sanitizer must redact bearer tokens");
assert(adminJobsSource.includes("GOCSPX-[redacted]"), "sanitizer must redact Google client secret fragments");
assert(adminJobsSource.includes("ya29.[redacted]"), "sanitizer must redact Gmail access token fragments");

const fakeSecrets = {
  AUTH_SECRET: "auth-secret-value-1234567890",
  CRON_SECRET: "cron-secret-value-1234567890",
  ADMIN_SECRET: "admin-secret-value-1234567890",
  SMTP_PASSWORD: "smtp-password-value-1234567890",
  GMAIL_CLIENT_SECRET: "GOCSPX-client-secret-value",
  GMAIL_REFRESH_TOKEN: "refresh-token-value-1234567890",
};

const originalEnv = Object.fromEntries(
  Object.keys(fakeSecrets).map((key) => [key, process.env[key]]),
);

try {
  Object.assign(process.env, fakeSecrets);
  const error = new Error(
    [
      "failed against postgresql://user:pass@example.invalid:5432/prod_db?sslmode=require",
      "Bearer raw-bearer-token",
      "client_secret=GOCSPX-client-secret-value",
      "refresh_token=refresh-token-value-1234567890",
      "access_token=ya29.raw-access-token",
      "password=smtp-password-value-1234567890",
      "auth-secret-value-1234567890",
      "cron-secret-value-1234567890",
      "admin-secret-value-1234567890",
    ].join(" "),
  );
  error.stack = `${error.message}\n    at fake (postgres://stack-user:stack-pass@example.invalid/db)`;

  const sanitized = sanitizeOperationalError(error);
  const serialized = JSON.stringify(sanitized);

  for (const secret of Object.values(fakeSecrets)) {
    assert(!serialized.includes(secret), `sanitized output must not include fake secret ${secret}`);
  }
  assert(!serialized.includes("user:pass"), "sanitized output must not include DB credentials");
  assert(!serialized.includes("stack-user:stack-pass"), "sanitized stack must not include DB credentials");
  assert(!serialized.includes("raw-bearer-token"), "sanitized output must not include bearer token");
  assert(serialized.includes("[redacted-db-url]"), "sanitized output should mark redacted DB URLs");
  assert(serialized.includes("Bearer [redacted]"), "sanitized output should mark redacted bearer tokens");
  assert(sanitized.message.length <= 1000, "sanitized message must stay bounded");
  assert(sanitized.stack === null || sanitized.stack.length <= 4000, "sanitized stack must stay bounded");
} finally {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

console.log("gmail sync-run safety tests passed");
