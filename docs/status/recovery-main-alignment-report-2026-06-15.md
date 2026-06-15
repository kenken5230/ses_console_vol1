# Recovery/Main Alignment Report 2026-06-15

## 目的

dirty tree へ直接 merge せず、`origin/main` から作成した clean worktree で、現状の機能・docs・検証基盤・未実装導線を整理する。

参照方針:

- 現行 dirty tree は保全してから触る。
- `origin/main` 由来の clean branch/worktree で復旧する。
- DB write、migration、worktree 削除、branch 大移動は保全方針なしに実行しない。
- UI に出すなら動かす。動かせないなら出さない。

## 作業場所

| 項目 | 内容 |
|---|---|
| 元 worktree | `C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1` |
| clean worktree | `C:\Users\ke919\OneDrive\ドキュメント\1234project\sesconsole-recovery-main-20260614` |
| branch | `codex/recovery-main-alignment-20260614` |
| base | `origin/main` at `bb6097f` |
| dirty tree backup | `C:\Users\ke919\OneDrive\ドキュメント\1234project\sesconsole-patches-20260615-090744` |

## 現在できていること

| 領域 | 現状 |
|---|---|
| 認証 | login/logout/session/password reset API と `LoginPanel` がある。 |
| Dashboard | `/` で案件・要員・未分類メールを一覧表示し、DB から seed/実データを読む。 |
| 案件/要員 CRUD | `ProjectCreateDrawer`, `PersonCreateDrawer`, `/api/projects`, `/api/persons` がある。 |
| 未分類移行 | `/api/entities/move-to-unclassified`, 未分類メール詳細から案件/要員への移行導線がある。 |
| Gmail | 同期 run API、分類・抽出 script、抽出品質テストがある。 |
| CSV/Import | `/imports`, `/api/imports`, source record API、dry-run/test がある。 |
| Matching | `/matches`, dry-run API、suggestions API、review queue、review update API とテストがある。 |
| Market analysis | `/market-analysis`, market analysis API、匿名化された分析 UI がある。 |
| Prisma schema | User/Mail/Project/Person/Proposal/Distribution/SearchHistory/Import/MatchSuggestion/Audit などが定義済み。 |
| 検証基盤 | `typecheck`, `test`, `build`, Prisma validate/generate が clean worktree で pass。 |

## 今回直したこと

| Task | 状態 | 変更 | Task test | Group test |
|---|---|---|---|---|
| R-001 dirty tree 保全 | Done | backup dir に status/diff/untracked/recent log を保存 | backup path 作成確認 | clean worktree 作成前に保全完了 |
| R-002 clean worktree 作成 | Done | `origin/main` から `codex/recovery-main-alignment-20260614` を作成 | `git status --short --branch` clean 確認 | baseline gates pass |
| R-003 baseline validation | Done | clean worktree に `npm.cmd ci --ignore-scripts` | Prisma validate/generate, typecheck | test, build pass |
| R-004 未実装 UI 導線撤去 | Done | 検索履歴モック、提案開始仮実行、設定アイコン、未実装 nav を撤去 | 残骸 `rg` hit なし、typecheck pass | test/build pass |
| R-005 コピー導線修正 | Done | 存在しない `/projects/{id}` URL コピーをやめ、案件ID/案件名コピーに変更 | typecheck pass | test/build pass |
| R-006 検証基盤 hygiene | Done | `tsconfig.tsbuildinfo` を削除、ignore、`tsconfig` から generated/old/worktree を除外 | `git diff --check` pass | typecheck/test/build pass |
| R-007 未分類メールの除外キーワード | Done | 未分類メールにも `filterValues.exclude` を適用 | typecheck pass | test/build pass |

## まだできていないこと

