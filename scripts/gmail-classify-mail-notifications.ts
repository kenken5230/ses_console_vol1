import "dotenv/config";

import { prisma } from "../lib/prisma";
import { assertNotProductionMutation } from "../lib/production-guard";
import { classifyMailByRules, type MailClassificationResult } from "./gmail-classification-rules";

assertNotProductionMutation("gmail:classify");

type SummaryKey = MailClassificationResult["label"];

type SummaryRow = {
  category: string;
  dbCategory: string;
  count: number;
  excluded: number;
  needsReview: number;
};

type ClassifyOptions = {
  from: Date | null;
  to: Date | null;
  limit: number | null;
  summaryOnly: boolean;
};

const displayLabels: Record<SummaryKey, string> = {
  project_intro: "anken",
  person_intro: "youin",
  seminar: "seminar",
  newsletter: "newsletter",
  sales_ad: "sales_ad",
  reply: "reply",
  needs_review: "needs_review",
  other: "other",
};

function emptySummary(): Record<SummaryKey, SummaryRow> {
  return {
    project_intro: { category: displayLabels.project_intro, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
    person_intro: { category: displayLabels.person_intro, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
    seminar: { category: displayLabels.seminar, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
    newsletter: { category: displayLabels.newsletter, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
    sales_ad: { category: displayLabels.sales_ad, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
    reply: { category: displayLabels.reply, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
    needs_review: { category: displayLabels.needs_review, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
    other: { category: displayLabels.other, dbCategory: "-", count: 0, excluded: 0, needsReview: 0 },
  };
}

function parseLimit(): number | null {
  const argLimit = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const raw = argLimit ?? process.env.GMAIL_CLASSIFY_LIMIT;
  if (!raw) return null;
  const limit = Number(raw);
  return Number.isFinite(limit) && limit > 0 ? limit : null;
}

function parseDateArg(name: string, endOfDay = false): Date | null {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  if (!raw) return null;
  const normalized = raw.trim().replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`--${name} must be YYYY-MM-DD or YYYY/MM/DD`);
  }

  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${normalized}T${time}+09:00`);
}

function parseOptions(): ClassifyOptions {
  return {
    from: parseDateArg("from"),
    to: parseDateArg("to", true),
    limit: parseLimit(),
    summaryOnly: process.argv.includes("--summary-only"),
  };
}

async function main(): Promise<void> {
  const { from, to, limit, summaryOnly } = parseOptions();
  const receivedAt = from || to ? { receivedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const mails = await prisma.mailNotification.findMany({
    where: {
      NOT: { classifiedBy: "MANUAL" },
      ...receivedAt,
    },
    orderBy: { receivedAt: "desc" },
    take: limit ?? undefined,
    select: {
      id: true,
      externalMessageId: true,
      subject: true,
      bodyText: true,
      normalizedBody: true,
      fromEmail: true,
      fromName: true,
      toEmails: true,
      ccEmails: true,
      inReplyTo: true,
      referencesHeader: true,
      isReply: true,
    },
  });
  const summary = emptySummary();

  console.log("Starting rule-based mail classification.");
  console.log(`target: ${limit ? `latest ${limit}` : "all"} mail_notifications`);
  if (from || to) {
    console.log(`range: ${from?.toISOString() ?? "-"} - ${to?.toISOString() ?? "-"}`);
  }

  for (const mail of mails) {
    const result = classifyMailByRules(mail);

    await prisma.mailNotification.update({
      where: { id: mail.id },
      data: {
        category: result.category,
        categoryConfidence: result.confidence,
        isExcluded: result.isExcluded,
        excludeReason: result.excludeReason,
        needsReview: result.needsReview,
        classifiedBy: result.classifiedBy,
        classificationVersion: result.classificationVersion,
        isReply: result.label === "reply" ? true : mail.isReply,
      },
    });

    const row = summary[result.label];
    row.dbCategory = result.category;
    row.count += 1;
    row.excluded += result.isExcluded ? 1 : 0;
    row.needsReview += result.needsReview ? 1 : 0;

    if (!summaryOnly) {
      console.log(`[${displayLabels[result.label]}] ${mail.externalMessageId} ${mail.subject ?? "(no subject)"}`);
    }
  }

  console.table(Object.values(summary).filter((row) => row.count > 0));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
