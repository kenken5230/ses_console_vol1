# SES Console Theme Docs

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
| Matching | `docs/themes/matching/` | 案件/要員の deterministic matching、保存済み候補、review queue、将来の提案draft設計 |
| Source tracking / Import | `docs/themes/source-tracking/` | Gmail/CSV/Notion/手入力由来の source record、import run、dry-run、review UI |
| Market analysis | `docs/themes/market-analysis/` | 単価相場、市場分析、匿名化された集計軸、read-only分析UI |

## 共通docs

| 種別 | フォルダ | 内容 |
|---|---|---|
| 品質/テスト方針 | `docs/shared/quality/` | 2周テスト、Owner確認の減らし方、read-only/dry-run方針 |
| 運用/進捗連携 | `docs/shared/operations/` | 複数チャット作業の進捗共有と衝突防止 |
| 現状/復旧レポート | `docs/status/` | 機能状態、復旧結果、再テスト結果、未完了課題 |

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
