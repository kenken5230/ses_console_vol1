import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import { getSourceRecordDetail } from "../../../../../lib/import-review";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const { id } = await context.params;
    const result = await getSourceRecordDetail(prisma, id);
    if (!result) return NextResponse.json({ message: "Source record not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    return NextResponse.json({ message: "Source record review fetch failed" }, { status: 500 });
  }
}
