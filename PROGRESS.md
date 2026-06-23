# Project Progress

Updated: 2026-06-23 15:23 JST

This file is the current project snapshot. Dated history belongs in `docs/status/progress-log-YYYY-MM-DD.md` or in a focused status/runbook document.

## Current Base

| Item | State | Notes |
|---|---|---|
| Latest `origin/main` | `443d0e71e8e5b0744a261b29fbe0434e7e0b2a15` | Main commit after PR #95 merge: `Add Gmail company boundary tests (#95)`. |
| Recent final PR results | #82 merged at `b0d4cc1`; #83 merged at `c3082a8`; #84 merged at `b2df444`; #85 merged at `fee6581`; #86 merged at `89e38ed`; #87 merged at `cedd740`; #88 merged at `da54eb4`; #89 merged at `591dc40`; #90 merged at `f8988ea`; #91 merged at `98eb3d6`; #92 merged at `d01fbb8`; #93 merged at `1dc95a7`; #94 merged at `45563f7`; #95 merged at `443d0e7` | Keep only final outcomes here. Details through #87 are in `docs/status/progress-log-2026-06-20.md`; #89 merge/deploy status is in `docs/status/progress-log-2026-06-23.md`; post-#95 gates are summarized in `docs/status/post95-progress-and-gate-summary-2026-06-23.md`. |
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
| AI operating rules | Project-local AGENTS and AI work rules were formalized in #92. | Follow `AGENTS.md`, `AI_WORK_RULES.md`, and `AI_WORK_RULES_SHORT.md`; keep secret files unread and keep risky operations behind approval. |
| Gmail company completion | Read-only company candidate inference remains advisory. #93 documented the future apply/write gate, and #95 added boundary tests around company candidate and extraction quality behavior. | Future apply must keep preview and DB write separated, preserve the lazy candidate API boundary, and get reviewer approval before any local/test write smoke. |
| Person owner link HTTP smoke | Runbook and read-only preflight preparation are merged in #84; #94 hardened the preflight and route smoke safety expectations. The real HTTP smoke body has not been executed. | Select approved synthetic/disposable fixtures, run read-only preflight on the approved target, then request explicit approval before any DB write smoke. |
| Project company/contact role link | Contract (#83), API (#85), shared safety policy (#86), progress snapshot/log split (#87), docs sync (#88), and guarded UI (#89) are merged. PR #89 is closed/merged, Vercel production deploy succeeded, local/test DB write smoke, candidate-present Browser QA, and cleanup were completed. | Finish production login-after read-only screen verification when a normal login session is available. Do not use auth bypass, cookie injection, or token injection. |
| Staging/production operations | Vercel production deploy for #89 succeeded. Production read-only confirmation reached the login screen only; login-after production screens remain unverified. No production/staging/shared DB write, guarded PATCH production execution, migration, schema, env, package, lockfile, or deletion changes were performed. | Keep production/staging/shared DB writes and guarded PATCH execution behind explicit owner approval and documented rollback/evidence requirements. |
| Browser/UI QA | Local candidate-present Browser QA for #89 passed through normal local login. Production read-only QA is confirmed only to the login screen. | Run login-after production read-only screen verification with a normal authorized login; no auth bypass/cookie/token injection. |
| SearchHistory DB-backed work | #91 restored saved search history filters. PM investigations still treat the older DB-backed #55 path as needing a latest-main rebuild, not a direct merge. | Use `docs/status/pm-investigations/2026-06-17/README.md` before planning #55R or DB-backed SearchHistory work. |
| Gmail company completion apply/dashboard API | Apply/write and dashboard API expansion remain future work after #93/#95. | Replan against latest `origin/main` before implementation; do not turn advisory candidates into writes without the apply gate. |
| Dirty workspace cleanup | Many old worktrees and the original dirty workspace exist. Manual branch/worktree cleanup after #89 has not been performed. | Do not delete, merge, or reuse them without explicit user approval. |
| Open PRs | None currently open per post-#95 handoff. | Start any new work from latest `origin/main` in a separate clean branch/worktree. |

## Next Work Candidates

1. Complete production login-after read-only screen verification for the merged Project company/contact role link UI using normal login only.
2. Prepare a Person owner link preflight evidence bundle, then execute the HTTP smoke only after fixture selection, read-only preflight, and explicit approval.
3. Replan Gmail company apply from latest `origin/main`, keeping advisory preview, apply write, rollback, and audit evidence separated.
4. Replan DB-backed SearchHistory from latest `origin/main`, using the PM investigation docs as the starting point.
5. Prepare a separate cleanup ledger for local dirty/worktree cleanup and request approval before any deletion.

## Navigation

- Status index: `docs/status/README.md`
- 2026-06-20 progress log: `docs/status/progress-log-2026-06-20.md`
- 2026-06-23 progress log: `docs/status/progress-log-2026-06-23.md`
- Post-#95 progress and gate summary: `docs/status/post95-progress-and-gate-summary-2026-06-23.md`
- Worktree cleanup inventory: `docs/status/worktree-cleanup-inventory-2026-06-23.md`
- Coordination policy: `docs/shared/operations/chat-progress-coordination-v0.1.md`
- Quality policy: `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
