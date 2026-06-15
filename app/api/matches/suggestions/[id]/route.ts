import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import {
  getMatchSuggestionDetail,
  isMatchSuggestionMigrationRequiredError,
  isUuid,
  matchSuggestionMigrationRequiredResponse,
} from "../../../../../lib/match-suggestions-review";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const { id } = await context.params;
    if (!isUuid(id)) return NextResponse.json({ message: "Invalid match suggestion id" }, { status: 400 });

    const result = await getMatchSuggestionDetail(prisma, id);
    if (!result) return NextResponse.json({ message: "Match suggestion not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (isMatchSuggestionMigrationRequiredError(error)) {
      return NextResponse.json(matchSuggestionMigrationRequiredResponse("suggestion-detail"), { status: 503 });
    }

    return NextResponse.json({ message: "Saved match suggestion detail fetch failed" }, { status: 500 });
  }
}
