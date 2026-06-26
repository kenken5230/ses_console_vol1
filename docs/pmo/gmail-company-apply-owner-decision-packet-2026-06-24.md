# Gmail Company Apply Owner Decision Packet (2026-06-24)

This packet turns the existing Gmail company apply design into one clear owner
decision. It does not implement apply, connect to a DB, execute a DB write,
change the dashboard API, or approve production/staging/shared operations.

## Recommended Owner Decision

Proceed with a future first implementation only if it is scoped to:

- existing-company link only;
- no new `Company`, `CompanyAlias`, or contact creation;
- allowed sources limited to `known_main_email_domain` and `known_alias`;
- confidence limited to `HIGH`;
- one resolved `existingCompanyId` required;
- generic-domain, `LOW`, signature fallback, `from_name`, `body_label`, and
  unresolved or ambiguous candidates blocked from writes;
- dashboard list/detail API unchanged;
- lazy read-only preview kept separate from a dedicated apply endpoint;
- local/test DB write smoke only after a separate DB gate.

Plain-language decision:

> The first Gmail company apply should only link a reviewed Gmail candidate to
> one already-existing company using high-confidence domain or alias evidence.
> It must not create new master data, write generic/LOW/signature/fromName/body
> label candidates, or hide apply behavior inside ordinary dashboard reads.

## Why This Is The Safe First Step

- It keeps the write set small and reversible.
- It avoids creating noisy company master data from inferred email text.
- It preserves the current read-only candidate boundary.
- It lets the team build contract tests and local/test smoke evidence before
  considering broader apply behavior.
- It gives the owner a policy-level choice instead of asking for low-level
  threshold decisions.

## Explicit Non-Goals

- No apply endpoint in this packet.
- No Prisma write or transaction in this packet.
- No fixture creation.
- No migration, schema, env, package, or lockfile change.
- No dashboard API implementation change.
- No production/staging/shared DB operation.
- No deploy or cleanup operation.

## Future Implementation Gate

A future implementation PR should be allowed to start only when it states all
of the following:

| Gate | Required answer |
| --- | --- |
| Mode | `existingCompanyLinkOnly` |
| Allowed sources | `known_main_email_domain`, `known_alias` |
| Blocked sources | `generic_domain`, `sender_domain`, `signature_company`, `from_name`, `body_label`, `none` |
| Confidence | `HIGH` only |
| Company target | exactly one existing company id |
| New company creation | not supported |
| Dashboard API | unchanged unless separately approved |
| Preview/apply split | lazy read-only preview plus dedicated write endpoint |
| First smoke size | one local/test target unless separately approved |
| Rollback | documented before write |
| Executor/auditor | separate people/agents |

## Required Tests For Future Apply PR

- eligibility helper tests for source/confidence/generic/fallback matrix;
- contract tests rejecting unsupported modes, new company creation, missing
  reason code, missing target count, and target-count mismatch;
- static boundary test proving dashboard list/detail does not inline apply
  candidate fields;
- read-only preview tests proving no Prisma write calls;
- local/test write smoke only after DB target classification and rollback
  approval.

## Stop Conditions

Stop and return to owner/PM if any future PR tries to:

- create a new `Company`, alias, or contact;
- write generic, `LOW`, signature, `from_name`, or body-label-only candidates;
- change `app/api/dashboard-data/route.ts` to include candidate apply data;
- run production/staging/shared DB write smoke;
- omit rollback or audit reason;
- combine preview and apply in one incidental dashboard read endpoint.

## Source Documents

- `docs/status/sequence2-gmail-company-apply-design-pack-2026-06-23.md`
- `docs/status/gmail-company-apply-dbfree-boundary-2026-06-24.md`
- `docs/themes/gmail-remediation/operations/gmail-company-apply-gate-runbook-v0.1.md`
- `PROGRESS.md`

## Current Status

This packet is READY as a policy baseline for the next implementation package.
The implementation itself remains a separate task and must still pass the DB
write gate before any local/test apply smoke.

## 2026-06-26 Design Convergence Note

The seven-role approval result accepted this document as the design convergence
baseline, but explicitly kept apply implementation and DB write on HOLD.

Implementation must not start from this packet alone. A later approval must
name the implementation target and confirm:

- existing-company link only;
- `HIGH` confidence only;
- allowed evidence limited to known main email domain or known alias;
- no writes for generic, `LOW`, signature, `from_name`, body-label-only,
  unresolved, or ambiguous candidates;
- no new `Company`, `CompanyAlias`, or contact creation;
- dashboard list/detail API unchanged unless separately approved;
- preview/apply split preserved;
- local/test DB write smoke as a separate gate.
