# Open PR approval packet 2026-06-24

This packet is the current PMO summary after the approved merge batch, #116 restart work,
worktree cleanup execution, SearchHistory local DB QA, and CSV apply preflight.

## Non-engineer summary

The earlier approval batch has mostly been handled.

- Already merged: docs/test/guard PRs that were inside the approved low-risk scope.
- Partially completed: worktree cleanup removed 25 safe checkouts.
- Verified locally: SearchHistory can save and read a DB-backed history entry for a normal logged-in user.
- Blocked: #116 cannot be merged without a more explicit approval because it changes runtime behavior in the CSV apply path.
- Blocked: CSV apply cannot run on the current local DB because source tracking tables are missing.
- Blocked: 18 worktree checkouts could not be removed with `git worktree remove` because Windows returned `Permission denied`.

No production/staging/shared DB write was performed. No migration or schema change was performed.

## Completed since the old packet

| Area | Result |
|---|---|
| #113 | Merged. Commit `ca15328f86098a89408d17a0237eb793173cb9b4`. Production Vercel success was confirmed. |
| #105 | Merged. Commit `b932ed0fc7b6fdb75d00035452d92825892e9162`. |
| #119 | Merged. Commit `ffce54f25ef2eb9bb6c3430f6b530e1860e82b24`. |
| #120 | Merged. Commit `f9261f2efb369dcb10c13790125da7411eced985`. |
| #110 | Merged. Commit `b42694009bf096c953abad43fbf27e58d222c1e9`. |
| #111 | Merged. Commit `47b96b37691dc040cf15b7a04bf2444ff8c99150`. |
| #115 | Merged. Commit `5024bf1649059b7c61d70e392d70e32352787bd5`. |
| #107 | Merged. Commit `1f05e76434c6955dd054218d10f4b1fe595a97e4`. |
| #104 | Merged. Commit `7abfaa4e43cc2fc5a8d37f08f756ebc55a770c3b`. |
| #116 | Rebased onto latest main, validated, re-audited, and marked Ready. Merge attempt was blocked by the runtime-change safety gate. |
| #104 cleanup | 25 approval-ready worktrees removed with `git worktree remove` only. 18 remain on hold due `Permission denied`. |
| SearchHistory QA | Local/test normal-login DB QA passed. One QA history row was created and cleaned up. |
| CSV apply preflight | Local DB was classified as local, dry-run passed, but apply was blocked because source tracking tables are missing. |

## Current open PR state

| PR | Theme | Current handling |
|---|---|---|
| #106 | Gmail company auto-apply helper | Hold. Runtime/helper behavior, not covered by docs-only/test-only merge approval. |
| #108 | Person owner DB target guard | Hold. DB preflight/runtime guard scope. Needs explicit merge approval. |
| #109 | Gmail body fallback | Hold. Runtime behavior change. Needs explicit merge approval. |
| #112 | SearchHistory UI context guard | Hold. Real DB QA passed, but PR is stale/mergeable false and runtime UI scope needs explicit approval before rebase/merge. |
| #114 | Old merge approval plan | Stale. Superseded by this refreshed packet and actual merge results. Close only with explicit approval. |
| #116 | CSV apply mutation guard | Ready but merge-blocked. Needs explicit approval for runtime guard change before merge. |
| #117 | Auth source contract test | Hold. Auth/security scope, excluded from broad merge approval. |
| #118 | Gmail person remediation production guard | Hold. Runtime write-path guard; needs explicit approval. |
| #121 | Operations handoff runbook | Hold. Ops/auth/env runbook says explicit approval before moving forward. |
| #122 | This packet | Refreshed docs-only packet. Mergeable under the docs-only approval gate if checks pass. |

## Approval needed from user

### A. #116 runtime guard merge

Recommended: approve #116 explicitly if the user accepts a production deploy containing a safer CSV apply guard.

Why approval is needed: #116 changes runtime behavior by adding `assertNotProductionMutation("csv:import:apply")`
before Prisma/write access. This is safer behavior, but it is still runtime behavior.

### B. CSV apply local/test execution

Blocked for now.

The local DB is `localhost / ses_console_dev`, but it does not have:

- `import_sources`
- `import_runs`
- `source_records`
- `entity_source_links`

Running CSV apply requires either a local/test DB with these tables already present, or explicit approval for
a migration/schema update in a local/test DB.

### C. Remaining 18 worktree removals

Blocked for now.

The approved `git worktree remove` command returned `Permission denied` for 18 paths. Continuing would require a
separate decision, for example:

- retry later after closing file handles / OneDrive sync;
- allow `git worktree remove --force` if appropriate;
- allow a manual filesystem cleanup plan with backup and re-audit.

Branch deletion remains out of scope.

### D. Runtime PRs

The following PRs need explicit approval before Ready/merge because they change runtime behavior or sensitive paths:

- #106
- #108
- #109
- #112
- #116
- #117
- #118
- #121

## Safety notes

- Production/staging/shared DB write: not performed.
- Migration/schema change: not performed.
- Manual deploy/redeploy/rollback: not performed.
- Branch deletion: not performed.
- Force push for #122: not performed; latest main was brought in with a normal merge commit.
- Secret values, cookies, tokens, and DB URLs were not printed.

## Next recommended sequence

1. Decide #116 explicit runtime-guard merge approval.
2. Decide how to handle the local DB schema gap for CSV apply.
3. Decide how to handle the 18 permission-denied worktrees.
4. Refresh or close stale planning PRs (#114 and possibly #122) after the user chooses the next direction.
5. Rebase and re-check #112 only if the user wants the SearchHistory UI context guard PR to continue.
