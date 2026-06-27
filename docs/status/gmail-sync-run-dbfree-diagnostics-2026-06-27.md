# Gmail Sync-Run DB-Free Diagnostics 2026-06-27

## Context

Production logs previously showed recurring `POST /api/admin/gmail/sync-run` 500 responses.

This packet does not connect to production, read secrets, trigger Gmail sync, write to DB, or change Vercel configuration.

## Scope

- Add DB-free safety coverage around `POST /api/admin/gmail/sync-run`.
- Strengthen operational error sanitization so DB URLs are redacted.
- Keep real production diagnosis behind the existing production env/config and normal-login gates.

## Changed Safety Contract

| Area | Result |
|---|---|
| Invalid bearer handling | Route keeps explicit forbidden response before generic failure handling. |
| Auth/RBAC handling | Route keeps `authErrorResponse(error)` path. |
| Operational error response | Route returns only `sanitized.message`; stack is not returned in JSON. |
| DB URL leakage | `sanitizeOperationalError` now redacts `postgres`, `postgresql`, `mysql`, and `sqlserver` URLs. |
| Token/secret leakage | Existing bearer, OAuth token, Google client secret, and configured secret redaction remains covered. |

## Verification

| Command | Result |
|---|---|
| `npx.cmd tsx tests/gmail-sync-run-safety.test.ts` | PASS |
| `powershell -ExecutionPolicy Bypass -File scripts/safety-gate.ps1 -SessionStartRef <sha>` | PASS |

## Not Executed

| Item | Reason |
|---|---|
| Production `POST /api/admin/gmail/sync-run` | Would be production operation; not part of this DB-free packet. |
| Gmail sync/classify/extract execution | Can read/write operational data; remains behind explicit gate. |
| Vercel env/config change or redeploy | User approval required. |
| Production/staging/shared DB read/write | Not authorized here. |

## Remaining Unknowns

- Whether production has all required env values.
- Whether production DB has current `mail_sync_runs` / `job_locks` schema.
- Whether Gmail OAuth credentials and quota are valid.
- Whether the recurring caller is cron, manual UI, or another server-side caller.

## Next Safe Step

Use the production login/env recovery gate to confirm production env readiness without exposing secret values.

If env/config is fixed later, run production read-only QA first. Do not run production sync/write smoke unless explicitly approved as a separate production operation.
