# Auth Login Readiness - 2026-06-26

## Summary

Added a DB-read-only, secret-safe login readiness diagnostic for common login failures.

This treats the current login issue as a shared failure mode, not only a single-user password reset.

## Current findings

In the clean recovery worktree, no `.env*` file is present and the process has no `DATABASE_URL` or `AUTH_SECRET`.

That explains local login failure in this worktree. It does not by itself prove the production/shared environment has the same issue.

The new diagnostic command is intended to be run in the affected environment so the team can confirm:

- whether `DATABASE_URL` is present
- whether `AUTH_SECRET` is present and long enough
- whether SMTP reset-mail settings are present
- whether active users exist
- whether active users have password hashes

Any `FAIL` line exits non-zero. Active users without password hashes are treated as `FAIL` because those users cannot password-login.
`WARN`-only output exits zero, but still needs operational follow-up.
DB aggregate checks only prove that auth data can be read; they do not guarantee a specific user can log in, SMTP can deliver email, or browser login will succeed.
The diagnostic reads `process.env` only and does not auto-load `.env*`.

## Changed files

- `package.json`
- `scripts/auth-login-readiness.ts`
- `scripts/auth-login-readiness.test.ts`
- `docs/shared/operations/auth-login-readiness-runbook-2026-06-26.md`
- `docs/status/auth-login-readiness-2026-06-26.md`

## Verification

- `npm.cmd run test:auth-login-readiness` passed
- `npm.cmd run typecheck` passed after Prisma client generation
- `npm.cmd run build` passed with process-local dummy `DATABASE_URL` and `AUTH_SECRET`
- `git diff --check` passed

## Not done

- No DB write
- No migration or schema change
- No production/staging/shared DB operation
- No secret values read or printed
- No user-specific password reset

## Remaining decision

To make affected real users log in, the diagnostic must be run in the affected runtime or with the affected DB/env available.

If it reports missing SMTP or active users without password hashes, the next step is an approved operational recovery:

- configure SMTP/runtime env, or
- perform scoped password reset support with explicit DB target and user scope.
