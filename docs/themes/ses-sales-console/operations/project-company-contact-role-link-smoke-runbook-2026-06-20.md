# Project Company Contact Role Link Smoke Runbook

Date: 2026-06-20

Scope: safe operation notes for `PATCH /api/projects/[id]/company-contact-role`.

No real DB write smoke was executed in this implementation PR. Any future real DB write smoke requires separate written approval with the exact target, fixture IDs, operator session, rollback owner, and execution window.

## Current Implementation

- Route: `PATCH /api/projects/[id]/company-contact-role`.
- Auth: `ADMIN` and `MANAGER` only.
- Feature guard: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true`.
- Allowed targets: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=local`, `test`, or `staging`.
- Production refusal: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=production`, `NODE_ENV=production`, or `VERCEL_ENV=production` is rejected before JSON parsing.
- Transaction writes: `projectCompanyRole.create`, `project.update` to touch `Project.updatedAt`, and `auditLog.create`.
- AuditLog is retained and is not deleted by this flow.

## Non-Executed Smoke Status

The real DB write smoke was not executed. This PR performed code-level and mock DB validation only.

No migration, schema change, deploy, staging operation, production operation, or UI change was performed.

## Future Approval Checklist

- Target is not production.
- Fixture project/company/contact IDs are synthetic, disposable, or explicitly approved.
- The selected project has a current `updatedAt` captured immediately before the request.
- The selected project has no existing `ProjectCompanyRole` for the requested role.
- The selected `CompanyContact.companyId` matches the selected `Company.id`.
- The selected `CompanyContact.isActive` is true.
- The selected company `tradeStatus` is not `NG`, `NEEDS_REVIEW`, or `SUSPENDED`.
- Operator session is an active `ADMIN` or `MANAGER`.
- Request body contains only `companyId`, `contactId`, `role`, `expectedUpdatedAt`, `reasonCode`, and `confirmationToken`.
- Rollback plan is approved before the write.
- `AuditLog` evidence is retained.
