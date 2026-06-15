# SearchHistory DB-backed Implementation 2026-06-15

## Scope

`SearchHistory` Prisma model exists, but mock-only UI was removed in PR #53. This task restores search history as a real DB-backed feature.

Base branch:

- `origin/codex/recovery-main-alignment-20260614`

Working branch:

- `codex/search-history-db-backed-20260615`

## Requirements

- Use `search_histories`, not mock data.
- Require authenticated user.
- Allow ADMIN, MANAGER, SALES, VIEWER to read/write their own search histories.
- Do not expose other users' histories.
- Save only compact search state: target scope, query text, filters, sort key, result count.
- Cap list size and request payload size.
- UI must only show the history button after API/UI are implemented.
- Tests must verify DB write boundaries with mocks before any real DB smoke.

## Task Plan

| Task | Action | Task test | Status |
|---|---|---|---|
| SH-001 | Add docs and split implementation tasks. | This document exists. | Done |
| SH-002 | Add `lib/search-history.ts` with validation, list/save helpers, and safe output shape. | `npm.cmd run test:search-history` with mocked DB. | Done |
| SH-003 | Add `GET/POST /api/search-histories`. | Route smoke in `scripts/search-history.test.ts`; `npm.cmd run typecheck`; `npm.cmd run build`. | Done |
| SH-004 | Add `SearchHistoryModal` and toolbar/app wiring. | UI wiring smoke in `scripts/search-history.test.ts`; `npm.cmd run build`. | Done |
| SH-005 | Update stale docs that still mention removed mock SearchHistory UI. | Status docs updated; residual mock-only `searchHistories` search has no live app/data hit. | Done |
| SH-006 | Group validation. | Prisma validate/generate, typecheck, test, build. | Done |

## Implementation Summary

- Added `lib/search-history.ts` to validate request payloads, cap list/payload sizes, and shape public responses without `userId`.
- Added `GET /api/search-histories` and `POST /api/search-histories`.
- Added `components/SearchHistoryModal.jsx`.
- Added toolbar/app wiring so the visible SearchHistory button now calls the DB-backed API instead of mock data.
- Added `scripts/search-history.test.ts` and wired it into `npm.cmd test`.

## Validation Results

| Gate | Result | Notes |
|---|---|---|
| `npm.cmd run test:search-history` | PASS | mocked DB verifies validation, own-user `where`, spoofed `userId` rejection by construction, route/UI wiring |
| `npx.cmd prisma generate` | PASS | generated client under `app/generated/prisma` |
| `npx.cmd prisma validate` | PASS | schema valid |
| `npm.cmd run typecheck` | PASS | TypeScript no-emit passed |
| `npm.cmd test` | PASS | existing test group plus SearchHistory passed |
| `npm.cmd run build` | PASS | Next build includes `/api/search-histories` |
| Browser smoke `http://127.0.0.1:3015/` | PASS | app title/login state rendered; no browser console errors observed |
| unauthenticated HTTP `GET /api/search-histories?targetScope=PROJECTS` | PASS | `401 {"message":"Unauthorized"}` |

## Safety

- No migration; model already exists.
- No production env changes.
- Tests use mocked DB. Real DB write smoke requires explicit DB target/rollback approval and is not part of this PR.
