# Progress Log - 2026-06-20

Observed at: 2026-06-20 19:16 JST for PR #82 through #86; post-merge sync observed at 2026-06-20 19:53 JST.

Source checks:

- `origin/main` merge history after fetch.
- `gh pr view` metadata for PR #82 through #86.
- `git show` merge metadata for PR #87.
- Existing PR bodies and status docs for recorded validation and out-of-scope notes.

This is historical context. Current project state belongs in `../../PROGRESS.md`.

## Latest Main at Observation

`89e38ed63ca55e1342bd5edc5ee10cd191d05920`

## Latest Main After PR #87 Sync

`cedd740b4d45ca076216b4c45887b6f809e1a2f7`

## PR #82 - Person Owner Link UI

- Final result: merged into `main` at `b0d4cc1e547a6f37f3e2571e71a2d4df3ab5c2ad`.
- Title: `Add guarded person owner link UI flow`.
- Scope: Added the guarded Person detail UI flow for linking displayed company/contact candidates to existing Company and CompanyContact records, plus dashboard payload fields and UI helper tests.
- Validation recorded in PR body: `git diff --check`, `npm.cmd run test:person-owner-link-ui`, `npm.cmd run test:person-owner-link-api`, `npm.cmd run test:person-owner-link-api-route`, `npm.cmd run test:person-owner-link-api-contract`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --audit-level=high`, `npx.cmd prisma validate`, `npx.cmd prisma generate`.
- Not executed in that PR: schema change, migration, real DB write smoke, production/staging DB operation, deploy.

## PR #83 - Project Company/Contact Link Contract

- Final result: merged into `main` at `c3082a842a404025db2390c16b0ccf6b0388758d`.
- Title: `Define project company contact link contract`.
- Scope: Defined the future `PATCH /api/projects/[id]/company-contact-role` contract, safety decisions, static contract test, and related docs/tests-only guard updates.
- Validation recorded in PR body: `git diff --check`, `npm.cmd run test:project-company-contact-link-contract`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --audit-level=high`, `npx.cmd prisma validate`, `npx.cmd prisma generate`.
- Not executed in that PR: route implementation, UI change, DB write helper, Prisma schema change, migration, real DB write smoke, deploy.

## PR #84 - Person Owner Link HTTP Smoke Preparation

- Final result: merged into `main` at `b2df444ca8c12178465c17cc474a9da7b20726c2ad`.
- Title: `Add person owner link HTTP smoke runbook`.
- Scope: Added HTTP smoke runbook coverage, target DB classification, production hard stop, staging approval/rollback requirements, one-fixture scope, secret handling rules, and read-only preflight helper.
- Validation recorded in PR body: classify-only preflight safely failed with `DATABASE_URL` unset; classify-only preflight passed with a dummy local/test URL and no DB connection; `git diff --check`; `npx.cmd prisma generate`; `npm.cmd run typecheck`; `npm.cmd test`; `npm.cmd run build`; `npm.cmd audit --audit-level=high`; `npx.cmd prisma validate`; final `npx.cmd prisma generate`.
- Not executed in that PR: real HTTP route smoke body, DB write, migration, schema change, deploy, production operation, staging operation, auth bypass, cookie injection, token display.

## PR #85 - Project Company/Contact Role Link API

- Final result: merged into `main` at `fee6581fadc5d3d89ab1906fa928a189a7c97f6e`.
- Title: `Add guarded project company contact role link API`.
- Scope: Added guarded `PATCH /api/projects/[id]/company-contact-role`, split route/handler/helper implementation, and added mock DB, pure helper, and route handler tests.
- Validation recorded in PR body: `git diff --check`, `npm.cmd run test:project-company-contact-link-api`, `npm.cmd run test:project-company-contact-link-contract`, `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd audit --audit-level=high`, `npx.cmd prisma validate`, `npx.cmd prisma generate`.
- Not executed in that PR: UI, real DB write smoke, Prisma schema change, migration, deploy, staging operation, production operation, broad `/api/projects` PATCH reuse.

## PR #86 - Link Safety Policy

- Final result: merged into `main` at `89e38ed63ca55e1342bd5edc5ee10cd191d05920`.
- Title: `Centralize company contact link safety policy`.
- Scope: Centralized the small shared safety policy pieces for Person owner links and Project company/contact role links: writer roles, blocked company statuses, production runtime checks, forbidden raw/sensitive payload keys, and shared sensitive value patterns.
- Validation recorded in PR body: `git diff --check`, `npm.cmd run test:link-safety-policy`, `npm.cmd run test:person-owner-link-api`, `npm.cmd run test:project-company-contact-link-api`, `npm.cmd run test:person-owner-link-api-contract`, `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd audit --audit-level=high`, `npx.cmd prisma validate`, `npx.cmd prisma generate`.
- Not executed in that PR: DB write, migration, schema change, deploy, real HTTP smoke.

## PR #87 - Progress Snapshot/Log Split

- Final result: merged into `main` at `cedd740b4d45ca076216b4c45887b6f809e1a2f7`.
- Title: `Split progress snapshot from dated progress log`.
- Scope: Split the live project snapshot in `PROGRESS.md` from the dated progress log in `docs/status/progress-log-2026-06-20.md`.
- Post-merge sync: `PROGRESS.md` now points at PR #87 as latest `origin/main`; this log and `docs/status/README.md` now include PR #87.
- Validation in this docs-sync worker: `git diff --check`, stale-expression `rg` checks, simple markdown link existence check, and deleted-file diff check.

## Cross-PR Notes

- Recorded validation was taken from PR bodies and existing status docs; this log does not claim those checks were re-run while creating this docs-only snapshot/log split.
- Real DB write smoke and real HTTP smoke remain deliberately unexecuted until the approved fixture/preflight/rollback process is followed.
- Browser/UI QA remains a separate follow-up where current status docs call it out.
- Final PR results above supersede older transient review-state wording that appeared in the previous `PROGRESS.md`.
