import { authErrorResponse, requireAnyRole } from "../../../../../lib/auth";
import {
  linkExistingProjectCompanyContactRole,
  projectCompanyContactRoleLinkGuard,
} from "../../../../../lib/project-company-contact-role-link";
import { handleProjectCompanyContactRolePatch } from "../../../../../lib/project-company-contact-role-link-route";
import { prisma } from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

const projectCompanyContactRolePatchDependencies = {
  authErrorResponse,
  db: prisma,
  linkExistingProjectCompanyContactRole,
  projectCompanyContactRoleLinkGuard,
  requireAnyRole,
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleProjectCompanyContactRolePatch(request, context, projectCompanyContactRolePatchDependencies);
}
