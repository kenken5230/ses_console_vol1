import { NextResponse } from "next/server";

import type { AppRole } from "./auth";
import { LINK_WRITER_ROLES } from "./link-safety-policy";
import {
  disabledProjectCompanyContactRoleLinkResponse,
  type ProjectCompanyContactRoleLinkDb,
  projectCompanyContactRoleLinkErrorResponse,
  type ProjectCompanyContactRoleLinkGuard,
  ProjectCompanyContactRoleLinkRequestError,
  type ProjectCompanyContactRoleLinkUser,
} from "./project-company-contact-role-link";

export type ProjectCompanyContactRolePatchContext = {
  params: Promise<{ id: string }>;
};

export type ProjectCompanyContactRolePatchDependencies = {
  authErrorResponse(error: unknown): Response | null;
  db: ProjectCompanyContactRoleLinkDb;
  linkExistingProjectCompanyContactRole(
    db: ProjectCompanyContactRoleLinkDb,
    routeProjectId: string,
    body: unknown,
    user: ProjectCompanyContactRoleLinkUser,
    guard: ProjectCompanyContactRoleLinkGuard,
  ): Promise<unknown>;
  projectCompanyContactRoleLinkGuard(): ProjectCompanyContactRoleLinkGuard;
  requireAnyRole(request: Request, roles: AppRole[]): Promise<ProjectCompanyContactRoleLinkUser>;
};

export async function handleProjectCompanyContactRolePatch(
  request: Request,
  context: ProjectCompanyContactRolePatchContext,
  deps: ProjectCompanyContactRolePatchDependencies,
) {
  try {
    const user = await deps.requireAnyRole(request, [...LINK_WRITER_ROLES]);
    const guard = deps.projectCompanyContactRoleLinkGuard();
    if (!guard.allowed) {
      return NextResponse.json(disabledProjectCompanyContactRoleLinkResponse(guard), { status: 403 });
    }

    const body = await request.json().catch(() => {
      throw new ProjectCompanyContactRoleLinkRequestError("Request body must be valid JSON");
    });

    const { id } = await context.params;
    const result = await deps.linkExistingProjectCompanyContactRole(deps.db, id, body, user, guard);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = deps.authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof ProjectCompanyContactRoleLinkRequestError) {
      return NextResponse.json(projectCompanyContactRoleLinkErrorResponse(error), { status: error.status });
    }

    return NextResponse.json(
      {
        status: "error",
        linked: false,
        writeAttempted: false,
        message: "Project company/contact role link failed.",
      },
      { status: 500 },
    );
  }
}
