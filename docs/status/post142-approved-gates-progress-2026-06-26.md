# Post-#142 Approved Gates Progress (2026-06-26)

Observed at: 2026-06-26 10:35 JST.

## Baseline

- Baseline: `origin/main` `23c9963cdfaadb7fee6a8468a06479d53c824ad2`
  (`Sync post-141 project status (#142)`).
- Open PRs at start: none.
- Open issues at start: none.
- Original active workspace remains dirty/old and was not used as the work base.

## Seven-Role Approval Result

The owner relayed a seven-role approval result with this split:

- Approved immediately:
  - worktree cleanup Batch A stale metadata prune, after a fresh dry-run confirms no live worktree entries;
  - Person owner link static contract test and documentation;
  - `test:person-owner-link-api` npm wiring verification;
  - ops runbook updates;
  - Gmail company apply design convergence decision doc;
  - status/approval packet correction on latest main.
- Conditionally approved:
  - production read-only QA only when the user logs in with a VIEWER-role account and no sensitive screenshots, network dumps, cookies, or tokens are captured;
  - SearchHistory local/test smoke with small count and explicit cleanup;
  - worktree cleanup Batch B only row-by-row with clean/inactive/origin-pushed evidence.
- HOLD:
  - Gmail company apply implementation and DB write;
  - real schema/migration changes and CSV apply until source tracking schema and integration target are decided.

## Worktree Cleanup Batch A Result

Command sequence:

```powershell
git worktree prune --dry-run --verbose
git worktree prune --verbose
git worktree prune --dry-run --verbose
```

Fresh dry-run showed only stale metadata entries with `gitdir file does not
exist`. No live worktree entries were mixed in.

The actual plain prune attempted to remove only that Git metadata, but every
entry failed with `Permission denied` under `.git/worktrees/...`.

Result: **BLOCKED by filesystem permission**.

Not performed:

- `git worktree remove`
- `git worktree remove --force`
- raw filesystem deletion
- branch deletion
- `git clean`
- `git reset`
- DB write

Next cleanup work should be a permission-focused investigation or manual owner
cleanup plan. Do not retry with raw deletion or force flags.

## Person Owner Link Static Preflight Result

`test:person-owner-link-api` was already wired in `package.json`, so no package
change was needed.

Initial `npm.cmd run test:person-owner-link-api` failed because this newly
created clean worktree did not yet have `node_modules/.bin/tsx`.

After dependency installation:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run test:person-owner-link-api
npx.cmd tsx scripts/person-owner-link-api.test.ts
```

Results:

- `npm.cmd ci --ignore-scripts`: passed, 0 vulnerabilities reported.
- `npm.cmd run test:person-owner-link-api`: passed.
- `npx.cmd tsx scripts/person-owner-link-api.test.ts`: passed.

No DB connection, fixture query, HTTP write smoke, migration, or guarded PATCH
was performed.

## Gmail Company Apply Design Decision

The design is converged for the next planning baseline:

- existing-company link only;
- `HIGH` confidence only;
- allowed evidence: known main email domain or known alias;
- blocked from writes: generic/LOW/signature/fromName/body-label/unresolved/ambiguous candidates;
- no new `Company`, alias, or contact creation;
- dashboard list/detail API remains unchanged unless separately approved;
- preview and apply remain separate;
- local/test DB write smoke remains a later separate gate.

Implementation code is still HOLD.

## Remaining Owner-Gated Work

1. Production read-only QA with user-side VIEWER-role login.
2. Person owner link DB-connected local/test preflight with target classification and fixture approval.
3. SearchHistory optional local/test smoke.
4. Worktree cleanup permission investigation / Batch B row-level plans.
5. Gmail company apply implementation re-approval after accepting the converged design.
6. CSV/source tracking schema integration decision before any real schema/migration/apply work.
