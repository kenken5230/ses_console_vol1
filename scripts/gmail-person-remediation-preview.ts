import "dotenv/config";

import { analyzePersonNameCandidate, personDisplayName } from "./gmail-extraction";

const maxRemediationLimit = 50;
const defaultCountOnlyScanLimit = 1000;
const maxScanLimit = 5000;
const maxPreviewRows = 50;
const maxUpdateLimit = 2000;
const defaultChunkSize = maxRemediationLimit;
const batchApplyConfirmation = "APPLY_GMAIL_PERSON_REMEDIATION";
const maxBatchApplySampleRows = 20;

type PrismaClient = (typeof import("../lib/prisma"))["prisma"];

let prismaClient: PrismaClient | null = null;

type RunMode = "preview" | "scan-preview" | "count-only" | "apply" | "batch-preview" | "batch-apply";

type Args = {
  apply: boolean;
  countOnly: boolean;
  batchApply: boolean;
  batchPreview: boolean;
  limit: number | null;
  scanLimit: number;
  updateLimit: number | null;
  chunkSize: number;
  confirm: string | null;
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
  mode: RunMode;
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

type PageCursor = {
  createdAt: Date;
  id: string;
};

type ChunkSummary = {
  chunk: number;
  scanned: number;
  candidates: number;
  updated: number;
  skipped: number;
  failed: number;
};

type BatchRunResult = {
  scannedTotal: number;
  candidatesTotal: number;
  updatedTotal: number;
  skippedTotal: number;
  failedTotal: number;
  stoppedReason: string;
  chunkSummaries: ChunkSummary[];
  rows: OutputRow[];
  failedRows: OutputRow[];
};

function parseArgs(argv = process.argv.slice(2)): Args {
  let rawLimit: string | undefined;
  let rawScanLimit: string | undefined;
  let rawBatchLimit: string | undefined;
  let rawUpdateLimit: string | undefined;
  let rawChunkSize: string | undefined;
  let confirm: string | undefined;
  let apply = false;
  let countOnly = false;
  let batchApply = false;
  let batchPreview = false;

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

    if (arg === "--batch-apply") {
      batchApply = true;
      continue;
    }

    if (arg === "--supervised-apply") {
      batchApply = true;
      continue;
    }

    if (arg === "--batch-preview") {
      batchPreview = true;
      continue;
    }

    if (arg === "--supervised-preview") {
      batchPreview = true;
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

    if (arg === "--batch-limit") {
      rawBatchLimit = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--batch-limit=")) {
      rawBatchLimit = arg.split("=")[1];
      continue;
    }

    if (arg === "--update-limit") {
      rawUpdateLimit = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--update-limit=")) {
      rawUpdateLimit = arg.split("=")[1];
      continue;
    }

    if (arg === "--chunk-size") {
      rawChunkSize = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--chunk-size=")) {
      rawChunkSize = arg.split("=")[1];
      continue;
    }

    if (arg === "--confirm") {
      confirm = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--confirm=")) {
      confirm = arg.split("=")[1];
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const batchMode = batchApply || batchPreview;
  if (batchApply && batchPreview) {
    throw new Error("--batch-apply cannot be combined with --batch-preview.");
  }
  if (batchMode) {
    if (apply || countOnly || rawLimit) {
      throw new Error("--batch-preview/--batch-apply cannot be combined with --apply, --count-only, or --limit.");
    }
    if (rawBatchLimit) {
      throw new Error("--batch-limit has been replaced by --scan-limit and --update-limit for supervised batch mode.");
    }

    const scanLimit = rawScanLimit ? Number(rawScanLimit) : NaN;
    if (!Number.isFinite(scanLimit) || scanLimit <= 0) {
      throw new Error(`Missing required --scan-limit=N for batch mode. Max is ${maxScanLimit}.`);
    }
    if (scanLimit > maxScanLimit) {
      throw new Error(`--scan-limit must be ${maxScanLimit} or less for safe batch scanning.`);
    }

    const updateLimit = rawUpdateLimit ? Number(rawUpdateLimit) : NaN;
    if (!Number.isFinite(updateLimit) || updateLimit <= 0) {
      throw new Error(`Missing required --update-limit=N for batch mode. Max is ${maxUpdateLimit}.`);
    }
    if (updateLimit > maxUpdateLimit) {
      throw new Error(`--update-limit must be ${maxUpdateLimit} or less for safe supervised remediation.`);
    }

    const chunkSize = rawChunkSize ? Number(rawChunkSize) : NaN;
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
      throw new Error(`Missing required --chunk-size=N for batch mode. Max is ${maxRemediationLimit}.`);
    }
    if (chunkSize > maxRemediationLimit) {
      throw new Error(`--chunk-size must be ${maxRemediationLimit} or less.`);
    }
    if (batchApply && confirm !== batchApplyConfirmation) {
      throw new Error(`Missing required --confirm=${batchApplyConfirmation} for --batch-apply.`);
    }

    return {
      apply: false,
      countOnly: false,
      batchApply,
      batchPreview,
      limit: null,
      scanLimit: Math.trunc(scanLimit),
      updateLimit: Math.trunc(updateLimit),
      chunkSize: Math.trunc(chunkSize),
      confirm: confirm ?? null,
    };
  }

  if (rawBatchLimit || rawUpdateLimit || rawChunkSize) {
    throw new Error("--batch-limit, --update-limit, and --chunk-size require --batch-preview or --batch-apply.");
  }
  if (confirm) {
    throw new Error("--confirm is only used with --batch-apply.");
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

    return {
      apply,
      countOnly,
      batchApply: false,
      batchPreview: false,
      limit: Math.trunc(limit),
      scanLimit: Math.trunc(limit),
      updateLimit: null,
      chunkSize: defaultChunkSize,
      confirm: null,
    };
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
    batchApply: false,
    batchPreview: false,
    limit: Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : null,
    scanLimit: Math.trunc(scanLimit),
    updateLimit: null,
    chunkSize: defaultChunkSize,
    confirm: null,
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

async function fetchRemediationPersons(take: number, after?: PageCursor): Promise<PersonForRemediation[]> {
  const db = await getPrisma();

  return db.person.findMany({
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
      ...(after
        ? {
            OR: [
              { createdAt: { lt: after.createdAt } },
              {
                createdAt: after.createdAt,
                id: { lt: after.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
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
}

function nextCursor(persons: PersonForRemediation[]): PageCursor | undefined {
  const last = persons[persons.length - 1];
  return last ? { createdAt: last.createdAt, id: last.id } : undefined;
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
  mode: RunMode,
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

async function runSingle(args: Args): Promise<void> {
  const mode: RunMode = args.apply ? "apply" : args.countOnly ? "count-only" : args.limit ? "preview" : "scan-preview";
  const persons = await fetchRemediationPersons(args.scanLimit);
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

async function runBatchScan(
  args: Args,
  options: {
    mode: RunMode;
    apply: boolean;
    rowLimit: number;
  },
): Promise<BatchRunResult> {
  const updateLimit = args.updateLimit ?? 0;
  const rows: OutputRow[] = [];
  const failedRows: OutputRow[] = [];
  const chunkSummaries: ChunkSummary[] = [];
  let after: PageCursor | undefined;
  let scannedTotal = 0;
  let candidatesTotal = 0;
  let updatedTotal = 0;
  let skippedTotal = 0;
  let failedTotal = 0;
  let stoppedReason = "scan_limit_reached";

  for (let chunk = 1; scannedTotal < args.scanLimit; chunk += 1) {
    const take = Math.min(args.chunkSize, args.scanLimit - scannedTotal);
    const persons = await fetchRemediationPersons(take, after);
    if (persons.length === 0) {
      stoppedReason = "no_more_persons";
      break;
    }

    const chunkSummary: ChunkSummary = {
      chunk,
      scanned: 0,
      candidates: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };
    let processedFullChunk = true;

    for (const person of persons) {
      if (options.apply && updatedTotal >= updateLimit) {
        stoppedReason = "update_limit_reached";
        processedFullChunk = false;
        break;
      }

      scannedTotal += 1;
      chunkSummary.scanned += 1;

      let candidate: RemediationCandidate | null = null;
      try {
        candidate = buildCandidate(person);
      } catch (error) {
        failedTotal += 1;
        chunkSummary.failed += 1;
        stoppedReason = "failed_in_chunk";
        processedFullChunk = false;
        break;
      }

      if (!candidate) {
        skippedTotal += 1;
        chunkSummary.skipped += 1;
        continue;
      }

      candidatesTotal += 1;
      chunkSummary.candidates += 1;

      if (!options.apply) {
        if (rows.length < options.rowLimit) {
          rows.push(candidateRow(candidate, options.mode, "candidate"));
        }
        continue;
      }

      try {
        const result = await applyCandidate(candidate);
        if (result === "updated") {
          updatedTotal += 1;
          chunkSummary.updated += 1;
          if (rows.length < options.rowLimit) {
            rows.push(candidateRow(candidate, options.mode, "updated"));
          }
          if (updatedTotal >= updateLimit) {
            stoppedReason = "update_limit_reached";
            processedFullChunk = false;
            break;
          }
        } else {
          skippedTotal += 1;
          chunkSummary.skipped += 1;
          if (rows.length < options.rowLimit) {
            rows.push(candidateRow(candidate, options.mode, "skipped"));
          }
        }
      } catch (error) {
        const row = candidateRow(candidate, options.mode, "failed", errorMessage(error));
        failedTotal += 1;
        chunkSummary.failed += 1;
        stoppedReason = "failed_in_chunk";
        failedRows.push(row);
        if (rows.length < options.rowLimit) {
          rows.push(row);
        }
        processedFullChunk = false;
        break;
      }
    }

    chunkSummaries.push(chunkSummary);

    if (chunkSummary.failed > 0) {
      break;
    }
    if (options.apply && updatedTotal >= updateLimit) {
      stoppedReason = "update_limit_reached";
      break;
    }
    if (!processedFullChunk) {
      break;
    }
    after = nextCursor(persons);
    if (persons.length < take) {
      stoppedReason = "no_more_persons";
      break;
    }
  }

  if (
    candidatesTotal === 0 &&
    (stoppedReason === "scan_limit_reached" || stoppedReason === "no_more_persons")
  ) {
    stoppedReason = "no_candidates_in_scan";
  }

  return {
    scannedTotal,
    candidatesTotal,
    updatedTotal,
    skippedTotal,
    failedTotal,
    stoppedReason,
    chunkSummaries,
    rows,
    failedRows,
  };
}

async function runBatch(args: Args): Promise<void> {
  const mode: RunMode = args.batchApply ? "batch-apply" : "batch-preview";
  const updateLimit = args.updateLimit ?? 0;

  if (!args.batchApply) {
    const result = await runBatchScan(args, {
      mode,
      apply: false,
      rowLimit: maxPreviewRows,
    });
    const wouldUpdateTotal = Math.min(result.candidatesTotal, updateLimit);

    console.log("Gmail person remediation batch preview. DB writes are not performed.");
    console.log(
      `mode: ${mode}, scanLimit: ${args.scanLimit}, updateLimit: ${updateLimit}, chunkSize: ${args.chunkSize}, scannedTotal: ${result.scannedTotal}, candidatesTotal: ${result.candidatesTotal}, wouldUpdateTotal: ${wouldUpdateTotal}, updatedTotal: 0, skippedTotal: ${result.skippedTotal}, failedTotal: ${result.failedTotal}, chunks: ${result.chunkSummaries.length}, stoppedReason: ${result.stoppedReason}, displayed: ${result.rows.length}`,
    );
    console.table(result.chunkSummaries);
    if (result.candidatesTotal > result.rows.length) {
      console.log(`candidate rows are limited to ${maxPreviewRows}.`);
    }
    console.table(result.rows);
    if (result.failedRows.length > 0) {
      console.table(result.failedRows);
    }
    return;
  }

  const before = await runBatchScan(args, {
    mode: "count-only",
    apply: false,
    rowLimit: 0,
  });
  const applyResult =
    before.failedTotal > 0
      ? {
          scannedTotal: 0,
          candidatesTotal: 0,
          updatedTotal: 0,
          skippedTotal: 0,
          failedTotal: 0,
          stoppedReason: "not_started_due_to_pre_count_failure",
          chunkSummaries: [],
          rows: [],
          failedRows: [],
        }
      : await runBatchScan(args, {
          mode,
          apply: true,
          rowLimit: maxBatchApplySampleRows,
        });
  const after =
    before.failedTotal > 0
      ? before
      : await runBatchScan(args, {
          mode: "count-only",
          apply: false,
          rowLimit: 0,
        });
  const failedTotal = before.failedTotal + applyResult.failedTotal + (before.failedTotal > 0 ? 0 : after.failedTotal);
  const reducedCandidates = before.candidatesTotal - after.candidatesTotal;

  console.log(
    "Gmail person remediation batch apply. DB writes are limited to persons.name and extraction_results. Post-count is included.",
  );
  console.log(
    `mode: ${mode}, scanLimit: ${args.scanLimit}, updateLimit: ${updateLimit}, chunkSize: ${args.chunkSize}, beforeScanned: ${before.scannedTotal}, beforeCandidates: ${before.candidatesTotal}, updatedTotal: ${applyResult.updatedTotal}, skippedTotal: ${applyResult.skippedTotal}, failedTotal: ${failedTotal}, afterScanned: ${after.scannedTotal}, afterCandidates: ${after.candidatesTotal}, reducedCandidates: ${reducedCandidates}, chunks: ${applyResult.chunkSummaries.length}, stoppedReason: ${applyResult.stoppedReason}, displayed: ${applyResult.rows.length}`,
  );
  console.table(applyResult.chunkSummaries);
  if (applyResult.rows.length > 0) {
    console.log(`sample rows are limited to ${maxBatchApplySampleRows}.`);
    console.table(applyResult.rows);
  }
  if (applyResult.failedRows.length > 0) {
    console.table(applyResult.failedRows);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (args.batchApply || args.batchPreview) {
    await runBatch(args);
    return;
  }

  await runSingle(args);
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
