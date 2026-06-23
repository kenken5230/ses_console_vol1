# Status Docs

This folder holds dated status material. Keep the live project snapshot in `../../PROGRESS.md`; use this folder for logs, runbooks, investigations, and focused reports that should remain historical.

## Categories

| Category | Where | Purpose |
|---|---|---|
| Current snapshot | [`../../PROGRESS.md`](../../PROGRESS.md) | Current base commit, open items, workspace safety, and next work candidates. |
| Dated progress logs | [`progress-log-2026-06-20.md`](./progress-log-2026-06-20.md), [`progress-log-2026-06-23.md`](./progress-log-2026-06-23.md) | PR-by-PR or day-by-day historical notes that would become stale if kept in the snapshot. |
| Current gate summaries | [`post95-progress-and-gate-summary-2026-06-23.md`](./post95-progress-and-gate-summary-2026-06-23.md), [`sequence1-db-pre-gate-pack-2026-06-23.md`](./sequence1-db-pre-gate-pack-2026-06-23.md), [`sequence2-gmail-company-apply-design-pack-2026-06-23.md`](./sequence2-gmail-company-apply-design-pack-2026-06-23.md) | Human-readable post-#95 status, remaining gates, AI-safe next work, and owner-approval items. |
| Status reports | Files directly under `docs/status/` | Focused implementation, validation, safety, or recovery reports. |
| Runbooks | Status docs or linked operation docs with step-by-step safety gates | Smoke, preflight, rollback, and evidence procedures. |
| Investigations | [`pm-investigations/`](./pm-investigations/) | PM/PdM research, backlog shaping, stale-branch decisions, and approval gates. |

## Index

