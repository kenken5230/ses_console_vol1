# PR #89 DB Write Smoke Proposal

Date: 2026-06-23

Scope: proposal only. This document does not approve or execute DB write.

## Purpose

Create a safe candidate-present fixture, run a minimal real DB write smoke for PR #89, verify the result, and leave an auditable rollback/cleanup path.

## Gate Status

Status: Proposed / user approval required.

Do not execute this plan until the user approves this separate DB-write gate.

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

However, this baseline did not provide a safe visible candidate-present Browser QA row in the current DB state.

## Candidate-Present Fixture Need

Current read-only search inspected 300 recent projects and found 0 safe projects that simultaneously had:

- a candidate with score >= 60,
- company tradeStatus `OK`,
- active contact,
- contact belonging to the company,
- an available role for the project,
- and suitable status for Browser QA.

Therefore, candidate-present Browser QA requires one of:

1. A local/test synthetic fixture update that makes the baseline project produce a visible safe candidate row.
2. A separate approved local/test fixture with the same safety properties.

## Proposed Fixture Creation Shape

Preferred fixture approach, subject to a fresh preflight:

1. Use the baseline project `50000000-0000-4000-8000-000000000002`.
2. Use the baseline OK company/contact pair:
   - company `30000000-0000-4000-8000-000000000004`
   - contact `31000000-0000-4000-8000-000000000004`
3. Adjust only local/test synthetic source data needed to make the candidate algorithm return this pair as a visible candidate with score >= 60.
4. Keep `PRIME_CONTRACTOR` absent until the final smoke write.
5. Record exact before/after values before making any fixture change.

The exact SQL or script must be prepared and audited separately before execution.

## Required Preflight Before Any Write

Record sanitized evidence only:

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

Use normal logged-in app session only. No cookie injection, token injection, auth proxy, or auth bypass.

The final application request must use only the narrow route:

`PATCH /api/projects/{projectId}/company-contact-role`

Allowed request fields:

- `companyId`
- `contactId`
- `role`
- `expectedUpdatedAt`
- `reasonCode`
- `confirmationToken`

Expected one successful write:

- one `project_company_roles` row,
- one `projects.updatedAt` touch,
- one `audit_logs` row.

## Rollback / Cleanup

Rollback requires separate confirmation at execution time unless the user has explicitly approved cleanup in the DB-write gate.

Default cleanup stance:

- Remove only the single created `project_company_roles` row, if cleanup is approved.
- Keep AuditLog by default.
- Do not restore old `Project.updatedAt` unless separately approved; the route intentionally touches it.
- Do not delete fixture company/contact/project records unless separately approved.

Rollback evidence:

- created role row id,
- before/after role count,
- after-cleanup role count if cleanup is approved,
- scoped AuditLog count retained,
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

Report:

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
