import { Client } from "pg";

import { BLOCKED_COMPANY_LINK_TRADE_STATUSES } from "../lib/link-safety-policy";

const INTENT = "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCTION_LIKE_SIGNAL_PATTERN = /production|prod(?!uct)|live|primary/;

type SmokeCase =
  | "success"
  | "existing-owner"
  | "stale-expected-updated-at"
  | "contact-company-mismatch"
  | "inactive-contact"
  | "blocked-company";

type TargetClass = "local" | "test" | "staging" | "production" | "shared" | "unknown";

type ParsedDatabaseTarget = {
  host: string;
  port: string;
  database: string;
  queryKeys: string[];
  dbSignalText: string;
};

type ParsedArgs = {
  caseName: SmokeCase;
  classifyOnly: boolean;
  confirmStagingReadOnly: boolean;
  personId: string | null;
  companyId: string | null;
  contactId: string | null;
};

type FixtureRows = {
  person: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  auditLogCount: number;
};

function usage() {
  return [
    "Usage:",
    "  npm run person-owner-link:http-smoke:preflight -- --classify-only",
    "  npm run person-owner-link:http-smoke:preflight -- --case success --person-id <uuid> --company-id <uuid> --contact-id <uuid>",
    "",
    "Cases:",
    "  success",
    "  existing-owner",
    "  stale-expected-updated-at",
    "  contact-company-mismatch",
    "  inactive-contact",
    "  blocked-company",
    "",
    "Safety:",
    "  Environment is process-only. The script does not load .env files.",
    "  The script never writes. It refuses production-like targets and uses a read-only transaction for fixture checks.",
  ].join("\n");
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    caseName: "success",
    classifyOnly: false,
    confirmStagingReadOnly: false,
    personId: null,
    companyId: null,
    contactId: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--classify-only") {
      parsed.classifyOnly = true;
      continue;
    }
    if (arg === "--confirm-staging-read-only") {
      parsed.confirmStagingReadOnly = true;
      continue;
    }
    if (arg === "--case") {
      if (!isSmokeCase(next)) throw new Error("--case must be a supported smoke case");
      parsed.caseName = next;
      i += 1;
      continue;
    }
    if (arg === "--person-id") {
      parsed.personId = requireUuid(next, "--person-id");
      i += 1;
      continue;
    }
    if (arg === "--company-id") {
      parsed.companyId = requireUuid(next, "--company-id");
      i += 1;
      continue;
    }
    if (arg === "--contact-id") {
      parsed.contactId = requireUuid(next, "--contact-id");
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.classifyOnly && (!parsed.personId || !parsed.companyId || !parsed.contactId)) {
    throw new Error("Fixture preflight requires --person-id, --company-id, and --contact-id");
  }

  return parsed;
}

function isSmokeCase(value: string | undefined): value is SmokeCase {
  return value === "success"
    || value === "existing-owner"
    || value === "stale-expected-updated-at"
    || value === "contact-company-mismatch"
    || value === "inactive-contact"
    || value === "blocked-company";
}

function requireUuid(value: string | undefined, flag: string) {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new Error(`${flag} must be a UUID`);
  }
  return value;
}

function parseDatabaseUrl(rawUrl: string): ParsedDatabaseTarget {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  return {
    host: url.hostname || "(none)",
    port: url.port || "(default)",
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "(none)",
    queryKeys: Array.from(url.searchParams.keys()).sort(),
    dbSignalText: [
      url.hostname,
      url.pathname,
      url.searchParams.get("branch"),
      url.searchParams.get("schema"),
      url.searchParams.get("options"),
      process.env.NODE_ENV,
      process.env.VERCEL_ENV,
    ].filter(Boolean).join(" ").toLowerCase(),
  };
}

function classifyTarget(signalText: string, host: string, database: string): TargetClass {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (PRODUCTION_LIKE_SIGNAL_PATTERN.test(signalText)) return "production";
  if (hasTargetMarker(signalText, ["shared", "common"])) return "shared";
  if (hasTargetMarker(signalText, ["staging", "stage", "uat", "preview"])) return "staging";
  if (hasTargetMarker(signalText, ["test", "testing", "ci", "spec", "smoke", "fixture"])) return "test";
  if (localHosts.has(host.toLowerCase()) || database.toLowerCase().endsWith("_dev")) return "local";
  return "unknown";
}

