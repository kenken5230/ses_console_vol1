# DB-Free Follow-Up Runbooks (2026-06-27)

This document consolidates DB-free follow-up work that can continue while the
production login/env gate and DB write gates remain waiting for owner approval.

It does not approve or execute DB writes, production/staging/shared operations,
migrations, schema changes, env/config changes, deploys, worktree cleanup, or
PR state changes.

## Current Baseline

- Latest baseline when authored: `origin/main` at `17c632b`
  (`Merge pull request #150 from kenken5230/codex/next-approval-gates-refresh-20260626`).
- #149 is merged and wires `test:search-history-ui-context` into package
  scripts and aggregate `npm test`.
- #151 is a separate Draft PR for post-#150 status sync and production login
  recovery runbook updates.
- Old #147 is superseded by #150 and remains PR-state-gated.

## DB-Free Work Packages

| Package | Allowed DB-free work | Stop before |
| --- | --- | --- |
| SearchHistory | Keep UI-context test references current; document no-write browser QA checks; run package tests in a local dependency-ready worktree. | Creating search history rows, two-user isolation smoke, production login QA, cookie/token injection. |
| Person owner link | Refresh static API/route/contract/UI evidence templates; keep fixture requirements clear. | DB-connected preflight, fixture selection from real DB, PATCH execution, write smoke. |
| Gmail company apply | Clarify existing-company-link-only boundary, allowed evidence, HIGH confidence requirement, and blocked sources. | Apply implementation, dashboard API expansion, DB write, production/shared DB access. |
| CSV/source tracking | Document DB-free dry-run/source-inventory/source-tracking validation commands and evidence. | Migration, schema application, CSV apply, target DB write. |

## SearchHistory DB-Free Checklist

Use this when touching SearchHistory without DB writes:

1. Confirm the package scripts include:
   - `test:search-history`
   - `test:search-history-ui-context`
2. Run both tests only in a dependency-ready local worktree.
3. If browser QA is performed before production login recovery, keep it local
   or preview-only and do not save new DB-backed records.
4. Evidence may include:
   - command names;
   - pass/fail status;
   - UI state descriptions;
   - no-write confirmation.
5. Evidence must not include:
   - cookies;
   - session tokens;
   - user IDs from production;
   - raw search history row contents from shared/prod DB.

## Person Owner Link DB-Free Checklist

Static verification may include:

- `test:person-owner-link-api`
- `test:person-owner-link-api-route`
- `test:person-owner-link-api-contract`
- `test:person-owner-link-ui`

Evidence template:

```text
Target: local code only / no DB connection
Commands: <script names>
Result: pass / fail
Deleted files: none
DB write: none
PATCH execution: none
Fixture selection: not performed
Next gate: local/test DB-connected preflight approval
```

Stop if the work needs:

- a real DB target;
- real Person/Company/Contact IDs;
- route execution against shared/prod;
- any write smoke.

## Gmail Company Apply DB-Free Checklist

Allowed DB-free confirmations:

- candidate inference remains advisory;
- existing-company link only;
- HIGH confidence only;
- known domain or approved alias evidence only;
- preview/apply separation;
- dashboard API unchanged for first implementation;
- blocked sources remain blocked:
  - generic domains;
  - LOW confidence;
  - signature-only;
  - fromName-only;
  - body-label-only.

Evidence template:

```text
Scope: DB-free policy/contract review
Implementation code changed: yes / no
Apply execution: no
DB write: no
Dashboard API expansion: no
Blocked source coverage: checked / not checked
Next gate: implementation-only approval or DB write approval
```

Stop before adding apply endpoints, running apply, or writing any company link.

## CSV / Source Tracking DB-Free Checklist

Allowed DB-free tests:

- `test:csv-import-dry-run`
- `test:import-source-tracking`
- `test:source-inventory`

Allowed evidence:

- command names;
- pass/fail status;
- schema-contract status from repository files;
- no target DB classified/connected confirmation.

Stop before:

- running migration;
- applying schema to any DB;
- running CSV apply;
- writing `ImportRun`, `SourceRecord`, or entity source rows;
- using production/staging/shared DB.

## Recommended Order While Approval Gates Wait

1. Keep #151 current until it is either merged or superseded.
2. Keep production login recovery as the top owner-gated item.
3. Continue DB-free evidence refreshes for SearchHistory, Person owner link,
   Gmail company apply, and CSV/source tracking.
4. Do not mix DB-free docs/test work with DB write or production env/config
   operations in the same PR.

## Universal Evidence Rules

- Prefer command names and PASS/WARN/FAIL summaries.
- Do not print secrets, cookies, tokens, DB URLs, password hashes, or raw
  production data.
- Keep approval-gated next steps explicit.
- Treat every production deploy trigger as a separate PR-state/deploy gate.
