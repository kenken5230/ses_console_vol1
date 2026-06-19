import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../../lib/auth";
import {
  isMatchSuggestionMigrationRequiredError,
  matchSuggestionMigrationRequiredResponse,
} from "../../../../../../lib/match-suggestions-review";
import {
  disabledMatchSuggestionReviewUpdateResponse,
  matchSuggestionReviewUpdateGuard,
  MatchSuggestionReviewUpdateRequestError,
  updateMatchSuggestionReviewSupervised,
} from "../../../../../../lib/match-suggestion-review-update";
import { prisma } from "../../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const guard = matchSuggestionReviewUpdateGuard();
    if (!guard.allowed) {
      return NextResponse.json(disabledMatchSuggestionReviewUpdateResponse(), { status: 403 });
    }

    const body = await request.json().catch(() => {
      throw new MatchSuggestionReviewUpdateRequestError("Request body must be valid JSON");
    });
    const { id } = await context.params;
    const result = await updateMatchSuggestionReviewSupervised(prisma, id, body, user);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof MatchSuggestionReviewUpdateRequestError) {
      return NextResponse.json(
        {
          mode: "saved-match-suggestion-review-update",
          message: error.message,
          updated: false,
          skippedNoop: false,
          writeAttempted: false,
        },
        { status: error.status },
      );
    }

    if (isMatchSuggestionMigrationRequiredError(error)) {
      return NextResponse.json(matchSuggestionMigrationRequiredResponse("suggestion-review-update"), { status: 503 });
    }

    return NextResponse.json(
      {
        mode: "saved-match-suggestion-review-update",
        message: "Saved match suggestion review update failed",
        updated: false,
        skippedNoop: false,
      },
      { status: 500 },
    );
  }
}
