import { readFileSync } from "fs";
import assert from "node:assert/strict";

const protectedScripts = [
  "scripts/auth-login-readiness.ts",
  "scripts/source-inventory.ts",
  "scripts/person-owner-link-http-smoke-preflight.ts",
];

function readSource(path: string) {
  return readFileSync(path, "utf8");
}

function assertNoRawErrorOutput(path: string, source: string) {
  assert(!source.includes("error.message"), `${path} must not print raw error.message`);
  assert(!source.includes("console.error(error"), `${path} must not pass raw errors to console.error`);
  assert(!source.includes("String(error)"), `${path} must not stringify raw errors`);
}

function assertNoSecretValueOutput(path: string, source: string) {
  const forbiddenConsolePatterns = [
    /console\.(?:log|error)\([^)]*process\.env\.(?:DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|GMAIL_REFRESH_TOKEN|API_KEY|TOKEN|PASSWORD)/,
    /console\.(?:log|error)\([^)]*(?:connectionString|rawUrl|databaseUrl)\b/,
    /NextResponse\.json\([^)]*(?:passwordHash|sessionToken|AUTH_SECRET|DATABASE_URL)/,
  ];

  for (const pattern of forbiddenConsolePatterns) {
    assert(!pattern.test(source), `${path} must not print secret-bearing values: ${pattern}`);
  }
}

for (const path of protectedScripts) {
  const source = readSource(path);
  assertNoRawErrorOutput(path, source);
  assertNoSecretValueOutput(path, source);
}

const authReadiness = readSource("scripts/auth-login-readiness.ts");
assert(authReadiness.includes("Secrets, passwords, tokens, DB URLs, and email addresses are not printed."));
assert(authReadiness.includes("diagnostic failed before completion"));
assert(authReadiness.includes("SMTP_USER and SMTP_PASSWORD must be configured together"));

const sourceInventory = readSource("scripts/source-inventory.ts");
assert(sourceInventory.includes("configured-value-not-printed"));
assert(sourceInventory.includes("assertNoSensitiveInventoryOutput(JSON.stringify(report))"));
assert(sourceInventory.includes("source inventory failed safely:"));

const personPreflight = readSource("scripts/person-owner-link-http-smoke-preflight.ts");
assert(personPreflight.includes("The script never writes."));
assert(personPreflight.includes("No DB write or HTTP smoke request was attempted."));
assert(personPreflight.includes("Preflight stopped safely:"));
assert(personPreflight.includes("AUTH_SECRET_present: ${Boolean(process.env.AUTH_SECRET)}"));
assert(!personPreflight.includes("console.log(`  DATABASE_URL"));
assert(!personPreflight.includes("AUTH_SECRET: ${process.env.AUTH_SECRET"));

console.log("safe output contract tests passed");
