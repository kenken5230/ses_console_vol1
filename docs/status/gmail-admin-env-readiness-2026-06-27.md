# Gmail Admin Env Readiness (2026-06-27)

Observed at: 2026-06-27 JST.

## Purpose

Production login/password reset remains owner-gated because Vercel production
env/config changes and redeploy require explicit approval. Separately, production
logs previously showed recurring `POST /api/admin/gmail/sync-run` 500 responses.

This packet adds a DB-free, secret-safe Gmail admin env readiness helper so the
next operator can check whether the server-trigger and Gmail OAuth env set is
present and syntactically sane without printing secret values.

## Added

| File | Purpose |
| --- | --- |
| `scripts/gmail-admin-env-readiness.ts` | Checks env presence/format for Gmail admin sync without loading `.env`, connecting to DB, calling Gmail, or printing values. |
| `scripts/gmail-admin-env-readiness.test.ts` | Verifies required/optional status, length/date/integer guards, and that secret/email/query values are not printed. |

## Checked Env Names

| Group | Names |
| --- | --- |
| Server trigger | `CRON_SECRET`, optional `ADMIN_SECRET` |
| Gmail OAuth | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |
| Optional Gmail config | `GMAIL_REDIRECT_URI`, `GMAIL_AUTH_USER`, `GMAIL_USER_ID`, `GMAIL_QUERY` |
| Date/limit controls | `GMAIL_SYNC_FROM`, `GMAIL_SYNC_TO`, `GMAIL_INITIAL_SYNC_LIMIT`, `GMAIL_SYNC_PAGE_SIZE`, `GMAIL_SYNC_MAX_RESULTS`, `GMAIL_SYNC_LOCK_TTL_SECONDS`, `GMAIL_CLASSIFY_LIMIT`, `GMAIL_EXTRACT_LIMIT` |

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd ci --ignore-scripts` | PASS; `found 0 vulnerabilities` |
| `npx.cmd tsx scripts/gmail-admin-env-readiness.test.ts` | PASS |
| `npx.cmd tsx scripts/gmail-admin-env-readiness.ts` without required env | PASS as safe stop; exits non-zero and prints only configured/missing/format status |

## Safety Notes

- No `.env` file is loaded by the new script.
- No DB connection or DB write.
- No Gmail API call or Gmail sync/classify/extract execution.
- No production/staging/shared operation.
- No secret values, tokens, DB URLs, email addresses, or query values are printed.
- No Vercel env/config change or redeploy.

## Remaining Gate

Running this helper against real production env is still an operational check.
It must be done in an approved environment where secret values are not copied
into chat, docs, logs, screenshots, or transcripts.
