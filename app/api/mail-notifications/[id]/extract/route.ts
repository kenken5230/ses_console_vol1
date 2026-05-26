import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import {
  createPersonFromExtraction,
  createProjectFromExtraction,
} from "../../../../../lib/gmail-extract-entities";
import {
  extractPersonFromMail,
  extractProjectFromMail,
  type MailExtractionSource,
  type PersonExtraction,
  type ProjectExtraction,
} from "../../../../../scripts/gmail-extraction";

export const dynamic = "force-dynamic";

type ExtractTarget = "project" | "person";

function asTarget(value: unknown): ExtractTarget | null {
  if (value === "project" || value === "person") return value;
  return null;
}

function htmlToText(html?: string | null) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildMailSource(mail: any, target: ExtractTarget): MailExtractionSource {
  const bodyText = mail.bodyText || htmlToText(mail.bodyHtml) || mail.normalizedBody;
  return {
    id: mail.id,
    category: target === "project" ? "PROJECT_INTRO" : "PERSON_INTRO",
    externalMessageId: mail.externalMessageId,
    subject: mail.subject,
    normalizedSubject: mail.normalizedSubject,
    bodyText,
    bodyHtml: mail.bodyHtml,
    normalizedBody: mail.normalizedBody,
    fromEmail: mail.fromEmail,
    fromName: mail.fromName,
    receivedAt: mail.receivedAt,
  };
}

function forceProjectReview(extraction: ProjectExtraction, mail: any): ProjectExtraction {
  return {
    ...extraction,
    title: extraction.title || mail.subject || "Gmail imported project",
    needsReview: true,
    missingFields: Array.from(new Set([...extraction.missingFields, "manual_classification"])),
  };
}

function forcePersonReview(extraction: PersonExtraction, mail: any): PersonExtraction {
  return {
    ...extraction,
    name: extraction.name || mail.subject || "Gmail imported person",
    needsReview: true,
    missingFields: Array.from(new Set([...extraction.missingFields, "manual_classification"])),
  };
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER", "SALES"]);
    const body = await request.json().catch(() => ({}));
    const target = asTarget(body?.target);
    if (!target) {
      return NextResponse.json({ message: "target must be project or person" }, { status: 400 });
    }

    const mail = await prisma.mailNotification.findUnique({
      where: { id: context.params.id },
      select: {
        id: true,
        externalMessageId: true,
        subject: true,
        normalizedSubject: true,
        bodyText: true,
        bodyHtml: true,
        normalizedBody: true,
        fromEmail: true,
        fromName: true,
        receivedAt: true,
      },
    });

    if (!mail) {
      return NextResponse.json({ message: "mail notification not found" }, { status: 404 });
    }

    const source = buildMailSource(mail, target);
    const result = await prisma.$transaction(async (tx) => {
      await tx.mailNotification.update({
        where: { id: mail.id },
        data: {
          category: target === "project" ? "PROJECT_INTRO" : "PERSON_INTRO",
          isExcluded: false,
          excludeReason: null,
          needsReview: true,
          classifiedBy: "MANUAL",
          classificationVersion: "manual-ui-v0.1",
        },
      });

      if (target === "project") {
        const extraction = forceProjectReview(extractProjectFromMail(source), mail);
        return createProjectFromExtraction(tx, source, extraction);
      }

      const extraction = forcePersonReview(extractPersonFromMail(source), mail);
      return createPersonFromExtraction(tx, source, extraction);
    });

    return NextResponse.json({
      message: target === "project" ? "案件として扱いました" : "要員として扱いました",
      result,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "mail extraction failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
