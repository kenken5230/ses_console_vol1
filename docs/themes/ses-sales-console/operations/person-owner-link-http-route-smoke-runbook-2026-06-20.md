# Person Owner Link HTTP Route Smoke Runbook

Date: 2026-06-20

Scope: safe preparation for `PATCH /api/persons/[id]/owner-company-contact`.

This runbook does not approve a real DB write smoke by itself. The smoke body must not be run until the target database, fixture IDs, operator session, expected request body, rollback owner, and execution window are approved in writing.

## Non-Negotiable Rules

- Never run the HTTP route smoke against production.
- Never display `AUTH_SECRET`, cookies, bearer tokens, session tokens, password values, full `DATABASE_URL`, or request headers that may contain credentials.
- Never run more than one Person/Company/Contact fixture set in a single local or test smoke.
- Never use a real customer or production-derived fixture unless the PM explicitly approves it for staging.
- Never clean up `AuditLog` rows as part of the default rollback. Audit evidence is retained.
- This PR only adds runbook and read-only preflight support. It must not execute the real HTTP write smoke.

## Target Database Classification

Classify the runtime that will execute the request before selecting fixtures.

Record only sanitized values:

| Item | Allowed to record | Must not record |
| --- | --- | --- |
| DB host | Hostname only | User, password, full URL |
| DB name | Path/database name only | Full connection string |
| DB query params | Param keys only, or approved non-secret branch/schema names | Raw query values that may contain secrets |
| Runtime | `NODE_ENV`, `VERCEL_ENV` | Environment dumps |
| Feature guard | Whether `COMPANY_CONTACT_LINK_WRITE_ENABLED=true`; target value | Any unrelated env values |
| Auth | `AUTH_SECRET` present/missing only | Secret value, cookies, JWTs, tokens |

Classification guidance:

| Target | Decision |
| --- | --- |
| `local` | Allowed only with a synthetic or disposable fixture. Use exactly one Person/Company/Contact set. |
| `test` | Allowed only with a synthetic or disposable fixture. Use exactly one Person/Company/Contact set. |
| `staging` | Requires explicit approval, approved fixture IDs, prepared rollback, and retained before/after evidence. |
| `production` | Forbidden. Stop before auth, fixture lookup, or HTTP request execution. |
| `unknown` | Treat as blocked until a reviewer classifies it as local/test/staging. |

Production-like signals include host, DB name, branch, schema, or runtime values containing `prod`, `production`, `live`, `primary`, or a production deployment marker. When any production signal is present, stop.

## Read-Only Preflight

Use the helper before asking for HTTP smoke approval:

```powershell
npm.cmd run person-owner-link:http-smoke:preflight -- --classify-only
```

For fixture validation:

```powershell
npm.cmd run person-owner-link:http-smoke:preflight -- `
  --case success `
  --person-id <person uuid> `
  --company-id <company uuid> `
  --contact-id <contact uuid>
```

The helper:

- Parses `DATABASE_URL` without printing secrets.
- Refuses production-like targets before connecting.
- Refuses staging unless `--confirm-staging-read-only` is supplied after approval.
- Refuses unknown targets unless a reviewer reclassifies them outside this script.
- Uses `BEGIN READ ONLY` and `ROLLBACK`.
- Selects only fixture IDs, owner link fields, `updatedAt`, `tradeStatus`, `companyId`, `isActive`, and existing audit count.
- Performs no `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, migration, or HTTP request.

If `DATABASE_URL` is unset, the helper must fail safely without attempting a DB connection.

## Fixture Scope

Each local/test/staging smoke run is limited to one route request target:

- One `Person.id`.
- One `Company.id`.
- One `CompanyContact.id`.
- One `expectedUpdatedAt` captured immediately before the approved request.

Do not batch multiple people, companies, or contacts. Run a separate approval and separate evidence bundle for each case.

## Cases To Confirm

Use route tests for baseline behavior and the real HTTP smoke only for a tiny approved fixture set.

| Case | Fixture/precondition | Expected HTTP result | DB expectation |
| --- | --- | --- | --- |
| Success | Person has no owner IDs; company/contact match; contact active; company not blocked; current `updatedAt` used | `200` | Person owner IDs set once; one `AuditLog` row added |
| Existing owner present | Person already has `ownerCompanyId` or `ownerContactId` | `409` manual review | No Person update; no new audit row for the attempted link |
| Stale `expectedUpdatedAt` | Request uses an older timestamp than the current Person row | `409` manual review | No Person update; no audit row |
| Contact-company mismatch | `CompanyContact.companyId` differs from request `companyId` | `409` manual review | No Person update; no audit row |
| Inactive contact | `CompanyContact.isActive=false` | `409` manual review | No Person update; no audit row |
| Blocked company | Company `tradeStatus` is `NG`, `NEEDS_REVIEW`, or `SUSPENDED` | `409` manual review | No Person update; no audit row |

Do not simulate failure cases by editing shared data unless that mutation is separately approved. Prefer pre-existing synthetic fixtures or disposable local/test data.

## HTTP Request Requirements

The approved request body may contain only:

- `intent`
- `companyId`
- `contactId`
- `confirmCompanyContactLink`
- `expectedOwnerCompanyId`
- `expectedOwnerContactId`
- `expectedUpdatedAt`

Do not include names, email addresses, notes, raw mail body, raw CSV values, free text, cookies, tokens, or secrets in the body, logs, screenshots, or report.

Use only an active application session with role `ADMIN` or `MANAGER`. Do not bypass auth and do not inject cookies or tokens into logs.

## Rollback

Prepare rollback before requesting approval.

Default rollback:

```sql
UPDATE "persons"
SET "owner_company_id" = NULL,
    "owner_contact_id" = NULL
WHERE "id" = '<person id>'
  AND "owner_company_id" = '<company id>'
  AND "owner_contact_id" = '<contact id>';
```

Rollback rules:

- Roll back only with approval, unless the original smoke approval explicitly includes rollback authority.
- Re-query the Person after rollback and record the sanitized row state.
- Do not delete the `AuditLog` row by default. It is evidence that the route was exercised and rolled back.
- If PM requests audit cleanup later, treat that as a separate audited operation.

## Required Report After Execution

Report the following, with secrets and PII omitted:

- Git commit/deployment identifier and route path.
- Target classification: local/test/staging, DB host, DB name.
- Confirmation that production was not used.
- Runtime guard values: write enabled exact match and target.
- Operator role: `ADMIN` or `MANAGER`.
- Fixture IDs: Person, Company, Contact.
- Preflight result and `updatedAt` used for `expectedUpdatedAt`.
- Case executed and HTTP status/result.
- Before and after Person owner link state.
- AuditLog count before and after; retain the new audit row as evidence.
- Rollback status, rollback owner, and post-rollback Person state if rollback was run.
- Confirmation that no cookie, token, `AUTH_SECRET`, full `DATABASE_URL`, or raw PII was displayed.

## Approval Checklist

Before running a real HTTP write smoke, the approver must confirm:

- Target is not production.
- Staging, if used, has explicit approval and an execution window.
- Fixture set is synthetic, disposable, or approved.
- Exactly one Person/Company/Contact set will be used.
- Rollback SQL and rollback owner are ready.
- Operator session is valid and authorized.
- Request body is the minimal safe shape.
- AuditLog will be retained.
- This preparation PR did not perform the real DB write smoke.
