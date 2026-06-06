import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../lib/auth";
import { buildMatchReviewResponse, MatchReviewRequestError } from "../../../../lib/match-review";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const result = await buildMatchReviewResponse(new URL(request.url).searchParams);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof MatchReviewRequestError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    return NextResponse.json({ message: "Matching review fetch failed" }, { status: 500 });
  }
}
