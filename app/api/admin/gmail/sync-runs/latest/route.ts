import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const run = await prisma.mailSyncRun.findFirst({
      orderBy: { startedAt: "desc" },
      include: {
        triggeredBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ run: null });
    }

    return NextResponse.json({
      run: {
        id: run.id,
        jobName: run.jobName,
        mode: run.mode,
        trigger: run.trigger,
        source: run.source,
        status: run.status,
        query: run.query,
        maxResults: run.maxResults,
        fetched: run.fetched,
        created: run.created,
        updated: run.updated,
        skipped: run.skipped,
        failed: run.failed,
        projectCreated: run.projectCreated,
        personCreated: run.personCreated,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        durationMs: run.durationMs,
        errorMessage: run.errorMessage,
        triggeredBy: run.triggeredBy
          ? {
              id: run.triggeredBy.id,
              name: run.triggeredBy.name,
              email: run.triggeredBy.email,
              role: run.triggeredBy.role,
            }
          : null,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "latest sync run fetch failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
