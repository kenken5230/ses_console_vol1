# Project Memo

- 画面上のカテゴリタブ（HR / FINANCE / MARKETING / 管理部採用など）は、UIとして残してよい。
- ただし、このカテゴリ分類は今後の検索・フィルター・案件管理ロジックの分類軸としては使わない。
- 案件データベース設計時も、このタブ分類に依存しない前提で進める。

## 2026-05-26 Staging移行後TODO

- O-010 staging検証は完了扱い。staging公開前の最低限確認はOK。
- 次の作業は以下を別Issue/PRに分けて進める。

| 優先順 | Issue案 | 内容 | メモ |
|---|---|---|---|
| 1 | O-011: Next.js security warning対応 | Next.js 14.2.15 security warningの解消、または対応方針の明文化 | staging公開前または公開直後の改善タスク。O-010合否とは分離する |
| 2 | O-012: ADMIN / SALES / VIEWER 権限制御の棚卸しと仕様化 | ロールごとの閲覧・作成・編集・同期管理・設定操作の可否を確認 | アカウント招待機能より先に固める |
| 3 | O-013: アカウント登録・招待機能の設計 | 管理者によるユーザー作成、招待メール、初回パスワード設定、role指定を設計 | 現状はDB直接追加と初期パスワード設定で対応済み |
| 4 | O-014: SMTP本番運用方針の整理 | no-reply@skv.co.jp、Google Workspace SMTP Relay、現行Gmail SMTP継続の比較 | 現状は暫定的に個人Google Workspace SMTPを利用 |
| 5 | O-015: Gmail分類精度改善の設計 | 未分類メールの傾向分析、分類ルール改善、AI分類の検討 | 未分類が残っているため今後改善する |

- GitHub / Vercel / Neon / Cloudflareなど開発・環境操作に関わる管理は、現時点では佐藤翔太のみで運用する方針。
- SES Consoleアプリ内のADMINはアプリ権限であり、外部サービスの管理権限とは分けて考える。
