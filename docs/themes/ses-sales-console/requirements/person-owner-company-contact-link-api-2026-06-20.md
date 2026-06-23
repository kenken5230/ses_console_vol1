# Person Owner Company/Contact Link API

## Scope

This implementation adds `PATCH /api/persons/[id]/owner-company-contact` for linking a Person to an existing Company and an existing CompanyContact only.

It does not create companies, create contacts, update existing links, add migrations, deploy anything, or run real DB write smoke tests. The guarded Person detail UI flow now calls this API only after explicit confirmation. Generic Company/Contact create/update UI remains unimplemented; a separate guarded Project detail UI for existing company/contact role links is implemented and uses `PATCH /api/projects/[id]/company-contact-role` only after explicit confirmation.

## Guard

Writes are allowed only when both values are present:

- `COMPANY_CONTACT_LINK_WRITE_ENABLED=true`
- `COMPANY_CONTACT_LINK_WRITE_TARGET=staging`

`COMPANY_CONTACT_LINK_WRITE_TARGET=production` is rejected even when the enabled flag is true.

## Auth

The route uses the existing auth helper and allows only `ADMIN` and `MANAGER`.

`SALES`, `VIEWER`, unauthenticated requests, and inactive users cannot write.

## Request

The body must contain exactly these fields:

```json
{
  "intent": "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT",
  "companyId": "company-uuid",
  "contactId": "contact-uuid",
  "confirmCompanyContactLink": true,
  "expectedOwnerCompanyId": null,
  "expectedOwnerContactId": null,
  "expectedUpdatedAt": "2026-06-20T00:00:00.000Z"
}
```

Raw body text, mail body text, free notes, generated memo fields, names, emails, and any unsupported top-level key are rejected before DB write logic.

## DB Rules

- The route reads existing `Company`, `CompanyContact`, and `Person` rows only.
- It never calls `company.create`, `companyContact.create`, `upsert`, or delete APIs.
- `contact.companyId` must equal `companyId`.
- `CompanyContact.isActive=false` returns `409` with `manual-review`.
- Company `tradeStatus` values `NG`, `NEEDS_REVIEW`, and `SUSPENDED` return `409` with `manual-review`.
- Existing `Person.ownerCompanyId` or `Person.ownerContactId` returns `409`; the route never overwrites.
- Mismatched `expectedOwnerCompanyId`, `expectedOwnerContactId`, or `expectedUpdatedAt` returns `409`.

## Transaction And Audit

`person.update` and `auditLog.create` run in the same Prisma transaction.

The current schema has no `AuditLog.metadata` column, so safe metadata from the #78/#79 contract is stored inside `afterData.metadata` while preserving the existing `AuditLog` columns:

- `action`
- `entityType`
- `entityId`
- `beforeData`
- `afterData`

## Response

Success returns only minimal identifiers and intent:

```json
{
  "personId": "person-uuid",
  "ownerCompanyId": "company-uuid",
  "ownerContactId": "contact-uuid",
  "intent": "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT"
}
```

Responses do not include company names, contact names, emails, notes, raw mail text, stack traces, secrets, connection strings, or Prisma internals.

## Tests

`npm run test:person-owner-link-api` covers guard behavior, production target rejection, roles, payload rejection, conflict/manual-review cases, transaction/audit behavior with a mock DB, and source guards for no create/upsert/delete calls.
