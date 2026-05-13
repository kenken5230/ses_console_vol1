type GuardEnv = Partial<Record<string, string | undefined>>;

type GuardReason = {
  code: string;
  detail: string;
};

function lower(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function parseDatabaseUrl(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function databaseTargetLooksProduction(databaseUrl: string | undefined): GuardReason | null {
  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed) return null;

  const host = lower(parsed.hostname);
  const database = lower(parsed.pathname.replace(/^\//, ""));
  const search = lower(parsed.search);
  const productionMarkers = ["production", "prod", "prd", "ses_console_prod"];

  if (productionMarkers.some((marker) => host.includes(marker))) {
    return { code: "DATABASE_HOST_PRODUCTION_MARKER", detail: "DATABASE_URL host looks production-like" };
  }

  if (productionMarkers.some((marker) => database.includes(marker))) {
    return { code: "DATABASE_NAME_PRODUCTION_MARKER", detail: "DATABASE_URL database name looks production-like" };
  }

  if (/(^|[?&])(branch|options|schema)=([^&]*)(production|prod|prd|main)/i.test(search)) {
    return { code: "DATABASE_BRANCH_PRODUCTION_MARKER", detail: "DATABASE_URL query looks production-like" };
  }

  return null;
}

export function detectProductionMutationRisk(env: GuardEnv = process.env): GuardReason[] {
  const reasons: GuardReason[] = [];

  if (env.NODE_ENV === "production") {
    reasons.push({ code: "NODE_ENV_PRODUCTION", detail: "NODE_ENV is production" });
  }

  if (env.VERCEL_ENV === "production") {
    reasons.push({ code: "VERCEL_ENV_PRODUCTION", detail: "VERCEL_ENV is production" });
  }

  const databaseReason = databaseTargetLooksProduction(env.DATABASE_URL);
  if (databaseReason) reasons.push(databaseReason);

  return reasons;
}

export function assertNotProductionMutation(operationName: string, env: GuardEnv = process.env): void {
  const reasons = detectProductionMutationRisk(env);
  if (!reasons.length) return;

  const codes = reasons.map((reason) => reason.code).join(", ");
  throw new Error(
    `${operationName} is blocked by production guard. Refusing to run destructive or bulk data mutation in production-like environment. Reasons: ${codes}.`,
  );
}

export function isDeployedRuntime(env: GuardEnv = process.env): boolean {
  return Boolean(env.VERCEL_ENV) || env.NODE_ENV === "production";
}

export function missingEnvNames(names: string[], env: GuardEnv = process.env): string[] {
  return names.filter((name) => !env[name]?.trim());
}
