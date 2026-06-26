# Auth Login Readiness Runbook - 2026-06-26

## Purpose

Use this runbook when one or more users cannot log in, cannot set an initial password, or do not receive a password reset email.

The app uses email/password login backed by the `users` table. Users without `password_hash` cannot password-login until they complete the password reset flow.

## Safe diagnostic command

Run:

```powershell
npm.cmd run auth:login-readiness
```

The command prints only sanitized readiness checks:

- required environment variable presence
- `AUTH_SECRET` length status, not the value
- SMTP configuration presence, not the values
- aggregate user counts
- aggregate role counts

It must not print passwords, password hashes, reset tokens, cookies, full `DATABASE_URL`, individual email addresses, or individual user rows.

## Common failure patterns

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Everyone is returned to login | `AUTH_SECRET` missing, too short, or changed between requests | `auth:login-readiness` should show `AUTH_SECRET: PASS` |
| Local worktree cannot log in | `.env*` is gitignored and missing from that worktree | Configure `DATABASE_URL` and `AUTH_SECRET` for the app runtime. For this diagnostic command, pass values through the current process environment because it does not auto-load `.env*`. |
| Password reset says accepted but no email arrives | SMTP env is missing or invalid | `SMTP_HOST`, `MAIL_FROM`, and the optional `SMTP_USER`/`SMTP_PASSWORD` pair |
| Many active users cannot log in | active users have no password hash | `DB_ACTIVE_USERS_WITHOUT_PASSWORD` fail count |
| One user cannot log in | inactive user, wrong email, wrong password, or password reset not completed | Investigate only with approved user-specific support flow |

## Minimum environment needed

The app cannot authenticate correctly without:

- `DATABASE_URL`
- `AUTH_SECRET` with at least 32 characters

Password reset email additionally needs:

- `SMTP_HOST`
- `MAIL_FROM`
- `SMTP_PORT` if not using the default `587`
- `SMTP_USER` and `SMTP_PASSWORD` when the SMTP server requires auth
- `APP_URL` or `APP_BASE_URL` when reset links must use a stable public URL

Do not write actual secret values into docs, PR comments, chat, screenshots, or notifications.

## Exit-code interpretation

- `PASS`: the checked item is ready.
- `WARN`: the checked item may need operational attention, but does not by itself make the login runtime unusable. Example: missing `APP_URL` when reset links can safely use the current request origin.
- `WARN`-only output exits `0`; warnings still need follow-up before the environment is considered healthy.
- `FAIL`: the checked item blocks login readiness for all users or at least one active user. The command exits non-zero when any `FAIL` is present.

If either `APP_URL` or `APP_BASE_URL` is configured and reset links can safely use that URL, a warning for the other URL variable is acceptable.

`DB_ACTIVE_USERS_WITHOUT_PASSWORD` is a `FAIL` when greater than zero. Active users without password hashes cannot password-login and must complete password reset or an approved support reset before the system is considered fully login-ready.
DB aggregate checks only prove that auth data can be read. They do not prove that a specific user can log in, that SMTP can deliver email, or that a browser session will succeed.

## Recovery guidance

1. Run `npm.cmd run auth:login-readiness`.
2. Provide required values through the target process environment. The script does not auto-load `.env*`; do not commit or print `.env*`.
3. If SMTP is missing or invalid, configure SMTP first. Without SMTP, new users and users without a password cannot complete reset by email.
4. If active users without passwords are expected, send password reset emails after SMTP is healthy.
5. If a direct DB password reset is required, treat it as DB write support work. It needs target DB classification, exact user scope, rollback/cleanup notes, and approval.

## Stop conditions

Stop and escalate before acting if:

- the target DB is production/staging/shared and the next step is a write
- a password, token, cookie, full DB URL, or SMTP secret would need to be displayed
- a broad reset for multiple users is requested without explicit scope
- SMTP needs provider-side changes outside the repo
