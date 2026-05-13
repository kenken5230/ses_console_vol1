# SES Console Docs

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
