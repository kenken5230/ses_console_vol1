import "dotenv/config";

import { prisma } from "../lib/prisma";
import { classifyMailByRules } from "./gmail-classification-rules";

type ParsedOptions = {
  from: Date;
  to: Date;
  limit: number;
};

function parseDateArg(name: string, fallback: string): string {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
}

function parseLimit(): number {
  const raw = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "100";
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 100;
}

function parseJstDate(value: string, endOfDay = false): Date {
  const normalized = value.trim().replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("Date must be YYYY-MM-DD or YYYY/MM/DD");
  }

  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${normalized}T${time}+09:00`);
}

function options(): ParsedOptions {
  return {
    from: parseJstDate(parseDateArg("from", "2026-03-01")),
    to: parseJstDate(parseDateArg("to", "2026-05-10"), true),
    limit: parseLimit(),
  };
}

function domainFromEmail(email: string | null): string {
  return email?.split("@")[1]?.trim().toLowerCase() || "-";
}

function normalizeSubjectPattern(subject: string | null): string {
  return (subject || "(no subject)")
    .replace(/^\s*(re|fw|fwd)\s*:\s*/i, "")
    .replace(/\[SES配信\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function main(): Promise<void> {
  const { from, to, limit } = options();
  const rangeWhere = {
    receivedAt: {
      gte: from,
      lte: to,
    },
  };

  const [total, categoryRows, sourceCounts, unclassifiedSenderRows, unclassifiedSamples, unclassifiedPreviewRows] = await Promise.all([
    prisma.mailNotification.count({ where: rangeWhere }),
    prisma.mailNotification.groupBy({
      by: ["category", "isExcluded"],
      where: rangeWhere,
      _count: { _all: true },
      orderBy: [{ category: "asc" }, { isExcluded: "asc" }],
    }),
    Promise.all([
      prisma.project.count({
        where: {
          sourceMail: {
            receivedAt: rangeWhere.receivedAt,
          },
        },
      }),
      prisma.person.count({
        where: {
          sourceMail: {
            receivedAt: rangeWhere.receivedAt,
          },
        },
      }),
      prisma.mailEntityLink.count({
        where: {
          entityType: { in: ["PROJECT", "PERSON"] },
          mailNotification: {
            receivedAt: rangeWhere.receivedAt,
          },
        },
      }),
      prisma.extractionResult.count({
        where: {
          targetType: { in: ["PROJECT", "PERSON"] },
          targetId: { not: null },
          mailNotification: {
            receivedAt: rangeWhere.receivedAt,
          },
        },
      }),
    ]),
    prisma.mailNotification.groupBy({
      by: ["fromEmail"],
      where: {
        ...rangeWhere,
        category: { in: ["OTHER", "NEEDS_REVIEW"] },
        isExcluded: false,
      },
      _count: { _all: true },
      orderBy: { _count: { fromEmail: "desc" } },
      take: 30,
    }),
    prisma.mailNotification.findMany({
      where: {
        ...rangeWhere,
        category: { in: ["OTHER", "NEEDS_REVIEW"] },
        isExcluded: false,
      },
      orderBy: { receivedAt: "desc" },
      take: limit,
      select: {
        id: true,
        externalMessageId: true,
        subject: true,
        fromEmail: true,
        fromName: true,
        receivedAt: true,
        category: true,
      },
    }),
    prisma.mailNotification.findMany({
      where: {
        ...rangeWhere,
        category: { in: ["OTHER", "NEEDS_REVIEW"] },
        isExcluded: false,
      },
      select: {
        id: true,
        externalMessageId: true,
        subject: true,
        bodyText: true,
        normalizedBody: true,
        fromEmail: true,
        fromName: true,
        receivedAt: true,
        toEmails: true,
        ccEmails: true,
        inReplyTo: true,
        referencesHeader: true,
        isReply: true,
      },
    }),
  ]);

  const subjectGroups = new Map<string, { count: number; fromDomains: Set<string>; latest: string }>();
  for (const mail of unclassifiedSamples) {
    const pattern = normalizeSubjectPattern(mail.subject);
    const existing = subjectGroups.get(pattern) ?? {
      count: 0,
      fromDomains: new Set<string>(),
      latest: mail.receivedAt.toISOString(),
    };
    existing.count += 1;
    existing.fromDomains.add(domainFromEmail(mail.fromEmail));
    if (mail.receivedAt.toISOString() > existing.latest) existing.latest = mail.receivedAt.toISOString();
    subjectGroups.set(pattern, existing);
  }
  const previewSummary = new Map<string, { label: string; category: string; isExcluded: boolean; count: number }>();
  const previewStillOtherGroups = new Map<string, { count: number; fromDomains: Set<string>; latest: string }>();
  for (const mail of unclassifiedPreviewRows) {
    const result = classifyMailByRules(mail);
    const key = `${result.label}:${result.category}:${result.isExcluded}`;
    const current = previewSummary.get(key) ?? {
      label: result.label,
      category: result.category,
      isExcluded: result.isExcluded,
      count: 0,
    };
    current.count += 1;
    previewSummary.set(key, current);

    if (result.label === "other") {
      const pattern = normalizeSubjectPattern(mail.subject);
      const existing = previewStillOtherGroups.get(pattern) ?? {
        count: 0,
        fromDomains: new Set<string>(),
        latest: mail.receivedAt?.toISOString?.() ?? "",
      };
      existing.count += 1;
      existing.fromDomains.add(domainFromEmail(mail.fromEmail));
      const receivedAt = mail.receivedAt?.toISOString?.() ?? "";
      if (receivedAt > existing.latest) existing.latest = receivedAt;
      previewStillOtherGroups.set(pattern, existing);
    }
  }

  console.log("Gmail classification audit. No DB changes are performed.");
  console.table([
    {
      fromJst: from.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      toJst: to.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      total,
    },
  ]);

  console.log("category summary");
  console.table(
    categoryRows.map((row) => ({
      category: row.category,
      isExcluded: row.isExcluded,
      count: row._count._all,
    })),
  );

  console.log("entity extraction summary");
  console.table([
    {
      sourceProjects: sourceCounts[0],
      sourcePersons: sourceCounts[1],
      mailEntityLinks: sourceCounts[2],
      extractionResults: sourceCounts[3],
    },
  ]);

  console.log("unclassified sender summary");
  console.table(
    unclassifiedSenderRows.map((row) => ({
      fromEmail: row.fromEmail ?? "-",
      domain: domainFromEmail(row.fromEmail),
      count: row._count._all,
    })),
  );

  console.log("current-rule preview for unclassified mails. No DB changes are performed.");
  console.table(
    Array.from(previewSummary.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .map((row) => ({
        predictedLabel: row.label,
        predictedCategory: row.category,
        predictedExcluded: row.isExcluded,
        count: row.count,
      })),
  );

  console.log("current-rule still-other subject patterns. No DB changes are performed.");
  console.table(
    Array.from(previewStillOtherGroups.entries())
      .map(([subject, value]) => ({
        subject,
        count: value.count,
        domains: Array.from(value.fromDomains).slice(0, 5).join(", "),
        latest: value.latest,
      }))
      .sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest))
      .slice(0, 50),
  );

  console.log("unclassified recent samples");
  console.table(
    unclassifiedSamples.slice(0, 50).map((mail, index) => ({
      no: index + 1,
      category: mail.category,
      from: mail.fromEmail ?? "-",
      name: mail.fromName ?? "-",
      subject: mail.subject?.slice(0, 120) ?? "(no subject)",
      receivedAt: mail.receivedAt.toISOString(),
    })),
  );

  console.log("unclassified sampled subject patterns");
  console.table(
    Array.from(subjectGroups.entries())
      .map(([subject, value]) => ({
        subject,
        count: value.count,
        domains: Array.from(value.fromDomains).slice(0, 5).join(", "),
        latest: value.latest,
      }))
      .sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest))
      .slice(0, 50),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
