# Project Progress

Updated: 2026-06-20 19:53 JST

This file is the current project snapshot. Dated history belongs in `docs/status/progress-log-YYYY-MM-DD.md` or in a focused status/runbook document.

## Current Base

| Item | State | Notes |
|---|---|---|
| Latest `origin/main` | `cedd740b4d45ca076216b4c45887b6f809e1a2f7` | Merge commit for PR #87. |
| Recent final PR results | #82 merged at `b0d4cc1`; #83 merged at `c3082a8`; #84 merged at `b2df444`; #85 merged at `fee6581`; #86 merged at `89e38ed`; #87 merged at `cedd740` | Keep only final outcomes here. Details are in `docs/status/progress-log-2026-06-20.md`. |
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
| Project company/contact role link | Contract (#83), API (#85), and shared safety policy (#86) are merged. UI is not implemented and real DB write smoke has not been run. | Decide whether to build the guarded UI next, then run smoke only under the approved runbook/fixture process. |
| Staging/production operations | No deploy, staging DB operation, production DB operation, migration, or schema change is part of the latest docs/status work. | Keep these behind explicit owner approval and documented rollback/evidence requirements. |
| Browser/UI QA | Several flows have code-level tests, but manual browser/UI QA remains separate where status docs call it out. | Run browser QA from a clean latest-main worktree when the user asks for visual or interaction verification. |
| SearchHistory DB-backed work | PM investigations still treat the stale #55 path as needing a latest-main rebuild, not a direct merge. | Use `docs/status/pm-investigations/2026-06-17/README.md` before planning #55R or DB-backed SearchHistory work. |
| Dirty workspace cleanup | Many old worktrees and the original dirty workspace exist. | Do not delete, merge, or reuse them without explicit user approval. |

## Next Work Candidates

1. Execute the Person owner link HTTP smoke flow only after fixture selection, read-only preflight, and explicit approval.
2. Build the guarded Project company/contact role link UI on top of the merged API.
3. Replan DB-backed SearchHistory from latest `origin/main`, using the PM investigation docs as the starting point.
4. Run browser/UI QA for restored console flows and new link flows from a clean worktree.
5. Prepare a separate cleanup ledger for old worktrees and the dirty original workspace if the user asks.

## Navigation

- Status index: `docs/status/README.md`
- 2026-06-20 progress log: `docs/status/progress-log-2026-06-20.md`
- Coordination policy: `docs/shared/operations/chat-progress-coordination-v0.1.md`
- Quality policy: `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
