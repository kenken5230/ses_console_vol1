import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../lib/auth";
import {
  isMatchSuggestionMigrationRequiredError,
  listMatchSuggestions,
  matchSuggestionMigrationRequiredResponse,
  MatchSuggestionRequestError,
} from "../../../../lib/match-suggestions-review";
import {
  disabledMatchSuggestionSaveResponse,
  matchSuggestionSaveGuard,
  MatchSuggestionSaveRequestError,
  saveMatchSuggestionSupervised,
} from "../../../../lib/match-suggestion-save";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const result = await listMatchSuggestions(prisma, new URL(request.url).searchParams);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof MatchSuggestionRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    if (isMatchSuggestionMigrationRequiredError(error)) {
      return NextResponse.json(matchSuggestionMigrationRequiredResponse("suggestions"), { status: 503 });
    }

    return NextResponse.json({ message: "Saved match suggestion fetch failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const guard = matchSuggestionSaveGuard();
    if (!guard.allowed) {
      return NextResponse.json(disabledMatchSuggestionSaveResponse(), { status: 403 });
    }

    const body = await request.json().catch(() => {
      throw new MatchSuggestionSaveRequestError("Request body must be valid JSON");
    });
    const result = await saveMatchSuggestionSupervised(prisma, body, user);
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof MatchSuggestionSaveRequestError) {
      return NextResponse.json({ message: error.message, saved: false, writeAttempted: false }, { status: error.status });
    }

    if (isMatchSuggestionMigrationRequiredError(error)) {
      return NextResponse.json(matchSuggestionMigrationRequiredResponse("suggestion-save"), { status: 503 });
    }

    return NextResponse.json({ message: "Supervised match suggestion save failed", saved: false }, { status: 500 });
  }
}
