# SES Console Docs

## Theme Entry

- `docs/themes/README.md`
  - GPTへ渡すテーマ別docsの入口。対象テーマだけ渡し、必要な場合だけ `docs/shared/` を足す構造。

## 追加ドキュメント

- `docs/shared/operations/codex-windows-sandbox-preflight-v0.1.md`
  - Codexで実装・merge・conflict解消に入る前のWindows sandbox / PowerShell / npm / Prisma / proxy / permission確認手順。
- `docs/themes/matching/match-suggestion-review-update-fix-list-v0.1.md`
  - Claude Code調査結果をもとにした、次PR向けの guarded review update API 修正点・テスト観点・禁止事項の整理。
- `docs/shared/operations/workspace-folder-organization-2026-06-12.md`
  - ルート直下の過去 worktree / 一時ファイルを `old/` に退避するためのテーマ別整理方針。
- `docs/shared/operations/chat-progress-coordination-v0.1.md`
  - 複数チャットで開発する際の進捗確認、衝突防止、引き継ぎ、PM/PdM判断ルール。
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
| `docs/gmail/` | Gmail取り込み、分類、抽出、分析に関する設計・実装メモ |
| `docs/release/` | 社内公開前チェックリスト、公開準備設計、ユーザー確認タスク |

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
