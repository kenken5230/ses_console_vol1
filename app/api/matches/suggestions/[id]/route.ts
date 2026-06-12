import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import {
  buildReadApiErrorResponse,
  fetchSuggestionDetail,
  parseTenantContext,
} from "../../../../../lib/matching/match-suggestion-read-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const tenantId = parseTenantContext(new URL(request.url), request.headers);
    const item = await fetchSuggestionDetail(prisma, tenantId, context.params.id);
    if (!item) {
      return NextResponse.json({ message: "Match suggestion not found", code: "MATCH_SUGGESTION_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const response = buildReadApiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

