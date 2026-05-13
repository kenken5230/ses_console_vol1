# 公開準備 見直し・MD反映・ユーザー判断反映タスク v0.1

作成日: 2026-05-11

## 1. 目的

公開準備設計書とは別に、以下だけを追えるようにする。

- 見直し済みの内容
- Markdownへ反映済みの内容
- ユーザー判断を反映済みのタスク
- 次に実装へ進む前の確定事項

対象ドキュメント:

- `docs/release/public-release-readiness-v0.1.md`
- `docs/release/public-release-readiness-v0.2.md`

## 2. 見直し済み事項

| ID | 見直し内容 | 結果 | 反映先 |
|---|---|---|---|
| R-001 | Gmail取得アカウント | 当面 `sho.sato@skv.co.jp` を使い、`sho.sato@skv.co.jp` のGmail上で見える `to:ses@skv.co.jp` を取得する | `docs/release/public-release-readiness-v0.2.md` |
| R-002 | `ses@skv.co.jp` の扱い | Googleグループであり、OAuth対象にしない | `docs/release/public-release-readiness-v0.2.md` |
| R-003 | ログイン方式 | 初期公開はメール/パスワード方式で進める。Google Workspaceログインは将来候補 | `docs/release/public-release-readiness-v0.2.md` |
| R-004 | パスワード再設定 | パスワードリセットメール送信を最低限必要な機能に入れる | `docs/release/public-release-readiness-v0.2.md` |
| R-005 | 権限方針 | `MANAGER` に同期・分類・抽出権限を持たせる。ただしGmail削除、返信、送信、既読化、ラベル操作はしない | `docs/release/public-release-readiness-v0.2.md` |
| R-006 | 公開構成 | Vercel Hobby + Neon Free PostgreSQL + Cloudflare Workers Cron Free を前提にする | `docs/release/public-release-readiness-v0.2.md` |
| R-007 | 15分自動更新 | Vercel Hobby Cronではなく、Cloudflare Workers CronからVercel管理APIを呼ぶ | `docs/release/public-release-readiness-v0.2.md` |
| R-008 | 手動更新 | 画面上の更新ボタンから、Cronと同じ管理APIを呼ぶ | `docs/release/public-release-readiness-v0.2.md` |
| R-009 | Gmail OAuth secret管理 | 本番では `secrets/gmail-oauth-client.json` を使わず、Vercel環境変数へ移す | `docs/release/public-release-readiness-v0.2.md` |
| R-010 | DB分離 | local / staging / production を分ける | `docs/release/public-release-readiness-v0.2.md` |
| R-011 | 本番事故防止 | 本番で `seed`、`migrate reset`、`db push` を禁止する | `docs/release/public-release-readiness-v0.1.md`, `docs/release/public-release-readiness-v0.2.md` |
| R-012 | タブ分類 | HR / FINANCE / MARKETING / 管理部採用は業務分類ロジックに使わず、案件 / 要員 / 未分類を主軸にする | `docs/release/public-release-readiness-v0.2.md` |

## 3. Markdown反映済み事項

| ID | 反映内容 | 状態 |
|---|---|---|
| M-001 | 公開前の一般チェックリストを作成 | 完了 |
| M-002 | secrets / `.env` / refresh token 管理方針を記載 | 完了 |
| M-003 | 開発DB、共有DB、本番DBの分離方針を記載 | 完了 |
| M-004 | `sho.sato@skv.co.jp` 依存リスクを記載 | 完了 |
| M-005 | Gmail取得専用アカウント案を記載 | 完了 |
| M-006 | ログイン制御方針を記載 | 完了 |
| M-007 | 閲覧、同期、分類、抽出の権限方針を記載 | 完了 |
| M-008 | Gmail同期管理画面の必要性を記載 | 完了 |
| M-009 | エラー時のログ確認方法を記載 | 完了 |
| M-010 | Vercel Hobby / Neon Free / Cloudflare Workers Cron構成を記載 | 完了 |
| M-011 | 環境変数一覧を記載 | 完了 |
| M-012 | Vercel / Neon / Cloudflare Worker側の設定項目を記載 | 完了 |
| M-013 | 15分Cron設計を記載 | 完了 |
| M-014 | 手動更新API設計を記載 | 完了 |
| M-015 | セキュリティ対策を記載 | 完了 |
| M-016 | デプロイ手順を記載 | 完了 |
| M-017 | 運用手順を記載 | 完了 |
| M-018 | リスクと注意点を記載 | 完了 |
| M-019 | 参照した公式情報を記載 | 完了 |

