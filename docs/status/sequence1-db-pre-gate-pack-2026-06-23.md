# Sequence 1 DB Pre-Gate Pack - 2026-06-23

Observed at: 2026-06-23 JST

Scope: docs-only DB-before-execution gate for Person owner link, Project company/contact role link, and Gmail company apply. This pack does not approve or execute DB connection, DB write, migration, schema change, deploy, Ready, merge, close, fixture creation, cleanup, or Browser QA.

## Target Themes

| Theme | Current relationship to DB execution | Existing boundary |
|---|---|---|
| Person owner link | The UI/API path exists, and the HTTP route smoke is prepared, but the real HTTP write smoke has not been executed. | Link only an existing `Company` and existing `CompanyContact` to one `Person` through `PATCH /api/persons/[id]/owner-company-contact`; no generic company/contact create/update. |
| Project company/contact role link | The guarded UI/API path has already completed local/test DB write smoke, candidate-present Browser QA, result audit, and approved cleanup for PR #89. | Link only an existing `Company` and existing `CompanyContact` to one `ProjectCompanyRole` through `PATCH /api/projects/[id]/company-contact-role`; no broad `/api/projects` write reuse. |
| Gmail company apply | Company candidate inference remains advisory/read-only. Apply/write is future work after the apply gate. | Preserve preview and lazy candidate API boundaries; do not turn candidate inference into persistence without a separate apply/write design and approval. |

The common safety point is that all three themes touch company/contact linkage, but only the Project link has already passed a local/test write-smoke cycle. Person owner link still needs fixture selection and read-only preflight before any write. Gmail company apply is earlier: its policy choices and apply endpoint are not implemented or approved.

## Completed Evidence

| Area | Done | Evidence |
|---|---|---|
| Operating rules | Project-local safety rules formalized. | PR #92 added `AGENTS.md`, `AI_WORK_RULES.md`, and `AI_WORK_RULES_SHORT.md`; summarized in `docs/status/post95-progress-and-gate-summary-2026-06-23.md`. |
| Person owner UI/API path | Guarded UI path merged; code-level tests were recorded. | PR #82, merge `b0d4cc1`; see `docs/status/progress-log-2026-06-20.md`. |
| Person owner HTTP smoke preparation | Runbook, target classification, production hard stop, secret handling, and read-only preflight helper were merged. | PR #84, merge `b2df444`; see `docs/status/person-owner-link-http-smoke-plan-2026-06-20.md`, `docs/themes/ses-sales-console/operations/person-owner-link-http-route-smoke-runbook-2026-06-20.md`, and `docs/themes/ses-sales-console/operations/person-owner-link-db-smoke-preflight-2026-06-20.md`. |
| Person owner safety hardening | Preflight and HTTP smoke expectations were hardened after the operating-rule work. | PR #94, merge `45563f7`; summarized in `docs/status/post95-progress-and-gate-summary-2026-06-23.md`. |
| Project contract/API/safety | Contract, narrow route/API, and shared safety policy were merged before UI. | PR #83 `c3082a8`, PR #85 `fee6581`, PR #86 `89e38ed`; see `docs/status/progress-log-2026-06-20.md`, `docs/themes/ses-sales-console/requirements/project-company-contact-link-contract-2026-06-20.md`, and `docs/status/link-safety-policy-2026-06-20.md`. |
| Project UI and local/test smoke | Guarded UI, local/test DB write smoke, candidate-present Browser QA, result audit, and approved cleanup completed. | PR #89, merge `591dc40`; see `docs/status/pr89-db-write-smoke-proposal-2026-06-23.md`, `docs/status/pr89-current-gates-2026-06-23.md`, and `docs/status/progress-log-2026-06-23.md`. |
| Gmail apply gate | Apply/write gate runbook added; read-only candidate design keeps apply boundary explicit. | PR #93, merge `1dc95a7`; see `docs/themes/gmail-remediation/operations/gmail-company-apply-gate-runbook-v0.1.md` and `docs/themes/gmail-remediation/design/gmail-company-candidate-readonly-v0.1.md`. |
| Gmail boundary tests | Boundary tests for company candidate and extraction-quality behavior were added. | PR #95, merge `443d0e7`; see `PROGRESS.md` and `docs/status/post95-progress-and-gate-summary-2026-06-23.md`. |

