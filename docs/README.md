# SES Console Docs

## Theme Entry

- `docs/themes/README.md`
  - GPTへ渡すテーマ別docsの入口。対象テーマだけ渡し、必要な場合だけ `docs/shared/` を足す構造。
- `docs/status/README.md`
  - 現在の実装状態、復旧レポート、再テスト結果を見る入口。

## 追加ドキュメント

- `docs/status/current-feature-status-2026-06-15.md`
  - 機能ごとの実装済み/設計のみ/未実装/要再テストを整理した現状表。
- `docs/status/recovery-main-alignment-report-2026-06-15.md`
  - `origin/main` clean worktree による復旧・機能棚卸し・修正タスク・検証結果のレポート。
- `docs/status/ui-change-ledger-2026-06-15.md`
  - #53/#54/#55 の追加/削除/非表示/文言/導線/API/package/rollback台帳。
- `docs/status/ui-regression-restore-2026-06-15.md`
  - #49基準で消えたUI導線の復旧履歴、原因範囲、hotfixのタスクと検証計画。
- `docs/status/ui-restore-plan-2026-06-15.md`
  - 勝手に消えた/変わったUIを、どのPRで戻すか、または承認後に非表示/削除するかの計画。
- `docs/themes/ses-sales-console/requirements/ses-sales-console-integrated-requirements-v0.1.md`
  - Notion移行、案件/要員DB、AIマッチング、提案、メール、履歴、統計、KPI、会社/商流、統合consoleの大テーマ別要件定義。
- `docs/themes/ses-sales-console/BK/ses-sales-console-theme-backlog-v0.1.md`
  - 各テーマのBK、実行順、タスク、2周テスト、Owner確認の整理。
- `docs/themes/ses-sales-console/BK/backups/2026-06-04-ses-console-theme-input-bk-v0.1.md`
  - 今回共有された大テーマ要望とrepo棚卸し根拠のBK。

このフォルダは、SES Console の設計書・運用メモを用途別に整理しています。

## フォルダ構成

| パス | 内容 |
|---|---|
| `docs/db-design-v0.1.md` | DB設計書。`schema.prisma` の参照コメントがあるためトップ直下に残しています。 |
| `docs/status/` | 現在の機能状態、復旧・検証レポート、未完了課題 |
| `docs/themes/` | テーマ別の要件・設計・BK・テスト方針 |
| `docs/shared/` | 横断運用ルール、品質/テスト方針 |
| `docs/gmail/` | Gmail取り込み、分類、抽出、分析に関する設計・実装メモ |
| `docs/release/` | 社内公開前チェックリスト、公開準備設計、ユーザー確認タスク |

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

- ファイルは削除せず、用途別フォルダへ移動して整理しています。
- コード、API、Prisma、Gmail同期スクリプトの配置は変更していません。
