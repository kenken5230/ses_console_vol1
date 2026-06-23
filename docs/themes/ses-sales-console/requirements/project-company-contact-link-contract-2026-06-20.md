# Project Company/Contact Role Link Contract

## Purpose

This contract fixes the write boundary for linking an existing `Company` and an existing `CompanyContact` to a `ProjectCompanyRole`.

Implemented in this PR: guarded helper, narrow route, and mock/pure/route tests for `PATCH /api/projects/[id]/company-contact-role`.

This PR implements the guarded Project detail UI flow for existing company/contact role linking. It does not implement a Prisma schema change, migration, deploy, staging/production operation, or real DB write smoke. The real DB write smoke was not executed.

## Endpoint Proposal

- Proposed route: `PATCH /api/projects/[id]/company-contact-role`
- Intent: link an existing project to an existing company/contact pair through `ProjectCompanyRole`.
- Storage target: create one `ProjectCompanyRole` row with `projectId`, `companyId`, `companyContactId`, `role`, server-derived `roleOrder`, and server-derived `isPrimary`.
- Do not use existing `/api/projects` PATCH for this write. That route is a broad project edit API and can be used by `SALES`, so project company/contact role linking must have its own narrow route and guard.

## Role Contract

Initial implementation must require `role` in the payload. It must not silently default to `UPPER_COMPANY`.

Reason: the current schema and project display support multiple `ProjectCompanyRoleType` values, and existing project create code maps several company roles. A required explicit `role` keeps the route narrow while avoiding a hidden assumption that only upper-company links exist.

Allowed role enum values are the current `ProjectCompanyRoleType` values:

- `UPPER_COMPANY`
- `END_USER`
- `PRIME_CONTRACTOR`
- `SECONDARY_CONTRACTOR`
- `TERTIARY_CONTRACTOR`
- `ACCOUNT_MANAGER_COMPANY`
- `PROPOSAL_TARGET`
- `OTHER`

`roleOrder` and `isPrimary` are not accepted from the client. The future route must derive them from `role` server-side.

Any payload containing `roleOrder` or `isPrimary` returns `400` and must not reach write logic.

Server-derived role decision table:

| `role` | `roleOrder` | `isPrimary` | Meaning |
|---|---:|---|---|
| `UPPER_COMPANY` | `1` | `true` | Primary upper company link. |
| `END_USER` | `2` | `false` | End-user/end-client company link. |
| `PRIME_CONTRACTOR` | `3` | `false` | Prime contractor company link. |
| `SECONDARY_CONTRACTOR` | `4` | `false` | Secondary contractor company link. |
| `TERTIARY_CONTRACTOR` | `5` | `false` | Tertiary contractor company link. |
| `ACCOUNT_MANAGER_COMPANY` | `80` | `false` | Account manager company link outside commerce-flow ordering. |
| `PROPOSAL_TARGET` | `90` | `false` | Proposal target company link outside commerce-flow ordering. |
| `OTHER` | `99` | `false` | Explicit fallback role, sorted last. |

The table above is exhaustive for current schema/contract values. `END_CLIENT`, `CLIENT`, and `PARTNER` are not accepted role values unless a future schema/contract update adds them to `ProjectCompanyRoleType`.

## Auth

- Allowed roles: `ADMIN` and `MANAGER` only.
- Forbidden roles: `SALES`, `VIEWER`, inactive users, and unauthenticated callers.
- Expected failures: unauthenticated requests return `401`; authenticated but unauthorized requests return `403`.

## Feature Guard

Writes are allowed only under an explicit non-production feature guard:

- `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true`
- `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET` is one of `local`, `test`, or `staging`

`PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=production` must reject the write even if the enabled flag is true.

## Request Body

Allowed request fields: `companyId`, `contactId`, `role`, `expectedUpdatedAt`, `reasonCode`, `confirmationToken`.

Example:

```json
{
  "companyId": "company-uuid",
  "contactId": "contact-uuid",
  "role": "UPPER_COMPANY",
  "expectedUpdatedAt": "2026-06-20T00:00:00.000Z",
  "reasonCode": "candidate_verified",
  "confirmationToken": "project-company-contact-role-link:project-uuid:UPPER_COMPANY:company-uuid:contact-uuid"
}
```

Any unsupported top-level field is rejected before write logic. The route must reject raw mail body, free note, customer data, generated memo, names, emails, phone text, source body, and arbitrary comments. The payload contains identifiers, enum values, a stale token, and a bounded reason only.

## Reason Code Contract

`reasonCode` is required for this write and must be one of the bounded enum values below. No raw/free text reason is accepted.

Allowed `reasonCode` enum values are:

- `candidate_verified`
- `manual_admin_review`
- `sales_ops_cleanup`
- `stale_candidate_recheck`
- `duplicate_role_cleanup`

Unknown `reasonCode` values return `400` and must not reach write logic.

## Validation Rules

