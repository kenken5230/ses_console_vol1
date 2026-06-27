type Status = "PASS" | "WARN" | "FAIL";

type Check = {
  name: string;
  status: Status;
  detail: string;
};

const REQUIRED_FOR_SERVER_TRIGGER = ["CRON_SECRET"];
const OPTIONAL_SERVER_TRIGGER = ["ADMIN_SECRET"];
const REQUIRED_FOR_GMAIL_SYNC = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"];
const OPTIONAL_GMAIL_CONFIG = [
  "GMAIL_REDIRECT_URI",
  "GMAIL_AUTH_USER",
  "GMAIL_USER_ID",
  "GMAIL_QUERY",
];

function hasValue(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function envPresence(name: string, required: boolean): Check {
  const present = hasValue(name);
  return {
    name,
    status: present ? "PASS" : required ? "FAIL" : "WARN",
    detail: present ? "configured" : required ? "missing" : "not configured",
  };
}

function secretLengthCheck(name: string, required: boolean, minimumLength: number): Check {
  const value = process.env[name]?.trim();
  if (!value) return envPresence(name, required);
  return {
    name,
    status: value.length >= minimumLength ? "PASS" : "FAIL",
    detail: value.length >= minimumLength ? `configured; length ${minimumLength}+` : `too short; must be ${minimumLength}+ characters`,
  };
}

function dateCheck(name: string): Check {
  const value = process.env[name]?.trim();
  if (!value) return envPresence(name, false);
  return {
    name,
    status: /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value) ? "PASS" : "FAIL",
    detail: "configured; expected YYYY-MM-DD or YYYY/M/D",
  };
}

function positiveIntegerCheck(name: string, required = false): Check {
  const value = process.env[name]?.trim();
  if (!value) return envPresence(name, required);
  const parsed = Number(value);
  return {
    name,
    status: Number.isInteger(parsed) && parsed > 0 ? "PASS" : "FAIL",
    detail: Number.isInteger(parsed) && parsed > 0 ? "configured; positive integer" : "must be a positive integer",
  };
}

function syncPageSizeCheck(): Check {
  const check = positiveIntegerCheck("GMAIL_SYNC_PAGE_SIZE");
  if (check.status !== "PASS") return check;
  const parsed = Number(process.env.GMAIL_SYNC_PAGE_SIZE);
  return {
    name: "GMAIL_SYNC_PAGE_SIZE",
    status: parsed <= 500 ? "PASS" : "FAIL",
    detail: parsed <= 500 ? "configured; <= 500" : "must be <= 500",
  };
}

function printCheck(check: Check): void {
  console.log(`${check.status} ${check.name}: ${check.detail}`);
}

function hasFailure(checks: Check[]): boolean {
  return checks.some((check) => check.status === "FAIL");
}

export function buildGmailAdminEnvReadinessChecks(): Check[] {
  return [
    ...REQUIRED_FOR_SERVER_TRIGGER.map((name) => secretLengthCheck(name, true, 16)),
    ...OPTIONAL_SERVER_TRIGGER.map((name) => secretLengthCheck(name, false, 16)),
    ...REQUIRED_FOR_GMAIL_SYNC.map((name) => envPresence(name, true)),
    ...OPTIONAL_GMAIL_CONFIG.map((name) => envPresence(name, false)),
    dateCheck("GMAIL_SYNC_FROM"),
    dateCheck("GMAIL_SYNC_TO"),
    positiveIntegerCheck("GMAIL_INITIAL_SYNC_LIMIT"),
    syncPageSizeCheck(),
    positiveIntegerCheck("GMAIL_SYNC_MAX_RESULTS"),
    positiveIntegerCheck("GMAIL_SYNC_LOCK_TTL_SECONDS"),
    positiveIntegerCheck("GMAIL_CLASSIFY_LIMIT"),
    positiveIntegerCheck("GMAIL_EXTRACT_LIMIT"),
  ];
}

export function runGmailAdminEnvReadiness(): Check[] {
  console.log("Gmail admin env readiness check");
  console.log("Secret values, tokens, DB URLs, and email addresses are not printed.");

  const checks = buildGmailAdminEnvReadinessChecks();
  for (const check of checks) printCheck(check);

  if (hasFailure(checks)) {
    process.exitCode = 1;
  }

  return checks;
}

if (require.main === module) {
  try {
    runGmailAdminEnvReadiness();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`FAIL GMAIL_ADMIN_ENV_READINESS: ${errorName}; diagnostic failed before completion. Check runtime logs in an approved secret-safe environment.`);
    process.exitCode = 1;
  }
}
