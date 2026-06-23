# Project Company Contact Role Link Ready Checklist

Date: 2026-06-21

Scope: PR #89 `Add guarded project company contact link UI`.

> Historical snapshot: this checklist records the Ready gate state as of 2026-06-21. It intentionally preserves then-current `Not run` and `Blocked` rows. The later Ready, local DB smoke, Browser QA, and merge-gate state are tracked in the PR body and `docs/status/pr89-current-gates-2026-06-23.md`.

This checklist is a docs-only readiness record. It does not approve DB access, DB write smoke, Browser QA execution, deploy, Ready for review, merge, close, staging use, or cleanup.

## Status Legend

| Status | Meaning |
| --- | --- |
| Not run | No executable validation evidence has been recorded. |
| Blocked | Cannot proceed until the listed gate or approval is satisfied. |
| Pass | Evidence was recorded and the gate passed. |
| Fail | Evidence was recorded and the gate failed. |

## Current Readiness Summary

| Area | Status | Required evidence before Ready |
| --- | --- | --- |
| Docs-only sequence 2 preparation | Pass | This checklist, the DB smoke runbook expansion, and status index link are present. |
| DB classification command | Not run / Blocked | `DB classification command: drafted/audited only unless an actual classification output is recorded.` |
| Real DB write smoke | Not run / Blocked | `Real DB write smoke: Not run. Blocked by missing process-only local/test env and fixture approval.` |
| Browser QA after login | Not run / Blocked | `Browser QA after login: Not run. Normal-auth session was unavailable in this no-PC pass.` |
| Ready for review | Blocked | `Ready for review remains blocked until DB/Browser QA evidence is recorded or explicitly deferred by the PM gate.` |
| Merge/deploy | Blocked | Separate explicit approval is required after Ready consideration. |

## Non-Negotiable Boundaries

- Do not record `DATABASE_URL`, `AUTH_SECRET`, passwords, cookies, bearer tokens, session tokens, JWTs, or other secret values.
- Record only presence/absence and sanitized classification output: host category, database name category, runtime classification, guard classification, and approval state.
- Use the no-connect DB classifier command and output schema fixed in the smoke runbook; it parses `DATABASE_URL` only and never prints the full URL, user, password, raw host, query values, tokens, or secrets.
- DB write is forbidden until the DB target is classified as local/test by sanitized evidence and the fixture set is approved.
- `NODE_ENV=test` alone does not classify a database as test.
- `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=test` alone does not classify a database as test.
- The implementation guard recognizes `local`, `test`, and `staging`, but this unapproved Ready checklist stops at local/test only.
- Production, staging, shared, and unknown DB write targets are forbidden for this checklist.
- Unknown means Blocked: do not proceed while classification remains unknown.
- Staging write requires a separate explicit approval, execution window, rollback owner, evidence plan, and PM gate decision.
- Browser QA must use normal login only. Auth bypass, cookie injection, token injection, and auth proxy are forbidden.
- Ready for review, merge, deploy, close, and worktree cleanup require separate approval.

## Minimum Four-Role Gate

Use a minimum four-role operating gate for planning and docs work. The preferred model is a five-role gate including Parent PM.

Before DB write smoke, Browser QA evidence acceptance, Ready deferral, or Ready for review, re-open any paused role and record the preferred five-role confirmation below:

| Role | Required confirmation |
| --- | --- |
| Parent PM | Scope, approval need, Ready/merge/deploy separation, and whether deferral is allowed. |
| Executor | Exact command or manual QA scope, changed files, and evidence captured without secrets. |
| Audit | Read-only review of target classification, changed files, deleted files, forbidden operations, and evidence redaction. |
| PMO | Process status, unresolved blockers, role separation, and required report completeness. |
| Technical lead | Technical risk, fixture suitability, expected DB writes, rollback posture, and Browser QA coverage. |

If capacity forces a temporary four-role fallback, keep Parent PM, executor, audit, and at least one of PMO or technical lead active. Record the paused role, and do not approve DB write, Ready, merge, deploy, or cleanup until the paused role is re-opened or explicitly handled by the PM gate.

If any required role is missing, NG, or unresolved at an approval gate, the gate remains Blocked.

## DB Classification Gate

Staging scope separation for this Ready checklist:

- Implementation guard recognizes `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=staging`.
- This Ready checklist allows DB write smoke to proceed only for sanitized local/test classification.
- Staging is Blocked until separate staging approval, separate execution evidence, rollback owner, execution window, and PM gate record exist.

