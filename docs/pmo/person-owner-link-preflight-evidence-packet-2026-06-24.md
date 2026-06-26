# Person Owner Link Preflight Evidence Packet (2026-06-24)

This packet prepares the next Person owner link read-only preflight. It does
not approve DB connection, fixture creation, DB write smoke, rollback, Browser
submit, migration, deploy, Ready/merge/close, cleanup, or secret output.
It also does not approve auth bypass, session-cookie injection, guard bypass,
or any fixture create/update/delete mutation.

## Current Blockers From The Last Attempt

The 2026-06-23 preflight attempt stopped safely because:

- process runtime values were not available, so the DB target could not be
  classified as local/test;
- the helper could not run in that worktree because `tsx` was unavailable;
- no approved synthetic/disposable Person/Company/Contact fixture set was
  identified;
- no DB connection, fixture query, or write was performed.

## 2026-06-26 Static Contract Check

The seven-role approval result allowed the static contract test and npm wiring
verification, but not the real DB write smoke.

Observed result:

- `test:person-owner-link-api` is already wired in `package.json`.
- `npm.cmd ci --ignore-scripts` passed in the clean worktree.
- `npm.cmd run test:person-owner-link-api` passed.
- `npx.cmd tsx scripts/person-owner-link-api.test.ts` passed.

No DB connection, fixture query, HTTP write smoke, migration, guarded PATCH,
auth bypass, or secret output was performed.

The next DB-connected preflight still requires local/test target
classification and an approved synthetic/disposable fixture set.

## Goal Of The Next Attempt

Run **only** a read-only preflight for one synthetic or disposable fixture set,
after all prerequisites are satisfied. The write smoke remains a later gate.

Plain-language goal:

> Confirm that one local/test Person, one existing Company, and one existing
> CompanyContact are safe candidates for a later owner-link smoke. Do not link
> them yet.

## Required Preflight Inputs

| Input | Required Evidence | Secret Handling |
| --- | --- | --- |
| Runtime env | `DATABASE_URL` present in process, `AUTH_SECRET` present, route guard env present if required | values not printed |
| DB target | classified as local or isolated test | host/database category only |
| Helper runtime | preflight command can run with dependencies available | command path only |
| Fixture person | synthetic/disposable/approved, unlinked owner fields, current `updatedAt` captured | IDs/timestamps only |
| Fixture company | existing company, trade status not blocked | ID/status only |
| Fixture contact | active, belongs to the selected company | ID/status only |
| Audit evidence | scoped AuditLog count before | count only |

## Approved Read-Only Checks

If the target is local/test and the fixture set is approved, the next preflight
may collect sanitized evidence for:

- `Person.id`;
- `Person.ownerCompanyId`;
- `Person.ownerContactId`;
- `Person.updatedAt`;
- selected `Company.id`;
- selected `Company.tradeStatus`;
- selected `CompanyContact.id`;
- selected `CompanyContact.companyId`;
- selected `CompanyContact.isActive`;
- scoped AuditLog count for that Person/action.

Do not collect or report names, email addresses, notes, raw mail bodies,
customer text, full connection strings, cookies, tokens, passwords, or
unscoped database counts.

## Stop Conditions

Stop before DB connection or fixture query if:

- DB target is production, staging without explicit approval, shared, or
  unknown;
- `.env` or `.env.*` contents would need to be read or printed;
- runtime secrets would need to be copied into docs or chat;
- auth bypass, session-cookie injection, or guard bypass would be needed;
- dependencies are missing and fixing them would require package/lockfile
  changes;
- no approved synthetic/disposable fixture set is available;
- the preflight would create, update, delete, or otherwise mutate fixture rows;
- the selected Person already has `ownerCompanyId` or `ownerContactId`;
- the selected Company is blocked or suspended;
- the selected CompanyContact is inactive or belongs to another Company;
- executor/auditor separation is unavailable.

## Write Smoke Is Not Included

The real HTTP write smoke remains blocked until a later packet records:

- sanitized preflight PASS;
- exact request body shape;
- expected before/after state;
- rollback SQL and rollback owner;
- execution window;
- separate write executor and result auditor;
- explicit owner approval for one local/test write.

## Output Template For A Future Read-Only Preflight

```text
Result: PASS | BLOCKED
DB target classification: local | test | blocked
Secrets printed: no
Fixture set approved: yes | no
Person owner fields currently empty: yes | no
Company allowed status: yes | no
Contact active and company-matched: yes | no
Scoped AuditLog count before:
Write executed: no
Next gate: request one-target write smoke approval | fix blocker
```

## Source Documents

- `docs/status/person-owner-link-readonly-preflight-result-2026-06-23.md`
- `docs/status/sequence1-db-pre-gate-pack-2026-06-23.md`
- `docs/themes/ses-sales-console/operations/person-owner-link-db-smoke-preflight-2026-06-20.md`
- `docs/themes/ses-sales-console/operations/person-owner-link-http-route-smoke-runbook-2026-06-20.md`
- `PROGRESS.md`

## Current Status

This packet is READY as a preflight evidence checklist. The actual DB-connected
read-only preflight still requires local/test target classification and an
approved fixture set before execution.
