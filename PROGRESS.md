# Project Progress

作成日: 2026-06-13 JST

このファイルは、複数チャットで同じプロジェクトを進めるための進捗ボードです。各チャットは作業開始時に必ずこのファイルを読み、作業終了時に必要な更新を残します。

## 運用ルール

- 開始時: `PROGRESS.md` を読み、重複作業・衝突リスク・未完了タスクを確認する。
- 編集前: 触る予定の範囲が既存の作業枠と重なる場合は、先にユーザーへ確認する。
- 実装時: `docs/shared/quality/two-pass-task-test-policy-v0.1.md` を確認し、2周テスト方針に従う。
- 終了時: 変更内容、確認結果、残タスク、他チャットへの連携事項をこのファイルに残す。
- 更新不要: 調査だけで成果物・判断・未完了事項が残らない場合は、読み取り確認だけでよい。
- 禁止: secret、DB接続URL、パスワード、実データの個人情報をここに書かない。

詳細ルール: `docs/shared/operations/chat-progress-coordination-v0.1.md`

## 現在の全体状況

| 項目 | 状態 | メモ |
|---|---|---|
| チャット横断進捗管理 | GitHub共有準備中 | 2026-06-13 に本ファイルと運用ルールを追加 |
| 事故防止ルール | 運用開始 | 開始時確認、編集前衝突確認、終了時更新を基本にする |
| 既存タスク群 | 要確認 | 既存の未コミット変更が複数ある可能性があるため、各チャットは担当範囲を明示してから作業する |

## アクティブ作業枠

作業中のチャットは、編集前に1行追加します。完了したらステータスを `Done` にし、必要に応じて下の引き継ぎログへ要点を残します。

| Chat / Owner | Scope | Main Files | Status | Last Update | Blocker / Coordination |
|---|---|---|---|---|---|
| PM setup chat | チャット横断進捗管理の初期整備 | `PROGRESS.md`, `docs/shared/operations/` | Done | 2026-06-13 | なし |
| Codex GitHub sync chat | GitHub上に進捗共有docsを配置 | `PROGRESS.md`, `docs/shared/operations/`, `docs/shared/README.md` | Done | 2026-06-13 | ローカル `git status` はsandbox制約で未確認 |
| Codex recovery/main alignment | `origin/main` clean worktree で復旧・UI真実性・検証基盤を修正 | `app/page.jsx`, `components/*`, `data/mockProjects.js`, `tsconfig.json`, `.gitignore`, `docs/status/recovery-main-alignment-report-2026-06-15.md` | Done | 2026-06-15 | SearchHistory DB 実装、dependency upgrade、Browser visual QA は別タスク |
| Codex search history DB-backed | DB-backed SearchHistory API/UI/test | `lib/search-history.ts`, `app/api/search-histories/route.ts`, `components/SearchHistoryModal.jsx`, `app/page.jsx`, `scripts/search-history.test.ts` | Done | 2026-06-15 | Real DB write smoke is approval-gated |

## 衝突注意エリア

既存の未コミット変更がある可能性があるため、以下の領域を触るチャットは開始時に差分と担当範囲を確認します。

| Area | Reason | Required Action |
|---|---|---|
| `app/api/` | API挙動への影響が大きい | 変更前に対象routeと既存差分を確認 |
| `lib/gmail-extract-entities.ts` | Gmail抽出品質に影響 | 関連テストと既存仕様を確認 |
| `scripts/gmail-*` | DB read/writeや抽出処理に影響 | dry-run/read-only条件を明記 |
| `prisma/` | schema/migrationが他作業と衝突しやすい | migration順序、DB安全条件、生成結果を確認 |
| `docs/` | 既存docs追加・整理が進行中 | 入口docsとテーマdocsの重複を確認 |
| `.env*`, `private/`, `secrets/` | secret事故リスク | 原則として内容を書き写さない |

## 次に見るべき入口

