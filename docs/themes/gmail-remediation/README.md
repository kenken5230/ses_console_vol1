# Gmail Remediation Theme

このテーマは、Gmail由来personのnameに件名全文が入る問題を安全に補修し、今後のGmail抽出品質を保つための設計・BKです。

## GPTへ渡す最小セット

Gmail remediationと抽出品質を相談する場合:

- `docs/themes/gmail-remediation/README.md`
- `docs/themes/gmail-remediation/design/gmail-company-candidate-readonly-v0.1.md`
- `docs/themes/gmail-remediation/design/gmail-person-remediation-supervised-ops-v0.1.md`
- `docs/themes/gmail-remediation/research/gmail-unlinked-extraction-quality-research-v0.1.md`
- `docs/themes/gmail-remediation/BK/feature-backlog-and-task-list-v0.1.md`
- `docs/themes/gmail-remediation/BK/gmail-unlinked-extraction-quality-bk-v0.1.md`
- `docs/shared/quality/two-pass-task-test-policy-v0.1.md`

SES console全体との関係も相談する場合:

- `docs/themes/ses-sales-console/requirements/ses-sales-console-integrated-requirements-v0.1.md`
- `docs/themes/ses-sales-console/BK/ses-sales-console-theme-backlog-v0.1.md`

## フォルダ構成

| フォルダ | 内容 |
|---|---|
| `design/` | supervised batch applyや安全運用の設計 |
| `research/` | Gmail未リンク抽出品質改善のResearch-to-PR方針 |
| `BK/` | Gmail remediationと関連運用タスク |
| `BK/backups/` | 添付資料や壁打ち内容を安全に要約したBK |

## 注意

- applyコマンドはOwner操作のみ。
- Codex側ではread-only preview/count/testまでを基本にする。
- Gmail本文全文、token、DB接続URL、SMTP passwordはdocsへ入れない。
