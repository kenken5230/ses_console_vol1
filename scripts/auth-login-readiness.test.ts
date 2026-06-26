import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("scripts/auth-login-readiness.ts", "utf8");

assert(source.includes("Secrets, passwords, tokens, DB URLs, and email addresses are not printed."));
assert(!source.includes("dotenv/config"), "readiness script must not auto-load ignored .env files");
assert(!source.includes("findMany("), "readiness script must not select user rows or email addresses");
assert(!source.includes("passwordHash: true"), "readiness script must not select password hashes");
assert(!source.includes("email: true"), "readiness script must not select email addresses");
assert(!/\b(create|update|upsert|delete|deleteMany|updateMany|createMany)\s*\(/.test(source), "readiness script must be read-only");
assert(source.includes("prisma.user.count("), "readiness script should use aggregate user counts only");
assert(source.includes("prisma.user.groupBy("), "readiness script should use role aggregates only");
assert(source.includes("SMTP_USER and SMTP_PASSWORD must be configured together"));
assert(!source.includes("error.message"), "readiness script must not print raw error messages because they can contain secret-bearing URLs");
assert(source.includes("diagnostic failed before completion"), "readiness script should print a fixed secret-safe failure message");
assert(source.includes("function hasFailure(checks: Check[])"));
assert(source.includes('check.status === "FAIL"'));
assert(source.includes("const databaseChecks = await runDatabaseChecks(databaseUrl);"));
assert(source.includes("failed = failed || hasFailure(databaseChecks);"));
assert(source.includes("if (failed)"));
assert(
  source.includes('name: "DB_ACTIVE_USERS_WITHOUT_PASSWORD", status: activeUsersWithoutPassword === 0 ? "PASS" : "FAIL"'),
  "active users without password hashes must fail readiness because those users cannot password-login"
);

console.log("auth login readiness script contract passed");
