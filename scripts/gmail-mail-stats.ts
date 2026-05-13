import "dotenv/config";

import { prisma } from "../lib/prisma";

function parseFromDate(): Date {
  const raw = process.argv.find((arg) => arg.startsWith("--from="))?.split("=")[1] ?? process.env.GMAIL_SYNC_FROM ?? "2026-03-01";
  const normalized = raw.replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("--from must be YYYY-MM-DD or YYYY/MM/DD");
  }

  return new Date(`${normalized}T00:00:00.000Z`);
}

async function main(): Promise<void> {
  const from = parseFromDate();
  const [total, sinceFrom, categories, entityCounts, duplicateGroups] = await Promise.all([
    prisma.mailNotification.aggregate({
      _count: { _all: true },
      _min: { receivedAt: true },
      _max: { receivedAt: true },
    }),
    prisma.mailNotification.count({ where: { receivedAt: { gte: from } } }),
    prisma.mailNotification.groupBy({
      by: ["category", "isExcluded"],
      _count: { _all: true },
      orderBy: [{ category: "asc" }, { isExcluded: "asc" }],
    }),
    Promise.all([
      prisma.project.count({ where: { sourceMailId: { not: null } } }),
      prisma.person.count({ where: { sourceMailId: { not: null } } }),
      prisma.mailEntityLink.count({ where: { entityType: { in: ["PROJECT", "PERSON"] } } }),
      prisma.extractionResult.count({
        where: {
          targetType: { in: ["PROJECT", "PERSON"] },
          targetId: { not: null },
        },
      }),
    ]),
    prisma.mailNotification.groupBy({
      by: ["fromEmail", "normalizedSubject"],
      where: {
        normalizedSubject: { not: null },
      },
      _count: { _all: true },
      having: {
        id: { _count: { gt: 1 } },
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 20,
    }),
  ]);

  console.log("mail_notifications stats");
  console.table([
    {
      total: total._count._all,
      sinceFrom,
      from: from.toISOString().slice(0, 10),
      minReceivedAt: total._min.receivedAt?.toISOString() ?? "-",
      maxReceivedAt: total._max.receivedAt?.toISOString() ?? "-",
    },
  ]);

  console.log("category summary");
  console.table(
    categories.map((row) => ({
      category: row.category,
      isExcluded: row.isExcluded,
      count: row._count._all,
    })),
  );

  console.log("entity link summary");
  console.table([
    {
      sourceProjects: entityCounts[0],
      sourcePersons: entityCounts[1],
      mailEntityLinks: entityCounts[2],
      extractionResults: entityCounts[3],
    },
  ]);

  console.log("same sender + same normalized subject candidates");
  console.table(
    duplicateGroups.map((row) => ({
      fromEmail: row.fromEmail ?? "-",
      normalizedSubject: row.normalizedSubject?.slice(0, 80) ?? "-",
      count: row._count._all,
    })),
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
