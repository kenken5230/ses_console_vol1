# Approval Waiting Packet (2026-06-24)

This packet lists the remaining owner-gated work after the #137 root docs
navigation merge.

It is intentionally not an execution script. Use it to decide what can be
approved next.

## Current GitHub State

- Open PRs: none at the time of this packet refresh.
- Open issues: none at the time of this packet refresh.
- Snapshot source commit: `e6d1d6b9033833d8faab277cc7deb5110e270573`
  (`Add root docs navigation README (#137)`).
- Main Vercel status for #137: success.

## Approval Items

| Priority | Area | Current state | What approval would allow | Current recommendation |
| --- | --- | --- | --- | --- |
| 1 | Production login-after read-only QA | Production reaches the login screen, but post-login read-only screens are not verified. | Normal-login read-only checks only. No auth bypass, cookie injection, token injection, DB write, or guarded PATCH. | Approve when a normal authorized login session is available. |
| 2 | Person owner link HTTP smoke | Prior read-only preflight was blocked by missing runtime env/helper/fixture conditions. #134 added a preflight evidence packet. | Prepare a fresh local/test preflight evidence bundle, then later request write-smoke approval separately if safe. | Approve read-only preflight preparation only; keep write smoke separate. |
| 3 | Gmail company apply | Candidate inference is still advisory. Apply/write is future work. #133 added an owner decision packet. | Implement an existing-company-link-only apply path after policy and DB gate approval. | Keep preview/apply separated. Do not write generic/LOW/signature/fromName/body-label candidates. |
| 4 | SearchHistory additional DB smoke / user isolation | DB-backed flow is merged and local normal-login QA passed. #135 added an optional local/test DB smoke packet. | Local/test-only smoke with exact users, rows, cleanup, and audit separation. | Lower priority unless SearchHistory behavior becomes suspect. |
| 5 | Worktree stale metadata cleanup | `git worktree prune --dry-run --verbose` reports stale metadata. One OneDrive reparse-point checkout previously returned `Permission denied`. #131 added a v2 planning packet. | Only a refreshed cleanup approval packet can be prepared now. Actual prune/remove/delete/branch deletion remains a separate future approval. | Do not treat this packet as approval to prune, remove, raw-delete, or branch-delete anything. |
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
2. **Person owner link read-only preflight preparation**: useful if this feature is next in product priority and local/test fixture conditions can be confirmed.
3. **Gmail company apply implementation planning**: useful if Gmail company completion is the next product priority, but DB write and dashboard changes remain separate gates.
4. **Cleanup planning only**: useful to reduce workspace confusion without yet deleting anything; actual prune/remove/delete remains a later approval.

## Evidence To Collect Before Any Execution Approval

- exact target;
- command or route;
- expected changed rows/files;
- rollback or cleanup path;
- stop conditions;
- separate execution and audit roles;
- proof that the target is local/test when DB access is involved.
