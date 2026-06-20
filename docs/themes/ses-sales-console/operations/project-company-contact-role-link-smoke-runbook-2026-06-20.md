# Project Company Contact Role Link Smoke Runbook

Date: 2026-06-20

Scope: safe operation notes for `PATCH /api/projects/[id]/company-contact-role`.

No real DB write smoke was executed in this implementation PR. Any future real DB write smoke requires separate written approval with the exact target, fixture IDs, operator session, rollback owner, and execution window.

## Hard Stop Conditions

Do not proceed from classification/preflight into any write step when any item below is true:

- DB target classification has not been recorded from sanitized evidence.
- The only "test" signal is `NODE_ENV=test` or `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=test`.
- `DATABASE_URL` is missing, malformed, production-like, staging-like, shared, or unknown.
- The DB host, DB name, branch, schema, or query options contain production/shared signals such as `prod`, `production`, `live`, `primary`, or a known shared/staging marker.
- Staging write is proposed without separate explicit staging approval, execution window, rollback owner, and evidence plan.
- `AUTH_SECRET` is missing or would need to be printed, copied, pasted, or stored to continue.
- The operator session is not a normal logged-in `ADMIN` or `MANAGER` application session.
- Browser QA would require auth bypass, cookie injection, token injection, or an auth proxy.
- Fixture IDs, current `Project.updatedAt`, existing same-role state, rollback owner, or AuditLog retention plan are not approved.
- Parent PM, executor, audit, PMO, and technical lead gate has not recorded OK.
- Ready for review, merge, deploy, close, cleanup, or worktree deletion is being bundled into the smoke run.

If any hard stop condition is present, record `Blocked` and do not run the write.

## Current Implementation

- Route: `PATCH /api/projects/[id]/company-contact-role`.
- Auth: `ADMIN` and `MANAGER` only.
- Feature guard: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true`.
- Route guard recognizes `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=local`, `test`, or `staging`; this runbook allows a write attempt only after sanitized DB classification and approval. Staging write requires separate explicit approval.
- Production refusal: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=production`, `NODE_ENV=production`, or `VERCEL_ENV=production` is rejected before JSON parsing.
- Intended transaction writes: `project.update` to touch `Project.updatedAt`, `projectCompanyRole.create`, and `auditLog.create`.
- AuditLog is retained and is not deleted by this flow.

## Non-Executed Smoke Status

The real DB write smoke was not executed. This PR performed code-level and mock DB validation only.

The current implementation includes the guarded Project detail UI and code/mock validation. No schema change, migration, deploy, staging operation, production operation, or real DB write smoke was performed.

## Target Database Classification

Classify the runtime that will execute the request before selecting fixtures, opening Browser QA, or preparing a write.

Record only sanitized values:

| Item | Allowed to record | Must not record |
| --- | --- | --- |
| DB URL | Presence and classification only | Full `DATABASE_URL`, username, password, token, query secrets |
| DB host | Hostname category, such as local/test/staging/production/shared/unknown | Credentials or full URL |
| DB name | Database/path name category | Full connection string |
| DB query params | Param keys only, or approved non-secret branch/schema categories | Raw values that may contain secrets |
| Runtime | `NODE_ENV` and `VERCEL_ENV` category | Environment dump |
| Feature guard | Whether enabled is exactly true and target category | Unrelated env values |
| Auth config | `AUTH_SECRET` present/missing/invalid-length only | Secret value, cookies, JWTs, tokens |

Classification decisions:

| Target | Decision |
| --- | --- |
| `local` | Eligible for the next gate only when host/name evidence is local and fixture data is synthetic or disposable. |
| `test` | Eligible for the next gate only when host/name evidence is test/disposable and not shared. |
| `staging` | Blocked unless there is a separate explicit staging-write approval. |
| `production` | Forbidden. Stop before auth, fixture lookup, Browser write action, or HTTP request execution. |
| `shared` | Forbidden. Treat as unsafe for write smoke. |
| `unknown` | Blocked until an auditor classifies it as local/test or a separate staging approval is recorded. |

`NODE_ENV=test` and write target `test` are guard signals only. They do not classify the DB by themselves.

## Read-Only Preflight

Run read-only fixture checks only after DB classification is local/test, or after separate staging read-only approval if staging is being investigated.

The read-only preflight must:

