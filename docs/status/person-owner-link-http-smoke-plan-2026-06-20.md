# Person Owner Link HTTP Smoke Preparation

Date: 2026-06-20

DB-free follow-up checklist: `docs/status/dbfree-followup-runbooks-2026-06-27.md`.

## Current State

- #82 merged the Person owner link UI path into `origin/main` at `b0d4cc1e547a6f37f3e2571e71a2d4df3ab5c2ad`.
- Helper smoke, route tests, API contract tests, and UI route tests are already covered by code-level tests.
- The real HTTP route smoke body has not been executed.
- This follow-up adds the runbook and read-only preflight helper needed before a separately approved real DB write smoke.

## Added Safety Coverage

- DB target classification for local/test/staging/production.
- Production hard stop.
- Staging approval, fixture, rollback, and evidence requirements.
- One Person/Company/Contact fixture set per local/test/staging run.
- Required confirmation points for success, existing owner, stale `expectedUpdatedAt`, contact-company mismatch, inactive contact, and blocked company cases.
- Rollback policy that keeps AuditLog rows as evidence.
- Secret handling rules for `AUTH_SECRET`, cookies, tokens, and `DATABASE_URL`.
- A read-only preflight script that refuses production-like targets and performs only select queries inside a read-only transaction.

## Remaining Work

- Real HTTP route smoke body is still unexecuted.
- Select approved synthetic or disposable fixtures for each case.
- Obtain explicit staging approval before any staging read/write exercise.
- Run the preflight helper against the approved target and retain sanitized output.
- Execute the real HTTP write smoke only after approval, then report the required before/after and rollback evidence.

## Safety Notes

- No migration, schema change, deploy, production/staging operation, or DB write belongs to this preparation PR.
- Do not display or store secrets, cookies, tokens, full connection strings, or raw PII in status docs.
