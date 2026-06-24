# Worktree Cleanup Approval Packet v3 (2026-06-24)

Observed at: 2026-06-24 21:05 JST.

This packet is planning-only. It does not approve or execute cleanup.

## Current Snapshot

- Latest observed `origin/main`: `e489508372e21e87d05be7b468c54a8b34eeac56`
  (`Sync post-139 project status (#140)`).
- Open PRs: none observed before this packet work started.
- Open issues: none observed before this packet work started.
- No cleanup command was executed while preparing this packet.
- No branch deletion was performed.
- No raw filesystem deletion was performed.
- The original active workspace remains dirty/old and was not used as a work base.

## Read-Only Evidence Collected

Commands run:

```powershell
git worktree list --porcelain
git worktree prune --dry-run --verbose
```

`git worktree prune --dry-run --verbose` still reports the same stale metadata
class of entries as v2: metadata whose `gitdir` file no longer exists. This
means Git can see stale records, but this packet still does not approve the
actual prune.

## Batch A: Stale Metadata Prune Candidate

Dry-run output reported these stale metadata entries:

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

If approved later, execute only from a fresh local PowerShell session after
confirming the repo root:

```powershell
Get-Location
git worktree prune --dry-run --verbose
git worktree prune --verbose
git worktree prune --dry-run --verbose
```

Approval for Batch A should be limited to Git metadata pruning. It must not
delete regular directories, branch refs, or files outside `.git/worktrees`.

Rollback note: metadata pruning is normally recoverable by recreating a needed
checkout from the relevant branch or commit. If exact metadata rollback is
required, back up `.git/worktrees` before executing the prune.

## Batch B: Registered Worktree Removal

Registered worktree removal remains a separate gate. Use exact per-worktree
commands only after collecting fresh evidence:

```powershell
git worktree remove -- "<exact path copied from fresh local worktree list>"
```

Do not use `--force` unless a separate approval explicitly names that path,
the reason, and the recovery plan.

## Batch C: OneDrive / Reparse-Point Directory Handling

One prior path returned `Permission denied`, likely related to OneDrive or
reparse-point behavior. Do not raw-delete that path from an AI cleanup run.

If filesystem cleanup is still needed, prepare a separate one-path
backup-and-delete plan with:

- exact path copied from a fresh local shell;
- backup location;
- restore command;
- OneDrive sync/lock state notes;
- explicit owner approval.

## Forbidden By This Packet

- actual `git worktree prune`
- `git worktree remove`
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

If cleanup is desired next, approve **Batch A only** first. It is the narrowest
cleanup action because it targets stale Git metadata that already has missing
`gitdir` files.

Keep registered worktree removal and OneDrive/reparse-point filesystem cleanup
as separate future gates.