## Still Not To Execute In This Sequence

| Item | Status | Why it remains stopped |
|---|---|---|
| DB classification command against real runtime values | Not executed here. | Would require environment-specific values and may lead to DB connection gates; this pack records the next approval shape only. |
| DB connection preflight | Not executed here. | Even read-only fixture checks require owner-approved target and sanitized evidence handling. |
| Real DB write smoke for Person owner link | Not executed. | Needs target classification, synthetic/disposable fixture IDs, operator session, expected request body, rollback owner, and execution window. |
| Additional Project DB write smoke | Not needed for this pre-gate. | PR #89 already completed local/test write smoke and cleanup; production/staging/shared writes remain forbidden without separate approval. |
| Gmail company apply write smoke | Not implemented and not executed. | Apply policy choices are unresolved; candidate inference remains advisory/read-only. |
| Fixture creation or mutation | Not executed. | Fixture writes are DB writes and need exact write set plus approval. |
| Browser QA for Person owner write or Gmail apply | Not executed. | Browser QA must use normal login and must not submit write actions before DB gate approval. |
| Production login-after read-only Project verification | Not executed in this sequence. | It is a remaining QA item, but not a DB-before-execution gate for Person/Gmail writes. It still requires normal login only. |

## Owner Approval Waiting List

User decision needed next, in one sentence:

**Should the next step allow a local/test-only, read-only DB connection preflight for the Person owner link using one synthetic or disposable fixture set, while keeping Gmail company apply design-only and doing no DB write?**

Plain-language summary:

**Plain-language decision: approve only the next Person owner link read-only DB preflight on local/test for one synthetic/disposable fixture. Do not approve Gmail apply, DB write, production/staging/shared access, fixture mutation, cleanup, Ready, merge, close, or deploy in the same decision.**

Recommended answer when ready: approve only the Person owner link read-only preflight, limited to sanitized target classification and one fixture set. Do not approve Person owner write smoke, Gmail apply write, production/staging/shared access, fixture creation, cleanup, Ready, merge, close, or deploy in the same approval.

If this decision is not approved, Sequence 1 can still be considered complete as a docs-only DB pre-gate pack, but no DB-connected evidence may be claimed.

## Internal Five-Role Check

| Role | Check | Current status for this pack |
|---|---|---|
| Parent PM | Scope is docs-only; owner decision is reduced to the next DB connection preflight decision. | OK for docs-only. |
| Audit | No secret files, DB values, code, schema, env, package, lockfile, deployment, Ready/merge/close, or deletion operations are needed. | OK for docs-only; verify final diff and deleted-file diff. |
| PMO | Role separation, remaining blocked items, and user approval point are explicit. | OK for docs-only. |
| Technical lead | Theme boundaries match existing runbooks: Project is post-smoke, Person is pre-smoke, Gmail is advisory/pre-apply. | OK for docs-only. |
| Executor | May create/update docs only under `docs/status` and optional progress/index links. | OK for docs-only. |

Before any DB-connected preflight, re-open the five-role check and record all roles as OK or stop. A hold/NG from any role blocks DB connection and write.

## Write Executor / Auditor Separation

For any future DB-connected or DB-write step:

| Step | Required executor | Required auditor | Separation rule |
|---|---|---|---|
| Read-only DB preflight | DB preflight executor | Audit sub-agent or separate reviewer | The preflight executor must not be the only evidence reviewer. |
| DB write smoke | DB write executor | Result auditor | The write executor and result auditor must not be the same sub-agent. |
| Rollback or cleanup | Cleanup executor approved in the gate | Cleanup/result auditor | Cleanup requires its own approval unless included explicitly in the original smoke approval. |
| Browser QA that can submit a write | Browser QA executor | Gate auditor or TL | The submit action is blocked until DB gate approval is recorded. |

## Sanitized Evidence Template

Use this template only after approval for a read-only preflight or write smoke. Do not paste full URLs, credentials, cookies, tokens, raw mail body, personal names, email addresses, notes, or raw customer data.