| Check | Status | Required record |
| --- | --- | --- |
| `DATABASE_URL` presence | Not run / Blocked | Present/missing only; never full URL or credentials. |
| DB target classification | Not run / Blocked | `local`, `test`, `staging`, `production`, `shared`, or `unknown`; derived from sanitized URL evidence only. |
| DB host classification | Not run / Blocked | `localhost`, `loopback`, `local-docker`, `private-network`, `remote`, or `unknown`; raw host omitted. |
| DB name/category classification | Not run / Blocked | Disposable/synthetic/local/test vs production-like/staging-like/shared/unknown; sanitized only. |
| Runtime classification | Not run / Blocked | `NODE_ENV` and `VERCEL_ENV` category only; no env dump. |
| Feature guard classification | Not run / Blocked | Whether write enabled is exactly true and target category; no unrelated env values. |
| Auth config presence | Not run / Blocked | `AUTH_SECRET` present/missing/invalid-length only; never the value. |

Stop if the classifier reports production, staging, shared, unknown, missing required config, or only `NODE_ENV=test` / write target `test` without DB evidence. Staging being recognized by the route guard is not enough for this checklist; staging write remains blocked unless a separate staging approval is recorded.

## DB Write Smoke Gate

Expected write scope, if later approved after local/test classification:

- `project.update`
- `projectCompanyRole.create`
- `auditLog.create`

No other DB write is in scope. Migration, seed, reset, delete, upsert outside the route flow, staging write, production write, and shared DB write are out of scope.

| Requirement | Status | Evidence needed |
| --- | --- | --- |
| Local/test DB classification passed | Not run / Blocked | Sanitized classifier output and audit approval. |
| Fixture set approved | Not run / Blocked | One `projectId`, `companyId`, `contactId`, and role; IDs only. |
| Pre-write read-only fixture check | Not run / Blocked | Existing role absence, contact/company match, active contact, allowed company trade status, current `Project.updatedAt`. |
| Request body approved | Not run / Blocked | Only `companyId`, `contactId`, `role`, `expectedUpdatedAt`, `reasonCode`, and `confirmationToken`. |
| Rollback/cleanup approval | Not run / Blocked | Rollback owner and scope; no automatic cleanup. |
| AuditLog retention | Not run / Blocked | AuditLog retained by default; cleanup requires separate approval. |
| Result evidence | Not run / Blocked | HTTP/result status, before/after sanitized state, and audit count delta. |

## Browser QA Gate

Browser QA is currently Not run / Blocked.

Use only a normal authenticated application login with an `ADMIN` or `MANAGER` user. Do not bypass auth, inject cookies, paste tokens, use an auth proxy, or display secrets in screenshots/logs.

Required Browser QA evidence before Ready or explicit deferral:

