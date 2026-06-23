# Worktree Cleanup Inventory 2026-06-23

Observed at: 2026-06-23 15:23 JST

Scope: docs-only inventory note. No worktree deletion, branch deletion, reset, clean, stash, merge, or other-worktree mutation was performed for this document.

## Current Known State

| Item | Known state | Handling |
|---|---|---|
| Main latest work base | `443d0e71e8e5b0744a261b29fbe0434e7e0b2a15` after #95 | Use latest main for new work. |
| Current docs-only worktree | `C:\Users\ke919\OneDrive\ドキュメント\1234project\__post95_progress_gate_sync_20260623` on `codex/post95-progress-gate-sync-20260623` | Safe target for this docs-only pack. |
| Original main workspace | `C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1` is reported dirty and old | Do not use as a base for new PR work. Do not reset or clean without explicit approval. |
| Older worktrees | Multiple old worktrees are known from prior handoff/status context | Do not delete, reuse, merge, or inspect deeply without a separate cleanup pass. |
| Open PRs | None currently open per post-#95 handoff | Still verify before any cleanup action because PR state can change. |

## Cleanup Principles

- Inventory first, delete later.
- Do not read secret files, DB dumps, local SQLite files, private keys, or credential directories while inventorying.
- Do not use wildcard deletion or recursive deletion as a first step.
- Do not delete a worktree with dirty changes, untracked files, unpushed commits, unknown owner, or possible secret/DB artifacts.
- Do not delete a branch linked to an open or recently active PR without separate confirmation.
- Treat generated folders such as build output separately from source changes, but still confirm path ownership before deleting.

## Required Ledger Fields Before Any Deletion

| Field | Required note |
|---|---|
| Worktree path | Absolute path. |
| Branch | Current branch name. |
| Base commit | Base or merge target if known. |
| Latest commit | Current HEAD. |
| Related PR/issue | PR number, issue, or "none known". |
| Dirty status | Clean/dirty summary without dumping secret values. |
| Untracked files | Count and safe categories only; do not print protected filenames if they contain secret-bearing paths. |
| Unpushed commits | Whether commits are only local. |
| Protected files risk | Whether `.env`, keys, DB dumps, credential files, or private data may exist. |
| Delete candidate | yes/no/unknown. |
| Approval | Approver and date before execution. |
| Command plan | Exact command to be reviewed later. This inventory intentionally does not include deletion commands. |
| Result | Filled only after an approved cleanup run. |

## Known Cleanup Gates

| Gate | Status |
|---|---|
| Confirm current open PR state | Not executed in this docs-only pass. |
| Confirm each candidate worktree status | Not executed in this docs-only pass. |
| Confirm unpushed commits | Not executed in this docs-only pass. |
| Confirm no protected files are being read or removed | Not executed in this docs-only pass. |
| Prepare deletion command review | Not executed in this docs-only pass. |
| Execute deletion | Not executed and not approved here. |

## Suggested Next Cleanup Pack

1. List worktree paths and branches only.
2. For each candidate, record `git status --short` summary and HEAD, without reading protected files.
3. Check whether the branch has unpushed commits.
4. Mark candidates as keep, investigate, or deletion-candidate.
5. Ask for approval with the exact path list before any delete command is run.

## Explicit Non-Actions

- No delete command was run.
- No cleanup command was run.
- No other worktree files were edited.
- No secret file contents, DB files, keys, credentials, or env files were read.
- No PR, remote branch, local branch, or git ref was changed.
