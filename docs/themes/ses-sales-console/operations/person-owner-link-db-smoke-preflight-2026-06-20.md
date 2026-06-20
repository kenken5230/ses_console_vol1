# Person Owner Link DB Write Smoke Preflight

Date: 2026-06-20

Scope: preflight only for `PATCH /api/persons/[id]/owner-company-contact`.

This document does not approve or execute a real DB write smoke. Any real DB write smoke must be separately approved with the exact target database, fixture IDs, operator session, rollback owner, and planned execution window.

## Hard Stop Conditions

Do not run the write smoke when any item below is true:

- `DATABASE_URL` host, database name, branch, schema, or options look production-like.
- `NODE_ENV=production` or `VERCEL_ENV=production`.
- `COMPANY_CONTACT_LINK_WRITE_ENABLED` is not exactly `true`.
- `COMPANY_CONTACT_LINK_WRITE_TARGET` is not exactly `staging`.
- `AUTH_SECRET` is missing, shorter than the application requirement, or not the same secret used by the target runtime.
- The browser/API session is not an active `ADMIN` or `MANAGER` session.
- The selected fixture person already has `ownerCompanyId` or `ownerContactId`.
- The selected fixture company/contact pair is ambiguous, inactive, blocked, or not isolated for smoke testing.
- Before/after verification queries cannot be run and retained.
- Rollback SQL and rollback owner are not prepared before the write.

## Connection Target Confirmation

Before requesting approval for a real write smoke, record the following from the runtime that will execute the request:

| Check | Required record |
| --- | --- |
| `DATABASE_URL` host | Hostname only, no password or full URL |
| `DATABASE_URL` database name | Database/path name only |
| `DATABASE_URL` branch/query | Branch, schema, or options values if present |
| Runtime env | `NODE_ENV` and `VERCEL_ENV` |
| Feature flags | `COMPANY_CONTACT_LINK_WRITE_ENABLED`, `COMPANY_CONTACT_LINK_WRITE_TARGET` |
| Auth config | `AUTH_SECRET` present and valid length; do not record the value |
| App build | Commit SHA and deployment/local runtime identifier |

Expected preflight target:

- Host/database must be staging or disposable test data, not production.
- `COMPANY_CONTACT_LINK_WRITE_ENABLED=true`.
- `COMPANY_CONTACT_LINK_WRITE_TARGET=staging`.
- Production target must be refused by the route guard with HTTP 403 before JSON parsing or helper execution.

## Session Confirmation

Use an active application session whose user role is one of:

- `ADMIN`
- `MANAGER`

Expected refusal cases:

- No valid session: HTTP 401.
- `SALES` or lower role: HTTP 403.
- Disabled guard or production target: HTTP 403, `writeAttempted=false`.

## Fixture Requirements

Select fixtures only after a reviewer approves the target DB.

The fixture person must satisfy:

- Existing row is synthetic, test-only, or otherwise approved for smoke mutation.
- `Person.id` is known.
- `ownerCompanyId` is `null`.
- `ownerContactId` is `null`.
- `updatedAt` is captured immediately before the request and used as `expectedUpdatedAt`.

The fixture company/contact must satisfy:

- `Company.id` is known and belongs to the same approved fixture set.
- `Company.tradeStatus` is not `NG`, `NEEDS_REVIEW`, or `SUSPENDED`.
- `CompanyContact.id` is known.
- `CompanyContact.companyId` equals the selected `Company.id`.
- `CompanyContact.isActive` is not `false`.

The request body must contain only:

- `intent`
- `companyId`
- `contactId`
- `confirmCompanyContactLink`
- `expectedOwnerCompanyId`
- `expectedOwnerContactId`
- `expectedUpdatedAt`

Do not include names, email addresses, notes, raw mail body, raw CSV values, free text, or secrets.

## Pre-Write Verification

Record the following before any separately approved write:

1. Person row:
   - `id`
   - `ownerCompanyId`
   - `ownerContactId`
   - `updatedAt`
2. Company row:
   - `id`
   - `tradeStatus`
3. CompanyContact row:
   - `id`
   - `companyId`
   - `isActive`
4. AuditLog count for:
   - `entityType=Person`
   - `entityId=<person id>`
   - `action=LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT`

Keep query output redacted to IDs, status flags, and timestamps only.

## Expected Success Case

Approved write smoke success must show:

- HTTP 200.
- Response contains `personId`, `ownerCompanyId`, `ownerContactId`, and `intent`.
- `Person.ownerCompanyId` changes from `null` to the selected company ID.
- `Person.ownerContactId` changes from `null` to the selected contact ID.
- `AuditLog` gains one row with:
  - `actorUserId`
  - `action=LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT`
  - `entityType=Person`
  - `entityId=<person id>`
  - `beforeData.ownerCompanyId=null`
  - `beforeData.ownerContactId=null`
  - `afterData.ownerCompanyId=<company id>`
  - `afterData.ownerContactId=<contact id>`
  - `afterData.metadata.featureGuard.COMPANY_CONTACT_LINK_WRITE_TARGET=staging`

## Expected Failure Cases

| Case | Expected result |
| --- | --- |
| No session | HTTP 401, no JSON parse dependency, no helper execution |
| `SALES` session | HTTP 403, no JSON parse dependency, no helper execution |
| Guard disabled | HTTP 403, `status=disabled`, `writeAttempted=false`, no JSON parse, no helper execution |
| Production target | HTTP 403, `status=disabled`, `writeAttempted=false`, production refusal message |
| Invalid JSON | HTTP 400, `reasonCode=INVALID_PERSON_OWNER_LINK_REQUEST`, no helper execution |
| Invalid UUID/body shape | HTTP 400, no DB write |
| Company not found | HTTP 404, no person update |
| Contact not found | HTTP 404, no person update |
| Contact/company mismatch | HTTP 409, `manual-review`, no person update |
| Inactive contact | HTTP 409, `manual-review`, no person update |
| Company trade status blocked | HTTP 409, `manual-review`, no person update |
| Person already linked | HTTP 409, `manual-review`, no person update |
| Stale `updatedAt` | HTTP 409, `manual-review`, no audit write |
| Audit failure | HTTP 500 generic route response; real DB transaction should roll back the person update |

## Post-Write Verification

Only after a separately approved write:

1. Re-query the person row and confirm the two owner link columns changed exactly once.
2. Re-query the matching AuditLog row and confirm before/after payloads.
3. Confirm no company or contact rows were created, updated, deleted, or upserted.
4. Confirm the response and retained logs do not contain raw mail body, notes, email address, password, token, or full `DATABASE_URL`.

## Rollback Plan

Prepare rollback before requesting write approval.

Preferred rollback:

```sql
UPDATE "Person"
SET "ownerCompanyId" = NULL,
    "ownerContactId" = NULL
WHERE "id" = '<person id>'
  AND "ownerCompanyId" = '<company id>'
  AND "ownerContactId" = '<contact id>';
```

Rollback notes:

- Execute rollback only with separate approval unless the smoke approval explicitly includes rollback authority.
- Retain the AuditLog row as evidence unless PM explicitly approves an audit cleanup.
- If rollback is run, re-query person state and record the timestamp.

## Approval Gate

Before a real DB write smoke, provide the PM/reviewer with:

- Target host and database name.
- Runtime env and feature flags.
- Session role.
- Fixture person/company/contact IDs.
- Pre-write verification output.
- Expected request body with no raw text or PII.
- Rollback SQL and owner.
- Confirmation that this preflight PR itself did not run any DB write smoke.
