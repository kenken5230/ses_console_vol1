# SES Console Docs

このフォルダは、SES Console の要件、設計、運用メモ、検証結果を用途別に整理する入口です。
現在の進捗や残タスクは `PROGRESS.md` と `docs/status/README.md` を優先して確認してください。

## Theme Entry

- `docs/themes/README.md`
  - GPTへ渡すテーマ別docsの入口です。対象テーマを確認し、必要な場合だけ `docs/shared/` を参照します。
- `docs/status/README.md`
  - 現在の実装状態、復旧レポート、テスト結果、未完了タスクを見る入口です。

## 重要ドキュメント

- `docs/shared/operations/codex-windows-sandbox-preflight-v0.1.md`
  - CodexでWindows環境を使う前の確認手順です。sandbox、PowerShell、npm、Prisma、proxy、permissionの確認を扱います。
- `docs/status/current-feature-status-2026-06-15.md`
  - 機能ごとの実装済み、設計のみ、未実装、要テストを整理した現状表です。
- `docs/status/recovery-main-alignment-report-2026-06-15.md`
  - `origin/main` clean worktree による復旧、機能棚卸し、修正タスク、検証結果のレポートです。
- `docs/status/ui-change-ledger-2026-06-15.md`
  - #53/#54/#55 の追加、削除、非表示、文言、導線、API、package、rollbackの台帳です。
- `docs/status/ui-regression-restore-2026-06-15.md`
  - #49基準で消えたUI導線の復旧履歴、原因範囲、hotfixのタスクと検証計画です。
- `docs/status/ui-restore-plan-2026-06-15.md`
  - 勝手に消えた、または変わったUIをどのPRで戻すか、承認後に非表示や削除するかの計画です。
- `docs/themes/ses-sales-console/requirements/ses-sales-console-integrated-requirements-v0.1.md`
  - Notion移行、案件/要員DB、AIマッチング、提案、メール、履歴、統計、API、会社/商流、統合Consoleの大テーマ別要件定義です。
- `docs/themes/ses-sales-console/BK/ses-sales-console-theme-backlog-v0.1.md`
  - テーマ別のバックログ、実行順、タスク、周辺テスト、owner確認を整理したBKです。
- `docs/themes/ses-sales-console/BK/backups/2026-06-04-ses-console-theme-input-bk-v0.1.md`
  - 以前共有された大テーマ要件とrepo棚卸し結果を残したバックアップです。

## フォルダ構成

| パス | 内容 |
|---|---|
| `docs/db-design-v0.1.md` | DB設計メモです。`prisma/schema.prisma` に参照コメントがあるため、トップ直下に残しています。 |
| `docs/status/` | 現在の機能状態、復旧、検証レポート、未完了課題を置きます。 |
| `docs/themes/` | テーマ別の要件、設計、BK、テスト方針を置きます。 |
| `docs/shared/` | 横断運用ルール、品質、テスト方針を置きます。 |
| `docs/gmail/` | Gmail取り込み、分類、抽出、分析に関する設計と実装メモを置きます。 |
| `docs/release/` | 社内外公開前チェックリスト、公開準備設計、ユーザー確認タスクを置きます。 |

## テーマ別入口

- `docs/themes/ses-sales-console/README.md`
- `docs/themes/gmail-remediation/README.md`
- `docs/themes/matching/README.md`
- `docs/themes/source-tracking/README.md`
- `docs/themes/market-analysis/README.md`

## Gmail関連

- `docs/gmail/gmail-ingest-design-v0.1.md`
- `docs/gmail/gmail-ingest-implementation-status-v0.1.md`
- `docs/gmail/gmail-classification-analysis-v0.1.md`

## 公開準備関連

- `docs/release/public-release-readiness-v0.1.md`
- `docs/release/public-release-readiness-v0.2.md`
- `docs/release/public-release-review-tasks-v0.1.md`

## 注意

- ファイルは削除せず、用途別フォルダへ移動して整理してください。
- コード、API、Prisma、Gmail同期スクリプトの配置はこのREADME更新では変更していません。
- 重要操作やDB write、migration、worktree削除は、必ず該当する安全ゲートと承認ルールに従ってください。
