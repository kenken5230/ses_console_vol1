import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "../../../../../lib/auth";
import { loadProjectCompanyContactCandidates } from "../../../../../lib/company-contact-candidate-loader";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request);
    const { id } = await context.params;
    const project = await prisma.project.findFirst({
      where: {
        id,
        status: { not: "ARCHIVED" }
      },
      select: {
        id: true
      }
    });
    if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const candidates = await loadProjectCompanyContactCandidates(prisma, id);
    if (!candidates) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({ candidates });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    return NextResponse.json({ message: "Failed to load company contact candidates" }, { status: 500 });
  }
}
