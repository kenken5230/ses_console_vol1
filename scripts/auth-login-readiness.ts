import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type CheckStatus = "PASS" | "WARN" | "FAIL";

type Check = {
  name: string;
  status: CheckStatus;
  detail: string;
};

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function envCheck(name: string, required = true): Check {
  const present = hasValue(name);
  return {
    name,
    status: present ? "PASS" : required ? "FAIL" : "WARN",
    detail: present ? "configured" : required ? "missing" : "not configured"
  };
}

function authSecretCheck(): Check {
  const value = process.env.AUTH_SECRET;
  if (!value) return { name: "AUTH_SECRET", status: "FAIL", detail: "missing" };
  if (value.length < 32) return { name: "AUTH_SECRET", status: "FAIL", detail: "too short; must be 32+ characters" };
  return { name: "AUTH_SECRET", status: "PASS", detail: "configured; length OK" };
}

function smtpChecks(): Check[] {
  const checks = [envCheck("SMTP_HOST"), envCheck("MAIL_FROM")];
  const userPresent = hasValue("SMTP_USER");
  const passwordPresent = hasValue("SMTP_PASSWORD");

  if (userPresent !== passwordPresent) {
    checks.push({
      name: "SMTP_AUTH_PAIR",
      status: "FAIL",
      detail: "SMTP_USER and SMTP_PASSWORD must be configured together"
    });
  } else {
    checks.push({
      name: "SMTP_AUTH_PAIR",
      status: "PASS",
      detail: userPresent ? "configured" : "not configured; unauthenticated SMTP"
    });
  }

  return checks;
}

function printCheck(check: Check) {
  console.log(`${check.status} ${check.name}: ${check.detail}`);
}

function hasFailure(checks: Check[]) {
  return checks.some((check) => check.status === "FAIL");
}

async function runDatabaseChecks(connectionString: string): Promise<Check[]> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const [totalUsers, activeUsers, activeUsersWithPassword, roleRows] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true, passwordHash: { not: null } } }),
      prisma.user.groupBy({ by: ["role", "isActive"], _count: { _all: true } })
    ]);

    const activeUsersWithoutPassword = activeUsers - activeUsersWithPassword;
    const checks: Check[] = [
      { name: "DB_USERS_TOTAL", status: totalUsers > 0 ? "PASS" : "FAIL", detail: `${totalUsers}` },
      { name: "DB_ACTIVE_USERS", status: activeUsers > 0 ? "PASS" : "FAIL", detail: `${activeUsers}` },
      { name: "DB_ACTIVE_USERS_WITH_PASSWORD", status: activeUsersWithPassword > 0 ? "PASS" : "FAIL", detail: `${activeUsersWithPassword}` },
      { name: "DB_ACTIVE_USERS_WITHOUT_PASSWORD", status: activeUsersWithoutPassword === 0 ? "PASS" : "FAIL", detail: `${activeUsersWithoutPassword}` }
    ];

    for (const check of checks) printCheck(check);

    console.log("ROLE_COUNTS");
    for (const row of roleRows) {
      console.log(`  role=${row.role} active=${row.isActive} count=${row._count._all}`);
    }

    return checks;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("Auth login readiness check");
  console.log("Secrets, passwords, tokens, DB URLs, and email addresses are not printed.");

  const checks = [envCheck("DATABASE_URL"), authSecretCheck(), envCheck("APP_URL", false), envCheck("APP_BASE_URL", false), ...smtpChecks()];
  for (const check of checks) printCheck(check);
  let failed = hasFailure(checks);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("SKIP DB_READINESS: DATABASE_URL is missing");
    process.exitCode = 1;
    return;
  }

  const databaseChecks = await runDatabaseChecks(databaseUrl);
  failed = failed || hasFailure(databaseChecks);

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`FAIL AUTH_READINESS: ${errorName}; diagnostic failed before completion. Check runtime logs in an approved secret-safe environment.`);
  process.exitCode = 1;
});
