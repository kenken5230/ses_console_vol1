import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole, type AuthUser } from "../../../../../lib/auth";
import {
  GMAIL_SYNC_JOB_NAME,
  acquireJobLock,
  buildSyncOptions,
  normalizeGmailAdminMode,
  releaseJobLock,
  runGmailAdminJob,
  sanitizeOperationalError,
} from "../../../../../lib/gmail-admin-jobs";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

type RunTrigger = "MANUAL" | "CRON" | "ADMIN_SECRET";

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isValidSecret(value: string | null, expected: string | undefined) {
  if (!value || !expected || expected.trim().length < 16) return false;
  return safeEquals(value, expected.trim());
}

async function authorizeRun(request: Request): Promise<{
  trigger: RunTrigger;
  source: string;
  user: AuthUser | null;
}> {
  const bearer = readBearerToken(request);
  if (bearer) {
    if (isValidSecret(bearer, process.env.CRON_SECRET)) {
      return {
        trigger: "CRON",
        source: request.headers.get("x-sync-source") || "cloudflare-cron",
        user: null,
      };
    }

    if (isValidSecret(bearer, process.env.ADMIN_SECRET)) {
      return {
        trigger: "ADMIN_SECRET",
        source: request.headers.get("x-sync-source") || "server-admin",
        user: null,
      };
    }

    throw new Error("Invalid server secret");
  }

  const user = await requireAnyRole(request, ["ADMIN", "MANAGER"]);
  return {
    trigger: "MANUAL",
    source: "manual-ui",
    user,
  };
}

function statusForSecretError(error: unknown) {
  if (error instanceof Error && error.message === "Invalid server secret") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function POST(request: Request) {
  const startedAt = new Date();
  let runId: string | null = null;
  let lockAcquired = false;

  try {
    const body = await request.json().catch(() => ({}));
    const authorized = await authorizeRun(request);
    const mode = normalizeGmailAdminMode(body?.mode);
    const syncOptions = buildSyncOptions({
      query: typeof body?.query === "string" ? body.query : null,
      maxResults: body?.maxResults,
      refreshExisting: Boolean(body?.refreshExisting),
    });
    const lockLeaseMs = Number(process.env.GMAIL_SYNC_LOCK_TTL_SECONDS || "600") * 1000;
    const run = await prisma.mailSyncRun.create({
      data: {
        jobName: GMAIL_SYNC_JOB_NAME,
        mode: mode.toUpperCase() as any,
        trigger: authorized.trigger as any,
        source: typeof body?.source === "string" ? body.source.slice(0, 120) : authorized.source,
        triggeredByUserId: authorized.user?.id ?? null,
        status: "RUNNING",
        query: syncOptions.query,
        maxResults: syncOptions.maxResults,
        startedAt,
      },
      select: { id: true },
    });
    runId = run.id;

    lockAcquired = await acquireJobLock({
      jobName: GMAIL_SYNC_JOB_NAME,
      lockedBy: run.id,
      leaseMs: lockLeaseMs,
    });

    if (!lockAcquired) {
      const finishedAt = new Date();
      await prisma.mailSyncRun.update({
        where: { id: run.id },
        data: {
          status: "ALREADY_RUNNING",
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
        },
      });

      return NextResponse.json(
        {
          status: "already_running",
          runId: run.id,
          message: "A gmail_sync_pipeline job is already running.",
        },
        { status: 202 },
      );
    }

    const result = await runGmailAdminJob({
      mode,
      maxResults: syncOptions.maxResults,
      query: syncOptions.query,
      refreshExisting: syncOptions.refreshExisting,
    });
    const finishedAt = new Date();

    await prisma.mailSyncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        fetched: result.summary.fetched,
        created: result.summary.created,
        updated: result.summary.updated,
        skipped: result.summary.skipped,
        failed: result.summary.failed,
        projectCreated: result.summary.projectCreated,
        personCreated: result.summary.personCreated,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    });

    return NextResponse.json({
      status: "success",
      runId: run.id,
      summary: result.summary,
    });
  } catch (error) {
    const secretResponse = statusForSecretError(error);
    if (secretResponse) return secretResponse;

    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const sanitized = sanitizeOperationalError(error);
    const finishedAt = new Date();
    if (runId) {
      await prisma.mailSyncRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          failed: { increment: 1 },
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          errorMessage: sanitized.message,
          errorStack: sanitized.stack,
        },
      }).catch(() => null);
    }

    return NextResponse.json(
      {
        status: "failed",
        runId,
        error: sanitized.message,
      },
      { status: 500 },
    );
  } finally {
    if (lockAcquired && runId) {
      await releaseJobLock({ jobName: GMAIL_SYNC_JOB_NAME, lockedBy: runId }).catch(() => null);
    }
  }
}
