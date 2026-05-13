import "dotenv/config";

import { prisma } from "../lib/prisma";
import { extractFromMail, formatDate, type MailExtractionSource } from "./gmail-extraction";

type ExtractPreviewType = "all" | "anken" | "youin";

function parseLimit(): number {
  const argLimit = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const raw = argLimit ?? process.env.GMAIL_EXTRACT_LIMIT ?? "20";
  const limit = Number(raw);
  return Number.isFinite(limit) && limit > 0 ? limit : 20;
}

function parseType(): ExtractPreviewType {
  const argType = process.argv.find((arg) => arg.startsWith("--type="))?.split("=")[1];
  if (argType === "anken" || argType === "youin") return argType;
  return "all";
}

function categoryFilter(type: ExtractPreviewType) {
  if (type === "anken") return ["PROJECT_INTRO"] as const;
  if (type === "youin") return ["PERSON_INTRO"] as const;
  return ["PROJECT_INTRO", "PERSON_INTRO"] as const;
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const type = parseType();
  const categories = categoryFilter(type);
  const mails = await prisma.mailNotification.findMany({
    where: {
      category: { in: [...categories] },
      isExcluded: false,
      OR: [
        {
          category: "PROJECT_INTRO",
          sourceProjects: { none: {} },
          entityLinks: { none: { entityType: "PROJECT", linkType: "EXTRACTED" } },
          extractionResults: { none: { targetType: "PROJECT", extractionType: "PROJECT_EXTRACTION" } },
        },
        {
          category: "PERSON_INTRO",
          sourcePersons: { none: {} },
          entityLinks: { none: { entityType: "PERSON", linkType: "EXTRACTED" } },
          extractionResults: { none: { targetType: "PERSON", extractionType: "PERSON_EXTRACTION" } },
        },
      ],
    },
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      category: true,
      externalMessageId: true,
      subject: true,
      bodyText: true,
      normalizedBody: true,
      fromEmail: true,
      fromName: true,
      receivedAt: true,
      classifiedBy: true,
      classificationVersion: true,
    },
  });

  const rows = mails.map((mail) => {
    const extraction = extractFromMail(mail as MailExtractionSource);

    if (extraction.target === "project") {
      return {
        type: "anken",
        category: mail.category,
        classifiedBy: mail.classifiedBy,
        classificationVersion: mail.classificationVersion,
        subject: mail.subject,
        title: extraction.title,
        price: extraction.unitPriceMax,
        location: extraction.workLocationText,
        startMonth: formatDate(extraction.startMonth)?.slice(0, 7) ?? null,
        skills: extraction.requiredSkills.slice(0, 5).join(", "),
        needsReview: extraction.needsReview,
        missing: extraction.missingFields.join(", "),
      };
    }

    return {
      type: "youin",
      category: mail.category,
      classifiedBy: mail.classifiedBy,
      classificationVersion: mail.classificationVersion,
      subject: mail.subject,
      name: extraction.name ?? extraction.initials,
      company: extraction.ownerCompanyName,
      price: extraction.desiredUnitPrice,
      availableFrom: formatDate(extraction.availableFrom)?.slice(0, 7) ?? null,
      skills: extraction.skills.slice(0, 5).join(", "),
      needsReview: extraction.needsReview,
      missing: extraction.missingFields.join(", "),
    };
  });

  console.log("Gmail extraction preview. DB writes are not performed.");
  console.log(`target: ${type}, limit: ${limit}, candidates: ${mails.length}`);
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
