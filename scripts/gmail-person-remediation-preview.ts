import "dotenv/config";

import { prisma } from "../lib/prisma";
import { analyzePersonNameCandidate, personDisplayName } from "./gmail-extraction";

function parseLimit(): number {
  const raw = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const limit = raw ? Number(raw) : NaN;
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("Missing required --limit=N. Use a small limit first, e.g. --limit=20.");
  }
  return Math.min(Math.trunc(limit), 200);
}

function shortId(value: string | null | undefined): string {
  return value ? value.slice(0, 8) : "";
}

function shortText(value: string | null | undefined, maxLength = 120): string {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
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

async function main(): Promise<void> {
  const limit = parseLimit();
  const persons = await prisma.person.findMany({
    where: {
      sourceMailId: { not: null },
      status: { not: "ARCHIVED" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
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
        },
      },
      skills: {
        select: {
          skillName: true,
        },
      },
    },
  });

  const rows = persons
    .map((person) => {
      const skills = person.skills.map((skill) => skill.skillName);
      const analysis = analyzePersonNameCandidate({
        candidate: person.name,
        initials: person.initials,
        subject: person.sourceMail?.subject ?? null,
        skills,
      });
      const reasons = unique([
        ...analysis.reviewReasons,
        !person.name ? "PERSON_NAME_MISSING" : null,
        person.name && !analysis.acceptedName ? "EXISTING_PERSON_NAME_LOOKS_LOW_CONFIDENCE" : null,
      ]);

      if (!reasons.length) return null;

      return {
        personId: shortId(person.id),
        personCode: person.personCode ?? "",
        mailId: shortId(person.sourceMail?.id),
        currentName: shortText(person.name),
        suggestedDisplayName: personDisplayName(person.sourceMail?.id ?? person.id, analysis.acceptedName, safeInitials(person.initials)),
        nameConfidence: analysis.nameConfidence,
        reviewReasons: reasons.join(", "),
        subject: shortText(person.sourceMail?.subject),
        skillCount: skills.length,
        createdAt: person.createdAt.toISOString().slice(0, 10),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  console.log("Gmail person remediation preview. DB writes are not performed.");
  console.log(`limit: ${limit}, scanned: ${persons.length}, candidates: ${rows.length}`);
  console.table(rows);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
