# SearchHistory Current Status 2026-06-23

DB-free follow-up checklist: `docs/status/dbfree-followup-runbooks-2026-06-27.md`.

## Summary

SearchHistory is already DB-backed on current `origin/main`.

The old #55 / #55R rebuild language is historical. Current work should start from the merged implementation, not from the stale #55 branch.

## Current Implementation

| Area | Status |
|---|---|
| API | `GET /api/search-histories` and `POST /api/search-histories` exist. |
| Service | `lib/search-history.ts` scopes list/create to the authenticated user. |
| UI | `components/SearchHistoryModal.jsx` loads, saves, and applies DB-backed histories. |
| Toolbar wiring | `components/SearchToolbar.jsx` stores the current context for saving. |
| Page apply wiring | `app/page.jsx` restores keyword, filters, checked filters, focus, page size, sort key, and tab/scope. |
| Test script | `npm run test:search-history` is wired in `package.json`. |
| Schema | Uses the existing Prisma `SearchHistory` model. No schema change or migration is required. |

## Verified In This Sync

- `npm.cmd run test:search-history`: PASS.
- `npm.cmd run typecheck`: PASS after `npx.cmd prisma generate` with a process-local dummy `DATABASE_URL`.
- `npm.cmd test`: PASS.
- `npm.cmd run build`: PASS with a process-local dummy `DATABASE_URL`; no DB write was performed.
- Static review confirmed server-side user scoping, public response shaping without row `userId`, recursive filter sanitization, request limits, and DB-backed UI states.
- React chip keys were hardened so duplicate chip labels do not reuse the same key.
- No DB connection or DB write was performed.
- No migration, schema, env, package, lockfile, or deploy change was performed.

## Remaining Gates

| Gate | State | Next requirement |
|---|---|---|
| Browser QA | READY | Run with normal login only. Do not use cookie/token injection, auth proxy, or auth bypass. |
| Real DB write smoke | WAITING_APPROVAL | Requires explicit local/test DB target, fixture IDs, request body, rollback/cleanup plan, and result auditor. |
| Real own-user isolation evidence | WAITING_APPROVAL | Requires approved local/test fixture records for at least two users or an equivalent approved test setup. |
| Production/staging/shared DB write | BLOCKED | Not allowed without explicit owner approval. |

## Historical Notes

- #55 is closed and unmerged. Keep it reference-only.
- #57 merged the clean DB-backed replacement.
- #91 restored saved condition application.
- PM investigation docs from 2026-06-17 remain useful background, but their "#55R rebuild" wording is no longer the current plan.

## Next Task Cycle

READY:

1. Run SearchHistory Browser QA with normal local login when an authorized session is available.
2. Keep `test:search-history` in the normal suite during future package/script edits.

WAITING_APPROVAL:

1. If real DB smoke is needed, prepare a local/test-only smoke proposal with target DB classification, fixture IDs, exact route/action, expected writes, and rollback/cleanup.
2. If own-user isolation needs real DB evidence, prepare a fixture plan that does not use production/staging/shared data.
