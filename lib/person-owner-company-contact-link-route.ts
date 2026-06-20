import { NextResponse } from "next/server";

import type { AppRole } from "./auth";
import { LINK_WRITER_ROLES } from "./link-safety-policy";
import {
  disabledPersonOwnerCompanyContactLinkResponse,
  type PersonOwnerCompanyContactLinkDb,
  type PersonOwnerCompanyContactLinkGuard,
  type PersonOwnerCompanyContactLinkUser,
  personOwnerCompanyContactLinkErrorResponse,
  PersonOwnerCompanyContactLinkRequestError,
} from "./person-owner-company-contact-link";

export type PersonOwnerCompanyContactPatchContext = {
  params: Promise<{ id: string }>;
};

export type PersonOwnerCompanyContactPatchDependencies = {
  authErrorResponse(error: unknown): Response | null;
  db: PersonOwnerCompanyContactLinkDb;
  linkExistingPersonOwnerCompanyContact(
    db: PersonOwnerCompanyContactLinkDb,
    routePersonId: string,
    body: unknown,
    user: PersonOwnerCompanyContactLinkUser,
    guard: PersonOwnerCompanyContactLinkGuard,
  ): Promise<unknown>;
  personOwnerCompanyContactLinkGuard(): PersonOwnerCompanyContactLinkGuard;
  requireAnyRole(request: Request, roles: AppRole[]): Promise<PersonOwnerCompanyContactLinkUser>;
};

export async function handlePersonOwnerCompanyContactPatch(
  request: Request,
  context: PersonOwnerCompanyContactPatchContext,
  deps: PersonOwnerCompanyContactPatchDependencies,
) {
  try {
    const user = await deps.requireAnyRole(request, [...LINK_WRITER_ROLES]);
    const guard = deps.personOwnerCompanyContactLinkGuard();
    if (!guard.allowed) {
      return NextResponse.json(disabledPersonOwnerCompanyContactLinkResponse(guard), { status: 403 });
    }

    const body = await request.json().catch(() => {
      throw new PersonOwnerCompanyContactLinkRequestError("Request body must be valid JSON");
    });

    const { id } = await context.params;
    const result = await deps.linkExistingPersonOwnerCompanyContact(deps.db, id, body, user, guard);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = deps.authErrorResponse(error);
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
