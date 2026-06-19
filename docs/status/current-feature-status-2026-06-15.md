# Current Feature Status 2026-06-15

## Summary

`origin/main` 由来の clean branch で再確認した現在地。2026-06-15のUI退行確認後は、ユーザー確認済みの baseline snapshot（first-parent `main` `71b9a09b029c1e05dcaf13f0cc9bf159c93d5d6d`、PR `#49` merge直後）で画面に存在していた導線を勝手に削除せず、`implemented` / `no-write placeholder` / `design only` / `deferred` を分けて扱う。`#49` 自体をUI実装PRとみなす意味ではない。

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
| Search history | DB-backed replacement PR | #56で `サンプル検索履歴` として安全復元済み。`codex/search-history-db-backed-after-ui-safety-20260615` で `GET/POST /api/search-histories`、DB-backed modal、`test:search-history` を追加 | 実DB write smokeは未承認。Browser visual QA、full gates、merge承認が必要 |
| Proposal start/list/draft | No-write placeholder / Design/partial | baseline snapshot時点の提案開始導線を復旧。Prisma `Proposal` とmatching docsはある | 実DB writeの提案作成API/UIは別PR。現hotfixの表示方法は承認待ち |
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
| Mock-only search history UI | #56では `サンプル検索履歴` として表示し、実履歴の保存/取得なしを画面上で明示。今回のclean replacement PRでDB-backed UI/APIへ置き換える。 |
| Proposal start no-write action | `提案開始（未実装）` として表示し、クリック時にDB登録なしを明示。実DB writeは別PR。 |
| Project copy action | `/projects/{id}` ページが存在しないためURLコピーは復旧しない。案件ID/案件名コピーを維持。 |
| `tsconfig.tsbuildinfo` dirtying worktree | Removed from git and ignored. |
| Generated Prisma/old worktrees in typecheck | Excluded in `tsconfig.json`. |
| Top-level market-analysis docs | Moved under `docs/themes/market-analysis/`. |
| Recovery report location | Moved under `docs/status/`. |

## Retest Results

Executed after this docs/folder recheck and subsequent recovery tasks:

| Gate | Result | Notes |
|---|---|---|
| old docs path search | PASS | Old market-analysis docs path and old recovery report path have no live references. |
| UI restore diff review | PASS | SearchHistory UI、提案開始、コピー、Header nav/settingsはsafety stateへ変更済み。 |
| #56 local QA | PASS | Header disabled nav/settings、市場分析リンク、サンプル検索履歴modal、提案開始未実装notice、案件ID/案件名コピーを確認。 |
| `git diff --check` | PASS on #56 | CRLF warnings only. |
| `npm.cmd run typecheck` | PASS on #56 | TypeScript no-emit passed. |
| `npm.cmd test` | PASS on #56 | Gmail/import/matching tests passed. Gmail quality current accuracy remains 0.96. |
| `npm.cmd run build` | PASS on #56 | Next build and Prisma generate passed. |
| `npx.cmd prisma validate` | PASS on #56 | Schema is valid. |
| `npm.cmd audit --audit-level=high` | PASS in dependency-security branch / #54 | 0 vulnerabilities after dependency update. |
| SearchHistory DB-backed replacement gates | PENDING | `test:search-history`, Prisma validate/generate, typecheck, test, build, audit, diff check are required before merge. |

## Deferred Backlog

| Priority | Task |
|---|---|
| P0 | Browser visual QA for `/`, `/imports`, `/matches`, `/market-analysis` |
| P0 | DB-backed SearchHistory replacement PR review and full validation |
| P1 | Dependency security upgrade follow-up monitoring after Next 16 merge |
| P1 | Per-theme implemented/design-only/deferred status tables |
| P1 | Environment-specific DB write smoke with explicit DB target and rollback policy |