| ID | 課題 | 理由 | 次タスク |
|---|---|---|---|
| A-004 | DB-backed SearchHistory API/UI | Prisma model はあるが、API/UI/テストが未完成。DB write テストが必要なので別 PR に分離。 | `GET/POST /api/search-histories`、認可、上限件数、DB write test を設計してから実装。 |
| A-008 | 依存脆弱性対応 | `npm.cmd ci` で 8 vulnerabilities と Next 14.2.15 の security warning。 | Next/Prisma/TypeScript の互換性を見て upgrade PR を切る。 |
| A-009 | 実ブラウザ visual QA | このスレッドでは in-app Browser 操作用 tool が公開されなかった。 | Browser tool が使えるスレッドで `/`, `/imports`, `/matches`, `/market-analysis` を確認。 |
| A-010 | DB migration 実行確認 | DB write/migration は今回実行していない。 | 対象 DB と rollback 方針を明示してから migration/dry-run を確認。 |
| A-011 | docs と実装の完全同期 | 初期の機能ステータス表は `docs/status/current-feature-status-2026-06-15.md` に追加済み。theme別の詳細Statusはまだ粗い。 | 各 theme README に Status: implemented/design-only/deferred を付ける。 |

## 邪魔していたもの・不要だったもの

| 対象 | 問題 | 対応 |
|---|---|---|
| `components/SearchHistoryModal.jsx` | mock data だけで実 DB 機能ではないのに UI 上は機能に見える。 | 削除。 |
| `data/mockProjects.js` の `searchHistories` | 固定履歴で、ユーザー実行結果や DB と無関係。 | 削除。 |
| `提案開始` ボタン | DB 登録せず notice だけ出す。実装済み機能に見える。 | 一覧/詳細から撤去。 |
| `/projects/{id}` コピー | 実 route がない。クリック後の期待と実態がズレる。 | 案件ID/案件名コピーへ変更。 |
| `Header` の未実装 nav/settings | 遷移先や設定画面がない。 | 現在動く `案件` と `/market-analysis` に絞った。 |
| tracked `tsconfig.tsbuildinfo` | typecheck/build 後に worktree が汚れる。 | 削除して `.gitignore` へ追加。 |
| `tsconfig` の広すぎる include | generated/old/worktree が紛れ込むと typecheck を壊す。 | exclude を追加。 |

## docs の状態

| docs | 状態 |
|---|---|
| `docs/README.md` | 入口あり。今回の recovery report への参照を追加済み。 |
| `PROGRESS.md` | チャット横断作業ボードあり。今回の引き継ぎログを追加済み。 |
| `docs/shared/quality/two-pass-task-test-policy-v0.1.md` | テスト方針あり。今回の task test/group test に使用。 |
| `docs/themes/ses-sales-console/requirements/...` | 統合要件あり。ただし実装済み/未実装の紐付けが不足。 |
| `docs/themes/matching/*` | matching 関連の設計/要件/テスト docs が厚い。 |
| `docs/themes/source-tracking/*` | source/import 関連 docs あり。 |
| `docs/gmail/*` | Gmail ingest/classification docs あり。抽出品質の新しい状態は theme docs と分散。 |

## 検証結果

clean worktree で実行:

- `npm.cmd ci --ignore-scripts`: pass
- `npx.cmd prisma validate`: pass
- `npx.cmd prisma generate`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd test`: pass
- `npm.cmd run build`: pass
- `git diff --check`: pass with CRLF warnings only
- 残骸検索: `SearchHistoryModal|検索履歴|onOpenHistory|searchHistories|提案開始|proposalIds|handleAddProposal|/projects/` は app/components/data/package で hit なし

## 次の Sprint Backlog

| Priority | Task | Done definition |
|---|---|---|
| P0 | この clean branch を PR 化 | CI pass、PR body に本 report と test result を貼る。 |
| P0 | Browser visual QA | login 後の `/` で検索履歴/提案開始/設定/存在しない URL 導線が出ないことを確認。 |
| P1 | SearchHistory を別 PR で実装 | DB-backed API/UI、認可、上限、task test、group test が揃う。 |
| P1 | dependency security upgrade | `npm audit` の critical/high と Next warning を解消し、build/test pass。 |
| P1 | theme docs status matrix | theme docs ごとに implemented/design-only/deferred を付ける。 |