| File | Category | Purpose |
|---|---|---|
| [`progress-log-2026-06-20.md`](./progress-log-2026-06-20.md) | Dated log | Historical summary of PR #82 through #87, merge commits, recorded validation where available, and intentionally unexecuted smoke/QA work. |
| [`progress-log-2026-06-23.md`](./progress-log-2026-06-23.md) | Dated log | Docs-only post-#89 merge sync with final merge commit, Vercel production deploy result, production read-only limit, non-executed DB/write scope, and remaining work. |
| [`post95-progress-and-gate-summary-2026-06-23.md`](./post95-progress-and-gate-summary-2026-06-23.md) | Current gate summary | Post-#95 non-technical summary for Ken, theme-by-theme status, remaining gates, AI-safe work, owner-approval work, and 30-90 minute work-pack candidates. |
| [`search-history-current-status-2026-06-23.md`](./search-history-current-status-2026-06-23.md) | Current gate summary | Current SearchHistory status after #57/#91: DB-backed implementation is merged, `test:search-history` passes, old #55/#55R plans are historical, and remaining gates are Browser QA plus approval-gated local/test DB smoke. |
| [`sequence1-db-pre-gate-pack-2026-06-23.md`](./sequence1-db-pre-gate-pack-2026-06-23.md) | Current gate summary | Sequence 1 docs-only DB pre-gate pack for Person owner link, Project company/contact role link, and Gmail company apply; consolidates completed evidence, stopped DB actions, approval point, role separation, sanitized evidence template, stop conditions, and rollback/cleanup policy. |
| [`person-owner-link-readonly-preflight-result-2026-06-23.md`](./person-owner-link-readonly-preflight-result-2026-06-23.md) | Status report | Sanitized blocked result for the approved Person owner link read-only preflight attempt: env keys absent, helper unavailable, no local/test DB classification, no approved fixture set found, and no DB connection or write performed. |
| [`sequence2-gmail-company-apply-design-pack-2026-06-23.md`](./sequence2-gmail-company-apply-design-pack-2026-06-23.md) | Current gate summary | Sequence 2 Gmail company apply design pack; keeps candidate inference advisory until a future existing-company-link-only apply gate, records blocked source/confidence handling, preview/apply/audit/rollback/target-count/test boundaries, and separates DB write smoke plus dashboard API approval. |
| [`worktree-cleanup-inventory-2026-06-23.md`](./worktree-cleanup-inventory-2026-06-23.md) | Cleanup inventory | Sanitized known worktree cleanup state and approval gates: 95 worktrees observed, 32 keep/investigate, 63 possible cleanup candidates; no delete commands, no deletion execution, and no other-worktree mutation. |
| [`project-company-contact-role-link-ready-checklist-2026-06-21.md`](./project-company-contact-role-link-ready-checklist-2026-06-21.md) | Historical runbook/status report | PR #89 Ready checklist as of 2026-06-21; later Ready, DB smoke, Browser QA, and merge-gate state is tracked in the PR body and `pr89-current-gates-2026-06-23.md`; post-merge state is in `progress-log-2026-06-23.md`. |
| [`link-safety-policy-2026-06-20.md`](./link-safety-policy-2026-06-20.md) | Status report | Shared Person/Project company contact link safety conditions; no DB/migration/deploy. |
| [`person-owner-link-http-smoke-plan-2026-06-20.md`](./person-owner-link-http-smoke-plan-2026-06-20.md) | Runbook/status report | Person owner link HTTP route smoke preparation, preflight policy, and remaining unexecuted real smoke. |
| [`claude-review-pr62-65-followup-2026-06-20.md`](./claude-review-pr62-65-followup-2026-06-20.md) | Status report | Claude Code PR #62 through #65 review follow-up scope, validation gaps, and validation log. |
| [`market-analysis-controls-2026-06-17.md`](./market-analysis-controls-2026-06-17.md) | Status report | Market analysis UI/read-only API controls, validation limits, and residual risk. |
| [`react-duplicate-key-hardening-2026-06-17.md`](./react-duplicate-key-hardening-2026-06-17.md) | Status report | UI-only React duplicate-key hardening scope, safety notes, and blocked local validation. |
| [`current-feature-status-2026-06-15.md`](./current-feature-status-2026-06-15.md) | Status report | Feature-by-feature implemented/design-only/unimplemented/retest matrix. |
| [`dependency-security-audit-2026-06-15.md`](./dependency-security-audit-2026-06-15.md) | Status report | npm audit findings, dependency update task, and validation results. |
| [`recovery-main-alignment-report-2026-06-15.md`](./recovery-main-alignment-report-2026-06-15.md) | Status report | Clean-worktree recovery, removed unimplemented UI leftovers, validation results, and remaining tasks. |
| [`search-history-db-backed-2026-06-15.md`](./search-history-db-backed-2026-06-15.md) | Historical status report | Ledger for replacing stale sample SearchHistory with DB-backed work. Current status is superseded by `search-history-current-status-2026-06-23.md`. |
| [`ui-change-ledger-2026-06-15.md`](./ui-change-ledger-2026-06-15.md) | Status report | Ledger for PR #53/#54/#55 UI, API, package, and rollback changes. |
| [`ui-regression-restore-2026-06-15.md`](./ui-regression-restore-2026-06-15.md) | Status report | Baseline UI regression restoration history, cause range, and test plan. |
| [`ui-restore-plan-2026-06-15.md`](./ui-restore-plan-2026-06-15.md) | Status report | Plan for restoring, hiding, or deleting changed UI after approval. |
| [`pm-investigations/2026-06-17/README.md`](./pm-investigations/2026-06-17/README.md) | Investigation index | PM investigations for SearchHistory, Market/Search/Gmail recheck, duplicate key warning, browser QA, and worktree cleanup planning. |

## Rules

- Current facts and next choices go in `../../PROGRESS.md`.
- Historical observations, completed PR details, and time-sensitive PR states go in dated logs or focused status docs with `Observed at` style wording.
- DB write, migration, real data updates, staging/production operations, and worktree deletion require documented safety gates and rollback/evidence notes before execution.
- UI-facing features should distinguish implemented behavior, design-only placeholders, and unverified flows.
- Do not store secrets, cookies, tokens, full connection strings, passwords, or raw personal data in status docs.
