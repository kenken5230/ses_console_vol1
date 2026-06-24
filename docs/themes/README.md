# SES Console Theme Docs

このフォルダは、テーマ単位で要件・設計・テスト方針・バックログを分ける入口です。

## How To Use

- 調べたいテーマのフォルダから確認します。
- 共通ルールが必要な場合は [../shared/README.md](../shared/README.md) を参照します。
- 進捗や承認ゲートは [../status/README.md](../status/README.md) と [../../PROGRESS.md](../../PROGRESS.md) を優先します。
- `.env*`、DB dump、token、password、connection string、raw mail body、個人情報を含む実データは置きません。

## Themes

| テーマ | フォルダ | 主な内容 |
|---|---|---|
| SES営業統合コンソール | [ses-sales-console/](./ses-sales-console/) | 案件/要員DB、UIマッチング、検索、メール、履歴、統計、API、会社/商流などの全体要件 |
| Gmail remediation / 抽出品質 | [gmail-remediation/](./gmail-remediation/) | Gmail由来の要員名揺れ、会社補完、remediation apply、未リンク抽出品質 |
| Matching | [matching/](./matching/) | 案件/要員のdeterministic matching、保存済み候補、review queue、提案draft |
| Source tracking / Import | [source-tracking/](./source-tracking/) | Gmail/CSV/Notion/手入力由来のsource record、import run、dry-run、review UI |
| Market analysis | [market-analysis/](./market-analysis/) | 単価相場、市場分析、匿名化された集計軸、read-only分析UI |

## Shared References

| 種別 | 場所 | 内容 |
|---|---|---|
| 品質/テスト方針 | [../shared/quality/](../shared/quality/) | 2周テスト、owner確認を減らす方針、read-only/dry-run方針 |
| 運用/進捗連携 | [../shared/operations/](../shared/operations/) | 複数チャット作業時の進捗共有、衝突回避、引き継ぎ運用 |
| 現状/復旧レポート | [../status/](../status/) | 機能状態、復旧結果、テスト結果、未完了課題 |

## Hand-Off Order

GPTや別AIにテーマ単位で渡すときは、原則として以下の順で渡します。

1. 対象テーマの `README.md`
2. 対象テーマの `requirements/` または `design/`
3. 対象テーマの `BK/`
4. 必要に応じて [../shared/quality/](../shared/quality/)
5. 現在状態として [../../PROGRESS.md](../../PROGRESS.md) と [../status/README.md](../status/README.md)
