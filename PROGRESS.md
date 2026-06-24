# Project Progress

Updated: 2026-06-24 19:34 JST

This file is the current project snapshot. Dated history belongs in `docs/status/progress-log-YYYY-MM-DD.md` or in a focused status/runbook document.

## Current Base

| Item | State | Notes |
|---|---|---|
| Snapshot source commit | `e6d1d6b9033833d8faab277cc7deb5110e270573` | This snapshot was authored from the latest observed `origin/main` after PR #137 merge: `Add root docs navigation README (#137)`. |
| Recent final PR results | #82-#103 are historical; #104 merged at `7abfaa4`; #105 at `b932ed0`; #106 at `b017e36`; #107 at `1f05e76`; #108 at `03e60e2`; #109 at `afb98ae`; #110 at `b426940`; #111 at `47b96b3`; #112 at `98b41a3`; #113 at `ca15328`; #115 at `5024bf1`; #116 at `43b08db`; #117 at `5c24052`; #118 at `c23c619`; #119 at `ffce54f`; #120 at `f9261f2`; #121 at `b140b75`; #122 at `cbbdeb8`; #123 at `a92031c`; #124 at `8419b4f`; #125 at `d227234`; #126 at `93cf98a`; #127 at `124d9f2`; #128 at `4afb596`; #129 at `10d8342`; #130 at `9506680`; #131 at `d86f2b9`; #132 at `02cd639`; #133 at `bc33a6d`; #134 at `e6c24b9`; #135 at `da053ce`; #136 at `39f3d21`; #137 at `e6d1d6b` | Keep only final outcomes here. Details through #87 are in `docs/status/progress-log-2026-06-20.md`; #89 merge/deploy status is in `docs/status/progress-log-2026-06-23.md`; #104-#137 current-state sync is summarized in `docs/status/post137-current-state-2026-06-24.md`. |
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
| AI operating rules | Project-local AGENTS and AI work rules were formalized and then extended through #92, #97, #101, #124, #125, #127, #128, and #129. #128 added the independent development organization loop; #129 added short-run accountability. #130 synchronized the post-rule status baseline. | Follow `AGENTS.md`, `AI_WORK_RULES.md`, and `AI_WORK_RULES_SHORT.md`; keep secret files unread and keep risky operations behind approval. Treat status checks as input, not completion. |
| Navigation / docs entry points | #137 added a root `README.md` and repaired mojibake-affected `docs/README.md`, `docs/themes/README.md`, and `docs/shared/README.md`. | Use root `README.md` for first navigation; keep current facts in `PROGRESS.md` and dated details in `docs/status/`. |
| Gmail company completion | Read-only company candidate inference remains advisory. #93 documented the future apply/write gate, and #95 added boundary tests around company candidate and extraction quality behavior. | Future apply must keep preview and DB write separated, preserve the lazy candidate API boundary, and get reviewer approval before any local/test write smoke. |
| Gmail company apply design | Sequence 2 design pack is recorded in `docs/status/sequence2-gmail-company-apply-design-pack-2026-06-23.md`. #133 added an owner decision packet for the first future apply implementation. | First future implementation should default to existing-company link only, block generic/LOW/signature/fromName/body-label writes, keep dashboard API unchanged unless separately approved, and treat DB write smoke as a separate local/test-only gate. |
| Person owner link HTTP smoke | Runbook and read-only preflight preparation are merged in #84; #94 hardened the preflight and route smoke safety expectations. The real HTTP smoke body has not been executed. Sequence 1 DB pre-gate pack is in `docs/status/sequence1-db-pre-gate-pack-2026-06-23.md`. The 2026-06-23 read-only preflight attempt is blocked in `docs/status/person-owner-link-readonly-preflight-result-2026-06-23.md`; #134 added a fresh preflight evidence packet. | To retry, classify the target as local/test without printing secrets, use normal runtime only, identify exactly one approved synthetic/disposable Person/Company/Contact fixture set, and keep DB write smoke behind a later approval gate. |
| Project company/contact role link | Contract (#83), API (#85), shared safety policy (#86), progress snapshot/log split (#87), docs sync (#88), and guarded UI (#89) are merged. PR #89 is closed/merged, Vercel production deploy succeeded, local/test DB write smoke, candidate-present Browser QA, and cleanup were completed. | Finish production login-after read-only screen verification when a normal login session is available. Do not use auth bypass, cookie injection, or token injection. |
| Staging/production operations | Vercel production deploy for #89 succeeded. Production read-only confirmation reached the login screen only; login-after production screens remain unverified. No production/staging/shared DB write, guarded PATCH production execution, migration, schema, env, package, lockfile, or deletion changes were performed. | Keep production/staging/shared DB writes and guarded PATCH execution behind explicit owner approval and documented rollback/evidence requirements. |
| Browser/UI QA | Local candidate-present Browser QA for #89 passed through normal local login. Production read-only QA is confirmed only to the login screen. #132 added a production read-only QA packet for normal-login verification. | Run login-after production read-only screen verification with a normal authorized login; no auth bypass/cookie/token injection. |
| SearchHistory DB-backed work | DB-backed SearchHistory is already merged through #57; #91 restored saved filter/sort/page-size application; #102 synchronized current status docs plus chip key hardening; #107 added the Browser QA plan; #112 merged the UI context guard. Local/test normal-login SearchHistory save/list/public-response/cleanup QA passed and is recorded on #112. #135 added an optional local/test own-user-isolation DB smoke approval packet. | Remaining optional gates are production login-after read-only UI verification and optional local/test DB smoke with approved fixture users. Do not use auth bypass, cookie injection, token injection, or production/staging/shared DB writes. |
| Gmail company completion apply/dashboard API | Apply/write and dashboard API expansion remain future work after #93/#95. | Replan against latest `origin/main` before implementation; do not turn advisory candidates into writes without the apply gate. |
| Dirty workspace cleanup | Sanitized inventory is recorded in `docs/status/worktree-cleanup-inventory-2026-06-23.md`; #104 merged the approval list. A cleanup batch removed 25 safe checkouts. A later single-worktree `git worktree remove` attempt for `__market_analysis_url_sync_v04_worktree` hit Windows/OneDrive `Permission denied` and stopped safely. `git worktree prune --dry-run --verbose` now reports multiple stale metadata entries. #131 added a v2 cleanup approval packet separating stale metadata prune, registered worktree removal, and OneDrive/reparse-point cleanup. | Do not run raw deletion, `--force`, `git worktree prune`, branch deletion, reset, clean, stash, or other-worktree mutation without a new explicit cleanup approval. Remaining dirty worktrees stay on HOLD. |
| Open PRs | No open PRs or open issues as of 2026-06-24 19:34 JST. #114 was closed as superseded; it was not merged. | Start any new product/runtime work from latest `origin/main` in a separate clean branch/worktree. |

## Next Work Candidates

1. Complete production login-after read-only screen verification for merged UI flows using normal login only.
2. Prepare a Person owner link preflight evidence bundle, then execute the HTTP smoke only after fixture selection, read-only preflight, and explicit approval.
3. Implement Gmail company apply only after owner policy approval and DB gate approval, using the Sequence 2 design pack as the starting point.
4. Decide how to handle stale worktree metadata and OneDrive permission-denied directories. Any cleanup must be a new explicit plan; do not run raw deletion, `--force`, `git worktree prune`, or branch deletion without approval.
5. Continue status-sync hygiene: use observed snapshot-source wording instead of claiming the status PR's own future merge commit as latest `origin/main`.

## Navigation

- Status index: `docs/status/README.md`
- 2026-06-20 progress log: `docs/status/progress-log-2026-06-20.md`
- 2026-06-23 progress log: `docs/status/progress-log-2026-06-23.md`
- Post-#95 progress and gate summary: `docs/status/post95-progress-and-gate-summary-2026-06-23.md`
- Sequence 1 DB pre-gate pack: `docs/status/sequence1-db-pre-gate-pack-2026-06-23.md`
- Sequence 2 Gmail company apply design pack: `docs/status/sequence2-gmail-company-apply-design-pack-2026-06-23.md`
- SearchHistory current status: `docs/status/search-history-current-status-2026-06-23.md`
- Post-#112 current state: `docs/status/post112-current-state-2026-06-24.md`
- Post-#128 current state: `docs/status/post128-current-state-2026-06-24.md`
- Post-#135 current state: `docs/status/post135-current-state-2026-06-24.md`
- Post-#137 current state: `docs/status/post137-current-state-2026-06-24.md`
- Worktree cleanup inventory: `docs/status/worktree-cleanup-inventory-2026-06-23.md`
- Worktree cleanup approval list: `docs/status/worktree-cleanup-approval-list-2026-06-23.md`
- Coordination policy: `docs/shared/operations/chat-progress-coordination-v0.1.md`
- Quality policy: `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
