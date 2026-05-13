import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { authErrorResponse, requireAnyRole } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

type EntityType = "project" | "person";

function parseEntityType(value: unknown): EntityType | null {
  if (value === "project" || value === "person") return value;
  return null;
}

export async function POST(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER", "SALES"]);
    const body = await request.json().catch(() => ({}));
    const entityType = parseEntityType(body?.entityType);
    const entityId = typeof body?.entityId === "string" ? body.entityId : "";

    if (!entityType || !entityId) {
      return NextResponse.json({ message: "entityType and entityId are required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (entityType === "project") {
        const project = await tx.project.findUnique({
          where: { id: entityId },
          select: { id: true, sourceMailId: true },
        });
        if (!project) throw new Error("案件が見つかりません");
        if (!project.sourceMailId) throw new Error("元メールが紐付いていない案件です");

        await tx.project.update({
          where: { id: project.id },
          data: {
            status: "ARCHIVED",
            sourceMailId: null,
          },
        });

        await tx.mailNotification.update({
          where: { id: project.sourceMailId },
          data: {
            category: "NEEDS_REVIEW",
            isExcluded: false,
            excludeReason: null,
            needsReview: true,
            classifiedBy: "MANUAL",
            classificationVersion: "manual-unclassified-v0.1",
          },
        });

        return { mailNotificationId: project.sourceMailId };
      }

      const person = await tx.person.findUnique({
        where: { id: entityId },
        select: { id: true, sourceMailId: true },
      });
      if (!person) throw new Error("要員が見つかりません");
      if (!person.sourceMailId) throw new Error("元メールが紐付いていない要員です");

      await tx.person.update({
        where: { id: person.id },
        data: {
          status: "ARCHIVED",
          sourceMailId: null,
        },
      });

      await tx.mailNotification.update({
        where: { id: person.sourceMailId },
        data: {
          category: "NEEDS_REVIEW",
          isExcluded: false,
          excludeReason: null,
          needsReview: true,
          classifiedBy: "MANUAL",
          classificationVersion: "manual-unclassified-v0.1",
        },
      });

      return { mailNotificationId: person.sourceMailId };
    });

    return NextResponse.json({
      message: "未分類へ移行しました",
      ...result,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "未分類への移行に失敗しました";
    const status = message.includes("見つかりません") || message.includes("紐付いていない") ? 400 : 500;
    return NextResponse.json({ message }, { status });
  }
}
