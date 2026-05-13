import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

function parseTake(value: string | null) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(Math.trunc(parsed), 100);
  return 20;
}

function mapRun(run: any) {
  return {
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
  };
}

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const url = new URL(request.url);
    const runs = await prisma.mailSyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: parseTake(url.searchParams.get("take")),
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

    return NextResponse.json({ runs: runs.map(mapRun) });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "sync runs fetch failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