- `projectId`, `companyId`, and `contactId` must be valid existing UUID rows.
- Existing `Company` and existing `CompanyContact` only. The route never creates or upserts companies or contacts.
- `contact.companyId` must equal `companyId`; company/contact mismatch returns `409`.
- `CompanyContact.isActive=false` returns `409` with `manual-review` or refusal.
- Company `tradeStatus` values `NG`, `NEEDS_REVIEW`, and `SUSPENDED` return `409` with `manual-review` or refusal.
- `role` must be one of the allowed `ProjectCompanyRoleType` enum values.
- `roleOrder` and `isPrimary` must be derived from the role decision table and must not be accepted from the payload.
- Unknown `reasonCode` values are rejected before any create, upsert, update, delete, or AuditLog write.
- Existing same `projectId + role` returns `409`; the route must not overwrite an existing role.
- Filling in only `companyContactId` for an existing role is out of scope and requires separate approval and evidence. Whether it is handled in a separate PR or explicitly deferred within the current PR is a PM gate decision.
- The future route must not call the broad `/api/projects` PATCH handler internally.

## Stale Write Detection

The minimum stale check uses `Project.updatedAt` as `expectedUpdatedAt`.

`ProjectCompanyRole` currently has no `updatedAt`, so the first implementation must not add a schema change or migration just to support this contract. If `Project.updatedAt` differs from `expectedUpdatedAt`, return `409` before writing.

## Transaction And Audit

The write must run `projectCompanyRole.create`, `project.update` for the `Project.updatedAt` stale token touch, and `auditLog.create` in the same transaction.

`AuditLog` is mandatory. The audit record must include actor, action, entity type, project id, role, before data, after data, safe reason code, and feature guard target. AuditLog rows must never be deleted by this flow. Rollback or correction must be represented by a separate approved write and its own AuditLog entry.

## Response And UI Contract

Success response contains only minimal identifiers:

```json
{
  "projectId": "project-uuid",
  "companyRoleId": "project-company-role-uuid",
  "companyId": "company-uuid",
  "contactId": "contact-uuid",
  "role": "UPPER_COMPANY"
}
```

After success, UI must reload/reselect the project from server data. It must not apply an optimistic write to local project details.

The guarded project detail UI may use this narrow route only after a candidate is shown, an operator opens the confirmation panel, selects a bounded `role` and bounded `reasonCode`, and checks the confirmation checkbox. The UI payload must be built from the contract fields above and must not include raw mail body, notes, names, emails, phone text, or arbitrary free text.

## Out Of Scope

- Changing `app/api/projects/route.ts`.
- Further UI changes beyond the guarded project detail link panel.
- Prisma schema changes or migrations.
- Creating companies or contacts.
- Updating existing `ProjectCompanyRole` rows.
- Contact-only completion of an existing role.
- Real DB write smoke.
- Deployment.

Smoke testing and real DB writes require separate approval/evidence and a separate execution record. The PM gate may explicitly defer real DB smoke and/or Browser QA before Ready, but Ready must not imply those checks were completed unless evidence is recorded.

## Implementation Status

- Route implemented: `app/api/projects/[id]/company-contact-role/route.ts`.
- Helper implemented: `lib/project-company-contact-role-link.ts`.
- Route handler implemented: `lib/project-company-contact-role-link-route.ts`.
- Guarded UI helper implemented: `lib/project-company-contact-role-link-ui.ts`.
- Project detail UI implemented: `components/ProjectDetailPane.jsx` calls only `PATCH /api/projects/[id]/company-contact-role` and reloads/reselects after success.
- Tests implemented: `scripts/project-company-contact-link-api.test.ts`, `scripts/project-company-contact-link-api-route.test.ts`, and this contract test.
- Guard behavior implemented: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true` plus `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=local|test|staging`; `production`, `NODE_ENV=production`, and `VERCEL_ENV=production` are refused before JSON parsing.
- DB smoke status: real DB write smoke was not executed.

## Future Improvement / Residual Risk

The implementation centralizes runtime role and reason validation in exported helper constants:

- `PROJECT_COMPANY_CONTACT_ROLE_VALUES`
- `PROJECT_COMPANY_CONTACT_ROLE_REASON_CODES`
- `PROJECT_COMPANY_CONTACT_ROLE_DERIVATION`

The contract docs and static contract tests intentionally duplicate those enum/table values to catch accidental drift. Future role or reason expansion must update the helper constants, this contract document, and the static tests together. A future cleanup could generate the docs/test assertions from the exported constants, but that is out of scope for this route implementation PR.

## Future Test Checklist

- `ADMIN` and `MANAGER` can write only when the feature guard allows `local`, `test`, or `staging`.
- `SALES` is rejected.
- Production target is rejected.
- `/api/projects` PATCH is not used for this flow.
- Existing Company/CompanyContact are required; no create/upsert/delete calls.
- Company/contact mismatch returns `409`.
- Inactive contact returns `409`.
- `NG`, `NEEDS_REVIEW`, and `SUSPENDED` company statuses return `409`.
- Unknown `reasonCode` is rejected.
- `roleOrder` and `isPrimary` payload fields are rejected.
- The role decision table covers every allowed `ProjectCompanyRoleType` value.
- Stale `Project.updatedAt` returns `409`.
- Existing same `projectId + role` returns `409` without overwrite.
- Unsupported raw fields are rejected.
- `AuditLog` is created in the same transaction and is never deleted.
- Successful UI path reloads/reselects server data with no optimistic write.
