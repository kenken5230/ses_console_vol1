import "dotenv/config";

import { analyzePersonNameCandidate, personDisplayName } from "./gmail-extraction";

const maxRemediationLimit = 50;
const defaultCountOnlyScanLimit = 1000;
const maxScanLimit = 5000;
const maxPreviewRows = 50;

type PrismaClient = (typeof import("../lib/prisma"))["prisma"];

let prismaClient: PrismaClient | null = null;

type Args = {
  apply: boolean;
  countOnly: boolean;
  limit: number | null;
  scanLimit: number;
};

type PersonForRemediation = {
  id: string;
  personCode: string | null;
  name: string | null;
  initials: string | null;
  createdAt: Date;
  sourceMail: {
    id: string;
    subject: string | null;
    externalMessageId: string;
    sourceAccount: {
      provider: string;
    };
  } | null;
  skills: Array<{ skillName: string }>;
};

type RemediationCandidate = {
  person: PersonForRemediation;
  reviewReasons: string[];
  displayName: string;
};

type OutputRow = {
  mode: "preview" | "scan-preview" | "count-only" | "apply";
  status: "candidate" | "updated" | "skipped" | "failed";
  personId: string;
  personCode: string;
  mailId: string;
  currentName: string;
  newName: string;
  displayName: string;
  nameConfidence: string;
  reviewReasons: string;
  subject: string;
  skillCount: number;
  createdAt: string;
  error?: string;
};

function parseArgs(argv = process.argv.slice(2)): Args {
  let rawLimit: string | undefined;
  let rawScanLimit: string | undefined;
  let apply = false;
  let countOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--count-only") {
      countOnly = true;
      continue;
    }

    if (arg === "--limit") {
      rawLimit = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      rawLimit = arg.split("=")[1];
      continue;
    }

    if (arg === "--scan-limit") {
      rawScanLimit = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--scan-limit=")) {
      rawScanLimit = arg.split("=")[1];
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (apply && countOnly) {
    throw new Error("--count-only cannot be combined with --apply.");
  }
  if (apply && rawScanLimit) {
    throw new Error("--scan-limit cannot be combined with --apply. Use --limit=N for apply.");
  }

  const limit = rawLimit ? Number(rawLimit) : NaN;
  if (apply) {
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new Error(`Missing required --limit=N for apply. Use a small limit first, e.g. --limit=5. Max is ${maxRemediationLimit}.`);
    }
    if (limit > maxRemediationLimit) {
      throw new Error(`--limit must be ${maxRemediationLimit} or less for safe remediation apply.`);
    }

    return { apply, countOnly, limit: Math.trunc(limit), scanLimit: Math.trunc(limit) };
  }

  const scanLimit = rawScanLimit
    ? Number(rawScanLimit)
    : Number.isFinite(limit) && limit > 0
      ? limit
      : countOnly
        ? defaultCountOnlyScanLimit
        : NaN;
  if (!Number.isFinite(scanLimit) || scanLimit <= 0) {
    throw new Error(
      `Missing required --limit=N or --scan-limit=N. For whole preview, use --scan-limit=${defaultCountOnlyScanLimit} or --count-only.`,
    );
  }
  if (scanLimit > maxScanLimit) {
    throw new Error(`--scan-limit must be ${maxScanLimit} or less for safe read-only scanning.`);
  }
  if (Number.isFinite(limit) && limit > maxRemediationLimit) {
    throw new Error(`--limit must be ${maxRemediationLimit} or less. Use --scan-limit=N for larger read-only scans.`);
  }

  return {
    apply,
    countOnly,
    limit: Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : null,
    scanLimit: Math.trunc(scanLimit),
  };
}

function shortId(value: string | null | undefined): string {
  return value ? value.slice(0, 8) : "";
}

