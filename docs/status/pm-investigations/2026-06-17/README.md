# PM Investigations 2026-06-17

This folder keeps parent-PM investigation outputs from 2026-06-17.

The original baseline was latest main commit `db0c60b6f0ae3c80bdac9b1dcced2e56794784be`.
Those notes are historical/reference-only when planning work after PR #57 and PR #91.

## Current Reading Guidance

- The old #55 DB-backed SearchHistory branch was stale and should not be merged directly.
- A clean DB-backed replacement was later merged in PR #57.
- Saved filter/sort/page-size application was later restored in PR #91.
- Therefore, new SearchHistory work should start from the current `origin/main` implementation, not from the old #55R rebuild assumption.
- Remaining SearchHistory work is Browser QA, real local/test DB write smoke if required, and own-user isolation evidence if a real DB fixture is approved.

## Investigation Index

| Doc | Current use |
|---|---|
| [search-history-db-backed-plan.md](./search-history-db-backed-plan.md) | Historical plan for replacing stale #55. Use only as background; current main already contains DB-backed SearchHistory from #57/#91. |
| [market-search-gmail-recheck.md](./market-search-gmail-recheck.md) | Market / Search / Gmail recheck notes and A/B/C classification. |
| [react-duplicate-key-warning.md](./react-duplicate-key-warning.md) | React duplicate key warning priorities and known check areas. |
| [browser-qa-runbook.md](./browser-qa-runbook.md) | Normal-login Browser QA runbook. Do not use cookie/token/auth proxy bypass. |
| [worktree-cleanup-ledger-plan.md](./worktree-cleanup-ledger-plan.md) | Worktree cleanup ledger plan. Deletion remains approval-gated. |

## Not Performed By These Investigation Notes

- No code implementation.
- No package/API change.
- No DB connection or DB write.
- No schema or migration.
- No deploy.
- No worktree deletion.