| Check | Status | Evidence needed |
| --- | --- | --- |
| Normal login session | Not run / Blocked | Role category only; no username, password, cookie, token, or secret value. |
| Role authorization: `ADMIN` | Not run / Blocked | `ADMIN` can reach the guarded link controls only when all non-auth gates allow it. |
| Role authorization: `MANAGER` | Not run / Blocked | `MANAGER` can reach the guarded link controls only when all non-auth gates allow it. |
| Role refusal: `SALES` | Not run / Blocked | `SALES` cannot execute the project company/contact role link, even if general project edit UI is available. |
| Role refusal: `VIEWER` | Not run / Blocked | `VIEWER` cannot execute the link and sees an understandable blocked/permission state. |
| Role refusal: unauthenticated | Not run / Blocked | Logged-out access cannot execute the link; no auth bypass or token injection is used. |
| Project detail route opens | Not run / Blocked | Project detail pane opens from normal navigation with no secrets/PII beyond approved fixture IDs. |
| Candidate display / 候補表示 | Not run / Blocked | Existing company/contact candidates are shown with company/contact IDs or labels needed for operator review. |
| Guard allowed/disabled state / guard許可/disabled状態 | Not run / Blocked | `projectCompanyContactRoleLinkWriteAllowed=true` permits the confirmation path only with an allowed role; false/disabled guard blocks submit and shows a clear disabled state. |
| `projectCompanyContactRoleLinkWriteAllowed` true state | Not run / Blocked | When dashboard data returns true and user role is allowed, candidate row action can open the confirmation panel. |
| `projectCompanyContactRoleLinkWriteAllowed` false state | Not run / Blocked | Candidate row action is disabled or shows a clear disabled reason; no write can be submitted. |
| Confirmation panel opens | Not run / Blocked | Panel appears only after selecting an enabled candidate action. |
| Role selection / role選択 | Not run / Blocked | Bounded role select is required; blank or invalid role cannot submit. |
| Reason code selection / reasonCode選択 | Not run / Blocked | Bounded `reasonCode` select is present and required; no free-text reason is accepted. |
| Confirmation checkbox required / confirmation checkbox必須 | Not run / Blocked | Confirmation checkbox must be checked before submit. |
| Checkbox reset on role change | Not run / Blocked | Changing role clears the confirmation checkbox before submit can be re-enabled. |
| Checkbox reset on reasonCode change | Not run / Blocked | Changing `reasonCode` clears the confirmation checkbox before submit can be re-enabled. |
| Submit disabled conditions / submit disabled条件 | Not run / Blocked | Submit must stay disabled for no candidate, no role, no reasonCode, unchecked confirmation, disabled gate, or in-flight submit. |
| Submit disabled: no candidate | Not run / Blocked | Submit is unavailable when no candidate row is selected. |
| Submit disabled: no role | Not run / Blocked | Submit remains disabled until a bounded role is selected. |
| Submit disabled: no reasonCode | Not run / Blocked | Submit remains disabled if a bounded `reasonCode` is absent. |
| Submit disabled: unchecked confirmation | Not run / Blocked | Submit remains disabled until the checkbox is checked. |
| Submit disabled: gate disabled | Not run / Blocked | Submit remains disabled when project/candidate/role gate is disabled. |
| Submit disabled: submitting | Not run / Blocked | Double-submit is prevented while request is in progress. |
| Narrow PATCH route only | Not run / Blocked | Submit calls only narrow PATCH `/api/projects/[id]/company-contact-role`; broad `/api/projects` PATCH is not used for this flow. |
| No optimistic write / no optimistic write | Not run / Blocked | UI does not mutate local project role/contact state before server success. |
| Success reload/reselect / 成功後reload/reselect | Not run / Blocked | After approved success, dashboard data reloads and the same project is reselected from server data. |
| `409` manual review display | Not run / Blocked | Manual-review response is shown as a blocked/manual review state, with no local optimistic save. |
| `403` disabled display | Not run / Blocked | Disabled feature guard response shows an understandable disabled state and does not submit further writes. |
| `403` permission display | Not run / Blocked | Unauthorized role response shows an understandable permission/forbidden state. |
| Visual integrity / UI文言 | Not run / Blocked | UI文言の文字化け、はみ出し、重なりがなく、tested desktop/mobile viewportsで判読できる。 |
| Approved success path, if DB smoke is approved | Not run / Blocked | Only after DB gate; otherwise do not submit a write. |

If DB write approval is not present, Browser QA may verify navigation, candidate display, permission/disabled states, form reset behavior, disabled submit conditions, and visual integrity without clicking the final submit.

## PR Body / Comment Sync Before Ready

Before Ready for review or an explicit PM deferral, synchronize the PR body or a PR comment with the latest evidence. This checklist does not approve doing that sync; it defines the required content for the later approved PR update.

| Item | Status | Required record |
| --- | --- | --- |
| Latest PR head | Not run / Blocked | Latest head SHA or verified "checked at" note from GitHub; do not rely on stale embedded hashes. |
| Latest changed files actual count / 最新changed files実数 | Not run / Blocked | Current PR changed files count from GitHub; PR body value such as old `20` must be synchronized to the latest actual value before Ready. |
| DB smoke status | Not run / Blocked | Not run, Blocked, Pass, Fail, or explicitly deferred by PM gate. |
| Browser QA status | Not run / Blocked | Not run, Blocked, Pass, Fail, or explicitly deferred by PM gate. |
| DB/Browser QA state | Not run / Blocked | DB smoke and Browser QA statuses are both recorded in the PR body/comment. |
| PM deferral state / PM deferral有無 | Not run / Blocked | Whether DB smoke and/or Browser QA were deferred, by whom, and why. |
| Deleted files | Not run / Blocked | Current deleted files list or explicit "none". |
| DB/schema/env/package/lockfile changes | Not run / Blocked | Explicit yes/no for each category. |
| Untracked files | Not run / Blocked | Ready sync must record `untrackedなし`; if untracked files exist, explain whether they are intended and ensure they are included or cleared before Ready. |
| PR body changed-files sync | Not run / Blocked | PR body/comment must replace stale changed-files counts, including the prior `20` value, with the latest actual count. |
| Ready/merge/deploy separation | Not run / Blocked | Ready, merge, and deploy remain separate approval gates. |

## Required Final Report Fields

When this checklist moves beyond Blocked, report:

- Changed files and deleted files.
- DB/schema/env/package/lockfile change status.
- DB classification result, sanitized.
- Real DB write smoke status: Not run, Blocked, Pass, or Fail.
- Browser QA status: Not run, Blocked, Pass, or Fail.
- Whether Ready was explicitly deferred by the PM gate.
- Rollback/cleanup status and whether AuditLog was retained.
- Confirmation that no secrets, passwords, tokens, full DB URLs, cookies, or raw personal data were recorded.
