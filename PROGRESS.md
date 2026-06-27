# Project Progress

Updated: 2026-06-27 23:55 JST

This file is the current project snapshot. Dated history belongs in `docs/status/progress-log-YYYY-MM-DD.md` or in a focused status/runbook document.

## Current Base

| Item | State | Notes |
|---|---|---|
| Snapshot source commit | `d379da60dcef1765ac46424261b252fb21dc4242` | This snapshot was refreshed after PR #163 merge: `Refresh Gmail sync-run sanitizer diagnostics`. |
| Recent final PR results | #82-#103 are historical; #104 merged at `7abfaa4`; #105 at `b932ed0`; #106 at `b017e36`; #107 at `1f05e76`; #108 at `03e60e2`; #109 at `afb98ae`; #110 at `b426940`; #111 at `47b96b3`; #112 at `98b41a3`; #113 at `ca15328`; #115 at `5024bf1`; #116 at `43b08db`; #117 at `5c24052`; #118 at `c23c619`; #119 at `ffce54f`; #120 at `f9261f2`; #121 at `b140b75`; #122 at `cbbdeb8`; #123 at `a92031c`; #124 at `8419b4f`; #125 at `d227234`; #126 at `93cf98a`; #127 at `124d9f2`; #128 at `4afb596`; #129 at `10d8342`; #130 at `9506680`; #131 at `d86f2b9`; #132 at `02cd639`; #133 at `bc33a6d`; #134 at `e6c24b9`; #135 at `da053ce`; #136 at `39f3d21`; #137 at `e6d1d6b`; #138 at `4805466`; #139 at `ce0c294`; #140 at `e489508`; #141 at `0265ae0`; #142 at `23c9963`; #143 at `497cd30`; #144 at `66bb643`; #145 at `94952cb`; #146 at `e2f96b9`; #148 at `0ec3778`; #149 at `256a443`; #150 at `17c632b`; #152 at `15b33ef`; #153 at `8df3374`; #155 at `131eb19`; #159 at `24dc716`; #160 at `2169ef3`; #161 at `63531f4`; #162 at `a361450`; #163 at `d379da6` | Keep only final outcomes here. Details through #87 are in `docs/status/progress-log-2026-06-20.md`; #89 merge/deploy status is in `docs/status/progress-log-2026-06-23.md`; #104-#163 current-state sync is summarized in `docs/status/post163-current-state-2026-06-27.md`, `docs/status/app-entrypoint-baseline-2026-06-27.md`, `docs/status/dbfree-followup-runbooks-2026-06-27.md`, `docs/status/gmail-sync-run-dbfree-diagnostics-2026-06-27.md`, and `docs/pmo/standing-authorization-token-policy-2026-06-27.md`. |
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
| AI operating rules | Project-local AGENTS and AI work rules were formalized and then extended through #92, #97, #101, #124, #125, #127, #128, and #129. #159 added `AI_PROJECT_PROFILE.md`, canonical `docs/ai-queue/`, and `scripts/safety-gate.ps1`. #160 through #163 completed the initial LLL/rule foundation follow-up loop. | Follow `AGENTS.md`, `AI_WORK_RULES.md`, `AI_PROJECT_PROFILE.md`, `AI_WORK_RULES_SHORT.md`, and `docs/ai-queue/`. Keep secret files unread and keep risky operations behind approval. H2/H3 are still incomplete, so delegated automerge/deploy automation remains disabled. |
| Navigation / docs entry points | #137 added a root `README.md` and repaired mojibake-affected `docs/README.md`, `docs/themes/README.md`, and `docs/shared/README.md`. | Use root `README.md` for first navigation; keep current facts in `PROGRESS.md` and dated details in `docs/status/`. |
| Gmail company completion | Read-only company candidate inference remains advisory. #93 documented the future apply/write gate, and #95 added boundary tests around company candidate and extraction quality behavior. | Future apply must keep preview and DB write separated, preserve the lazy candidate API boundary, and get reviewer approval before any local/test write smoke. |
| Gmail company apply design | Sequence 2 design pack is recorded in `docs/status/sequence2-gmail-company-apply-design-pack-2026-06-23.md`. #133 added an owner decision packet for the first future apply implementation. #143 recorded the seven-role approval split and design convergence while keeping apply implementation and DB write on HOLD. | Design is converged on existing-company-link-only, HIGH confidence, known domain/alias evidence, dashboard API unchanged, preview/apply separation. Do not write implementation code or DB writes until a later approval. |
| Person owner link HTTP smoke | Runbook and read-only preflight preparation are merged in #84; #94 hardened the preflight and route smoke safety expectations. The real HTTP smoke body has not been executed. Sequence 1 DB pre-gate pack is in `docs/status/sequence1-db-pre-gate-pack-2026-06-23.md`. The 2026-06-23 read-only preflight attempt is blocked in `docs/status/person-owner-link-readonly-preflight-result-2026-06-23.md`; #134 added a fresh preflight evidence packet. On 2026-06-26, DB-free tests passed again: `test:person-owner-link-api`, `test:person-owner-link-api-route`, `test:person-owner-link-api-contract`, and `test:person-owner-link-ui`. | Static contract side is green. To retry DB-connected preflight, classify the target as local/test without printing secrets, use normal runtime only, identify exactly one approved synthetic/disposable Person/Company/Contact fixture set, and keep DB write smoke behind a later approval gate. |
| Project company/contact role link | Contract (#83), API (#85), shared safety policy (#86), progress snapshot/log split (#87), docs sync (#88), and guarded UI (#89) are merged. PR #89 is closed/merged, Vercel production deploy succeeded, local/test DB write smoke, candidate-present Browser QA, and cleanup were completed. | Finish production login-after read-only screen verification when a normal login session is available. Do not use auth bypass, cookie injection, or token injection. |
| Staging/production operations | Vercel production deploy for #89 succeeded. Production read-only confirmation reached the login screen only; login-after production screens remain unverified. No production/staging/shared DB write, guarded PATCH production execution, migration, schema, env, package, lockfile, or deletion changes were performed. | Keep production/staging/shared DB writes and guarded PATCH execution behind explicit owner approval and documented rollback/evidence requirements. |
| Browser/UI QA | Local candidate-present Browser QA for #89 passed through normal local login. Production read-only QA is confirmed only to the login screen. #132 added a production read-only QA packet for normal-login verification. | Run login-after production read-only screen verification with a normal authorized login; no auth bypass/cookie/token injection. |
| Auth/login readiness | #148 merged secret-safe login readiness diagnostics. Production login/password-reset failure remains unresolved and is likely env/config or active-user readiness. #163 salvaged the production login recovery runbook/log observation without printing secrets. | Run `npm.cmd run auth:login-readiness` only in an approved runtime/DB context. Production env/config changes, redeploy for login recovery, and production/staging/shared DB writes remain owner-gated. |
| SearchHistory DB-backed work | DB-backed SearchHistory is already merged through #57; #91 restored saved filter/sort/page-size application; #102 synchronized current status docs plus chip key hardening; #107 added the Browser QA plan; #112 merged the UI context guard. Local/test normal-login SearchHistory save/list/public-response/cleanup QA passed and is recorded on #112. #135 added an optional local/test own-user-isolation DB smoke approval packet. #149 wired `test:search-history-ui-context`. | Remaining optional gates are production login-after read-only UI verification and optional local/test DB smoke with approved fixture users. Do not use auth bypass, cookie injection, token injection, or production/staging/shared DB writes. |
| Gmail company completion apply/dashboard API | Apply/write and dashboard API expansion remain future work after #93/#95. | Replan against latest `origin/main` before implementation; do not turn advisory candidates into writes without the apply gate. |
| Dirty workspace cleanup | Sanitized inventory is recorded in `docs/status/worktree-cleanup-inventory-2026-06-23.md`; #104 merged the approval list. A cleanup batch removed 25 safe checkouts. A later single-worktree `git worktree remove` attempt for `__market_analysis_url_sync_v04_worktree` hit Windows/OneDrive `Permission denied` and stopped safely. #131 added a v2 cleanup approval packet; `docs/pmo/worktree-cleanup-approval-packet-v3-2026-06-24.md` refreshes the evidence after #140. #143 recorded that Batch A prune was approved but failed with `Permission denied` on all stale metadata entries. On 2026-06-26, a read-only permission report found 22 stale metadata directories, all with `ReadOnly, Directory, Archive, ReparsePoint` attributes. | Do not escalate to raw deletion, `--force`, branch deletion, reset, clean, stash, or other-worktree mutation. Use `docs/pmo/worktree-cleanup-permission-report-2026-06-26.md` for the next approval packet. Remaining dirty worktrees stay on HOLD. |
| CSV/source tracking | Main now contains `ImportSource`, `ImportRun`, `SourceRecord`, and `EntitySourceLink` schema and `20260604193000_import_source_tracking_foundation`, but real CSV apply remains blocked until the actual target DB is classified and proven to have the schema applied. On 2026-06-26, `test:csv-import-dry-run`, `test:import-source-tracking`, and `test:source-inventory` passed. | Use `docs/pmo/csv-source-tracking-integration-decision-2026-06-26.md` for the next decision. Read-only validation is green; schema/migration/apply remains HOLD. |
| Open PRs | No open PRs or open issues as of 2026-06-27 23:55 JST after #163 merge and stale PR closeout. #147/#151/#154/#156/#157/#158 were closed as superseded or unsafe under the new rules; branch deletion was not performed. | Start any new product/runtime work from latest `origin/main` in a separate clean branch/worktree. |

## Next Work Candidates

1. Complete production login/password-reset recovery through owner-controlled env/config and redeploy decisions, then run normal-login read-only screen verification.
2. Complete H1-H4: rule repo git management, write isolation for `scripts/` and `docs/ai-queue/DECISIONS.md`, standing token handling, and PowerShell policy.
3. Run T-20260627-007 browser entry QA only after production login recovery or safe local/test login preparation.
4. Decide whether #154/#157 equivalents should stay blocked, be redesigned outside `scripts/`, or receive a narrow post-H2 script-hardening exception.
5. Prepare a Person owner link DB-connected preflight only after local/test target classification and fixture approval; DB-free API/route/contract/UI tests are green.
6. Keep Gmail company apply implementation on HOLD until the converged design receives a separate implementation/DB gate approval.
7. Decide how to handle stale worktree metadata permission-denied failures using the permission report; do not run raw deletion, `--force`, worktree remove, or branch deletion without a new explicit plan.
8. Decide whether CSV/source tracking can move from HOLD to a local/test DB schema verification gate; DB-free tests are green, but do not run migration/schema/apply yet.

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
- Post-#139 current state: `docs/status/post139-current-state-2026-06-24.md`
- Post-#141 current state: `docs/status/post141-current-state-2026-06-25.md`
- Post-#142 approved gates progress: `docs/status/post142-approved-gates-progress-2026-06-26.md`
- Post-#143 next gates: `docs/status/post143-next-gates-2026-06-26.md`
- DB-free verification refresh: `docs/status/dbfree-verification-refresh-2026-06-26.md`
- Auth login readiness: `docs/status/auth-login-readiness-2026-06-26.md`
- App entrypoint baseline: `docs/status/app-entrypoint-baseline-2026-06-27.md`
- Post-#163 current state: `docs/status/post163-current-state-2026-06-27.md`
- Gmail sync-run DB-free diagnostics: `docs/status/gmail-sync-run-dbfree-diagnostics-2026-06-27.md`
- Standing authorization token policy: `docs/pmo/standing-authorization-token-policy-2026-06-27.md`
- PowerShell execution policy standard: `docs/pmo/powershell-execution-policy-standard-2026-06-27.md`
- Worktree cleanup permission investigation: `docs/pmo/worktree-cleanup-permission-investigation-2026-06-26.md`
- Worktree cleanup permission report: `docs/pmo/worktree-cleanup-permission-report-2026-06-26.md`
- Next approval gates: `docs/pmo/next-approval-gates-2026-06-26.md`
- CSV/source tracking integration decision: `docs/pmo/csv-source-tracking-integration-decision-2026-06-26.md`
- Worktree cleanup inventory: `docs/status/worktree-cleanup-inventory-2026-06-23.md`
- Worktree cleanup approval list: `docs/status/worktree-cleanup-approval-list-2026-06-23.md`
- Worktree cleanup approval packet v3: `docs/pmo/worktree-cleanup-approval-packet-v3-2026-06-24.md`
- Coordination policy: `docs/shared/operations/chat-progress-coordination-v0.1.md`
- Quality policy: `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
