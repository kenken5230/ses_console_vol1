# Next Approval Gates (2026-06-26)

Observed at: 2026-06-26 12:50 JST.

This packet turns the current remaining gates into clear approval choices. It
does not execute any DB write, migration, schema change, production access,
cleanup, deletion, or branch operation.

## Current Baseline

- Latest observed `origin/main`: `e2f96b98c605aa2b8c9183acca976dd3903fd548`
  (`Merge pull request #146 from kenken5230/codex/worktree-permission-report-20260626`).
- Open PRs: none observed before this branch.
- Open issues: none observed before this branch.
- Vercel for #146 merge commit: success.
- DB-free tests are green as recorded in
  `docs/status/dbfree-verification-refresh-2026-06-26.md`.
- Worktree cleanup permission evidence is recorded in
  `docs/pmo/worktree-cleanup-permission-report-2026-06-26.md`.

## Approval Choice A: Production Read-Only QA

**Goal:** Confirm production screens after normal login without writes.

Allowed only if approved:

- User uses or provides a normal authorized VIEWER-role login session.
- AI performs read-only screen checks only.
- No auth bypass, cookie injection, token injection, or production DB access.
- No guarded write route execution.
- No screenshots, network dumps, cookies, tokens, or sensitive screen contents
  are saved into repo docs.

Recommended outcome:

- Approve only when a normal login path is available.
- If unavailable, keep this gate waiting and continue other local/test work.

## Approval Choice B: Person Owner Link Local/Test DB-Connected Preflight

**Goal:** Run read-only DB-connected preflight before any real HTTP write smoke.

Already green:

- `test:person-owner-link-api`
- `test:person-owner-link-api-route`
- `test:person-owner-link-api-contract`
- `test:person-owner-link-ui`

Allowed only if approved:

- Target DB is classified as local/test without printing secret values.
- Exactly one synthetic/disposable Person/Company/Contact fixture set is
  identified.
- Evidence is sanitized: target category, table names, fixture IDs, expected
  row counts, and stop conditions only.
- No write smoke, no PATCH execution, no production/staging/shared DB.

Recommended next step:

- Approve read-only local/test preflight only.
- Keep real HTTP write smoke as a later approval after preflight evidence.

## Approval Choice C: SearchHistory Own-User Isolation Smoke

**Goal:** Optionally verify SearchHistory user isolation with local/test writes.

Already green:

- `test:search-history`

Allowed only if approved:

- local/test DB only.
- Two exact test users or approved equivalent fixture users.
- Exact rows to create, expected visibility, cleanup rows, and rollback
  evidence listed before execution.
- Separate executor and result auditor.
- No production/staging/shared DB writes.

Recommended outcome:

- Lower priority unless SearchHistory behavior becomes suspect.
- If approved, run after Person owner link preflight so DB-gate work is not
  mixed.

## Approval Choice D: Worktree Cleanup Permission Handling

**Goal:** Resolve stale `.git/worktrees` metadata that `git worktree prune`
cannot delete because of permission/reparse-point behavior.

Current evidence:

- Fresh dry-run reports 22 stale metadata directories.
- All 22 have `ReadOnly, Directory, Archive, ReparsePoint`.
- Prior plain `git worktree prune --verbose` failed with `Permission denied`.

Allowed only if approved:

- Fresh dry-run immediately before the operation still reports exactly the same
  22 metadata names.
- Back up only those exact `.git/worktrees/<name>` metadata directories.
- Try to resolve ReadOnly/reparse-point metadata attributes only for those exact
  22 directories.
- Retry plain Git prune after the attribute issue is handled.
- If Git still fails, stop and report before raw deletion.

Still not approved:

- raw recursive deletion;
- deleting registered worktree checkouts;
- branch deletion;
- `git worktree remove --force`;
- `git clean`;
- `git reset --hard`;
- mutating dirty or active worktrees.

Recommended outcome:

- Approve a narrow permission-handling gate only if cleanup is now a priority.
- Otherwise keep it waiting; it is not blocking product work.

## Approval Choice E: Gmail Company Apply Implementation

**Goal:** Start the first implementation PR for supervised Gmail company apply.

Design baseline:

- existing-company link only;
- HIGH confidence only;
- known domain or approved alias evidence;
- preview/apply split;
- dashboard API unchanged for first implementation;
- DB write smoke is separate;
- no generic domains, LOW confidence, signature/fromName/body-label-only writes.

Allowed only if approved:

- Implementation code may be written for preview/apply separation and DB-free
  boundary tests.
- No DB write, no apply execution, no dashboard API expansion, no production or
  shared DB.

Recommended outcome:

- Approve implementation-only if Gmail apply is the next product priority.
- Keep DB write/apply execution as a later gate.

## Approval Choice F: CSV / Source Tracking Local/Test Schema Gate

**Goal:** Decide whether CSV apply can move past repository-contract checks.

Already green:

- `test:csv-import-dry-run`
- `test:import-source-tracking`
- `test:source-inventory`

Current state:

- Repo contains source tracking schema and migration.
- A specific target DB has not been proven to have that schema applied.

Allowed only if approved:

- Pick one target:
  1. existing local/test DB with source tracking tables already applied;
  2. fresh disposable local/test DB where migrations may be applied;
  3. docs/read-only mode only.
- Collect table-existence evidence without table contents.
- No production/staging/shared DB.
- Do not combine schema preparation and CSV apply in one approval.

Recommended outcome:

- Choose option 3 if no local/test DB setup time is available.
- Choose option 2 if clean integration confidence is more important than speed.

## Recommended Order

1. Person owner link local/test read-only preflight.
2. Gmail company apply implementation-only approval, if product progress is the
   priority.
3. CSV/source tracking target decision.
4. Production read-only QA when a normal VIEWER login is available.
5. Worktree cleanup permission handling when cleanup is the priority.
6. SearchHistory own-user isolation smoke only if SearchHistory becomes suspect.

## Universal Stop Conditions

Stop and report if any of these occur:

- target classification is production/staging/shared/unknown for a write action;
- fixture IDs are missing or ambiguous;
- a command would print secret values;
- a command would mutate schema, run migration, write DB rows, or delete files
  outside the approved scope;
- internal audit, PMO, or TL says NG/HOLD;
- the actual target differs from the packet.
