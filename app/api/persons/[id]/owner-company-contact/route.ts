import { NextResponse } from "next/server";

import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import {
  disabledPersonOwnerCompanyContactLinkResponse,
  linkExistingPersonOwnerCompanyContact,
  personOwnerCompanyContactLinkErrorResponse,
  personOwnerCompanyContactLinkGuard,
  PersonOwnerCompanyContactLinkRequestError,
} from "../../../../../lib/person-owner-company-contact-link";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAnyRole(request, ["ADMIN", "MANAGER"]);
    const guard = personOwnerCompanyContactLinkGuard();
    if (!guard.allowed) {
      return NextResponse.json(disabledPersonOwnerCompanyContactLinkResponse(guard), { status: 403 });
    }

    const body = await request.json().catch(() => {
      throw new PersonOwnerCompanyContactLinkRequestError("Request body must be valid JSON");
    });

    const { id } = await context.params;
    const result = await linkExistingPersonOwnerCompanyContact(prisma, id, body, user, guard);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof PersonOwnerCompanyContactLinkRequestError) {
      return NextResponse.json(personOwnerCompanyContactLinkErrorResponse(error), { status: error.status });
    }

    return NextResponse.json(
      {
        status: "error",
        linked: false,
        writeAttempted: false,
        message: "Person owner company/contact link failed.",
      },
      { status: 500 },
    );
  }
}
