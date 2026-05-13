import "dotenv/config";

import { prisma } from "../lib/prisma";

async function main(): Promise<void> {
  const [projects, persons] = await Promise.all([
    prisma.project.findMany({
      where: {
        sourceMailId: { not: null },
        status: { not: "ARCHIVED" },
        sourceMail: {
          is: {
            OR: [{ isExcluded: true }, { category: { not: "PROJECT_INTRO" } }],
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        projectCode: true,
        title: true,
        status: true,
        sourceMail: {
          select: {
            category: true,
            isExcluded: true,
            subject: true,
          },
        },
      },
    }),
    prisma.person.findMany({
      where: {
        sourceMailId: { not: null },
        status: { not: "ARCHIVED" },
        sourceMail: {
          is: {
            OR: [{ isExcluded: true }, { category: { not: "PERSON_INTRO" } }],
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        personCode: true,
        name: true,
        status: true,
        sourceMail: {
          select: {
            category: true,
            isExcluded: true,
            subject: true,
          },
        },
      },
    }),
  ]);

  console.log("Gmail extraction mismatch report. No DB changes are performed.");
  console.log(`mismatched active projects: ${projects.length}`);
  console.table(
    projects.map((project) => ({
      id: project.id,
      code: project.projectCode,
      status: project.status,
      mailCategory: project.sourceMail?.category ?? "-",
      mailExcluded: project.sourceMail?.isExcluded ?? "-",
      title: project.title.slice(0, 120),
      subject: project.sourceMail?.subject?.slice(0, 120) ?? "-",
    })),
  );

  console.log(`mismatched active persons: ${persons.length}`);
  console.table(
    persons.map((person) => ({
      id: person.id,
      code: person.personCode,
      status: person.status,
      mailCategory: person.sourceMail?.category ?? "-",
      mailExcluded: person.sourceMail?.isExcluded ?? "-",
      name: person.name.slice(0, 120),
      subject: person.sourceMail?.subject?.slice(0, 120) ?? "-",
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
