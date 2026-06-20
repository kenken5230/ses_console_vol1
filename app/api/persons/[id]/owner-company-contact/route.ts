import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import {
  linkExistingPersonOwnerCompanyContact,
  personOwnerCompanyContactLinkGuard,
} from "../../../../../lib/person-owner-company-contact-link";
import { handlePersonOwnerCompanyContactPatch } from "../../../../../lib/person-owner-company-contact-link-route";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

const personOwnerCompanyContactPatchDependencies = {
  authErrorResponse,
  db: prisma,
  linkExistingPersonOwnerCompanyContact,
  personOwnerCompanyContactLinkGuard,
  requireAnyRole,
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handlePersonOwnerCompanyContactPatch(request, context, personOwnerCompanyContactPatchDependencies);
}
