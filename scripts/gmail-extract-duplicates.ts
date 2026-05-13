import "dotenv/config";

import { prisma } from "../lib/prisma";

type ProjectRow = {
  id: string;
  projectCode: string | null;
  title: string;
  sourceMailId: string | null;
  createdAt: Date;
  sourceMail: {
    externalMessageId: string;
    subject: string | null;
  } | null;
};

type PersonRow = {
  id: string;
  personCode: string | null;
  name: string | null;
  initials: string | null;
  sourceMailId: string | null;
  createdAt: Date;
  sourceMail: {
    externalMessageId: string;
    subject: string | null;
  } | null;
};

function groupBySourceMail<T extends { sourceMailId: string | null }>(rows: T[]): T[][] {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    if (!row.sourceMailId) continue;
    const group = groups.get(row.sourceMailId) ?? [];
    group.push(row);
    groups.set(row.sourceMailId, group);
  }

  return Array.from(groups.values()).filter((group) => group.length > 1);
}

async function main(): Promise<void> {
  const [projects, persons, links, extractionResults] = await Promise.all([
    prisma.project.findMany({
      where: { sourceMailId: { not: null } },
      orderBy: [{ sourceMailId: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        projectCode: true,
        title: true,
        sourceMailId: true,
        createdAt: true,
        sourceMail: { select: { externalMessageId: true, subject: true } },
      },
    }),
    prisma.person.findMany({
      where: { sourceMailId: { not: null } },
      orderBy: [{ sourceMailId: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        personCode: true,
        name: true,
        initials: true,
        sourceMailId: true,
        createdAt: true,
        sourceMail: { select: { externalMessageId: true, subject: true } },
      },
    }),
    prisma.mailEntityLink.findMany({
      where: {
        linkType: "EXTRACTED",
        entityType: { in: ["PROJECT", "PERSON"] },
      },
      orderBy: [{ mailNotificationId: "asc" }, { entityType: "asc" }, { createdAt: "asc" }],
      select: {
        mailNotificationId: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        mailNotification: { select: { externalMessageId: true, subject: true } },
      },
    }),
    prisma.extractionResult.findMany({
      where: {
        extractionType: { in: ["PROJECT_EXTRACTION", "PERSON_EXTRACTION"] },
        targetType: { in: ["PROJECT", "PERSON"] },
        targetId: { not: null },
      },
      orderBy: [{ mailNotificationId: "asc" }, { targetType: "asc" }, { createdAt: "asc" }],
      select: {
        mailNotificationId: true,
        targetType: true,
        targetId: true,
        extractionType: true,
        createdAt: true,
        mailNotification: { select: { externalMessageId: true, subject: true } },
      },
    }),
  ]);

  const duplicateProjects = groupBySourceMail(projects as ProjectRow[]).flatMap((group) =>
    group.map((project, index) => ({
      sourceMailId: project.sourceMailId,
      externalMessageId: project.sourceMail?.externalMessageId,
      row: index + 1,
      keepCandidate: index === 0,
      projectId: project.id,
      projectCode: project.projectCode,
      title: project.title,
      createdAt: project.createdAt.toISOString(),
    })),
  );
  const duplicatePersons = groupBySourceMail(persons as PersonRow[]).flatMap((group) =>
    group.map((person, index) => ({
      sourceMailId: person.sourceMailId,
      externalMessageId: person.sourceMail?.externalMessageId,
      row: index + 1,
      keepCandidate: index === 0,
      personId: person.id,
      personCode: person.personCode,
      name: person.name ?? person.initials,
      createdAt: person.createdAt.toISOString(),
    })),
  );

  const linkGroups = new Map<string, typeof links>();
  for (const link of links) {
    const key = `${link.mailNotificationId}:${link.entityType}`;
    const group = linkGroups.get(key) ?? [];
    group.push(link);
    linkGroups.set(key, group);
  }
  const duplicateLinks = Array.from(linkGroups.values())
    .filter((group) => group.length > 1)
    .flatMap((group) =>
      group.map((link, index) => ({
        mailNotificationId: link.mailNotificationId,
        externalMessageId: link.mailNotification.externalMessageId,
        entityType: link.entityType,
        row: index + 1,
        keepCandidate: index === 0,
        entityId: link.entityId,
        createdAt: link.createdAt.toISOString(),
      })),
    );

  const extractionGroups = new Map<string, typeof extractionResults>();
  for (const result of extractionResults) {
    const key = `${result.mailNotificationId}:${result.targetType}`;
    const group = extractionGroups.get(key) ?? [];
    group.push(result);
    extractionGroups.set(key, group);
  }
  const duplicateExtractions = Array.from(extractionGroups.values())
    .filter((group) => group.length > 1)
    .flatMap((group) =>
      group.map((result, index) => ({
        mailNotificationId: result.mailNotificationId,
        externalMessageId: result.mailNotification.externalMessageId,
        targetType: result.targetType,
        row: index + 1,
        keepCandidate: index === 0,
        targetId: result.targetId,
        extractionType: result.extractionType,
        createdAt: result.createdAt.toISOString(),
      })),
    );

  console.log("Gmail extraction duplicate report. No DB changes are performed.");
  console.log(`duplicate project rows: ${duplicateProjects.length}`);
  console.table(duplicateProjects);
  console.log(`duplicate person rows: ${duplicatePersons.length}`);
  console.table(duplicatePersons);
  console.log(`duplicate mail_entity_links rows: ${duplicateLinks.length}`);
  console.table(duplicateLinks);
  console.log(`duplicate extraction_results rows: ${duplicateExtractions.length}`);
  console.table(duplicateExtractions);

  if (!duplicateProjects.length && !duplicatePersons.length && !duplicateLinks.length && !duplicateExtractions.length) {
    console.log("No duplicates found.");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

