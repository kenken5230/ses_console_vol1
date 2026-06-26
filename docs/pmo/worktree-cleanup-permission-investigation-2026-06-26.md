# Worktree Cleanup Permission Investigation (2026-06-26)

This is a planning and evidence packet only. It does not approve or execute
cleanup.

## Why This Exists

Batch A stale metadata cleanup was approved and attempted on 2026-06-26.

The fresh dry-run showed only stale metadata entries:

```text
Removing worktrees/...: gitdir file does not exist
```

Plain `git worktree prune --verbose` then failed with `Permission denied` for
every stale metadata directory under `.git/worktrees/...`.

No fallback cleanup was attempted.

## What Is Still Forbidden

- raw filesystem deletion;
- `git worktree remove`;
- `git worktree remove --force`;
- branch deletion;
- `git clean`;
- `git reset --hard`;
- stash/restore of dirty worktrees;
- changing or deleting the dirty active workspace;
- production/staging/shared DB operations.

## Investigation Goal

Find out why Git cannot delete stale metadata under `.git/worktrees` even
though the metadata is stale. The next step should identify the permission or
lock cause before any new cleanup approval.

## Read-Only Checks For A Future Investigation

Run only read-only checks first:

```powershell
Get-Location
git rev-parse --git-common-dir
git worktree prune --dry-run --verbose
Get-ChildItem -LiteralPath .git\worktrees -Force | Select-Object Name,Attributes,Mode,LastWriteTime
```

If a specific stale metadata directory needs inspection, inspect attributes and
ACL metadata only:

```powershell
Get-Item -LiteralPath ".git\worktrees\<name>" -Force | Format-List FullName,Attributes,Mode,LastWriteTime
Get-Acl -LiteralPath ".git\worktrees\<name>" | Format-List
```

Do not read secret files, database files, worktree contents, or `.env` files as
part of this investigation.

## Possible Causes To Check

- OneDrive file locking or sync placeholder behavior.
- Read-only attribute on `.git/worktrees` children.
- Antivirus or indexer lock.
- Stale process holding a handle.
- Windows ACL inherited from a protected directory.
- Path normalization or non-ASCII path behavior.

## Future Approval Options

Any next action must be separately approved:

| Option | Scope | Risk |
| --- | --- | --- |
| Permission metadata report only | Read-only ACL/attribute/process evidence. | Low |
| One stale metadata backup + delete | Exact one `.git/worktrees/<name>` metadata directory, backup first. | Medium; raw delete approval required |
| Full stale metadata cleanup | All stale metadata after backup. | Higher; requires exact list and rollback |
| Registered worktree removal Batch B | Only clean/inactive/origin-pushed worktrees, one row at a time. | Separate gate |

## Recommended Next Decision

Approve a read-only permission metadata report first. Do not jump directly from
`Permission denied` to raw deletion.
