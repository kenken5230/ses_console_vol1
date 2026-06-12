import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import {
  buildReadApiErrorResponse,
  fetchSuggestionList,
  parseSuggestionListQuery,
} from "../../../../lib/matching/match-suggestion-read-api";
import {
  buildWriteApiErrorResponse,
  parseMutationTenantContext,
  saveMatchSuggestion,
} from "../../../../lib/matching/match-suggestion-write-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const query = parseSuggestionListQuery(new URL(request.url), request.headers);
    const result = await fetchSuggestionList(prisma, query);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const response = buildReadApiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const tenantId = parseMutationTenantContext(request);
    const payload = await request.json();
    const result = await saveMatchSuggestion(prisma, tenantId, payload, actor, request.headers);
    return NextResponse.json(result, { status: result.duplicate || result.idempotentReplay ? 200 : 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const response = buildWriteApiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
