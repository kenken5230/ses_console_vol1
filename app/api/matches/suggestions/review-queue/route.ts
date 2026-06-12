import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import {
  buildReadApiErrorResponse,
  fetchReviewQueue,
  parseSuggestionListQuery,
} from "../../../../../lib/matching/match-suggestion-read-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const query = parseSuggestionListQuery(new URL(request.url), request.headers, { reviewQueue: true });
    const result = await fetchReviewQueue(prisma, query);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const response = buildReadApiErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

