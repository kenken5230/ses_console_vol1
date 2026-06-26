# Approval Waiting Packet (2026-06-24)

This packet lists the remaining owner-gated work after the #142 docs-only
status sync and the 2026-06-26 seven-role approval result.

It is intentionally not an execution script. Use it to decide what can be
approved next.

## Current GitHub State

- Open PRs: none at the time of this packet refresh.
- Open issues: none at the time of this packet refresh.
- Snapshot source commit: `23c9963cdfaadb7fee6a8468a06479d53c824ad2`
  (`Sync post-141 project status (#142)`).
- Main Vercel status for #142: success.
- Recent docs-only sync/planning PRs: #138 through #142 are closed/merged.
- Seven-role approval result received on 2026-06-26. It approved documentation/status correction, static Person owner link contract testing, npm script wiring verification, ops runbook updates, Gmail company apply design convergence docs, and worktree cleanup Batch A stale metadata prune attempt. Apply implementation/DB write and real schema/migration remain HOLD.

## Approval Items

| Priority | Area | Current state | What approval would allow | Current recommendation |
| --- | --- | --- | --- | --- |
| 1 | Production login-after read-only QA | Conditionally approved only when the user logs in with a VIEWER-role account and AI does not connect to production or capture cookies/network dumps/screenshots with sensitive content. | Normal-login read-only checks only. No auth bypass, cookie injection, token injection, DB write, guarded PATCH, or secret/cookie/token output. | Still waiting for user-side VIEWER login/session conditions. |
| 2 | Person owner link HTTP smoke | Static contract test is approved and passed: `npm.cmd run test:person-owner-link-api` and `npx.cmd tsx scripts/person-owner-link-api.test.ts`. Real DB write smoke remains a separate approval. | Prepare a fresh local/test DB-connected preflight evidence bundle later, then request write-smoke approval separately if safe. | Static side complete; DB-connected preflight still needs target classification and fixture approval. |
| 3 | Gmail company apply | HOLD for implementation/DB write. Design convergence is approved for docs only and recorded in the owner decision packet. | No apply code yet. Future implementation may start only after separate approval, using existing-company-link-only, HIGH confidence, known domain/alias evidence, dashboard API unchanged. | Keep preview/apply separated. Do not write generic/LOW/signature/fromName/body-label candidates. |
| 4 | SearchHistory additional DB smoke / user isolation | DB-backed flow is merged and local normal-login QA passed. #135 added an optional local/test DB smoke packet. | Local/test-only smoke with exact users, rows, cleanup, and audit separation. | Lower priority unless SearchHistory behavior becomes suspect. |
| 5 | Worktree stale metadata cleanup | Batch A was approved and attempted on 2026-06-26 after dry-run confirmed stale metadata only. Plain `git worktree prune --verbose` failed with `Permission denied` on every stale metadata entry. No remove/raw/branch/--force action was taken. | Future work may prepare a permission-focused plan only. Actual registered worktree removal, raw filesystem deletion, and branch deletion remain separate future approvals. | Do not retry with raw deletion or force. Investigate Windows/OneDrive/.git metadata permissions first. |
| 6 | CSV apply | HOLD/BLOCKED because source tracking schema is not landed on the main line and implementation work is distributed across older branches. | Read-only prep docs and dry-run analysis only. Real schema/migration/apply remains blocked until integration target and schema landing plan are approved. | Do not run apply or schema/migration changes until the source tracking gap is solved with explicit local/test approval. |

## Non-Approvals That Remain Forbidden

- Production/staging/shared DB write.
- Migration or schema change outside a separately approved local/test gate.
- Deploy outside the normal PR merge gate.
- Guarded PATCH execution against production.
- Worktree deletion, branch deletion, raw filesystem deletion, `--force`, or further non-dry-run prune without a new permission-focused cleanup approval.
- Secret value output.

## Suggested Next Approval Choices

1. **Production read-only QA**: useful if the user can provide or perform a VIEWER-role normal login session without sharing cookies/tokens/network dumps.
2. **Person owner link DB-connected preflight**: useful if local/test target classification and one approved synthetic/disposable fixture set can be confirmed.
3. **Cleanup permission investigation**: useful because Batch A prune was approved but blocked by `.git/worktrees/... Permission denied`.
4. **Gmail apply implementation re-approval**: only after accepting the converged existing-company-link-only design and deciding the first implementation target.

## Evidence To Collect Before Any Execution Approval

- exact target;
- command or route;
- expected changed rows/files;
- rollback or cleanup path;
- stop conditions;
- separate execution and audit roles;
- proof that the target is local/test when DB access is involved.
