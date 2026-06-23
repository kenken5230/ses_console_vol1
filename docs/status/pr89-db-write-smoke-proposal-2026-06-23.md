# PR #89 DB Write Smoke Proposal

Date: 2026-06-23

Scope: proposal and execution record. This document records the local/test-only DB write smoke gate approved and executed on 2026-06-23.

## Purpose

Create a safe candidate-present fixture, run a minimal real DB write smoke for PR #89, verify the result, and leave an auditable rollback/cleanup path.

## Gate Status

Status: Executed on local DB after user approval.

The gate was approved for local/test only. It did not authorize production/staging/shared DB write, merge, close, deploy, migration, schema change, seed-all, reset, truncate, or delete-all.

## Allowed Target

Allowed:

- Local DB only.
- Test DB only.

Forbidden:

- Production DB.
- Staging DB unless separately approved with execution window and rollback owner.
- Shared DB.
- Unknown DB.
- Any target where sanitized classification is not `local` or `test`.

## Required Team Split

| Role | Responsibility |
| --- | --- |
| Parent PM | Confirms scope, user approval, and separation from Ready/merge/deploy. |
| DB write executor | Runs only the approved fixture/write commands. |
| Result auditor | Independently checks before/after state, deleted files, cleanup, and evidence redaction. |
| PMO | Confirms process status and remaining gates. |
| Technical lead | Confirms fixture suitability, expected writes, rollback posture, and UI/API coverage. |

DB write executor and result auditor must not be the same sub-agent.

## Target Tables

Expected write scope for the final route smoke:

- `projects`: update only `updatedAt` for the selected project through the application route.
- `project_company_roles`: create one role-link row.
- `audit_logs`: create one audit log row and keep it by default.

Fixture creation, if needed for candidate-present Browser QA, may require inserting or updating minimal synthetic local/test records. The exact fixture write set must be listed before execution.

No migration, schema change, seed-all, reset, truncate, delete-all, production/staging/shared write, or deploy is allowed.

## Candidate Fixture Baseline

Existing read-only evidence found a write-smoke-safe baseline:

| Item | Value |
| --- | --- |
| Project ID | `50000000-0000-4000-8000-000000000002` |
| Company ID | `30000000-0000-4000-8000-000000000004` |
| Contact ID | `31000000-0000-4000-8000-000000000004` |
| Role | `PRIME_CONTRACTOR` |
| Project status | `OPEN` |
| Company trade status | `OK` |
| Contact active | `true` |
| Existing same project + role | None |
| AuditLog count before | `0` at the time of preflight |

The initial baseline did not provide a safe visible candidate-present Browser QA row because the approved project had no `sourceMailId`.

## Candidate-Present Fixture Need

Read-only search inspected 300 recent projects and found 0 safe projects that simultaneously had:

- a candidate with score >= 60,
- company tradeStatus `OK`,
- active contact,
- contact belonging to the company,
- an available role for the project,
- and suitable status for Browser QA.

Therefore, candidate-present Browser QA required one of:

1. A local/test synthetic fixture update that makes the baseline project produce a visible safe candidate row.
2. A separate approved local/test fixture with the same safety properties.

## Executed Fixture Creation Shape

Executed fixture approach, after fresh preflight and script audit:

1. Use the baseline project `50000000-0000-4000-8000-000000000002`.
2. Use the baseline OK company/contact pair:
   - company `30000000-0000-4000-8000-000000000004`
   - contact `31000000-0000-4000-8000-000000000004`
3. Created local-only synthetic source data needed to make the candidate algorithm return this pair as a visible candidate with score >= 60.
4. Keep `PRIME_CONTRACTOR` absent until the final smoke write.
5. Record exact before/after values before making any fixture change.

Executed fixture IDs:

- Synthetic mail fixture: `89000000-0000-4000-8000-000000000089`
- Extraction fixture: `89000000-0000-4000-8000-000000000189`

Retained fixture evidence:

- The synthetic mail fixture is retained in local DB.
- The extraction fixture is retained in local DB.
- The approved project `sourceMailId` fixture link is retained in local DB.

The exact temporary script was prepared, audited separately, executed, and removed from the worktree after completion.

## Required Preflight Before Any Write

Recorded sanitized evidence only:

- Current branch and head SHA.
- `git status`.
- `git diff --name-status --diff-filter=D`.
- No-connect DB classification: `local` or `test`, no secret values printed.
- `AUTH_SECRET` present only.
- Feature guard target category.
- Candidate fixture IDs.
- Current `Project.updatedAt`.
- Existing same project + role count.
- Contact/company match.
- Contact active.
- Company tradeStatus not blocked.
- AuditLog count before.

AuditLog count must be scoped, not a whole-table count. Use the project company/contact role link action, `entityType=Project`, `entityId=projectId`, and the approved role/company/contact metadata when checking before/after evidence.

## Smoke Execution Shape

Used normal logged-in app session only. No cookie injection, token injection, auth proxy, or auth bypass.

The final application request must use only the narrow route:

`PATCH /api/projects/{projectId}/company-contact-role`

Allowed request fields:

- `companyId`
- `contactId`
- `role`
- `expectedUpdatedAt`
- `reasonCode`
- `confirmationToken`

Observed one successful write:

- one `project_company_roles` row,
- one `projects.updatedAt` touch,
- one `audit_logs` row.

Observed result:

- Created role row: `43f418fe-0e83-40df-b3f6-b6dc773557ec`
- Matching scoped AuditLog: `2bd3c004-75e5-4d2f-ac23-8963709098c7`
- Same project + same role count after smoke: `1`

## Rollback / Cleanup

Cleanup was explicitly approved in the DB-write gate.

Executed cleanup stance:

- Removed only the single created `project_company_roles` row.
- Keep AuditLog by default.
- Did not restore old `Project.updatedAt`; the route intentionally touches it.
- Did not delete fixture company/contact/project records.
- Did not delete synthetic mail/extraction fixture evidence.

Cleanup evidence:

- created role row id: `43f418fe-0e83-40df-b3f6-b6dc773557ec`,
- after-cleanup role count: `0`,
- scoped AuditLog count retained: `1`,
- no secrets printed.

## Stop Conditions

Stop immediately if:

- DB classification is not local/test.
- The fixture no longer matches preflight.
- Same project + role already exists.
- Company is `NG`, `NEEDS_REVIEW`, or `SUSPENDED`.
- Contact is inactive or belongs to another company.
- Normal login cannot be established.
- Browser QA requires auth bypass/cookie injection/token injection.
- Any role in the gate returns NG/hold.
- The command would affect more than the approved IDs.

## Post-Execution Reporting

Reported:

- target classification,
- fixture IDs,
- route used,
- HTTP/result status,
- before/after role state,
- AuditLog delta,
- cleanup status,
- deleted files status,
- git status,
- Ready/merge/deploy not performed,
- secrets not printed.
