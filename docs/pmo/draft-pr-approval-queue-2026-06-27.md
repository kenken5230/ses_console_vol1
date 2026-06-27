# Draft PR Approval Queue (2026-06-27)

Observed at: 2026-06-27 JST.

This queue is a planning artifact only. It does not approve Ready, merge, close,
deploy, DB write, schema/migration, env/config changes, or branch/worktree
deletion.

## Current Baseline

- Latest observed `origin/main`: `17c632b`
  (`Merge pull request #150 from kenken5230/codex/next-approval-gates-refresh-20260626`).
- Open issues: none observed.
- Open PRs:
  - #151, #152, #153, #154, #155, #156, #157: Draft/open, MERGEABLE/CLEAN, Vercel success.
  - #147: Draft/open, CONFLICTING/DIRTY, superseded by #150/#151.

## Recommended Order

| Order | PR | State | Scope | Recommendation | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | #151 `Sync status after approval gate merges` | Draft / clean / Vercel success | `PROGRESS.md`, PMO/status docs, production login recovery runbook | Ready/merge candidate after internal gate | Status baseline should land before follow-up docs. |
| 2 | #152 `Add DB-free follow-up runbooks` | Draft / clean / Vercel success | DB-free follow-up docs and `docs/status/README.md` | Ready/merge candidate after #151 recheck | Shares `docs/status/README.md` with #151; rebase/mergeability must be rechecked after #151. |
| 3 | #153 `Record DB-free verification refresh` | Draft / clean / Vercel success | One DB-free verification status doc | Ready/merge candidate after #152 recheck | Depends conceptually on #152 runbook, but file path is disjoint. |
| 4 | #155 `Add production read-only QA evidence template` | Draft / clean / Vercel success | One PMO evidence template | Ready/merge candidate any time after #151 | Docs-only and disjoint from #151 files. |
| 5 | #154 `Harden safe output diagnostics` | Draft / clean / Vercel success | Diagnostic script safety + test | Ready/merge candidate after tests/checks refresh | Runtime-adjacent scripts only; no app route behavior change. |
| 6 | #157 `Add Gmail admin env readiness helper` | Draft / clean / Vercel success | New DB-free env readiness helper/test/status doc | Ready/merge candidate after #154 or independently | Adds diagnostic helper; does not read `.env`, connect DB, or call Gmail. |
| 7 | #156 `Add Gmail sync-run DB-free diagnostics` | Draft / clean / Vercel success | Gmail admin sanitizer/test/status doc | Ready/merge candidate after #154/#157 review | Touches runtime-ish `lib/gmail-admin-jobs.ts`; still DB-free, but should be reviewed after lower-risk docs/scripts PRs. |
| HOLD | #147 `Consolidate next approval gates` | Draft / CONFLICTING/DIRTY | Old approval/status packet | Close candidate only after explicit close gate | Superseded by #150/#151; do not merge/rebase/force-push. |

## Conflict And Recheck Notes

- #151 and #152 both touch `docs/status/README.md`.
  If #151 is merged first, #152 must be refreshed/rechecked before Ready/merge.
- #147 conflicts with current main and should not be merged.
- #154 and #156 both strengthen secret-safe diagnostics but touch different files
  except for shared conceptual safety policy. They can be reviewed separately.
- #156 and #157 are both Gmail-admin related. Their file paths are disjoint, but
  #156 changes `lib/gmail-admin-jobs.ts`, so review it after the docs/scripts-only
  PRs unless urgent production log hardening is prioritized.

## Gate Rules

Before any Ready/merge/close:

1. Re-fetch latest `origin/main`.
2. Confirm PR is still open, Draft state understood, mergeable, and CLEAN.
3. Confirm Vercel/checks are green on the current head.
4. Confirm deleted files are none.
5. Confirm DB/schema/migration/env/package/lockfile changes are understood.
6. Confirm production deploy impact is acceptable because main merge triggers Vercel production.
7. Confirm rollback/revert path is documented.
8. Confirm internal roles have no NG/hold/unknown.

## Still Owner-Gated

- Vercel production env/config changes and redeploy.
- Production normal-login read-only QA execution.
- DB-connected Person owner link preflight and any write smoke.
- SearchHistory own-user isolation DB smoke.
- Gmail apply implementation and DB write.
- CSV/source tracking schema/apply.
- Worktree cleanup that removes directories or metadata.
- Closing #147.
