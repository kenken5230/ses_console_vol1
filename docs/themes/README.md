# SES Console Theme Docs

## Current Theme Entries

- `docs/themes/matching/`
  - deterministic matching、saved `MatchSuggestion`、guarded review update API の設計・修正メモ。
- `docs/themes/gmail-remediation/`
  - Gmail由来の要員抽出、未リンク抽出品質、remediation の設計・調査メモ。
- `docs/themes/ses-sales-console/`
  - SES営業console全体の要件、バックログ、運用メモ。

このフォルダは、GPTなどにファイルを渡して壁打ちしやすいように、テーマ単位でdocsを分ける入口です。

## 使い方

- 原則として、相談したいテーマのフォルダだけ渡す。
- 共通ルールが必要な場合だけ `docs/shared/` を追加で渡す。
- `.env`、DB dump、実行ログ全文、secret、DB接続URL、token、password、connection stringは渡さない。
- BKは各テーマ配下の `BK/` を見る。全テーマを1ファイルへ無理にまとめない。
- 古いdocsを参照する場合も、まずテーマREADMEから辿る。

## テーマ一覧

| テーマ | フォルダ | 渡す場面 |
|---|---|---|
| SES営業統合console | `docs/themes/ses-sales-console/` | Notion移行、案件/要員DB、AIマッチング、提案、メール、統計、KPI、会社/商流の全体設計 |
| Gmail要員remediation / 抽出品質 | `docs/themes/gmail-remediation/` | Gmail由来要員name汚れ、remediation apply、Gmail未リンク抽出品質、Research-to-PR、安全運用 |

## 共通docs

| 種別 | フォルダ | 内容 |
|---|---|---|
| 品質/テスト方針 | `docs/shared/quality/` | 2周テスト、Owner確認の減らし方、read-only/dry-run方針 |

## 事故防止

GPTへ渡す最小単位:

1. 対象テーマの `README.md`
2. 対象テーマの `requirements/` または `design/`
3. 対象テーマの `BK/`
4. 必要な場合だけ `docs/shared/quality/`

渡さないもの:

- `.env*`
- DB dump / CSV実データ
- production/stagingの接続情報
- Gmail tokenやSMTP password
- 長大なメール本文全文
- 個人情報を含む実データの無加工コピー
