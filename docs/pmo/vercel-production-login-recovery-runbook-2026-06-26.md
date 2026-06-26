# Vercel Production Login Recovery Runbook (2026-06-26)

This runbook is for recovering normal production login and password reset on
`https://ses-console-vol1.vercel.app/`.

It is intentionally secret-safe. Do not paste, print, commit, screenshot, or
summarize secret values. Evidence should use only `set` / `not set`,
`length OK` / `length NG`, `pair complete` / `pair incomplete`, and sanitized
PASS/WARN/FAIL output.

## Current Situation

- #148 merged secret-safe auth readiness diagnostics.
- #149 merged DB-free SearchHistory UI context test wiring.
- #150 refreshed the approval gates after #148/#149.
- Production password reset still failed for the user after the #148 deploy.
- Vercel production env/config recovery remains owner-gated.
- No production DB write, direct password reset, migration, schema change, auth
  bypass, cookie injection, or token injection is approved by this runbook.

## Required Production Env Names

Minimum for login runtime:

- `DATABASE_URL`
- `AUTH_SECRET`

Minimum for password reset email:

- `SMTP_HOST`
- `MAIL_FROM`

Conditionally required:

- `SMTP_PORT`
- `SMTP_USER` and `SMTP_PASSWORD` as a pair when SMTP auth is required
- `APP_URL` or `APP_BASE_URL` for stable reset links

## Recommended Owner Flow

1. Open the Vercel dashboard for project `ses-console-vol1`.
2. Choose `Production` environment variables.
3. Confirm each required name is present.
4. Confirm `AUTH_SECRET` is at least 32 characters, without revealing the value.
5. Confirm SMTP auth is either fully absent or fully paired:
   `SMTP_USER` and `SMTP_PASSWORD` must be both set or both intentionally not
   needed.
6. Confirm `APP_URL` or `APP_BASE_URL` points to the production URL.
7. Save env changes.
8. Redeploy the latest production commit so runtime picks up env changes.
9. Run or request secret-safe readiness evidence after redeploy.
10. Try the normal password reset flow and normal login flow.

## Sanitized Evidence Template

Use this template for reporting back:

```text
Target: Vercel project ses-console-vol1 / Production
Latest commit redeployed: <short sha>
DATABASE_URL: set / not set
AUTH_SECRET: set, length OK / set, length NG / not set
SMTP_HOST: set / not set
MAIL_FROM: set / not set
SMTP auth pair: complete / incomplete / not used
APP_URL or APP_BASE_URL: set / not set
Redeploy: success / failed
auth:login-readiness sanitized result: PASS / WARN / FAIL
Password reset request: accepted / failed
Normal login: success / failed
```

Do not include:

- DB URLs;
- password hashes;
- SMTP passwords;
- reset tokens;
- cookies;
- session tokens;
- raw user lists;
- screenshots or network dumps containing personal data.

## Optional CLI Checks

Use dashboard checks when possible. If CLI is used, print only variable names or
sanitized status. Do not pull production env values into local files unless a
separate secret-handling approval exists.

Allowed as read-only:

```powershell
npx.cmd --yes vercel project ls
npx.cmd --yes vercel env ls production
npx.cmd --yes vercel logs https://ses-console-vol1.vercel.app --since 2h
```

Not allowed by this runbook:

```powershell
vercel env pull
```

`vercel env pull` writes secret values to a local file and needs a separate
approval plus cleanup plan.

## Stop Conditions

Stop and escalate if any of these happen:

- the target project is not `ses-console-vol1`;
- the target environment is not `Production`;
- any command would print secret values;
- the owner cannot confirm `DATABASE_URL` or `AUTH_SECRET`;
- SMTP settings are incomplete but password reset is required now;
- redeploy fails;
- readiness returns FAIL after env/config correction;
- fixing the issue would require production DB write, password hash update,
  migration, schema change, or auth bypass.

## Follow-Up Gates

After production login works:

1. Production read-only QA may proceed with normal authorized login only.
2. Password reset flow can be checked without storing reset links or tokens.
3. Any direct user password recovery, production DB write, or data repair needs
   a separate approval packet with exact target, rollback, and audit evidence.