- `docs/README.md`
- `docs/shared/README.md`
- `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
- 作業テーマに該当する `docs/themes/*/README.md`

## 引き継ぎログ

### 2026-06-13 JST / PM setup chat

- Scope: 複数チャットでの進捗確認・事故防止・連携ルールをPM/PdM観点で整備。
- Done: `PROGRESS.md` と `docs/shared/operations/chat-progress-coordination-v0.1.md` を追加。
- Changed: docs入口に参照を追加済み。
- Validation: ドキュメントのみ。リンク・表記を再読込で確認済み。
- Remaining: 各チャットへ運用開始文を送る場合は、本チャット最終回答の文面を使う。
- Risk / Need coordination: 既存の未コミット変更が多い可能性があるため、今後のチャットは担当範囲を明示してから編集する。

### 2026-06-13 JST / Codex GitHub sync chat

- Scope: 他チャットがGitHubから読めるよう、進捗共有docsをリモートブランチへ配置。
- Done: `codex/progress-coordination` ブランチを作成し、`PROGRESS.md` とoperations docを追加。
- Changed: `PROGRESS.md`, `docs/shared/operations/chat-progress-coordination-v0.1.md`, `docs/shared/README.md`。
- Validation: GitHub connectorで `main` 上の欠落を確認。ローカルgit/npm検証はsandbox制約により未実行。
- Remaining: PRをmergeして `main` に反映する。merge後、各チャットは作業開始時に `PROGRESS.md` を読む。
- Risk / Need coordination: ローカル未コミット差分はこの環境では未確認。実装作業前には通常環境で `git status` を確認する。

### 2026-06-15 JST / Codex recovery/main alignment

- Scope: dirty tree に直接 merge せず、`origin/main` から clean worktree/branch を作って復旧作業を開始。
- Done: dirty tree backup 作成、clean worktree 作成、未実装 UI 導線撤去、未分類メール除外キーワード修正、`tsconfig.tsbuildinfo` hygiene、復旧レポート追加。
- Changed: `.gitignore`, `app/page.jsx`, `components/Header.jsx`, `components/ProjectDetailPane.jsx`, `components/ProjectTable.jsx`, `components/SearchToolbar.jsx`, `data/mockProjects.js`, `tsconfig.json`, `docs/README.md`, `docs/status/recovery-main-alignment-report-2026-06-15.md`, `PROGRESS.md`。
- Validation: `npm.cmd ci --ignore-scripts`, Prisma validate/generate, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `git diff --check`, 未実装 UI 残骸検索 pass。
- Remaining: SearchHistory は DB-backed 実装として別 PR、dependency security upgrade、Browser visual QA、docs status matrix。
- Risk / Need coordination: DB write/migration は今回未実行。Browser 操作用 tool はこのスレッドで公開されなかったため visual QA は未実施。

### 2026-06-15 JST / Codex docs/status recheck

- Scope: docs入口とテーマ別フォルダを再整理し、怪しい箇所を再テストする。
- Done: `docs/status/` を追加し、復旧レポートを移動。市場分析docsを `docs/themes/market-analysis/` へ移動。docs入口とテーマ入口を更新。現状機能ステータス表を追加。
- Changed: `docs/README.md`, `docs/themes/README.md`, `docs/status/`, `docs/themes/market-analysis/`, `PROGRESS.md`。
- Validation: 参照切れ検索 pass、未実装UI残骸検索 pass、`git diff --check` pass(CRLF警告のみ)、`npm.cmd run typecheck` pass、`npm.cmd test` pass、`npm.cmd run build` pass、Prisma validate pass、`npm.cmd audit --audit-level=high` fail(8 vulnerabilities)。
- Remaining: SearchHistory DB-backed実装、dependency security upgrade、Browser visual QA。
- Risk / Need coordination: フォルダ移動のみ。コード配置、DB、migration、実データ更新は行わない。

### 2026-06-15 JST / Codex search history DB-backed

- Scope: mock-onlyだった検索履歴を、既存 `search_histories` model を使うDB-backed API/UIとして実装する。
- Done: 専用worktree/branchを作成。現状調査し、タスク表を `docs/status/search-history-db-backed-2026-06-15.md` に追加。
- Changed: `docs/status/search-history-db-backed-2026-06-15.md`, `docs/status/README.md`, `PROGRESS.md`。
- Validation: 実装後に mocked DB test、typecheck、test、buildを実行予定。
- Remaining: lib/API/UI/test実装。
- Risk / Need coordination: 実DB write smokeは明示的なDB target/rollback方針なしに行わない。

### 2026-06-15 JST / Codex search history DB-backed completion

- Scope: Restore SearchHistory as a real DB-backed feature instead of mock-only UI.
- Done: Added validation/list/save library, `GET/POST /api/search-histories`, `SearchHistoryModal`, toolbar/app wiring, and a mocked DB test suite.
- Changed: `lib/search-history.ts`, `app/api/search-histories/route.ts`, `components/SearchHistoryModal.jsx`, `components/SearchToolbar.jsx`, `app/page.jsx`, `app/globals.css`, `scripts/search-history.test.ts`, `package.json`, status docs.
- Validation: `npm.cmd run test:search-history`, `npx.cmd prisma generate`, `npx.cmd prisma validate`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` all passed.
- Remaining: real DB write smoke only after explicit DB target and rollback policy approval.
- Risk / Need coordination: this branch is stacked on recovery PR #53 and intentionally does not include dependency-security PR #54 changes.

## 引き継ぎテンプレート

```md
### YYYY-MM-DD HH:mm JST / <chat name or task>

- Scope:
- Done:
- Changed:
- Validation:
- Remaining:
- Risk / Need coordination:
```
