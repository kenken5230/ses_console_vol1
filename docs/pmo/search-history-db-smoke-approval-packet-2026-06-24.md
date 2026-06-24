# SearchHistory DB Smoke Approval Packet (2026-06-24)

This packet prepares an optional SearchHistory local/test DB smoke and
own-user isolation check. It does not approve or execute DB writes.

## Current State

SearchHistory is already DB-backed on `origin/main`.

- `GET /api/search-histories` and `POST /api/search-histories` exist.
- Rows are scoped by the authenticated `user.id`.
- Public responses omit row `userId`.
- `npm run test:search-history` exists for DB-free service/API/UI boundary
  tests.
- Local/test normal-login SearchHistory QA has been recorded previously.

The remaining gate is optional: prove a real local/test save/list/apply flow and
own-user isolation with approved fixture accounts.

## What This Packet Allows Later

Only after separate owner approval, a future executor may run a local/test-only
smoke with:

- one approved user A;
- optionally one approved user B for isolation;
- one `POST /api/search-histories` by user A;
- one `GET /api/search-histories` by user A;
- one `GET /api/search-histories` by user B, if user B exists;
- cleanup of only the row(s) created by the smoke, if cleanup is included in
  the same approval.

## What Remains Forbidden

- production/staging/shared/unknown DB writes;
- auth bypass, cookie injection, token injection, or fabricated sessions;
- reading or printing secret values, cookies, tokens, passwords, or `.env`
  contents;
- creating users as part of this packet;
- migrating schema or changing Prisma models;
- broad deletes, truncates, resets, seed-all, or cleanup by query pattern;
- exposing row `userId` in public response evidence;
- claiming own-user isolation if only one user is checked.

## Required Preflight

Before any write:

| Gate | Required Evidence |
| --- | --- |
| DB target | classified as local or isolated test; secret values hidden |
| App session | normal login only; role label recorded, no tokens/cookies |
| User A | approved test account label, no password/token recorded |
| User B | approved second test account label, if isolation check is included |
| Existing rows | scoped count for each user/scope before smoke |
| Request body | sanitized shape only, no raw customer text or secrets |
| Cleanup | exact created row id(s) and cleanup command/route plan |
| Auditor | separate result reviewer from write executor |

## Minimal Smoke Shape

Suggested target scope: `PROJECTS`.

Suggested request body shape:

```json
{
  "targetScope": "PROJECTS",
  "queryText": "smoke-search-history-local-test",
  "filters": {
    "source": "synthetic-smoke",
    "quickFilters": ["transactionNgHidden"]
  },
  "sortKey": "createdAtDesc",
  "pageSize": 50,
  "resultCount": 0
}
```

The future executor may adjust labels, but must keep the body synthetic and
must not include raw customer text, email addresses, tokens, cookies, or DB
connection details.

## Expected Evidence After Approved Smoke

- User A `POST` returns `201` or the route's documented success status.
- User A `GET` returns the created row in the expected scope.
- Public response has no `userId` or user-identifying filter keys.
- User B `GET`, if included, does not show User A's row.
- Cleanup removes only the smoke-created row(s), if cleanup was approved.
- Scoped count after cleanup returns to the before value.
- No migration, schema, package, lockfile, deploy, or broad cleanup occurred.

## Stop Conditions

Stop before write if:

- DB target is not local/test;
- normal login is unavailable;
- a second user is required but not available;
- cleanup target cannot be scoped to exact created row id(s);
- the request body would include real customer data;
- a route or tool requires auth/session bypass;
- executor and auditor cannot be separated.

## Source Documents

- `docs/status/search-history-current-status-2026-06-23.md`
- `docs/status/search-history-browser-qa-plan-2026-06-24.md`
- `lib/search-history.ts`
- `app/api/search-histories/route.ts`
- `scripts/search-history.test.ts`

## Current Status

This packet is READY as an approval template. The actual DB smoke remains
`WAITING_APPROVAL` and must be limited to local/test only.
