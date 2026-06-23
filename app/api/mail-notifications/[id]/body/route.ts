import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

const EMPTY_VALUE = "-";
const UNCLASSIFIED_BODY_CATEGORIES = new Set(["NEEDS_REVIEW", "OTHER", "NORMAL_CONTACT"]);

function stripMailSignature(value?: string | null) {
  const text = value || "";
  const signatureMarkers = ["-- ", "-----Original Message-----"];
  let result = text;
  for (const marker of signatureMarkers) {
    const index = result.indexOf(marker);
    if (index > 240) {
      result = result.slice(0, index).trim();
      break;
    }
  }
  return result || EMPTY_VALUE;
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

function mailBodyText(mail: any) {
  return stripMailSignature(mail?.bodyText || mail?.normalizedBody || htmlToText(mail?.bodyHtml));
}

function hasActiveSourceProject(mail: any) {
  return (mail?.sourceProjects || []).some((project: any) => project.status !== "ARCHIVED");
}

function hasActiveSourcePerson(mail: any) {
  return (mail?.sourcePersons || []).some((person: any) => person.status !== "ARCHIVED");
}

function hasAnySourceEntity(mail: any) {
  return (mail?.sourceProjects || []).length > 0 || (mail?.sourcePersons || []).length > 0;
}

export function canReadMailBodyFromDashboard(mail: any) {
  if (!mail) return false;
  if (hasActiveSourceProject(mail) || hasActiveSourcePerson(mail)) return true;
  if (hasAnySourceEntity(mail)) return false;

  return UNCLASSIFIED_BODY_CATEGORIES.has(mail.category) && mail.isExcluded === false;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const mail = await prisma.mailNotification.findUnique({
      where: { id },
      select: {
        category: true,
        isExcluded: true,
        bodyText: true,
        bodyHtml: true,
        normalizedBody: true,
        sourceProjects: {
          select: {
            status: true
          }
        },
        sourcePersons: {
          select: {
            status: true
          }
        }
      }
    });

    if (!mail || !canReadMailBodyFromDashboard(mail)) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ bodyText: mailBodyText(mail) });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    return NextResponse.json({ message: "Failed to load mail body" }, { status: 500 });
  }
}
