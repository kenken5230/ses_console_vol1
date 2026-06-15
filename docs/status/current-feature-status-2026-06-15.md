# Current Feature Status 2026-06-15

## Summary

`origin/main` 由来の clean branch で再確認した現在地。画面に出ているのに実装がないものは今回の復旧PRで外し、DB writeやmigrationが必要なものは別PRに分離する。

## Status Matrix

| Area | Status | Evidence | Remaining |
|---|---|---|---|
| Auth login/logout/session | Implemented | `app/api/auth/*`, `components/LoginPanel.jsx` | Browser visual QA |
| Password reset | Partial | API/UIあり。SMTP未設定時の受付messageあり | SMTP運用確認 |
| Main dashboard | Implemented | `app/page.jsx`, `app/api/dashboard-data/route.ts` | Browser visual QA |
| Project create/edit | Implemented | `ProjectCreateDrawer`, `app/api/projects/route.ts` | DB write系の環境別smoke |
| Person create/edit | Implemented | `PersonCreateDrawer`, `app/api/persons/route.ts` | DB write系の環境別smoke |
| Unclassified mail review/move | Implemented | `UnclassifiedMail*`, `app/api/mail-notifications/[id]/extract/route.ts`, `app/api/entities/move-to-unclassified/route.ts` | DB write系の環境別smoke |
| Keyword include/exclude | Implemented | 案件/要員/未分類メールに `filterValues.exclude` 適用 | Browser visual QA |
| Search history | Deferred | Prisma modelはあるが API/UI は未実装 | DB-backed API/UI/test を別PR |
| Proposal start/list/draft | Design/partial | Prisma `Proposal` とmatching docsはある | UIから未実装「提案開始」は撤去済み |
| Email draft/send | Design only | SES sales console BK, matching proposal draft docs | UI/APIは未実装のまま出さない |
| Gmail sync/classify/extract | Implemented/ops-sensitive | `scripts/gmail-*`, admin sync APIs, Gmail quality tests | DB/credential環境別のread-only/dry-run確認 |
| CSV/import/source tracking | Implemented/partial | `/imports`, import/source-record APIs, source tracking tests | supervised applyの運用確認 |
| Matching dry-run | Implemented | `/matches`, `GET /api/matches/dry-run`, tests | Browser visual QA |
| Saved match suggestions | Implemented with guards | read APIs, guarded save/update tests | production writeは無効前提 |
| Market analysis | Implemented read-only | `/market-analysis`, `GET /api/market-analysis`, theme docs | Browser visual QA |
| Release/network docs | Docs | `docs/release/*` | 実装状態との定期同期 |
| Docs operations | Implemented | `PROGRESS.md`, `docs/shared/*`, `docs/status/*` | theme別statusの継続更新 |

## Suspicious Items Rechecked

| Item | Result |
|---|---|
| Mock-only search history UI | Removed from app/components/data. Residual search has no hits. |
| Proposal start fake action | Removed from table/detail. Residual search has no hits. |
| Nonexistent `/projects/{id}` copy | Replaced with project ID/title copy. |
| `tsconfig.tsbuildinfo` dirtying worktree | Removed from git and ignored. |
| Generated Prisma/old worktrees in typecheck | Excluded in `tsconfig.json`. |
| Top-level market-analysis docs | Moved under `docs/themes/market-analysis/`. |
| Recovery report location | Moved under `docs/status/`. |

## Retest Results

Executed after this docs/folder recheck:

| Gate | Result | Notes |
|---|---|---|
| old docs path search | PASS | Old market-analysis docs path and old recovery report path have no live references. |
| removed UI residual search | PASS | SearchHistory mock UI, fake proposal start, fake project URL copy have no app/component/data hits. |
| `git diff --check` | PASS | CRLF warnings only. |
| `npm.cmd run typecheck` | PASS | TypeScript no-emit passed. |
| `npm.cmd test` | PASS | Gmail/import/matching tests passed. Gmail quality current accuracy remains 0.96. |
| `npm.cmd run build` | PASS | Next build and Prisma generate passed. |
| `npx.cmd prisma validate` | PASS | Schema is valid. |
| `npm.cmd audit --audit-level=high` | FAIL | 8 vulnerabilities: 5 moderate, 2 high, 1 critical. Next upgrade is breaking and must be separate. |

## Deferred Backlog

| Priority | Task |
|---|---|
| P0 | Browser visual QA for `/`, `/imports`, `/matches`, `/market-analysis` |
| P0 | DB-backed SearchHistory API/UI/test in a separate PR |
| P1 | Dependency security upgrade for Next/security audit |
| P1 | Per-theme implemented/design-only/deferred status tables |
| P1 | Environment-specific DB write smoke with explicit DB target and rollback policy |
