import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import {
  buildWriteApiErrorResponse,
  parseMutationTenantContext,
  reopenMatchSuggestion,
} from "../../../../../../lib/matching/match-suggestion-write-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const actor = await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const tenantId = parseMutationTenantContext(request);
    const payload = await request.json();
    const result = await reopenMatchSuggestion(prisma, tenantId, context.params.id, payload, actor, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const response = buildWriteApiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