## 4. ユーザー確認済みタスク

### 4.1 優先確認

| ID | 確定事項 | 判断 | 理由 |
|---|---|---|---|
| U-001 | 初期ログイン方式 | メール/パスワード方式で進める | Google Workspaceログインは将来候補 |
| U-002 | パスワードリセットメール送信元 | `MAIL_FROM` とSMTP系envで管理する | 具体的なSMTPサービス名は実装時に環境変数で差し替え可能にする |
| U-003 | `MANAGER` 権限 | 手動同期・分類・抽出を許可する | Gmail読み取りのみ、削除/送信/既読化/ラベル操作/添付保存なしを前提にする |
| U-004 | `SALES` 権限 | 同期・分類・抽出は不可 | 案件/要員の作成・編集、未分類から案件/要員への移動は可能 |
| U-005 | staging | 本番公開前に必ず作る | Neon staging database/branch と Vercel staging deploy で確認する |

### 4.2 後続確定事項

| ID | 確定事項 | 理由 |
|---|---|---|
| U-006 | Neon Free容量不足時 | 初期は無料枠で開始し、容量不足時は使用量確認、bodyHtml保存制限、有料化を検討する | Gmail本文を長期保存するため |
| U-007 | Gmail取得専用アカウント | 当面は `sho.sato@skv.co.jp`、将来 `ses-ingest@skv.co.jp` 等を検討する | 今回の移管前検証ではブロッカーにしない |
| U-008 | 同期エラー通知先 | 初期はADMIN向け通知・確認導線を作る | `ADMIN_EMAILS` または将来の通知設定で差し替え可能にする |
| U-009 | Cloudflare / Vercel / Neon 管理者 | 複数管理者を推奨する | 退職・異動リスク対策として権限移譲とtoken再発行手順を運用手順に含める |
| U-010 | パスワードポリシー | 最低12文字、hash保存、reset URL有効期限30分、reset token非平文・ログ非表示 | 初期パスワード配布ではなくreset URLから設定する |

## 5. 次フェーズ実装タスク

確定方針に基づき、以下の順で進める。

| 優先度 | タスク | 実装前提 |
|---|---|---|
| 1 | メール/パスワードログイン | `users` テーブル活用。必要ならpassword用テーブル追加を設計 |
| 2 | パスワードリセット | SMTP/メール送信サービス決定後 |
| 3 | role制御 | `ADMIN` / `MANAGER` / `SALES` / `VIEWER` |
| 4 | Gmail OAuth env化 | 本番では `secrets/*.json` を読まない |
| 5 | Gmail同期管理API | Cron/手動共通API |
| 6 | job lock | Cronと手動更新の同時実行防止 |
| 7 | sync run logs | 実行履歴とエラー追跡 |
| 8 | 手動更新ボタン | role制御つき |
| 9 | Cloudflare Worker Cron | 15分ごとに管理APIを呼ぶ |
| 10 | Neon staging移行検証 | migrationと接続確認 |
| 11 | Vercel staging deploy検証 | ログイン、一覧、同期API確認 |

## 6. 今回の検証メモ

- `docs/release/public-release-readiness-v0.2.md` に指定された公開構成が反映されていることを確認済み
- secret実値がMarkdownに混ざっていないことを確認済み
- まだコード変更、DB変更、デプロイ実装は行っていない
- このファイルは、確定方針と次フェーズ実装の入口として使う
