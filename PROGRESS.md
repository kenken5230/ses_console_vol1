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
| Codex Windows sandbox preflight docs | Codex Windows sandbox / PowerShell / npm / Prisma / proxy / workspace permission preflight docs追加 | `PROGRESS.md`, `docs/shared/operations/`, `docs/README.md` | Done | 2026-06-14 | docs only。PR #44には触らない |

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
- `docs/shared/operations/codex-windows-sandbox-preflight-v0.1.md`
- `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
- 作業テーマに該当する `docs/themes/*/README.md`

## 引き継ぎログ

### 2026-06-14 JST / Codex Windows sandbox preflight docs

- Scope: PR #44 merge後の再発防止として、Codex Windows sandbox / PowerShell / npm / Prisma / proxy / workspace permissionの作業前preflight docsを別PRで追加。
- Done: `codex/codex-windows-sandbox-preflight-docs` branchでpreflight doc、operations README、docs READMEリンク、PROGRESSログを追加。
- Changed: `PROGRESS.md`, `docs/shared/operations/codex-windows-sandbox-preflight-v0.1.md`, `docs/shared/operations/README.md`, `docs/README.md`。
- Validation: docsリンク、必須文言、`"**/backups/**" = "read"` を推奨設定として書いていないこと、secret/token/DB URLの実値がないことを確認。
- Remaining: PR review / merge。
- Risk / Need coordination: docs only。code、Prisma、migration、`package.json` は変更しない。production DB、`db push`、`migrate reset` は未実行。PR #44には触らない。

### 2026-06-13 JST / PM setup chat

- Scope: 複数チャットでの進捗確認・事故防止・連携ルールをPM/PdM観点で整備。
- Done: `PROGRESS.md` と `docs/shared/operations/chat-progress-coordination-v0.1.md` を追加。
- Changed: docs入口に参照を追加済み。
- Validation: ドキュメントのみ。リンク・表記を再読み込みで確認済み。
- Remaining: 各チャットへ運用開始文を送る場合は、本チャット最終回答の文面を使う。
- Risk / Need coordination: 既存の未コミット変更が多い可能性があるため、今後のチャットは担当範囲を明示してから編集する。

### 2026-06-13 JST / Codex GitHub sync chat

- Scope: 他チャットがGitHubから読めるよう、進捗共有docsをリモートブランチへ配置。
- Done: `codex/progress-coordination` ブランチを作成し、`PROGRESS.md` とoperations docを追加。
- Changed: `PROGRESS.md`, `docs/shared/operations/chat-progress-coordination-v0.1.md`, `docs/shared/README.md`。
- Validation: GitHub connectorで `main` 上の欠落を確認。ローカルgit/npm検証はsandbox制約により未実行。
- Remaining: PRをmergeして `main` に反映する。merge後、各チャットは作業開始時に `PROGRESS.md` を読む。
- Risk / Need coordination: ローカル未コミット差分はこの環境では未確認。実装作業前には通常環境で `git status` を確認する。

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
