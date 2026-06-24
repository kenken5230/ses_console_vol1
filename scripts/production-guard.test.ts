import assert from "node:assert/strict";

import {
  assertNotProductionMutation,
  detectProductionMutationRisk,
  isDeployedRuntime,
  missingEnvNames,
} from "../lib/production-guard";

function reasonCodes(env: Parameters<typeof detectProductionMutationRisk>[0]) {
  return detectProductionMutationRisk(env).map((reason) => reason.code);
}

function assertBlockedByDatabaseUrl(databaseUrl: string, expectedCode: string) {
  assert.deepEqual(reasonCodes({ DATABASE_URL: databaseUrl }), [expectedCode]);
  assert.throws(
    () => assertNotProductionMutation("contract test mutation", { DATABASE_URL: databaseUrl }),
    /contract test mutation is blocked by production guard.*Reasons: .+\./,
  );
}

function assertAllowedEnv(env: Parameters<typeof detectProductionMutationRisk>[0]) {
  assert.deepEqual(detectProductionMutationRisk(env), []);
  assert.doesNotThrow(() => assertNotProductionMutation("contract test mutation", env));
}

assert.deepEqual(reasonCodes({ NODE_ENV: "production" }), ["NODE_ENV_PRODUCTION"]);
assert.deepEqual(reasonCodes({ VERCEL_ENV: "production" }), ["VERCEL_ENV_PRODUCTION"]);
assert.deepEqual(reasonCodes({ NODE_ENV: "production", VERCEL_ENV: "production" }), [
  "NODE_ENV_PRODUCTION",
  "VERCEL_ENV_PRODUCTION",
]);

assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@production-db.example.invalid:5432/ses_console",
  "DATABASE_HOST_PRODUCTION_MARKER",
);
assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@prod-db.example.invalid:5432/ses_console",
  "DATABASE_HOST_PRODUCTION_MARKER",
);
assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@prd-db.example.invalid:5432/ses_console",
  "DATABASE_HOST_PRODUCTION_MARKER",
);
assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@db.example.invalid:5432/ses_console_prod",
  "DATABASE_NAME_PRODUCTION_MARKER",
);
assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@db.example.invalid:5432/ses_console?branch=production",
  "DATABASE_BRANCH_PRODUCTION_MARKER",
);
assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@db.example.invalid:5432/ses_console?branch=main",
  "DATABASE_BRANCH_PRODUCTION_MARKER",
);
assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@db.example.invalid:5432/ses_console?schema=prod",
  "DATABASE_BRANCH_PRODUCTION_MARKER",
);
assertBlockedByDatabaseUrl(
  "postgresql://app:dummy@db.example.invalid:5432/ses_console?options=--search_path%3Dproduction",
  "DATABASE_BRANCH_PRODUCTION_MARKER",
);

for (const databaseUrl of [
  "postgresql://app:dummy@localhost:5432/ses_console_local",
  "postgresql://app:dummy@127.0.0.1:5432/ses_console_test?schema=public",
  "postgresql://app:dummy@dev-db.example.invalid:5432/ses_console_dev?branch=feature",
  "postgresql://app:dummy@staging-db.example.invalid:5432/ses_console_staging?schema=staging",
  "postgresql://app:dummy@shared-db.example.invalid:5432/ses_console_shared?schema=shared",
]) {
  assertAllowedEnv({ DATABASE_URL: databaseUrl });
}

for (const env of [
  {},
  { NODE_ENV: "development" },
  { NODE_ENV: "test" },
  { VERCEL_ENV: "preview" },
  { DATABASE_URL: "" },
  { DATABASE_URL: "not a url" },
]) {
  assertAllowedEnv(env);
}

assert.equal(isDeployedRuntime({}), false);
assert.equal(isDeployedRuntime({ NODE_ENV: "production" }), true);
assert.equal(isDeployedRuntime({ VERCEL_ENV: "preview" }), true);
assert.equal(isDeployedRuntime({ NODE_ENV: "development", VERCEL_ENV: "" }), false);

assert.deepEqual(missingEnvNames(["DATABASE_URL", "API_TOKEN"], {}), ["DATABASE_URL", "API_TOKEN"]);
assert.deepEqual(missingEnvNames(["DATABASE_URL", "API_TOKEN"], { DATABASE_URL: "postgresql://dummy" }), [
  "API_TOKEN",
]);
assert.deepEqual(
  missingEnvNames(["DATABASE_URL", "API_TOKEN"], { DATABASE_URL: "postgresql://dummy", API_TOKEN: "dummy" }),
  [],
);

console.log("production guard contract tests passed.");