function hasTargetMarker(signalText: string, markers: string[]) {
  const escaped = markers.map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`(?:^|[^a-z0-9])(?:${escaped})(?:$|[^a-z0-9])`).test(signalText);
}

function safeRouteGuardTarget(value: string | undefined) {
  if (!value) return "(unset)";
  if (["local", "test", "staging", "production"].includes(value)) return value;
  return "(set: non-standard)";
}

function printTargetSummary(target: ParsedDatabaseTarget, classification: TargetClass) {
  console.log("Target database:");
  console.log(`  classification: ${classification}`);
  console.log(`  host: ${target.host}`);
  console.log(`  port: ${target.port}`);
  console.log(`  database: ${target.database}`);
  console.log(`  queryKeys: ${target.queryKeys.length ? target.queryKeys.join(",") : "(none)"}`);
  console.log("Runtime guard:");
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || "(unset)"}`);
  console.log(`  VERCEL_ENV: ${process.env.VERCEL_ENV || "(unset)"}`);
  console.log(`  COMPANY_CONTACT_LINK_WRITE_ENABLED_is_true: ${process.env.COMPANY_CONTACT_LINK_WRITE_ENABLED === "true"}`);
  console.log(`  COMPANY_CONTACT_LINK_WRITE_TARGET: ${safeRouteGuardTarget(process.env.COMPANY_CONTACT_LINK_WRITE_TARGET)}`);
  console.log(`  AUTH_SECRET_present: ${Boolean(process.env.AUTH_SECRET)}`);
}

function assertTargetAllowedForReadOnlyPreflight(classification: TargetClass, args: ParsedArgs) {
  if (classification === "production") {
    throw new Error("Refusing production-like target before DB connection");
  }
  if (classification === "shared") {
    throw new Error("Refusing shared-like target before DB connection");
  }
  if (classification === "unknown") {
    throw new Error("Refusing unknown DB target; classify it as local/test/staging before preflight");
  }
  if (classification === "staging" && !args.confirmStagingReadOnly) {
    throw new Error("Refusing staging read-only preflight without --confirm-staging-read-only");
  }
}

async function fetchFixtureRows(connectionString: string, args: ParsedArgs): Promise<FixtureRows> {
  if (!args.personId || !args.companyId || !args.contactId) {
    throw new Error("Fixture IDs are required for DB preflight");
  }

  const client = new Client({
    connectionString,
    application_name: "person-owner-link-http-smoke-preflight-readonly",
  });

  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");

    const person = await client.query(
      [
        'SELECT id, "owner_company_id" AS "ownerCompanyId",',
        '       "owner_contact_id" AS "ownerContactId",',
        '       "updated_at" AS "updatedAt"',
        'FROM "persons"',
        "WHERE id = $1",
      ].join(" "),
      [args.personId],
    );
    const company = await client.query(
      'SELECT id, "trade_status" AS "tradeStatus" FROM "companies" WHERE id = $1',
      [args.companyId],
    );
    const contact = await client.query(
      'SELECT id, "company_id" AS "companyId", "is_active" AS "isActive" FROM "company_contacts" WHERE id = $1',
      [args.contactId],
    );
    const auditLog = await client.query(
      [
        'SELECT COUNT(*)::int AS count',
        'FROM "audit_logs"',
        'WHERE "entity_type" = $1 AND "entity_id" = $2 AND "action" = $3',
      ].join(" "),
      ["Person", args.personId, INTENT],
    );

    await client.query("ROLLBACK");

    return {
      person: person.rows[0] ?? null,
      company: company.rows[0] ?? null,
      contact: contact.rows[0] ?? null,
      auditLogCount: Number(auditLog.rows[0]?.count ?? 0),
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function rowExists(row: Record<string, unknown> | null) {
  return Boolean(row);
}

function printFixtureSummary(rows: FixtureRows) {
  const ownerCompanyId = asString(rows.person?.ownerCompanyId);
  const ownerContactId = asString(rows.person?.ownerContactId);
  const contactCompanyId = asString(rows.contact?.companyId);
  const contactActive = asBoolean(rows.contact?.isActive);
  const tradeStatus = asString(rows.company?.tradeStatus) || "(missing)";

  console.log("Fixture read-only result:");
  console.log(`  personExists: ${rowExists(rows.person)}`);
  console.log(`  personOwnerCompanyIdPresent: ${Boolean(ownerCompanyId)}`);
  console.log(`  personOwnerContactIdPresent: ${Boolean(ownerContactId)}`);
  console.log(`  personUpdatedAt: ${rows.person?.updatedAt instanceof Date ? rows.person.updatedAt.toISOString() : "(missing)"}`);
  console.log(`  companyExists: ${rowExists(rows.company)}`);
  console.log(`  companyTradeStatus: ${tradeStatus}`);
  console.log(`  contactExists: ${rowExists(rows.contact)}`);
  console.log(`  contactCompanyMatchesCandidate: ${rows.company && rows.contact ? contactCompanyId === rows.company.id : false}`);
  console.log(`  contactIsActive: ${contactActive}`);
  console.log(`  existingAuditLogCountForPersonAction: ${rows.auditLogCount}`);
  console.log("  readOnlyTransaction: true");
  console.log("  writeAttempted: false");
}

function evaluateFixture(caseName: SmokeCase, rows: FixtureRows) {
  const failures: string[] = [];
  const ownerCompanyId = asString(rows.person?.ownerCompanyId);
  const ownerContactId = asString(rows.person?.ownerContactId);
  const contactCompanyId = asString(rows.contact?.companyId);
  const contactActive = asBoolean(rows.contact?.isActive);
  const tradeStatus = asString(rows.company?.tradeStatus) || "UNKNOWN";
  const hasOwner = Boolean(ownerCompanyId || ownerContactId);
  const contactMatches = Boolean(rows.company && rows.contact && contactCompanyId === rows.company.id);
  const companyBlocked = BLOCKED_COMPANY_LINK_TRADE_STATUSES.includes(
    tradeStatus as (typeof BLOCKED_COMPANY_LINK_TRADE_STATUSES)[number],
  );

  if (!rows.person) failures.push("Person fixture was not found");
  if (!rows.company) failures.push("Company fixture was not found");
  if (!rows.contact) failures.push("CompanyContact fixture was not found");
  if (failures.length) return failures;

  if (caseName === "success") {
    if (hasOwner) failures.push("Success case requires person owner IDs to be null");
    if (!contactMatches) failures.push("Success case requires contact.companyId to match company.id");
    if (contactActive !== true) failures.push("Success case requires active contact");
    if (companyBlocked) failures.push("Success case requires non-blocked company tradeStatus");
  }

  if (caseName === "existing-owner" && !hasOwner) {
    failures.push("Existing-owner case requires an ownerCompanyId or ownerContactId already present");
  }

  if (caseName === "stale-expected-updated-at") {
    if (hasOwner) failures.push("Stale-updatedAt case should use a person without owner IDs");
    if (!contactMatches) failures.push("Stale-updatedAt case should keep company/contact otherwise valid");
    if (contactActive !== true) failures.push("Stale-updatedAt case should keep contact active");
    if (companyBlocked) failures.push("Stale-updatedAt case should keep company non-blocked");
  }

  if (caseName === "contact-company-mismatch" && contactMatches) {
    failures.push("Mismatch case requires contact.companyId to differ from company.id");
  }

  if (caseName === "inactive-contact") {
    if (!contactMatches) failures.push("Inactive-contact case should use a matching company/contact pair");
    if (contactActive !== false) failures.push("Inactive-contact case requires CompanyContact.isActive=false");
  }

  if (caseName === "blocked-company" && !companyBlocked) {
    failures.push("Blocked-company case requires tradeStatus NG, NEEDS_REVIEW, or SUSPENDED");
  }

  return failures;
}

function safeExitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Preflight stopped safely: ${message}`);
  console.error("No DB write or HTTP smoke request was attempted.");
  process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const target = parseDatabaseUrl(connectionString);
  const classification = classifyTarget(target.dbSignalText, target.host, target.database);
  printTargetSummary(target, classification);
  assertTargetAllowedForReadOnlyPreflight(classification, args);

  if (args.classifyOnly) {
    console.log("Classify-only mode: no DB connection or fixture query was attempted.");
    console.log("writeAttempted: false");
    return;
  }

  const rows = await fetchFixtureRows(connectionString, args);
  printFixtureSummary(rows);

  const failures = evaluateFixture(args.caseName, rows);
  if (failures.length) {
    console.log("Fixture readiness: blocked");
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Fixture readiness: ok for ${args.caseName}`);
  console.log("Next step: request explicit approval before any real HTTP write smoke.");
}

main().catch(safeExitError);
