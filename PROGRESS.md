# Project Progress

作成日: 2026-06-13 JST

このファイルは、複数チャットで同じプロジェクトを進めるための進捗ボードです。
各チャットは作業開始時に必ずこのファイルを読み、作業終了時に必要な更新を残します。

## 運用ルール

- 開始時: `PROGRESS.md` を読み、重複作業・衝突リスク・未完了タスクを確認する。
- 編集前: 触る予定の範囲が既存の作業枠と重なる場合は、先にユーザーへ確認する。
- 終了時: 変更内容、確認結果、残タスク、他チャットへの連携事項をこのファイルに残す。
- 更新不要: 調査だけで成果物・判断・未完了事項が残らない場合は、読み取り確認だけでよい。
- 禁止: secret、DB接続URL、パスワード、実データの個人情報をここに書かない。

詳細ルール: `docs/shared/operations/chat-progress-coordination-v0.1.md`

## 現在の全体状況

| 項目 | 状態 | メモ |
|---|---|---|
| チャット横断進捗管理 | 運用開始 | 2026-06-13 に本ファイルと運用ルールを追加 |
| 事故防止ルール | 運用開始 | 開始時確認、編集前衝突確認、終了時更新を基本にする |
| 既存タスク群 | 要確認 | 既存の未コミット変更が複数あるため、各チャットは担当範囲を明示してから作業する |

## アクティブ作業枠

作業中のチャットは、編集前に1行追加します。完了したらステータスを `Done` にし、必要に応じて下の引き継ぎログへ要点を残します。

| Chat / Owner | Scope | Main Files | Status | Last Update | Blocker / Coordination |
|---|---|---|---|---|---|
| PM setup chat | チャット横断進捗管理の初期整備 | `PROGRESS.md`, `docs/shared/operations/` | Done | 2026-06-13 | なし |
| Codex / PR #8 scale follow-up | PR #8 最新main追従、CSSのみremote更新 | `app/globals.css` | Done | 2026-06-13 | ローカル `git status` は sandbox/EPERM で確認不能。remote branch のみ更新 |
| Codex / Windows sandbox preflight docs | Codex作業前preflightとsandbox再発防止docs追加 | `PROGRESS.md`, `docs/shared/operations/`, `docs/README.md` | Done | 2026-06-13 | PowerShellはsandbox backend制約で起動不能。docsのみ更新 |

## 衝突注意エリア

既存の未コミット変更があるため、以下の領域を触るチャットは開始時に差分と担当範囲を確認します。

| Area | Reason | Required Action |
|---|---|---|
| `app/api/` | API挙動への影響が大きい | 変更前に対象routeと既存差分を確認 |
| `lib/gmail-extract-entities.ts` | Gmail抽出品質に影響 | 関連テストと既存仕様を確認 |
| `scripts/gmail-*` | DB read/writeや抽出処理に影響 | dry-run/read-only条件を明記 |
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
- Risk / Need coordination: 既存の未コミット変更が多いため、今後のチャットは担当範囲を明示してから編集する。

### 2026-06-13 JST / Codex Windows sandbox preflight docs

- Scope: PR #44で発生したCodex Windows sandbox / PowerShell / npm / Prisma / proxy / workspace permissionの詰まりを、今後の作業開始前に判定できる運用docsとして整理。
- Done: `docs/shared/operations/codex-windows-sandbox-preflight-v0.1.md` を追加し、`docs/shared/operations/README.md` と `docs/README.md` へリンクを追加。
- Changed: `PROGRESS.md`, `docs/shared/operations/codex-windows-sandbox-preflight-v0.1.md`, `docs/shared/operations/README.md`, `docs/README.md`。
- Validation: 指定docsを読み込み確認。PowerShellは `windows sandbox: Restricted read-only access requires the elevated Windows sandbox backend` で起動できないため、`rg` / `git status` / npm / buildは未実行。
- Remaining: 通常shellが使える環境で `git status -sb` とリンク確認を実行する。必要ならこのdocs変更を別commit/PRとしてpushする。
- Risk / Need coordination: コード変更なし。GitHub connector直更新、Web Editor conflict解消、production DB、`db push`、`migrate reset` は未実行。

### 2026-06-13 JST / Codex PR #8 scale follow-up

- Scope: PR #8 `codex/default-console-scale-75` を最新mainへ追従。対象は `app/globals.css` のみ。
- Done: GitHub connector で最新main `71b9a09b029c1e05dcaf13f0cc9bf159c93d5d6d` ベースのclean commit `09242bbdace147fe6e8a476dbc822e2b74cf563f` を作成し、PR #8 branchを更新。
- Changed: remote PR差分は `app/globals.css` のみ。ローカルではこの進捗ログのみ更新。
- Validation: GitHub compareで ahead 1 / behind 0、PR mergeable true、差分1ファイルを確認。ローカル `npm` / `git diff --check` / browser確認は shell sandbox と `spawn EPERM` により未実行。
- Remaining: Vercel preview または通常ローカル環境で build、lint、test、ブラウザ表示確認を行う。
- Risk / Need coordination: ローカル `git status` は確認不能。PR #8自体はremote branchのみ更新し、DB/API/market-analysis/matches等には触れていない。

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
