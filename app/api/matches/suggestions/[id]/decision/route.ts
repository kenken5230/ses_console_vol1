import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import {
  buildWriteApiErrorResponse,
  decideMatchSuggestion,
  parseMutationTenantContext,
} from "../../../../../../lib/matching/match-suggestion-write-api";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const actor = await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const tenantId = parseMutationTenantContext(request);
    const payload = await request.json();
    const action = payload?.action;
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ message: "action must be approve or reject", code: "INVALID_ACTION" }, { status: 400 });
    }

    const result = await decideMatchSuggestion(prisma, tenantId, context.params.id, action, payload, actor, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const response = buildWriteApiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

