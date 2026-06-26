# Worktree Cleanup Permission Report (2026-06-26)

Observed at: 2026-06-26 12:20 JST.

This is a read-only permission report. It does not approve or execute cleanup.

## Baseline

- Latest observed `origin/main`: `94952cb1318a1f55ff2bd18048fd163191351663`
  (`Merge pull request #145 from kenken5230/codex/dbfree-verification-refresh-20260626`).
- Previous state: #143 recorded that approved Batch A `git worktree prune`
  failed with `Permission denied` on stale metadata under `.git/worktrees`.
- This report re-ran dry-run and filesystem metadata checks only.

## Commands Run

```powershell
git worktree prune --dry-run --verbose
git rev-parse --git-common-dir
Get-ChildItem -LiteralPath .git\worktrees -Force | Select-Object Name,Attributes,Mode,LastWriteTime
```

No non-dry-run prune, raw deletion, worktree remove, branch deletion, reset,
clean, stash, restore, or force operation was executed.

## Dry-Run Result

`git worktree prune --dry-run --verbose` still reports 22 stale metadata
directories. Each line has the same reason:

```text
gitdir file does not exist
```

## Attribute Finding

The 22 stale metadata directories reported by dry-run all exist under
`.git/worktrees` and all share this attribute pattern:

```text
ReadOnly, Directory, Archive, ReparsePoint
```

Representative examples:

| Metadata directory | Attributes |
| --- | --- |
| `sesconsole-dependency-security-20260615` | `ReadOnly, Directory, Archive, ReparsePoint` |
| `sesconsole-recovery-main-20260614` | `ReadOnly, Directory, Archive, ReparsePoint` |
| `__market_analysis_url_sync_v04_worktree` | `ReadOnly, Directory, Archive, ReparsePoint` |
| `__staging_fixture_smoke` | `ReadOnly, Directory, Archive, ReparsePoint` |
| `__validation_main_20260618` | `ReadOnly, Directory, Archive, ReparsePoint` |

This supports the earlier suspicion that Windows/OneDrive reparse-point or
placeholder behavior is blocking normal Git cleanup.

## Full Dry-Run Names

- `sesconsole-dependency-security-20260615`
- `sesconsole-recovery-main-20260614`
- `ses_console_vol1_pr21`
- `__market_analysis_api_v0_worktree`
- `__market_analysis_filters_v02_worktree`
- `__market_analysis_logic_v0_worktree`
- `__market_analysis_mvp_polish_worktree`
- `__market_analysis_page_usability_v01_worktree`
- `__market_analysis_page_v0_worktree`
- `__market_analysis_period_charts_copy_worktree`
- `__market_analysis_safe_drilldown_v03_worktree`
- `__market_analysis_url_sync_v04_worktree`
- `__match_review_requirements_worktree`
- `__pr30_main_verify_worktree`
- `__pr_guarded_match_save_ui`
- `__pr_match_suggestion_review_update_api`
- `__pr_match_suggestion_review_workflow`
- `__staging_fixture_smoke`
- `__staging_migrate_pr29`
- `__staging_migrate_sync`
- `__staging_smoke_save`
- `__validation_main_20260618`

## Risk

These paths are Git metadata directories, not normal worktree checkouts. Even
so, they are under `.git/worktrees`, so raw deletion can corrupt Git's view of
registered worktrees if the list is stale or misread.

Do not jump from this report directly to raw deletion.

## Recommended Next Gate

Ask for a narrow cleanup approval with these constraints:

1. Target only the 22 names listed in this report.
2. Confirm the fresh dry-run still reports exactly these 22 names immediately
   before cleanup.
3. Back up only the exact `.git/worktrees/<name>` metadata directories first.
4. Remove `ReadOnly` attributes and reparse-point placeholders only for the
   exact 22 metadata directories if required.
5. Prefer `git worktree prune --verbose` after the attribute issue is resolved.
6. If Git still cannot prune, stop and report before any raw deletion.

Still forbidden without a new explicit approval:

- raw filesystem deletion;
- recursive deletion outside the exact 22 metadata directories;
- `git worktree remove`;
- `git worktree remove --force`;
- branch deletion;
- `git clean`;
- `git reset --hard`;
- mutation of dirty or active worktrees.
