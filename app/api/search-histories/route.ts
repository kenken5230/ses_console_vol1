import { NextResponse } from "next/server";
import { authErrorResponse, requireAnyRole } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import {
  listSearchHistories,
  parseSearchHistoryListParams,
  saveSearchHistory,
  SearchHistoryRequestError
} from "../../../lib/search-history";

const SEARCH_HISTORY_ROLES = ["ADMIN", "MANAGER", "SALES", "VIEWER"] as const;

export const dynamic = "force-dynamic";

function searchHistoryErrorResponse(error: unknown) {
  const authResponse = authErrorResponse(error);
  if (authResponse) return authResponse;

  if (error instanceof SearchHistoryRequestError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  return NextResponse.json({ message: "Search history request failed" }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const user = await requireAnyRole(request, [...SEARCH_HISTORY_ROLES]);
    const params = parseSearchHistoryListParams(new URL(request.url));
    const items = await listSearchHistories(prisma, user, params);

    return NextResponse.json({ items });
  } catch (error) {
    return searchHistoryErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAnyRole(request, [...SEARCH_HISTORY_ROLES]);
    const body = await request.json().catch(() => {
      throw new SearchHistoryRequestError(400, "request body must be valid JSON");
    });
    const item = await saveSearchHistory(prisma, user, body);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return searchHistoryErrorResponse(error);
  }
}
