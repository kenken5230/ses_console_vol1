# Operations Handoff Runbook 2026-06-24

## Purpose

This runbook helps the project owner and the next AI operator confirm operational settings for Cloudflare, Vercel, Neon, and Gmail OAuth without exposing secret values.

It is docs-only. Do not paste, reveal, summarize, or copy secret values, DB URLs, OAuth client secrets, tokens, cookies, passwords, or private keys into this document, PR comments, logs, screenshots, or chat.

## Non-Goals and Prohibited Actions in This PR

The following actions are not performed by this PR and must remain out of scope unless the user gives separate explicit approval:

| Area | Not performed in this PR |
| --- | --- |
| Database | DB write, shared/staging/production DB connection, migration, migrate reset, seed, branch deletion |
| Deploy | Vercel deploy, production promotion, redeploy, rollback execution |
| External API | Cloudflare API write, Vercel API write, Neon API write, Gmail/Google API connection |
| GitHub | Ready for review, merge, close, force push |
| Local workspace | Worktree deletion, destructive cleanup, `git reset --hard`, `git clean` |

Any write/deploy operation against production, staging, or shared environments requires a separate approval gate that names the target environment, action, rollback plan, and responsible owner.

## Owner Confirmation

Before operational work starts, confirm the current accountable owner and access path.

| Check | Where to confirm | Expected evidence | Gate |
| --- | --- | --- | --- |
| Product owner | Project handoff thread or PM status docs | Owner name or role, not credentials | Required before deploy/write |
| GitHub repository owner | GitHub repository settings and PR permissions | Repository owner/org and collaborator role | Required before merge/close |
| Cloudflare account owner | Cloudflare dashboard account/team members | Account/team name and user role | Required before DNS changes |
| Vercel project owner | Vercel dashboard project/team settings | Team/project name and user role | Required before env/deploy changes |
| Neon project owner | Neon console project/member settings | Project name and user role | Required before DB branch/write |
| Google OAuth owner | Google Cloud Console project IAM and OAuth consent screen | Project ID/name and user role | Required before OAuth changes |

If ownership is unclear, stop and ask the user. Do not infer ownership from local files, environment variables, browser cookies, or prior terminal state.

## Environment Gate Matrix

Use this gate before any action that can affect users, shared data, billing, or authentication.

| Environment | Read-only confirmation | Write/deploy approval required | Examples requiring approval |
| --- | --- | --- | --- |
| Local/dev | Allowed when no secrets are read | Yes for destructive local cleanup | deleting worktrees, resetting branches |
| Staging/shared | Confirm target by dashboard labels only | Yes | DB write, migration, env var update, deploy |
| Production | Confirm target by dashboard labels only | Yes, with rollback owner | DNS change, OAuth redirect change, prod deploy |

For secret-bearing settings, confirm only whether the setting exists and which dashboard field owns it. Do not reveal the stored value.

## Cloudflare DNS and Domain Handoff

Confirm domain routing from the Cloudflare dashboard. Do not use API tokens or export zone files unless separately approved.

| Item | Dashboard location | Confirm without exposing values |
| --- | --- | --- |
| Account and zone | Cloudflare Dashboard -> account -> Websites -> target zone | Account name, zone name, plan, active status |
| Nameservers | Target zone -> Overview | Whether registrar nameservers match Cloudflare-assigned nameservers |
| DNS records | Target zone -> DNS -> Records | Record names, types, proxied status, TTL policy, target service category only |
| Domain redirects | Rules -> Redirect Rules / Page Rules | Rule names, enabled state, source/target pattern class |
| SSL/TLS mode | SSL/TLS -> Overview | Mode name, certificate status, edge certificate state |
| WAF and bot rules | Security -> WAF / Bots | Enabled rule groups and custom rule names |

Pre-change checklist:

1. Confirm the requested domain and environment in writing.
2. Confirm current DNS records by name/type only; do not paste secret-like targets when they contain tokens.
3. Identify expected rollback: restore prior record state, disable new rule, or revert proxied status.
4. Get separate approval before changing DNS, SSL/TLS, redirect rules, WAF, or registrar settings.

## Vercel Environment and Deploy Handoff

Use the Vercel dashboard for read-only confirmation. Do not trigger deploys from this PR.

| Item | Dashboard location | Confirm without exposing values |
| --- | --- | --- |
| Project and team | Vercel Dashboard -> team -> project -> Settings -> General | Project name, framework, linked Git repository, production branch |
| Environment variables | Settings -> Environment Variables | Variable names, target environments, presence/absence, last-updated metadata if visible |
| Domains | Settings -> Domains | Domain names, assigned environment, verification status |
| Git integration | Settings -> Git | Repository, production branch, auto-deploy behavior |
| Deployment status | Project -> Deployments | Latest deployment state, commit SHA, environment, creator |
| Build settings | Settings -> Build and Development Settings | Build command name, output directory, install command policy |

Pre-staging/production checklist:

1. Confirm target environment: Preview, Staging, or Production.
2. Confirm required env var names exist for that environment; do not read or paste values.
3. Confirm the deployment commit SHA and branch.
4. Confirm rollback target deployment before production promotion.
5. Obtain separate approval before env var updates, redeploys, production promotion, or rollback execution.

## Neon Database and Branch Handoff

Treat Neon projects and branches as shared data infrastructure. Do not connect to DBs or run migrations from this PR.

