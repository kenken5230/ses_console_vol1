import "dotenv/config";

import { prisma } from "../lib/prisma";
import { assertNotProductionMutation } from "../lib/production-guard";

assertNotProductionMutation("gmail:extract:archive-mismatches");

async function main(): Promise<void> {
  const [projects, persons] = await Promise.all([
    prisma.project.findMany({
      where: {
        sourceMailId: { not: null },
        projectCode: { startsWith: "GMAIL-PRJ-" },
        status: { not: "ARCHIVED" },
        sourceMail: {
          is: {
            OR: [{ isExcluded: true }, { category: { not: "PROJECT_INTRO" } }],
          },
        },
      },
      select: { id: true, projectCode: true, title: true },
    }),
    prisma.person.findMany({
      where: {
        sourceMailId: { not: null },
        personCode: { startsWith: "GMAIL-PER-" },
        status: { not: "ARCHIVED" },
        sourceMail: {
          is: {
            OR: [{ isExcluded: true }, { category: { not: "PERSON_INTRO" } }],
          },
        },
      },
      select: { id: true, personCode: true, name: true },
    }),
  ]);

  console.log("Archiving Gmail extraction mismatches. No physical deletes are performed.");
  console.table(
    projects.map((project) => ({
      entity: "project",
      id: project.id,
      code: project.projectCode,
      label: project.title.slice(0, 120),
    })),
  );
  console.table(
    persons.map((person) => ({
      entity: "person",
      id: person.id,
      code: person.personCode,
      label: person.name?.slice(0, 120) ?? "-",
    })),
  );

  const [projectResult, personResult] = await prisma.$transaction([
    prisma.project.updateMany({
      where: { id: { in: projects.map((project) => project.id) } },
      data: { status: "ARCHIVED" },
    }),
    prisma.person.updateMany({
      where: { id: { in: persons.map((person) => person.id) } },
      data: { status: "ARCHIVED" },
    }),
  ]);

  console.table([
    {
      projectsArchived: projectResult.count,
      personsArchived: personResult.count,
    },
  ]);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
