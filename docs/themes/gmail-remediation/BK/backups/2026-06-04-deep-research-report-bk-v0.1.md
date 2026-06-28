# Deep Research Report BK v0.1

作成日: 2026-06-04
入力ファイル:

- `deep-research-report.md`
- `Gmail未リンクメールの新規抽出品質改善と再現可能なResearch-to-PRワークフロー.docx`
- `Gmail未リンクメールの新規抽出品質改善と再現可能なResearch-to-PRワークフロー.pdf`

取り込み先:

- `docs/themes/gmail-remediation/research/gmail-unlinked-extraction-quality-research-v0.1.md`
- `docs/themes/gmail-remediation/BK/gmail-unlinked-extraction-quality-bk-v0.1.md`

## 1. BK方針

- 添付レポートの全文をそのまま転記しない。
- MDが文字化けして見える場合は、UTF-8指定またはWord/PDF版で内容を確認する。
- 実装に使う要点、失敗モード、評価メトリクス、検証方針だけをdocs化する。
- 本文全文、メールアドレス、会社名、氏名原文、secret、DB接続URL、token、passwordは保存しない。
- DB更新、apply、外部送信は行わない。

## 2. 取り込んだ要点

- Gmail未リンクメールの抽出品質改善は、既存の安全策を作り直すのではなく、証拠の信用順とdecision ruleを詰める段階。
- 最優先は分類、人名抽出、skill過剰抽出。
- 評価対象は、本当に新規作成候補の未リンクメールに限定する。
- UI bucket数や `source_mail_id` nullだけで評価しない。
- `reviewReasons` と `classificationWarning` は監査証跡として整理する。
- Research-to-PRはdry-run、匿名化、失敗モード分類、ルール改善、テスト、再dry-run、before/after比較を1PRにまとめる。

## 3. 追加したdocs

- research:
  - `docs/themes/gmail-remediation/research/gmail-unlinked-extraction-quality-research-v0.1.md`
- BK:
  - `docs/themes/gmail-remediation/BK/gmail-unlinked-extraction-quality-bk-v0.1.md`

## 4. 今後の利用方法

GPTへGmail抽出品質だけ相談する場合は、以下を渡す。

1. `docs/themes/gmail-remediation/README.md`
2. `docs/themes/gmail-remediation/research/gmail-unlinked-extraction-quality-research-v0.1.md`
3. `docs/themes/gmail-remediation/BK/gmail-unlinked-extraction-quality-bk-v0.1.md`
4. `docs/shared/quality/two-pass-task-test-policy-v0.1.md`

## 5. 検証方針

- docs構造検査を2周実施する。
- secret/DB接続URL系パターン検索を行う。
- 古いパスや孤立参照がないことを確認する。
- runtime testはdocs-onlyのため不要。
