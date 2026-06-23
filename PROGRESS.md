# Project Progress

Updated: 2026-06-23 10:54 JST

This file is the current project snapshot. Dated history belongs in `docs/status/progress-log-YYYY-MM-DD.md` or in a focused status/runbook document.

## Current Base

| Item | State | Notes |
|---|---|---|
| Latest `origin/main` | `591dc40cd58546c58d474262a0c7c2759e043442` | Main commit after PR #89 squash merge. |
| Recent final PR results | #82 merged at `b0d4cc1`; #83 merged at `c3082a8`; #84 merged at `b2df444`; #85 merged at `fee6581`; #86 merged at `89e38ed`; #87 merged at `cedd740`; #88 merged at `da54eb4`; #89 merged at `591dc40` | Keep only final outcomes here. Details through #87 are in `docs/status/progress-log-2026-06-20.md`; #89 merge/deploy status is in `docs/status/progress-log-2026-06-23.md`. |
| Original active workspace | Dirty and old | `C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1` has many pre-existing modified/untracked files on `codex/market-analysis-docs`. Do not use it as a base for new PR work. |
| New work base | Clean worktree from latest `origin/main` | Fetch first, verify the base commit, then create a separate worktree/branch. |

## Operating Rules

- Start by reading this snapshot and the status docs relevant to the task.
- If implementation is involved, also read `docs/shared/quality/two-pass-task-test-policy-v0.1.md`.
- Keep `PROGRESS.md` focused on current facts, open risks, and next choices.
- Put completed task details, PR-by-PR history, and time-sensitive observations in dated progress logs or focused status docs.
- After a PR merges, fetch `origin/main`, verify the merge commit, and sync this snapshot plus the dated progress log when the merge changes current state.
- Do not write secrets, DB connection URLs, passwords, cookies, tokens, or raw personal data into docs.
- Do not edit the old dirty active workspace for new PRs unless the user explicitly asks for that workspace.

## Important Open Items

| Area | Current status | Next decision or action |
|---|---|---|
| Person owner link HTTP smoke | Runbook and read-only preflight preparation are merged in #84. The real HTTP smoke body has not been executed. | Select approved synthetic/disposable fixtures, run read-only preflight on the approved target, then request explicit approval before any DB write smoke. |
| Project company/contact role link | Contract (#83), API (#85), shared safety policy (#86), progress snapshot/log split (#87), docs sync (#88), and guarded UI (#89) are merged. PR #89 is closed/merged, Vercel production deploy succeeded, local/test DB write smoke, candidate-present Browser QA, and cleanup were completed. | Finish production login-after read-only screen verification when a normal login session is available. Do not use auth bypass, cookie injection, or token injection. |
| Staging/production operations | Vercel production deploy for #89 succeeded. Production read-only confirmation reached the login screen only; login-after production screens remain unverified. No production/staging/shared DB write, guarded PATCH production execution, migration, schema, env, package, lockfile, or deletion changes were performed. | Keep production/staging/shared DB writes and guarded PATCH execution behind explicit owner approval and documented rollback/evidence requirements. |
| Browser/UI QA | Local candidate-present Browser QA for #89 passed through normal local login. Production read-only QA is confirmed only to the login screen. | Run login-after production read-only screen verification with a normal authorized login; no auth bypass/cookie/token injection. |
| SearchHistory DB-backed work | PM investigations still treat the stale #55 path as needing a latest-main rebuild, not a direct merge. | Use `docs/status/pm-investigations/2026-06-17/README.md` before planning #55R or DB-backed SearchHistory work. |
| Gmail company completion apply/dashboard API | Still a future planning item after #89. | Replan against latest `origin/main` before implementation. |
| Dirty workspace cleanup | Many old worktrees and the original dirty workspace exist. Manual branch/worktree cleanup after #89 has not been performed. | Do not delete, merge, or reuse them without explicit user approval. |
| Open PRs | None currently open. | Start any new work from latest `origin/main` in a separate clean branch/worktree. |

## Next Work Candidates

1. Complete production login-after read-only screen verification for the merged Project company/contact role link UI using normal login only.
2. Execute the Person owner link HTTP smoke flow only after fixture selection, read-only preflight, and explicit approval.
3. Replan DB-backed SearchHistory from latest `origin/main`, using the PM investigation docs as the starting point.
4. Replan Gmail company completion apply/dashboard API changes from latest `origin/main`.
5. Prepare a separate cleanup ledger for local dirty/worktree cleanup if the user asks.

## Navigation

- Status index: `docs/status/README.md`
- 2026-06-20 progress log: `docs/status/progress-log-2026-06-20.md`
- 2026-06-23 progress log: `docs/status/progress-log-2026-06-23.md`
- Coordination policy: `docs/shared/operations/chat-progress-coordination-v0.1.md`
- Quality policy: `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
