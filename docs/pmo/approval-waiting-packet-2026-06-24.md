# Approval Waiting Packet (2026-06-24)

This packet lists the remaining owner-gated work after #148 and the consolidated
next approval gates packet.

It is intentionally not an execution script. Use it to decide what can be
approved next.

## Current GitHub State

- Open PRs: #149 is Draft/open, mergeable, clean, and Vercel success; it changes only `package.json` to wire the DB-free SearchHistory UI context test. #147 is this consolidated approval packet refresh branch.
- Open issues: none at the time of this packet refresh.
- Snapshot source commit: `0ec3778bf3be9bb1145bb70d10eeea4c23733b27`
  (`Merge pull request #148 from kenken5230/codex/login-recovery-20260626`).
- Main Vercel status for #148: production deploy success.
- Recent docs-only sync/planning PRs: #138 through #146 are closed/merged; #148 is merged runtime diagnostics with secret-safe logging; #149 is pending owner approval for Ready/merge.
- Seven-role approval result received on 2026-06-26. It approved documentation/status correction, static Person owner link contract testing, npm script wiring verification, ops runbook updates, Gmail company apply design convergence docs, and worktree cleanup Batch A stale metadata prune attempt. Apply implementation/DB write and real schema/migration remain HOLD.
- DB-free verification refresh on 2026-06-26 passed Person owner link API/route/contract/UI, SearchHistory, Gmail extraction quality, CSV dry-run, import source tracking, and source inventory tests.
- Worktree cleanup read-only permission report on 2026-06-26 found 22 stale metadata directories, all with `ReadOnly, Directory, Archive, ReparsePoint`.
- `docs/pmo/next-approval-gates-2026-06-26.md` consolidates the remaining owner choices and recommended order.
- Production password reset/login remains blocked until production env/config is confirmed and, if needed, fixed. Vercel production env/config changes and redeploy are owner-gated production operations.

## Approval Items

| Priority | Area | Current state | What approval would allow | Current recommendation |
| --- | --- | --- | --- | --- |
| 1 | Production login/password reset env/config recovery | #148 secret-safe diagnostics are merged and production deploy succeeded, but the live password reset flow still failed for the user. Read-only Vercel inspection suggests production env/config may be missing or incomplete. | Approve a production env/config recovery gate: inspect env variable names only, set missing values through Vercel without printing secrets, then redeploy if required. | Highest priority because it blocks all normal-login production QA. User/Vercel owner should provide or enter secret values; AI should not print them. |
| 2 | #149 SearchHistory UI context test wiring | Draft/open, mergeable, clean, Vercel success. Changes only `package.json`; no DB/schema/env/lockfile/deletion impact. | Ready/merge after internal gate if owner approves docs/test-only deploy impact. | Safe WAITING_APPROVAL item; not urgent for login recovery but improves test coverage. |
| 3 | Production login-after read-only QA | Conditionally approved only when a normal authorized account can log in and AI does not connect to production DB or capture cookies/network dumps/screenshots with sensitive content. | Normal-login read-only checks only. No auth bypass, cookie injection, token injection, DB write, guarded PATCH, or secret/cookie/token output. | Wait until production login/reset is working. |
| 4 | Person owner link HTTP smoke | DB-free API/route/contract/UI tests passed on 2026-06-26. Real DB write smoke remains a separate approval. | Prepare a fresh local/test DB-connected preflight evidence bundle later, then request write-smoke approval separately if safe. | Static side complete; DB-connected preflight still needs target classification and fixture approval. |
| 5 | Gmail company apply | HOLD for implementation/DB write. Design convergence is approved for docs only and recorded in the owner decision packet. | No apply code yet. Future implementation may start only after separate approval, using existing-company-link-only, HIGH confidence, known domain/alias evidence, dashboard API unchanged. | Keep preview/apply separated. Do not write generic/LOW/signature/fromName/body-label candidates. |
| 6 | SearchHistory additional DB smoke / user isolation | DB-backed flow is merged and local normal-login QA passed. #135 added an optional local/test DB smoke packet. `test:search-history` passed on 2026-06-26; #149 would wire the existing UI-context test into `npm test`. | Local/test-only smoke with exact users, rows, cleanup, and audit separation. | Lower priority unless SearchHistory behavior becomes suspect. |
| 7 | Worktree stale metadata cleanup | Batch A was approved and attempted on 2026-06-26 after dry-run confirmed stale metadata only. Plain `git worktree prune --verbose` failed with `Permission denied` on every stale metadata entry. A read-only report found the 22 stale metadata directories all have `ReadOnly, Directory, Archive, ReparsePoint`. | A future approval could target only these 22 metadata directories, with fresh dry-run confirmation, backup, attribute/reparse-point handling, and Git prune retry. Actual raw deletion, registered worktree removal, and branch deletion remain separate future approvals. | Do not retry with raw deletion or force. Use `docs/pmo/worktree-cleanup-permission-report-2026-06-26.md` as the next approval basis. |
| 8 | CSV apply | HOLD/BLOCKED for real schema/migration/apply. The repository now contains source tracking schema/migration/tests, and DB-free CSV/source tracking tests passed on 2026-06-26, but a specific local/test DB target has not been proven to have the schema applied. | Read-only source tracking and CSV dry-run validation only. Real schema/migration/apply remains blocked until target DB and schema landing plan are approved. | Use `docs/pmo/csv-source-tracking-integration-decision-2026-06-26.md`; do not run apply or schema/migration changes yet. |

## Non-Approvals That Remain Forbidden

- Production/staging/shared DB write.
- Migration or schema change outside a separately approved local/test gate.
- Deploy outside the normal PR merge gate or a separately approved production env/config recovery gate.
- Guarded PATCH execution against production.
- Worktree deletion, branch deletion, raw filesystem deletion, `--force`, or further non-dry-run prune without a new permission-focused cleanup approval.
- Secret value output.

## Suggested Next Approval Choices

1. **Production login/password reset env/config recovery**: most useful because other production QA cannot proceed until normal login works.
2. **#149 Ready/merge**: low-risk DB-free test wiring if the owner wants to keep the test suite current.
3. **Person owner link DB-connected preflight**: useful if local/test target classification and one approved synthetic/disposable fixture set can be confirmed.
4. **Gmail apply implementation-only re-approval**: only after accepting the converged existing-company-link-only design and deciding the first implementation target.
5. **CSV/source tracking target decision**: useful because repo schema exists, but the target DB application state still needs a safe gate.
6. **Production read-only QA**: useful only after login/reset works, and only without sharing cookies/tokens/network dumps.
7. **Cleanup permission-handling gate**: useful because the metadata report now indicates all 22 stale metadata directories are read-only reparse points.
8. **SearchHistory own-user isolation smoke**: optional and lower priority unless SearchHistory behavior becomes suspect.

## Evidence To Collect Before Any Execution Approval

- exact target;
- command or route;
- expected changed rows/files;
- rollback or cleanup path;
- stop conditions;
- separate execution and audit roles;
- proof that the target is local/test when DB access is involved.