```text
Sequence:
Theme:
Route / command:
Git commit or deployment identifier:
Operator role category: ADMIN | MANAGER | not-applicable

DB target classification:
- targetClassification: local | test | staging | production | shared | unknown
- decision: eligible-next-gate | blocked
- stopReason:
- host category: localhost | loopback | local-docker | private-network | remote | unknown
- DB name category: local | test | staging | production | shared | unknown
- query keys only:
- runtime category: NODE_ENV category / VERCEL_ENV category
- feature guard category:
- secrets printed: no

Fixture scope:
- Person ID / Project ID / Gmail target count:
- Company ID:
- Contact ID:
- role or intent:
- expectedUpdatedAt captured: yes | no | not-applicable
- same-role or existing-owner state:
- company trade status category:
- contact active and company match:
- scoped AuditLog count before:

Execution:
- read-only preflight only: yes | no
- write executed: no unless separately approved
- approved request fields for write smoke:
  - Person owner link: intent / companyId / contactId / confirmCompanyContactLink / expectedOwnerCompanyId / expectedOwnerContactId / expectedUpdatedAt only
  - Project role link: companyId / contactId / role / expectedUpdatedAt / reasonCode / confirmationToken only
  - Gmail apply: not-applicable until an apply contract is separately approved
- sanitized request body shape recorded before write: yes | no | not-applicable
- HTTP status or command result:
- before state:
- after state:
- scoped AuditLog count after:

Rollback / cleanup:
- rollback prepared before write: yes | no | not-applicable
- rollback owner:
- cleanup approved: yes | no | not-applicable
- cleanup executed:
- AuditLog retained:

Forbidden evidence check:
- full DATABASE_URL printed: no
- AUTH_SECRET/cookies/tokens/passwords printed: no
- raw PII/customer text printed: no
- production/staging/shared write: no
```

## Stop Conditions

Stop before DB connection, Browser submit, fixture mutation, write, cleanup, or reporting success if any item is true:

- Target classification is production, shared, unknown, or staging without separate explicit staging approval.
- A required secret value would need to be printed, copied into docs, pasted into chat, or stored.
- `.env` or `.env.*` contents would need to be read.
- Fixture IDs are missing, not synthetic/disposable/approved, ambiguous, already linked, inactive, blocked, or not isolated.
- Person owner link would use more than one Person/Company/Contact set.
- Project role link would use more than one Project/Company/Contact/role set.
- Gmail apply would include generic-domain, `LOW` confidence, signature fallback, or `fromName` fallback candidates before policy approval.
- Normal login is unavailable and the flow would require auth bypass, cookie injection, token injection, or an auth proxy.
- The action would create, update, delete, upsert, migrate, seed, reset, truncate, deploy, Ready, merge, close, delete a worktree, or touch unrelated work.
- Executor/auditor separation is unavailable.
- Any internal role records hold/NG or the user approval is missing.

## Rollback / Cleanup Policy

| Theme | Policy before any future write |
|---|---|
| Person owner link | Prepare a single-row rollback that clears only the approved `Person.ownerCompanyId` and `Person.ownerContactId` when they still match the approved company/contact IDs. Retain the AuditLog row by default. Audit cleanup is separate and not bundled. |
| Project company/contact role link | PR #89 cleanup already removed the smoke-created local `project_company_roles` row and retained AuditLog evidence. Any additional write needs a new rollback/cleanup plan for exactly one approved role row. |
| Gmail company apply | Rollback strategy must be designed before implementation. It must list affected tables, record identifiers, reversal strategy, target count, skipped count, and audit evidence. No apply write exists in this pack. |

Cleanup is never a general delete. It must be scoped to approved IDs, reviewed before execution, and audited after execution. Production/staging/shared cleanup is forbidden without separate explicit approval.

## Completion Boundary For Sequence 1

After this pack is created and linked, Sequence 1 can be marked complete only up to:

- docs-only DB pre-gate consolidation completed;
- existing evidence and remaining gates consolidated;
- user approval point for the next read-only DB preflight clarified;
- no DB connection, no DB write, no fixture creation, no Browser write QA, no schema/migration/env/package/lockfile/code change, no deploy, no Ready/merge/close, and no cleanup performed.

Sequence 1 cannot be marked complete as DB preflight executed, DB write smoke passed, Gmail apply designed/implemented, or Browser QA passed. Those are separate later gates.
