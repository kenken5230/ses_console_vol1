# Approval Waiting Packet (2026-06-24)

This packet lists the remaining owner-gated work after #146 and the consolidated
next approval gates packet.

It is intentionally not an execution script. Use it to decide what can be
approved next.

## Current GitHub State

- Open PRs: none at the time of this packet refresh before the next-approval-gates branch.
- Open issues: none at the time of this packet refresh.
- Snapshot source commit: `e2f96b98c605aa2b8c9183acca976dd3903fd548`
  (`Merge pull request #146 from kenken5230/codex/worktree-permission-report-20260626`).
- Main Vercel status for #146: success.
- Recent docs-only sync/planning PRs: #138 through #146 are closed/merged.
- Seven-role approval result received on 2026-06-26. It approved documentation/status correction, static Person owner link contract testing, npm script wiring verification, ops runbook updates, Gmail company apply design convergence docs, and worktree cleanup Batch A stale metadata prune attempt. Apply implementation/DB write and real schema/migration remain HOLD.
- DB-free verification refresh on 2026-06-26 passed Person owner link API/route/contract/UI, SearchHistory, Gmail extraction quality, CSV dry-run, import source tracking, and source inventory tests.
- Worktree cleanup read-only permission report on 2026-06-26 found 22 stale metadata directories, all with `ReadOnly, Directory, Archive, ReparsePoint`.
- `docs/pmo/next-approval-gates-2026-06-26.md` consolidates the remaining owner choices and recommended order.

## Approval Items

| Priority | Area | Current state | What approval would allow | Current recommendation |
| --- | --- | --- | --- | --- |
| 1 | Production login-after read-only QA | Conditionally approved only when the user logs in with a VIEWER-role account and AI does not connect to production or capture cookies/network dumps/screenshots with sensitive content. | Normal-login read-only checks only. No auth bypass, cookie injection, token injection, DB write, guarded PATCH, or secret/cookie/token output. | Still waiting for user-side VIEWER login/session conditions. |
| 2 | Person owner link HTTP smoke | DB-free API/route/contract/UI tests passed on 2026-06-26. Real DB write smoke remains a separate approval. | Prepare a fresh local/test DB-connected preflight evidence bundle later, then request write-smoke approval separately if safe. | Static side complete; DB-connected preflight still needs target classification and fixture approval. |
| 3 | Gmail company apply | HOLD for implementation/DB write. Design convergence is approved for docs only and recorded in the owner decision packet. | No apply code yet. Future implementation may start only after separate approval, using existing-company-link-only, HIGH confidence, known domain/alias evidence, dashboard API unchanged. | Keep preview/apply separated. Do not write generic/LOW/signature/fromName/body-label candidates. |
| 4 | SearchHistory additional DB smoke / user isolation | DB-backed flow is merged and local normal-login QA passed. #135 added an optional local/test DB smoke packet. `test:search-history` passed on 2026-06-26. | Local/test-only smoke with exact users, rows, cleanup, and audit separation. | Lower priority unless SearchHistory behavior becomes suspect. |
| 5 | Worktree stale metadata cleanup | Batch A was approved and attempted on 2026-06-26 after dry-run confirmed stale metadata only. Plain `git worktree prune --verbose` failed with `Permission denied` on every stale metadata entry. A read-only report found the 22 stale metadata directories all have `ReadOnly, Directory, Archive, ReparsePoint`. | A future approval could target only these 22 metadata directories, with fresh dry-run confirmation, backup, attribute/reparse-point handling, and Git prune retry. Actual raw deletion, registered worktree removal, and branch deletion remain separate future approvals. | Do not retry with raw deletion or force. Use `docs/pmo/worktree-cleanup-permission-report-2026-06-26.md` as the next approval basis. |
| 6 | CSV apply | HOLD/BLOCKED for real schema/migration/apply. The repository now contains source tracking schema/migration/tests, and DB-free CSV/source tracking tests passed on 2026-06-26, but a specific local/test DB target has not been proven to have the schema applied. | Read-only source tracking and CSV dry-run validation only. Real schema/migration/apply remains blocked until target DB and schema landing plan are approved. | Use `docs/pmo/csv-source-tracking-integration-decision-2026-06-26.md`; do not run apply or schema/migration changes yet. |

## Non-Approvals That Remain Forbidden

- Production/staging/shared DB write.
- Migration or schema change outside a separately approved local/test gate.
- Deploy outside the normal PR merge gate.
- Guarded PATCH execution against production.
- Worktree deletion, branch deletion, raw filesystem deletion, `--force`, or further non-dry-run prune without a new permission-focused cleanup approval.
- Secret value output.

## Suggested Next Approval Choices

1. **Person owner link DB-connected preflight**: useful if local/test target classification and one approved synthetic/disposable fixture set can be confirmed.
2. **Gmail apply implementation-only re-approval**: only after accepting the converged existing-company-link-only design and deciding the first implementation target.
3. **CSV/source tracking target decision**: useful because repo schema exists, but the target DB application state still needs a safe gate.
4. **Production read-only QA**: useful if the user can provide or perform a VIEWER-role normal login session without sharing cookies/tokens/network dumps.
5. **Cleanup permission-handling gate**: useful because the metadata report now indicates all 22 stale metadata directories are read-only reparse points.
6. **SearchHistory own-user isolation smoke**: optional and lower priority unless SearchHistory behavior becomes suspect.

## Evidence To Collect Before Any Execution Approval

- exact target;
- command or route;
- expected changed rows/files;
- rollback or cleanup path;
- stop conditions;
- separate execution and audit roles;
- proof that the target is local/test when DB access is involved.
