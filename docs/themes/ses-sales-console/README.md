# SES Sales Console Theme

このテーマは、NotionにあるSES営業データをconsoleへ移行し、案件、要員、会社、担当者、商流、提案、メール、進捗、統計、KPI、AIマッチングを統合する全体設計です。

## GPTへ渡す最小セット

全体の壁打ち:

- `docs/themes/ses-sales-console/README.md`
- `docs/themes/ses-sales-console/status/theme-progress-2026-06-19.md`
- `docs/themes/ses-sales-console/requirements/ses-sales-console-integrated-requirements-v0.1.md`
- `docs/themes/ses-sales-console/requirements/input-field-definition-2026-06-19.md`
- `docs/themes/ses-sales-console/BK/ses-sales-console-theme-backlog-v0.1.md`
- `docs/shared/quality/two-pass-task-test-policy-v0.1.md`

要望の原文や棚卸し根拠まで見せる場合:

- `docs/themes/ses-sales-console/BK/backups/2026-06-04-ses-console-theme-input-bk-v0.1.md`

## フォルダ構成

| フォルダ | 内容 |
|---|---|
| `requirements/` | 統合要件定義 |
| `BK/` | テーマ別バックログ、タスク、実行順 |
| `BK/backups/` | 要望原文や棚卸し根拠のBK |

## 現時点の大テーマ

- Notionデータ移行
- 案件構造化DB
- 要員DB
- AI案件要員マッチング
- AI提案判断補助
- 高度検索/AI検索
- 提案リスト/営業進捗
- console内メール送信
- メール/提案履歴紐づけ
- 統計/グラフ
- KPI/売上見込み
- 会社/取引先/商流管理
- 入力/更新標準化
- SES営業統合console
- Gmail取り込み/抽出/品質改善

## 注意

- このテーマは全体設計なので、実データやsecretは含めない。
- Notion export実ファイルは別管理にして、このフォルダへ直接置かない。
- DB更新やapplyはこのdocsでは実行しない。

