# PR #89 Current Gates

Date: 2026-06-23

Scope: PR #89 `Add guarded project company contact link UI`.

This document records the current Draft state, completed evidence, remaining risks, and the next gates. It does not approve Ready for review, merge, close, deploy, migration, production/staging/shared DB access, fixture creation, or real DB write smoke.

## Owner Intent

PR #89 stays Draft.

The real DB write smoke and the candidate-present Browser QA remain separate DB-write gates and are waiting for explicit user approval. They are not executed in this pass.

## Scope

Included in PR #89:

- Guarded project company/contact link UI.
- Lazy-loaded project/person/unclassified detail support.
- Read-only candidate API routes.
- Dashboard detail payload optimization.
- Contract/UI/API tests and status/runbook docs.

Not included in this pass:

- Fixture creation for candidate-present QA.
- Real DB write smoke execution.
- Ready for review.
- Merge.
- Deploy.
- Migration or schema change.

## Current PR State

| Item | State |
| --- | --- |
| PR | #89 |
| Branch | `codex/project-company-contact-link-ui-20260620` |
| State | Draft / open |
| Latest checked head before this docs-only update | `61ba1d60ddd4425e154aa7bfac19df2aa275524a` |
| Vercel | Success at latest checked head |
| Mergeability | Mergeable at latest check |
| Files before this docs-only status update | 29 changed files |
| Deleted files | None |
| Package / lockfile | `package.json` test script wiring only; no lockfile diff |
| Prisma schema / migration | No diff |
| Env files | No PR diff |

## Completed Evidence

| Area | Evidence |
| --- | --- |
| Worktree safety | #89 worktree ended clean after local checks. |
| Deleted files | `git diff --name-status --diff-filter=D` returned no deleted files. |
| DB classification | Sanitized no-connect classifier reported `local`, `eligible-next-gate`, `stopReason: none`; production/staging/shared/unknown were not detected. Secret values were not printed. |
| Read-only fixture preflight | Read-only project/company/contact checks passed for the proposed write-smoke fixture: project exists, `updatedAt` exists, status `OPEN`; company exists with `tradeStatus: OK`; contact exists, matches company, and is active; same project + `PRIME_CONTRACTOR` role absent; AuditLog count before was `0`. |
| QA login preparation | Local synthetic QA user `qa-local@ses-console.test` was reset for Browser QA by updating only `users.passwordHash` and `users.passwordChangedAt`. Password hash and secret values were not printed. The temporary script was removed. |
| Normal login | Login succeeded as an `ADMIN` local QA user through the normal login screen. |
| Project list Browser QA | After clearing the default date filter, the project list displayed 5,045 records. |
| Dev server cleanup | Local dev server was stopped. Next.js `next-env.d.ts` generation noise was restored. |
| Final worktree state | Clean after cleanup. |

## Not Executed / Remaining Risks

| Area | Status | Reason |
| --- | --- | --- |
| Real DB write smoke | Not executed / blocked | DB write is a separate gate and remains user-approval pending. |
| Candidate-present Browser QA | Not executed / blocked | Read-only search inspected 300 recent projects and found 0 safe candidate-present projects that met the needed criteria. The fixed preflight project had write-smoke-safe IDs, but its visible candidate list was not suitable for candidate-present QA. |
| Fixture creation | Not executed / blocked | Creating a safe candidate-present fixture is DB write and must use the separate DB write gate proposal. |
| Ready for review | Blocked | Ready must not proceed while real DB write smoke and candidate-present Browser QA are either incomplete or not explicitly deferred by the final PM gate. |
| Merge / close / deploy | Blocked | Separate approval required after Ready consideration. |

## Changed Files

Implementation files in PR #89 remain the project company/contact link UI and related read-only routes, tests, and docs. This status pass adds docs-only records and should not add env, schema, migration, lockfile, or deletion changes.

## Deleted Files

None expected.

## Next Steps

1. Keep #89 Draft.
2. Keep real DB write smoke and candidate-present Browser QA as a separate approval gate.
3. If the user approves the DB-write gate, use `docs/status/pr89-db-write-smoke-proposal-2026-06-23.md` as the starting plan.
4. After that gate is complete or explicitly deferred, update PR #89 with final evidence before any Ready decision.

