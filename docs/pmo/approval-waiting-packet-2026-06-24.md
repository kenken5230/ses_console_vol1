# Approval Waiting Packet (2026-06-24)

This packet lists the remaining owner-gated work after the #129 heartbeat
short-run accountability rule merge.

It is intentionally not an execution script. Use it to decide what can be
approved next.

## Current GitHub State

- Open PRs: none at the time of this packet.
- Open issues: none at the time of this packet.
- Latest `origin/main`: `10d83426dcaf14736ce3ce4fabeb65e68eb79544`
  (`Add heartbeat short-run accountability (#129)`).
- Main Vercel status for #129: success.

## Approval Items

| Priority | Area | Current state | What approval would allow | Current recommendation |
| --- | --- | --- | --- | --- |
| 1 | Production login-after read-only QA | Production reaches the login screen, but post-login read-only screens are not verified. | Normal-login read-only checks only. No auth bypass, cookie injection, token injection, DB write, or guarded PATCH. | Approve when a normal authorized login session is available. |
| 2 | Worktree stale metadata cleanup | `git worktree prune --dry-run --verbose` reports stale metadata. One OneDrive reparse-point checkout previously returned `Permission denied`. | A new, exact cleanup plan can be prepared and, after separate approval, executed. | First approve only a fresh approval packet. Do not approve deletion/prune execution from this packet alone. |
| 3 | Person owner link HTTP smoke | Prior read-only preflight was blocked by missing runtime env/helper/fixture conditions. | Prepare a fresh local/test preflight evidence bundle, then later request write-smoke approval separately if safe. | Approve read-only preflight preparation only; keep write smoke separate. |
| 4 | Gmail company apply | Candidate inference is still advisory. Apply/write is future work. | Implement an existing-company-link-only apply path after policy and DB gate approval. | Keep preview/apply separated. Do not write generic/LOW/signature/fromName candidates. |
| 5 | SearchHistory additional DB smoke / user isolation | DB-backed flow is merged and local normal-login QA passed. Extra own-user isolation evidence remains optional. | Local/test-only smoke with exact users, rows, cleanup, and audit separation. | Lower priority unless SearchHistory behavior becomes suspect. |
| 6 | CSV apply | BLOCKED because the local/test DB previously lacked source tracking tables. | Local/test schema/table preparation or a DB with the required source tracking tables. | Do not run apply until schema/table gap is solved with explicit local/test approval. |

## Non-Approvals That Remain Forbidden

- Production/staging/shared DB write.
- Migration or schema change outside a separately approved local/test gate.
- Deploy outside the normal PR merge gate.
- Guarded PATCH execution against production.
- Worktree deletion, branch deletion, raw filesystem deletion, `--force`, or non-dry-run prune without an exact cleanup approval.
- Secret value output.

## Suggested Next Approval Choices

1. **Production read-only QA**: useful if the user can provide or perform a normal login session.
2. **Cleanup planning only**: useful to reduce workspace confusion without yet deleting anything.
3. **Person owner link read-only preflight preparation**: useful if this feature is next in product priority.

## Evidence To Collect Before Any Execution Approval

- exact target;
- command or route;
- expected changed rows/files;
- rollback or cleanup path;
- stop conditions;
- separate execution and audit roles;
- proof that the target is local/test when DB access is involved.