- Avoid printing secrets, passwords, tokens, cookies, full DB URLs, raw personal data, or environment dumps.
- Use a read-only transaction or read-only connection mode when available.
- Select only the approved fixture IDs, current `Project.updatedAt`, existing same-role state, `Company.tradeStatus`, `CompanyContact.companyId`, `CompanyContact.isActive`, and relevant AuditLog counts.
- Perform no `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, migration, seed, reset, deploy, or cleanup.
- Stop if the fixture set is not synthetic, disposable, or explicitly approved.

## Fixture Scope

Each approved smoke run is limited to one route request target:

- One `projectId`.
- One `companyId`.
- One `contactId`.
- One role.
- One `expectedUpdatedAt` captured immediately before the approved request.

Do not batch multiple projects, companies, contacts, or roles. Run a separate gate and evidence bundle for each case.

Before write approval, confirm:

- The project exists and current `Project.updatedAt` is recorded.
- No existing `ProjectCompanyRole` has the same project and role.
- The selected `CompanyContact.companyId` matches the selected `Company.id`.
- The selected `CompanyContact.isActive` is true.
- The selected company `tradeStatus` is not `NG`, `NEEDS_REVIEW`, or `SUSPENDED`.
- Operator session is a normal logged-in `ADMIN` or `MANAGER`.

## Write Cases

Use mock/code tests for broad behavior. A real DB write smoke, if later approved, should run only the minimal success case against one approved local/test fixture.

| Case | Fixture/precondition | Expected HTTP result | DB expectation |
| --- | --- | --- | --- |
| Success | Project/company/contact/role fixture passes preflight and uses current `expectedUpdatedAt` | `200` | `project.update`, `projectCompanyRole.create`, and `auditLog.create` occur in one transaction |
| Existing same role | Same project already has the requested role | `409` manual review | No new role link and no audit write for the attempted link |
| Stale `expectedUpdatedAt` | Request uses an older timestamp than the current Project row | `409` manual review | No role link and no audit write |
| Contact-company mismatch | `CompanyContact.companyId` differs from request `companyId` | `409` manual review | No role link and no audit write |
| Inactive contact | `CompanyContact.isActive=false` | `409` manual review | No role link and no audit write |
| Blocked company | Company `tradeStatus` is `NG`, `NEEDS_REVIEW`, or `SUSPENDED` | `409` manual review | No role link and no audit write |

Do not create failure fixtures by mutating shared data unless that mutation is separately approved.

## HTTP Request Requirements

The approved request body may contain only:

- `companyId`
- `contactId`
- `role`
- `expectedUpdatedAt`
- `reasonCode`
- `confirmationToken`

Do not include names, email addresses, notes, raw mail body, raw CSV values, free text, cookies, tokens, passwords, or secrets in the body, logs, screenshots, or report.

## Browser QA Boundary

Browser QA for PR #89 must use normal login only. Auth bypass, cookie injection, token injection, and auth proxy are forbidden.

Browser QA can confirm navigation and disabled/blocked states before DB write approval. It must not submit the role-link write unless the DB classification, fixture approval, and approval gate have passed.

## Rollback And Cleanup

Prepare rollback before requesting write approval.

Rollback rules:

- Roll back only with separate approval unless the original smoke approval explicitly includes rollback authority.
- Keep rollback limited to the single approved fixture and role.
- Re-query the project role state after rollback and record sanitized state.
- Retain `AuditLog` by default. It is evidence that the route was exercised and/or rolled back.
- AuditLog cleanup requires separate explicit approval and a separate audit trail.

## Required Report After Execution

Report the following, with secrets and PII omitted:

- Git commit/deployment identifier and route path.
- Target classification: local/test/staging, DB host category, and DB name category.
- Confirmation that production, shared, and unknown DB targets were not used.
- Runtime guard values: write enabled exact match and write target category.
- Operator role: `ADMIN` or `MANAGER`.
- Fixture IDs: project, company, contact, and role.
- Preflight result and `Project.updatedAt` used for `expectedUpdatedAt`.
- Case executed and HTTP status/result.
- Before and after Project role-link state.
- AuditLog count before and after; retain the new audit row as evidence.
- Rollback status, rollback owner, and post-rollback state if rollback was run.
- Confirmation that no cookie, token, `AUTH_SECRET`, full `DATABASE_URL`, password, or raw PII was displayed.

## Minimum Four-Role / Preferred Five-Role Approval Gate

Use a minimum four-role operating gate for planning and docs work. The preferred model is a five-role model including Parent PM.

Before a real DB write smoke, re-open any paused role and confirm all preferred five-role checks have recorded OK:

| Role | Required confirmation |
| --- | --- |
| Parent PM | Scope, approval state, Ready/merge/deploy separation, and whether staging or deferral is separately approved. |
| Executor | Exact command/manual action, fixture scope, expected request body, and evidence capture plan. |
| Audit | Read-only review of DB classification, deleted files, forbidden actions, rollback/cleanup scope, and evidence redaction. |
| PMO | Process completeness, blockers, role separation, and report fields. |
| Technical lead | Route behavior, fixture suitability, expected writes, transaction/rollback risk, and Browser QA boundary. |

If capacity forces a temporary four-role fallback, keep Parent PM, executor, audit, and at least one of PMO or technical lead active. Record the paused role, and do not approve DB write, Ready, merge, deploy, or cleanup until the paused role is re-opened or explicitly handled by the PM gate.

## Future Approval Checklist

- Target is classified as local/test by sanitized evidence, or staging has separate explicit approval.
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
