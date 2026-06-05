import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../lib/auth";
import { listSourceRecords } from "../../../../lib/import-review";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const result = await listSourceRecords(prisma, new URL(request.url).searchParams);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    return NextResponse.json({ message: "Source record review fetch failed" }, { status: 500 });
  }
}
