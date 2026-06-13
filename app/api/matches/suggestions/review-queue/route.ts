import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import {
  isMatchSuggestionMigrationRequiredError,
  listMatchSuggestionReviewQueue,
  matchSuggestionMigrationRequiredResponse,
  MatchSuggestionRequestError,
} from "../../../../../lib/match-suggestions-review";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const result = await listMatchSuggestionReviewQueue(prisma, new URL(request.url).searchParams);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof MatchSuggestionRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (isMatchSuggestionMigrationRequiredError(error)) {
      return NextResponse.json(matchSuggestionMigrationRequiredResponse("review-queue"), { status: 503 });
    }

    return NextResponse.json({ message: "Saved match suggestion review queue fetch failed" }, { status: 500 });
  }
}
