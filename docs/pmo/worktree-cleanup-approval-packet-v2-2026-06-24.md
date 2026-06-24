# Worktree Cleanup Approval Packet v2 (2026-06-24)

This packet is planning-only. It does not approve or execute cleanup.

## Current Snapshot

- Latest `origin/main`: `9506680d11723568f87a73efe091a05a100226ef`
  (`Sync post-129 heartbeat status (#130)`).
- Open PRs: none at the time this packet was prepared.
- Open issues: none at the time this packet was prepared.
- No cleanup command was executed while preparing this packet.
- No branch deletion was performed.
- No raw filesystem deletion was performed.

## Path Encoding Rule

Do not copy executable Windows paths from this Markdown file. Some review tools
can render non-ASCII path segments incorrectly. Before any future cleanup
execution, re-read paths from the local shell in the same PowerShell session:

```powershell
git worktree list --porcelain
git worktree prune --dry-run --verbose
```

If a rendered path looks garbled, stop and re-run the read-only commands above.

## Why This Exists

The earlier cleanup batch removed safe checkouts, but one targeted
`git worktree remove` attempt later hit Windows / OneDrive `Permission denied`.
Separately, `git worktree prune --dry-run --verbose` now reports stale
metadata entries whose `gitdir` file no longer exists.

The next cleanup should be split into separate approval gates. Do not combine
metadata pruning, registered worktree removal, and raw filesystem cleanup.

## Batch A: Stale Metadata Only

Dry-run command used from the cleanup packet worktree:

```powershell
git worktree prune --dry-run --verbose
```

Dry-run output says the following metadata entries would be pruned:

```text
worktrees/sesconsole-dependency-security-20260615
worktrees/sesconsole-recovery-main-20260614
worktrees/ses_console_vol1_pr21
worktrees/__market_analysis_api_v0_worktree
worktrees/__market_analysis_filters_v02_worktree
worktrees/__market_analysis_logic_v0_worktree
worktrees/__market_analysis_mvp_polish_worktree
worktrees/__market_analysis_page_usability_v01_worktree
worktrees/__market_analysis_page_v0_worktree
worktrees/__market_analysis_period_charts_copy_worktree
worktrees/__market_analysis_safe_drilldown_v03_worktree
worktrees/__market_analysis_url_sync_v04_worktree
worktrees/__match_review_requirements_worktree
worktrees/__pr30_main_verify_worktree
worktrees/__pr_guarded_match_save_ui
worktrees/__pr_match_suggestion_review_update_api
worktrees/__pr_match_suggestion_review_workflow
worktrees/__staging_fixture_smoke
worktrees/__staging_migrate_pr29
worktrees/__staging_migrate_sync
worktrees/__staging_smoke_save
worktrees/__validation_main_20260618
```

If approved later, the exact execution should be run from a freshly opened
PowerShell session after confirming the current repo root with `Get-Location`:

```powershell
git worktree prune --verbose
```

Approval should be limited to Git metadata pruning only. It must not delete
regular directories, branches, or files outside `.git/worktrees`.

Rollback note: metadata pruning is normally recoverable by recreating a needed
checkout from the relevant branch or commit. If exact metadata rollback is
required, make a backup of `.git/worktrees` before executing the prune.

## Batch B: Registered Clean Worktree Removal

Registered worktree removal is a different gate. It should use exact
per-worktree commands only:

```powershell
git worktree remove -- "<exact path copied from fresh local worktree list>"
```

Do not use `--force` unless a separate approval explicitly names that path,
the reason, and the recovery plan.

Before any registered worktree removal, collect:

- exact path from a fresh local `git worktree list --porcelain`;
- branch or detached HEAD;
- `git status --short`;
- whether it is active / main / dirty;
- whether the branch is pushed or the work can be recreated;
- matching PR or superseded reason;
- exact recovery command.

## Batch C: OneDrive / ReparsePoint Directory

One path previously returned `Permission denied` and appears related to
OneDrive / reparse-point behavior. Do not raw-delete that path from an AI
cleanup run.

If filesystem cleanup is still needed, first resolve OneDrive sync/lock state
manually or approve a separate one-path backup-and-delete plan. That separate
plan must include the exact path copied from a fresh local shell, the backup
location, and the restore command.

## Forbidden In This Packet

- `git worktree remove --force`
- raw recursive deletion
- wildcard deletion
- branch deletion
- `git clean`
- `git reset --hard`
- stash/restore of dirty worktrees
- touching the dirty active workspace
- production/staging/shared DB operations

## Recommended Decision

Approve **Batch A only** first if the goal is to reduce stale Git metadata
without touching real working directories.

Keep Batch B and Batch C separate until each path has owner/PR/recovery
evidence.
