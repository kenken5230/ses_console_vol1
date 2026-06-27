import assert from "node:assert/strict";

import { buildGmailAdminEnvReadinessChecks, runGmailAdminEnvReadiness } from "./gmail-admin-env-readiness";

const managedEnv = [
  "CRON_SECRET",
  "ADMIN_SECRET",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
  "GMAIL_REDIRECT_URI",
  "GMAIL_AUTH_USER",
  "GMAIL_USER_ID",
  "GMAIL_QUERY",
  "GMAIL_SYNC_FROM",
  "GMAIL_SYNC_TO",
  "GMAIL_INITIAL_SYNC_LIMIT",
  "GMAIL_SYNC_PAGE_SIZE",
  "GMAIL_SYNC_MAX_RESULTS",
  "GMAIL_SYNC_LOCK_TTL_SECONDS",
  "GMAIL_CLASSIFY_LIMIT",
  "GMAIL_EXTRACT_LIMIT",
];

const originalEnv = Object.fromEntries(managedEnv.map((key) => [key, process.env[key]]));
const originalExitCode = process.exitCode;

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  process.exitCode = originalExitCode;
}

function captureOutput(callback: () => unknown): string {
  const originalLog = console.log;
  const originalError = console.error;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => lines.push(args.join(" "));
  console.error = (...args: unknown[]) => lines.push(args.join(" "));
  try {
    callback();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  return lines.join("\n");
}

try {
  for (const key of managedEnv) delete process.env[key];
  let checks = buildGmailAdminEnvReadinessChecks();
  assert(checks.some((check) => check.name === "CRON_SECRET" && check.status === "FAIL"));
  assert(checks.some((check) => check.name === "GMAIL_CLIENT_ID" && check.status === "FAIL"));

  process.env.CRON_SECRET = "short";
  checks = buildGmailAdminEnvReadinessChecks();
  assert(checks.some((check) => check.name === "CRON_SECRET" && check.status === "FAIL" && check.detail.includes("too short")));

  const fakeSecrets = {
    CRON_SECRET: "cron-secret-value-1234567890",
    ADMIN_SECRET: "admin-secret-value-1234567890",
    GMAIL_CLIENT_ID: "gmail-client-id-value",
    GMAIL_CLIENT_SECRET: "GOCSPX-client-secret-value",
    GMAIL_REFRESH_TOKEN: "refresh-token-value-1234567890",
    GMAIL_AUTH_USER: "qa-user@example.invalid",
    GMAIL_QUERY: "to:secret@example.invalid",
    GMAIL_SYNC_FROM: "2026-06-01",
    GMAIL_SYNC_TO: "2026/6/27",
    GMAIL_INITIAL_SYNC_LIMIT: "50",
    GMAIL_SYNC_PAGE_SIZE: "500",
    GMAIL_SYNC_MAX_RESULTS: "100",
    GMAIL_SYNC_LOCK_TTL_SECONDS: "600",
    GMAIL_CLASSIFY_LIMIT: "50",
    GMAIL_EXTRACT_LIMIT: "50",
  };
  Object.assign(process.env, fakeSecrets);

  const output = captureOutput(() => runGmailAdminEnvReadiness());
  assert(!hasFailureStatus(buildGmailAdminEnvReadinessChecks()));

  for (const secret of [
    fakeSecrets.CRON_SECRET,
    fakeSecrets.ADMIN_SECRET,
    fakeSecrets.GMAIL_CLIENT_ID,
    fakeSecrets.GMAIL_CLIENT_SECRET,
    fakeSecrets.GMAIL_REFRESH_TOKEN,
    fakeSecrets.GMAIL_AUTH_USER,
    fakeSecrets.GMAIL_QUERY,
  ]) {
    assert(!output.includes(secret), `readiness output must not include raw env value: ${secret}`);
  }
  assert(output.includes("PASS CRON_SECRET: configured; length 16+"));
  assert(output.includes("PASS GMAIL_CLIENT_SECRET: configured"));
  assert(output.includes("PASS GMAIL_REFRESH_TOKEN: configured"));
  assert(output.includes("Secret values, tokens, DB URLs, and email addresses are not printed."));

  process.env.GMAIL_SYNC_PAGE_SIZE = "501";
  checks = buildGmailAdminEnvReadinessChecks();
  assert(checks.some((check) => check.name === "GMAIL_SYNC_PAGE_SIZE" && check.status === "FAIL"));

  process.env.GMAIL_SYNC_FROM = "20260601";
  checks = buildGmailAdminEnvReadinessChecks();
  assert(checks.some((check) => check.name === "GMAIL_SYNC_FROM" && check.status === "FAIL"));
} finally {
  restoreEnv();
}

function hasFailureStatus(checks: ReturnType<typeof buildGmailAdminEnvReadinessChecks>): boolean {
  return checks.some((check) => check.status === "FAIL");
}

console.log("gmail admin env readiness tests passed");