function shortText(value: string | null | undefined, maxLength = 120): string {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function safeJsonText(value: string | null | undefined, maxLength = 500): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function safeInitials(value: string | null): string | null {
  const initials = value?.trim();
  if (!initials) return null;
  if (!/^[A-Z]{2,3}$|^[A-Z][.,][A-Z](?:[.,][A-Z])?$/i.test(initials)) return null;
  return initials.toUpperCase().replace(",", ".");
}

function redactSecrets(value: string): string {
  let text = value;
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    text = text.split(databaseUrl).join("[REDACTED_DATABASE_URL]");
  }
  return text
    .replace(/\bDATABASE_URL\b/g, "[REDACTED_DATABASE_URL]")
    .replace(/\b(?:postgres(?:ql)?|mysql|sqlserver):\/\/[^\s"'<>]+/gi, "[REDACTED_DATABASE_URL]");
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactSecrets(message);
}

async function getPrisma(): Promise<PrismaClient> {
  if (!prismaClient) {
    const imported = await import("../lib/prisma");
    prismaClient = imported.prisma;
  }
  return prismaClient;
}

function buildCandidate(person: PersonForRemediation): RemediationCandidate | null {
  if (!person.name?.trim()) return null;
  if (person.sourceMail?.sourceAccount.provider !== "GMAIL") return null;

  const skills = person.skills.map((skill) => skill.skillName);
  const analysis = analyzePersonNameCandidate({
    candidate: person.name,
    initials: person.initials,
    subject: person.sourceMail?.subject ?? null,
    skills,
  });
  const isLowConfidenceName =
    !analysis.acceptedName &&
    (analysis.reviewReasons.includes("PERSON_NAME_LOW_CONFIDENCE") ||
      analysis.reviewReasons.includes("PERSON_NAME_FROM_SUBJECT_REJECTED"));

  if (!isLowConfidenceName) return null;

  return {
    person,
    reviewReasons: unique([...analysis.reviewReasons, "EXISTING_PERSON_NAME_LOOKS_LOW_CONFIDENCE"]),
    displayName: personDisplayName(person.sourceMail?.id ?? person.id, null, safeInitials(person.initials)),
  };
}

function candidateRow(
  candidate: RemediationCandidate,
  mode: OutputRow["mode"],
  status: OutputRow["status"],
  error?: string,
): OutputRow {
  const person = candidate.person;
  const skills = person.skills.map((skill) => skill.skillName);
  const analysis = analyzePersonNameCandidate({
    candidate: person.name,
    initials: person.initials,
    subject: person.sourceMail?.subject ?? null,
    skills,
  });

  return {
    mode,
    status,
    personId: shortId(person.id),
    personCode: person.personCode ?? "",
    mailId: shortId(person.sourceMail?.id),
    currentName: shortText(person.name),
    newName: "null",
    displayName: candidate.displayName,
    nameConfidence: analysis.nameConfidence,
    reviewReasons: candidate.reviewReasons.join(", "),
    subject: shortText(person.sourceMail?.subject),
    skillCount: skills.length,
    createdAt: person.createdAt.toISOString().slice(0, 10),
    ...(error ? { error: shortText(error, 120) } : {}),
  };
}

async function applyCandidate(candidate: RemediationCandidate): Promise<"updated" | "skipped"> {
  const person = candidate.person;
  if (!person.sourceMail) return "skipped";
  const db = await getPrisma();

  return db.$transaction(async (tx) => {
    const updated = await tx.person.updateMany({
      where: {
        id: person.id,
        sourceMailId: { not: null },
        sourceMail: {
          is: {
            sourceAccount: {
              is: {
                provider: "GMAIL",
              },
            },
          },
        },
        status: { not: "ARCHIVED" },
        name: person.name,
      },
      data: {
        name: null,
      },
    });

    if (updated.count !== 1) return "skipped";

    await tx.extractionResult.create({
      data: {
        mailNotificationId: person.sourceMail.id,
        targetType: "PERSON",
        targetId: person.id,
        extractionType: "PERSON_EXTRACTION",
        modelName: "remediation-cli",
        modelVersion: "gmail-person-remediation-v0.1",
        confidence: "0.3500",
        reviewStatus: "NEEDS_REVIEW",
        rawResult: {
          action: "gmail_person_name_remediation",
          mode: "apply",
          beforeName: safeJsonText(person.name),
          afterName: null,
          displayName: candidate.displayName,
          subject: safeJsonText(person.sourceMail.subject),
          reviewReasons: candidate.reviewReasons,
        },
        normalizedResult: {
          target: "person",
          name: null,
          initials: safeInitials(person.initials),
          nameConfidence: "LOW",
          nameSource: "none",
          rejectedNameCandidate: safeJsonText(person.name),
          needsReview: true,
          reviewReasons: unique([...candidate.reviewReasons, "EXISTING_PERSON_NAME_REMEDIATED"]),
          remediation: {
            action: "clear_subject_like_gmail_person_name",
            mode: "apply",
            previousName: safeJsonText(person.name),
            newName: null,
            displayName: candidate.displayName,
          },
        },
      },
    });

    return "updated";
  });
}

async function main(): Promise<void> {
  const args = parseArgs();
  const mode = args.apply ? "apply" : args.countOnly ? "count-only" : args.limit ? "preview" : "scan-preview";
  const db = await getPrisma();
  const persons = await db.person.findMany({
    where: {
      sourceMailId: { not: null },
      sourceMail: {
        is: {
          sourceAccount: {
            is: {
              provider: "GMAIL",
            },
          },
        },
      },
      status: { not: "ARCHIVED" },
      name: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: args.scanLimit,
    select: {
      id: true,
      personCode: true,
      name: true,
      initials: true,
      createdAt: true,
      sourceMail: {
        select: {
          id: true,
          subject: true,
          externalMessageId: true,
          sourceAccount: {
            select: {
              provider: true,
            },
          },
        },
      },
      skills: {
        select: {
          skillName: true,
        },
      },
    },
  });

  const candidates: RemediationCandidate[] = [];
  const rows: OutputRow[] = [];
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const person of persons) {
    let candidate: RemediationCandidate | null = null;
    try {
      candidate = buildCandidate(person);
    } catch (error) {
      failed += 1;
      continue;
    }

    if (!candidate) {
      skipped += 1;
      continue;
    }

    candidates.push(candidate);

    if (!args.apply) {
      if (!args.countOnly && rows.length < maxPreviewRows) {
        rows.push(candidateRow(candidate, mode, "candidate"));
      }
      continue;
    }

    try {
      const result = await applyCandidate(candidate);
      if (result === "updated") {
        updated += 1;
        rows.push(candidateRow(candidate, mode, "updated"));
      } else {
        skipped += 1;
        rows.push(candidateRow(candidate, mode, "skipped"));
      }
    } catch (error) {
      failed += 1;
      rows.push(candidateRow(candidate, mode, "failed", errorMessage(error)));
    }
  }

  console.log(
    args.apply
      ? "Gmail person remediation apply. DB writes are limited to persons.name and extraction_results."
      : "Gmail person remediation preview. DB writes are not performed.",
  );
  console.log(
    `mode: ${mode}, scanLimit: ${args.scanLimit}, scanned: ${persons.length}, candidates: ${candidates.length}, updated: ${updated}, skipped: ${skipped}, failed: ${failed}, displayed: ${rows.length}`,
  );
  if (!args.apply && !args.countOnly && candidates.length > rows.length) {
    console.log(`candidate rows are limited to ${maxPreviewRows}. Use --count-only to hide rows.`);
  }
  if (!args.countOnly) {
    console.table(rows);
  }
}

main()
  .catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