| Item | Console location | Confirm without exposing values |
| --- | --- | --- |
| Project | Neon Console -> Projects -> target project | Project name, region, plan/billing owner if visible |
| Branches | Project -> Branches | Branch names, primary/default branch, parent branch, created timestamp |
| Compute | Project -> Branch -> Compute | Compute name, status, size class, autosuspend policy |
| Roles | Project -> Roles | Role names only; do not reveal passwords |
| Connection strings | Project -> Connection Details | Presence of required connection targets only; do not copy URLs |
| Backups/restore | Project -> Restore / Branch history if available | Available restore points or branch history labels |

Pre-change checklist:

1. Confirm whether work targets local, staging/shared, or production data.
2. Confirm branch name and parent branch by console labels only.
3. Confirm migration plan, dry-run evidence, and rollback path.
4. Obtain separate approval before DB write, migration, schema change, branch reset, branch deletion, or production connection.

## Gmail OAuth, Redirect URI, and Scope Handoff

Use Google Cloud Console and Google OAuth consent settings for read-only confirmation. Do not retrieve client secrets or tokens.

| Item | Console location | Confirm without exposing values |
| --- | --- | --- |
| Google Cloud project | Google Cloud Console -> project selector | Project name/ID and billing/account owner if visible |
| OAuth consent screen | APIs & Services -> OAuth consent screen | Publishing status, app name, support email, test users count |
| OAuth client | APIs & Services -> Credentials -> OAuth 2.0 Client IDs | Client name, application type, creation/update metadata |
| Redirect URIs | OAuth client details -> Authorized redirect URIs | URI host/path and environment mapping; do not paste secrets |
| JavaScript origins | OAuth client details -> Authorized JavaScript origins | Origin host and environment mapping |
| Scopes | OAuth consent screen -> Data Access / Scopes | Scope names and sensitivity class |
| API enablement | APIs & Services -> Enabled APIs | Gmail API enabled state |

Pre-change checklist:

1. Confirm target environment and expected callback route.
2. Confirm redirect URI and JavaScript origin match the deployed domain for that environment.
3. Confirm scopes are the minimum required for the feature.
4. Confirm test users or publishing status before staging/production OAuth tests.
5. Obtain separate approval before changing OAuth clients, redirect URIs, consent screen settings, scopes, or publishing state.

## Staging and Production Readiness Checklist

Run this checklist before any staging or production operation. It is intentionally read-only.

| Gate | Required confirmation |
| --- | --- |
| Scope | Exact action, target environment, and expected outcome are written down |
| Owner | Accountable human owner is named |
| Access | Operator role is sufficient and does not require sharing secrets |
| Current state | Dashboard state is recorded by names/statuses only |
| Rollback | Revert path and rollback owner are identified |
| Evidence | Screenshots/logs avoid secrets and private tokens |
| Approval | Separate approval exists for write/deploy/shared environment operation |

Stop if any row is unknown.

## Rollback and Revert Plan

Rollback planning must happen before changes, not after an incident starts.

| Surface | Preferred rollback evidence | Revert option |
| --- | --- | --- |
| Git/docs | PR diff and commit SHA | Revert commit or close draft PR |
| Vercel deploy | Prior successful deployment ID and commit SHA | Promote previous deployment or revert Git commit, with approval |
| Vercel env | List of changed variable names and environments | Restore previous value from owner-managed secret store, with approval |
| Cloudflare DNS/rules | Prior record/rule names and enabled states | Restore prior record/rule state, with approval |
| Neon DB | Migration ID, branch name, backup/restore point label | Revert migration or restore/branch strategy, with approval |
| Gmail OAuth | Prior client config names and redirect/scope list | Restore prior redirect/scope/consent settings, with approval |

Never include secret values in rollback notes. If a secret value must be restored, the owner should re-enter it through the provider dashboard or approved secret manager.

## Operator Notes for Next AI

1. Start from latest `origin/main` in a clean worktree; do not use the dirty original active workspace as a base.
2. Do not deploy manually, close unrelated PRs, delete worktrees, delete branches, run DB writes, run migrations, or connect to shared/staging/production services without a separate gate.
3. If asked to verify dashboard settings, report only names, locations, statuses, and existence. Never report secret values.
4. For production read-only QA, the user must log in with an authorized VIEWER-role account. AI must not use auth bypass, cookie injection, token injection, screenshots containing sensitive data, or network dumps/cookie values as artifacts.
5. For worktree cleanup, keep stale metadata prune, registered worktree removal, OneDrive/reparse-point cleanup, and branch deletion as separate gates.
6. For local/test DB work, collect target classification, exact rows/tables/routes, rollback/cleanup, stop conditions, and separate executor/auditor roles before any write.

## 2026-06-26 Operational Update

- Batch A stale worktree metadata prune was approved and attempted after a
  dry-run confirmed only `gitdir file does not exist` entries. The plain prune
  failed with `Permission denied` for every stale metadata path. No raw
  deletion, force, worktree remove, or branch deletion was performed.
- Person owner link static contract testing passed through both
  `npm.cmd run test:person-owner-link-api` and
  `npx.cmd tsx scripts/person-owner-link-api.test.ts` after
  `npm.cmd ci --ignore-scripts`.
- Gmail company apply implementation and DB write remain on HOLD; only design
  convergence documentation was approved.

## Related Local Docs

- [Docs index](../README.md)
- [Shared operations docs](../shared/operations/README.md)
- [Status docs](../status/README.md)
