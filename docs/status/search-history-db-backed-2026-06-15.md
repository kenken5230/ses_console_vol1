# SearchHistory DB-backed Implementation 2026-06-15

## Purpose

Replace the #56 safety-state `サンプル検索履歴` UI with a DB-backed SearchHistory implementation on top of latest `main` commit `db0c60b6f0ae3c80bdac9b1dcced2e56794784be`.

The stale #55 branch/PR is reference-only for this work. This branch does not merge, close, ready, or otherwise operate on #55.

## Scope

| Area | Decision |
|---|---|
| Branch | `codex/search-history-db-backed-after-ui-safety-20260615` |
| Base | latest `origin/main`, commit `db0c60b6f0ae3c80bdac9b1dcced2e56794784be` |
| API | `GET /api/search-histories`, `POST /api/search-histories` |
| Service | `lib/search-history.ts` |
| UI | `components/SearchHistoryModal.jsx`, `components/SearchToolbar.jsx` |
| Test | `scripts/search-history.test.ts`, `npm run test:search-history` |
| package | Test script only. Next 16 dependencies and `typecheck = next typegen && tsc --noEmit` are preserved. |
| DB schema / migration | No DB schema change, no migration. Existing `SearchHistory` model is used. |
| Real DB smoke | Not executed. Requires separate approval. |

## UI Change

| Before #56 | This PR |
|---|---|
| `サンプル検索履歴` modal with mock data | `保存した検索履歴` modal that reads the logged-in user's DB-backed histories |
| Screen text said no real history save/fetch | Screen shows loading, empty, error, unauthenticated, and save status for DB-backed history |
| mock `searchHistories` data | Removed from the live app data export and modal import path |
| Sample condition apply | Saved item applies its keyword through the current page wiring and stores filter metadata for review/follow-up |

## Safety / Privacy Rules

| Rule | Implementation |
|---|---|
| Do not show another user's histories | `listSearchHistories` always filters by `userId: user.id`. |
| Ignore spoofed client `userId` on create | `saveSearchHistory` always writes `userId: user.id` from the authenticated session. |
| Do not expose row `userId` in public response | `publicSearchHistory()` returns only id, targetScope, queryText, filters, sortKey, resultCount, createdAt. |
| Strip user-identifying keys from `filters` | `filters` are recursively sanitized before DB create and again while shaping public responses. Dangerous keys include `userId`, `user_id`, `user`, `ownerId`, `owner_id`, `createdBy`, and `created_by`. |
| Cap list count | `limit` is capped to 50. |
| Cap query text | `queryText` is capped to 300 chars. |
| Cap sort key | `sortKey` is capped to 120 chars. |
| Cap filters payload | Sanitized `filters` JSON payload is capped to 8KB. |
| Avoid misleading sample data | `サンプル検索履歴` and mock `searchHistories` are removed from the DB-backed UI path. |

## Verification Plan

Required gates for this PR:

| Command | Expected |
|---|---|
| `npm.cmd run test:search-history` | Mock/static tests pass; no real DB write. |
| `npx.cmd prisma validate` | Schema validates with existing model. |
| `npx.cmd prisma generate` | Generated client includes `SearchHistory`. |
| `npm.cmd run typecheck` | Keeps `next typegen && tsc --noEmit`. |
| `npm.cmd test` | Includes `test:search-history`. |
| `npm.cmd run build` | Next build succeeds. |
| `npm.cmd audit --audit-level=high` | Remains green after #54 dependency update. |
| `git diff --check` | No whitespace errors. |

## Current Validation Note

This Codex session cannot execute local shell/git/npm commands because command execution is blocked by the Windows sandbox backend. The PR remains Draft. No real DB write smoke was executed.

Not run in this session:

| Command / Operation | Reason |
|---|---|
| `npm.cmd run test:search-history` | Local shell/npm execution blocked by Windows sandbox backend. |
| `npx.cmd prisma validate` | Local shell/npm execution blocked by Windows sandbox backend. |
| `npx.cmd prisma generate` | Local shell/npm execution blocked by Windows sandbox backend. |
| `npm.cmd run typecheck` | Local shell/npm execution blocked by Windows sandbox backend. |
| `npm.cmd test` | Local shell/npm execution blocked by Windows sandbox backend. |
| `npm.cmd run build` | Local shell/npm execution blocked by Windows sandbox backend. |
| `git diff --check` | Local shell/git execution blocked by Windows sandbox backend. |
| Real DB write smoke | Not approved for this phase and intentionally not executed. |
| Manual Vercel Preview / production deploy | Vercel Preview is an automatic PR check only; no manual preview operation, production deploy, or deploy operation was executed. |

## Merge Coordination

#60 may also edit `package.json` around test scripts. During follow-up reconciliation, integrate `test:search-history` with #60's `test:market-analysis` flow so the final package scripts run both suites consistently.

## Deferred / Approval Required

| Item | Reason |
|---|---|
| Real DB write smoke | `POST /api/search-histories` writes to DB; not approved in this phase. |
| Migration / schema change | Not needed and not approved. |
| Production / staging DB operation | Explicitly prohibited. |
| Deploy operation | Explicitly prohibited. |
| Merge old #55 | Superseded by this clean replacement PR. |

## Rollback

1. Revert this replacement PR.
2. The #56 safety-state modal can be restored by reverting `components/SearchHistoryModal.jsx` and `components/SearchToolbar.jsx` to #56 main if needed.
3. Remove `app/api/search-histories/route.ts`, `lib/search-history.ts`, `scripts/search-history.test.ts`, and `test:search-history` script.
4. Re-run `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build`.
