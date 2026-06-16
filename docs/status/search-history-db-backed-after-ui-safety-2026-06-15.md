# Search History DB-backed After UI Safety 2026-06-15

## Purpose

#56で安全復元した `サンプル検索履歴` UIを、最新main `db0c60b6f0ae3c80bdac9b1dcced2e56794784be` 起点のclean replacement PRでDB-backed SearchHistoryへ置き換える。

旧 #55 は #56 merge後のmainと衝突する stale / superseded candidate として扱い、そのままmergeしない。

## Scope

| Area | Decision |
|---|---|
| Branch | `codex/search-history-db-backed-after-ui-safety-20260615` |
| Base | latest `origin/main`, commit `db0c60b6f0ae3c80bdac9b1dcced2e56794784be` |
| API | `GET /api/search-histories`, `POST /api/search-histories` |
| Service | `lib/search-history.ts` |
| UI | `components/SearchHistoryModal.jsx`, `components/SearchToolbar.jsx` |
| Test | `scripts/search-history.test.ts`, `npm run test:search-history` |
| package | test script only. dependency versions and Next 16 `typecheck` are preserved. |
| DB schema / migration | No schema change, no migration. Existing `SearchHistory` model is used. |
| Real DB smoke | Not executed. Requires separate approval. |

## UI Change

| Before #56 | This PR |
|---|---|
| `サンプル検索履歴` modal with mock data | `保存した検索履歴` modal that reads the logged-in user's DB-backed histories |
| Screen text said no real history save/fetch | Screen shows loading, empty, error, and save status for DB-backed history |
| mock `searchHistories` import | Removed from the modal. The modal calls `/api/search-histories`. |
| Sample condition apply | Saved item applies its keyword through the existing page wiring. Saved filter metadata is displayed and stored. |

## Safety / Privacy Rules

| Rule | Implementation |
|---|---|
| Do not show another user's histories | `listSearchHistories` always filters by `userId: user.id`. |
| Do not expose `userId` in public response | `publicSearchHistory()` returns only id, targetScope, queryText, filters, sortKey, resultCount, createdAt. |
| Cap list count | `limit` is capped to 50. |
| Cap query text | `queryText` is capped to 300 chars. |
| Cap sort key | `sortKey` is capped to 120 chars. |
| Cap filters payload | `filters` JSON payload is capped to 8KB. |
| Avoid misleading sample wording | `サンプル検索履歴` is removed from the DB-backed modal. |

## Task Ledger

| Task | Status | Test |
|---|---|---|
| Comment #55 as stale / superseded | Done | PR comment recorded. |
| Convert #55 to Draft | Done | #55 remains open, draft, not closed, not merged. |
| Create clean branch from #56-merged main | Done | Branch created from `db0c60b6f0ae3c80bdac9b1dcced2e56794784be`. |
| Add SearchHistory service guards | Done | `scripts/search-history.test.ts` mocks DB calls; no real DB write. |
| Add GET/POST API route | Done | Route delegates auth, validation, list/save. |
| Replace sample modal with DB-backed UI | Done | Modal no longer imports mock histories. |
| Preserve #56 status docs / safety ledger | Done | No #56 ledger/restore docs are deleted. |

## Verification Plan

Required gates for this PR:

| Command | Expected |
|---|---|
| `npm.cmd run test:search-history` | Mock/static tests pass; no DB write. |
| `npx.cmd prisma validate` | Schema validates with existing model. |
| `npx.cmd prisma generate` | Generated client includes `SearchHistory`. |
| `npm.cmd run typecheck` | Keeps `next typegen && tsc --noEmit`. |
| `npm.cmd test` | Includes `test:search-history`. |
| `npm.cmd run build` | Next build succeeds. |
| `npm.cmd audit --audit-level=high` | Remains green after #54 dependency update. |
| `git diff --check` | No whitespace errors. |

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
