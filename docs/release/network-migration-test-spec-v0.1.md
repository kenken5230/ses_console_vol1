# SES Console ネットワーク移管前テスト仕様書 v0.1

作成日: 2026-05-12

## 1. テスト目的

SES Console を社内ネットワーク、staging、本番相当環境へ移管する前に、公開準備設計・Gmail同期設計・DB設計・権限制御方針の整合性を確認する。

画面機能の目視確認はユーザー側で完了済みとし、本仕様書では以下を中心に検証する。

- 認証
- 権限
- Gmail同期
- DB環境分離
- secrets / token管理
- ジョブログ
- 危険コマンド対策
- staging移行準備

## 2. 前提条件

- 本番デプロイはしない。
- 本番DBへ接続しない。
- production相当DBで `seed`、`migrate reset`、`db push`、`truncate`、`delete` を実行しない。
- secret値、refresh token、client secret、認証URLのcode、password reset tokenをMarkdownやログに出さない。
- 実メール本文をレポートに貼らない。
- DB更新を伴うテストは、事前に目的・対象・ロールバック方法を明記してから実行する。
- 読み取り専用テストとDB更新テストを分ける。
- 失敗時は、修正より先に原因・再現手順・影響範囲を記録する。

## 3. ユーザー判断反映済み

以下は確認待ちではなく、確定方針として扱う。

| ID | 確定方針 |
|---|---|
| U-001 | 初期ログイン方式: メール/パスワード方式で進める |
| U-002 | パスワードリセットメール送信元: `MAIL_FROM` / SMTP系envで管理し、実値はsecret扱い |
| U-003 | MANAGER権限: 手動同期・分類・抽出を条件付きで許可 |
| U-004 | SALES権限: 同期・分類・抽出は不可 |
| U-005 | staging: 本番公開前に必ず作る |
| U-006 | Neon容量不足時: 初期は無料枠、容量不足時は使用量監視・bodyHtml制限・有料化を検討 |
| U-007 | Gmail取得専用アカウント: 当面 `sho.sato@skv.co.jp`、将来専用アカウントを検討 |
| U-008 | 同期エラー通知先: 初期はADMIN向け通知・確認導線を作る |
| U-009 | Cloudflare / Vercel / Neon 管理者: 複数管理者推奨、運用手順に記録 |
| U-010 | パスワードポリシー: 最低12文字、reset URL有効期限30分、token/secret非表示 |

## 4. 対象範囲

- `docs/release/` の公開準備設計
- `docs/gmail/` のGmail取り込み・分類・抽出設計
- `docs/db-design-v0.1.md`
- `docs/README.md`
- `package.json`
- `.gitignore`
- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/seed.ts`
- `scripts/gmail-*.ts`
- `lib/prisma.ts`
- `app/api/**`
- 認証・権限・同期APIについては、未実装箇所の洗い出しも対象とする

## 5. 対象外範囲

- 本番デプロイ
- 本番DB接続
- Neon staging branchの実作成
- Vercel staging deployの実作成
- Cloudflare Worker実装・Cron有効化
- 本番secretの登録
- 実メール本文のレポート貼付
- 全件Gmail抽出
- Gmailラベル操作、既読化、削除、返信、送信、添付保存

## 6. テスト環境

| 項目 | 内容 |
|---|---|
| ローカル環境 | Windows / PowerShell |
| DB | ローカルPostgreSQL想定 |
| Prisma | Prisma v7 / PostgreSQL adapter |
| Gmail OAuth | `sho.sato@skv.co.jp` のtokenがローカル `secrets/` にある想定 |
| Gmail query | `to:ses@skv.co.jp` |
| 本番環境 | 未作成、未接続 |
| staging環境 | 未作成、仕様上は必須 |

## 7. リスク一覧

| ID | リスク | 影響 | テスト観点 |
|---|---|---|---|
| R-001 | secretがGitやMarkdownに混入 | 高 | secret pattern scan |
| R-002 | 本番DBでseed/reset/db push誤実行 | 高 | scriptsと手順確認 |
| R-003 | Gmail OAuthアカウント依存 | 中 | 方針確認 |
| R-004 | 同期APIに権限チェックがない | 高 | API Route確認 |
| R-005 | MANAGER/SALES権限の分離不足 | 高 | RBAC設計/実装確認 |
| R-006 | 二重同期 | 高 | job lock設計確認 |
| R-007 | ジョブログ不足 | 中 | mail_sync_runs方針確認 |
| R-008 | Neon Free容量不足 | 中 | bodyHtml保存量監視方針確認 |
| R-009 | 一覧の勝手なリロード | 中 | 設計確認、人間確認 |
| R-010 | stagingなしで本番公開 | 高 | staging必須ゲート確認 |

## 8. Codexで確認できる事項

- docs構成と実ファイルの一致
- 旧方針、確認待ち表現、矛盾の有無
- `.gitignore` にsecret除外があるか
- secretらしい値がMarkdownやソースに直書きされていないか
- `package.json` scriptsの分類
- Prisma schemaのロール、Gmail関連テーブル、sourceMailId、bodyHtml有無
- Gmail scriptsが `gmail.readonly` / `to:ses@skv.co.jp` を前提にしているか
- TypeScriptチェック
- Next.js build
- 読み取り専用コマンドの実行可否
- DB更新コマンドを実行してよい安全条件が満たされているか

## 9. 人間が最終確認する事項

- 画面の未ログインアクセス不可
- ログイン・パスワードリセットメール送信
- ADMIN / MANAGER / SALES / VIEWER の画面表示差分
- 手動同期ボタンの表示/非表示
- 同期完了後に一覧が勝手にリロードされないこと
- stagingのVercel URLでの画面表示
- Neon staging branchの管理画面
- Cloudflare Worker Cronの実行ログ
- secret登録先の管理権限
- 複数管理者体制

## 10. テストケース一覧

### A. リポジトリ・ドキュメント整合性

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| A-001 | Read | docs構成と実ファイル | `Get-ChildItem -Recurse docs` | `docs/README.md` の記載と一致 | 記入 |
| A-002 | Read | README参照 | root `README.md` または `docs/README.md` を確認 | 参照docsが存在 | 記入 |
| A-003 | Read | 公開準備docsの矛盾確認 | `rg "確認待ち|要決定|将来候補|メール/パスワード|MANAGER"` | U-001〜U-010が確定方針と衝突しない | 記入 |
| A-004 | Read | 業務タブ方針 | `rg "HR / FINANCE / MARKETING|案件/要員/未分類"` | HR系は業務分類ロジックに使わない | 記入 |

### B. secrets / .env / token管理

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| B-001 | Read | secret系ファイルのGit除外 | `Get-Content .gitignore` | `.env*`, `secrets/`, `gmail-oauth-client.json`, `*.secret.json` がある | 記入 |
| B-002 | Read | secret実値混入チェック | `rg "client_secret\\s*[:=]|refresh_token\\s*[:=]|access_token\\s*[:=]|ya29\\.|GOCSPX-|AIza"` | 実値らしい文字列が出ない | 記入 |
| B-003 | Read | 本番はenv化 | docs確認 | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` 方針あり | 記入 |
| B-004 | Read | browserへsecretを出さない方針 | docs / app確認 | `ADMIN_SECRET`, `CRON_SECRET`, SMTP secretをclientへ渡さない | 記入 |
| B-005 | Design | reset token非平文 | docs確認 | 平文保存/ログ出力禁止がある。実装は未実装なら未実行 | 記入 |

### C. DB環境分離・危険コマンド対策

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| C-001 | Read | DB分離方針 | docs確認 | local/staging/productionが分離 | 記入 |
| C-002 | Read | 危険コマンド禁止方針 | docs確認 | seed/reset/db push/truncate/delete禁止 | 記入 |
| C-003 | Read | seed guard有無 | `Get-Content prisma/seed.ts` | production guardがあること | 記入 |
| C-004 | Read | Prisma config | `Get-Content prisma.config.ts` | `DATABASE_URL` 参照。DIRECT_URL方針はdocsにある | 記入 |
| C-005 | Human/Staging | staging migration | Neon stagingで `prisma migrate status/deploy` | 本番前ゲートとしてPASS | 記入 |

### D. Gmail取得前提

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| D-001 | Read | `ses@skv.co.jp` はGoogleグループ | docs確認 | OAuth対象にしない | 記入 |
| D-002 | Read | OAuth対象 | scripts/docs確認 | `sho.sato@skv.co.jp` / `userId=me` | 記入 |
| D-003 | Read | Gmail query | `rg "GMAIL_QUERY|to:ses@skv.co.jp|deliveredto"` | 初期実装は `to:ses@skv.co.jp` | 記入 |
| D-004 | Read | scope | `rg "gmail.readonly|gmail.modify|gmail.send"` | `gmail.readonly` のみ | 記入 |
| D-005 | Read | Gmail禁止操作 | `rg "delete|trash|modify|send|attachments"` scripts app lib` | 削除/既読化/ラベル/送信/添付保存なし | 記入 |

### E. 認証・ログイン

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| E-001 | Design | 初期ログイン方式 | 本仕様書とdocs確認 | メール/パスワード確定 | 記入 |
| E-002 | Design | パスワードポリシー | 本仕様書確認 | 12文字以上、hash保存、reset 30分 | 記入 |
| E-003 | Read | 現在の認証実装有無 | `rg "password|auth|session|isActive|role" app lib prisma` | 未実装なら移管不可要件として記録 | 記入 |
| E-004 | Human/Staging | 未ログインアクセス | staging URLで確認 | 未ログインは画面/API不可 | 記入 |
| E-005 | Human/Staging | password reset mail | stagingで確認 | reset URL有効期限30分、token非表示 | 記入 |

### F. RBAC / 権限制御

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| F-001 | Read | enum UserRole | `rg "enum UserRole|ADMIN|MANAGER|SALES|VIEWER|SYSTEM" prisma/schema.prisma` | role定義あり | 記入 |
| F-002 | Design | 権限マトリクス | 本仕様書確認 | SALESは同期不可、MANAGERは同期可 | 記入 |
| F-003 | Read | API roleチェック | `rg "role|isActive|session|ADMIN|MANAGER|SALES" app/api` | API Route単位で認証/roleチェックが必要 | 記入 |
| F-004 | Human/Staging | 未分類移動権限 | staging画面/API | SALES可、VIEWER不可 | 記入 |

### G. Gmail同期管理API・手動同期

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| G-001 | Design | Cron/手動共通API | docs確認 | 共通API方針あり | 記入 |
| G-002 | Read | 現在API有無 | `rg "gmail.*sync|CRON_SECRET|ADMIN_SECRET" app/api scripts` | 未実装なら要実装 | 記入 |
| G-003 | Human/Staging | 手動同期ボタン | staging画面 | ADMIN/MANAGERのみ表示 | 記入 |
| G-004 | Human/Staging | 自動reloadなし | staging画面 | 通知のみ、手動反映 | 記入 |
| G-005 | Read | APIレスポンス安全性 | 実装後に確認 | secret/本文全文を返さない | 記入 |

### H. job lock / 二重実行防止

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| H-001 | Design | lock方式 | docs確認 | DB table lease推奨 | 記入 |
| H-002 | Read | 現在実装有無 | `rg "mail_sync_runs|job_locks|advisory|already_running" prisma app scripts` | 未実装なら要実装 | 記入 |
| H-003 | Human/Staging | 同時実行 | stagingで同時リクエスト | 片方は `already_running` | 記入 |
| H-004 | Design | 異常終了時解除 | docs/実装確認 | lock期限切れ方針あり | 記入 |

### I. sync run logs / ジョブログ

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| I-001 | Design | ジョブログ項目 | docs確認 | startedAt/finishedAt/status/count/error等 | 記入 |
| I-002 | Read | 現在テーブル有無 | `rg "mail_sync_runs|sync.*run|triggeredByUserId" prisma app scripts` | 未実装なら要実装 | 記入 |
| I-003 | Read | errorStack安全性 | 実装後に確認 | secret/token/bodyなし | 記入 |
| I-004 | Design | ADMIN通知 | docs確認 | ADMIN向け通知、env差し替え可能 | 記入 |

### J. Gmail分類・抽出コマンド

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| J-001 | Read | scripts一覧 | `Get-Content package.json` | Gmail scriptsあり | 記入 |
| J-002 | Read | 読み取り/更新分類 | package/scripts確認 | test/stats/preview/duplicates/mismatchesは原則読み取り | 記入 |
| J-003 | Execute/Read | TypeScript | `npm.cmd exec tsc -- --noEmit --pretty false` | 成功 | 記入 |
| J-004 | Execute/Build | build | `npm.cmd run build` | 成功 | 記入 |
| J-005 | Execute/Read | stats | `npm.cmd run gmail:stats -- --from=2026-03-01` | 実メール本文を出さず件数確認 | 記入 |
| J-006 | Execute/Read | duplicates | `npm.cmd run gmail:extract:duplicates` | 0件または内容記録 | 記入 |
| J-007 | Execute/Read | mismatches | `npm.cmd run gmail:extract:mismatches` | 0件または内容記録 | 記入 |
| J-008 | Skip/Update | sync/classify/extract | 少量limitのみ。実施前にロールバック明記 | 移管前は原則未実行 | 記入 |

### K. Neon / Vercel / Cloudflare staging移行検証

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| K-001 | Human/Staging | Neon staging作成 | Neon管理画面 | staging branch/databaseあり | 記入 |
| K-002 | Human/Staging | Vercel staging deploy | Vercel管理画面 | staging URLで起動 | 記入 |
| K-003 | Human/Staging | Cloudflare Workerテスト | 手動fetchまたはテストCron | staging APIのみ呼ぶ | 記入 |
| K-004 | Design | 15分Cron | docs確認 | 自動reloadせずDB保存と通知のみ | 記入 |
| K-005 | Human | 無料枠再確認 | 公式情報確認 | 実装直前に最新化 | 記入 |
| K-006 | Human | 複数管理者 | 運用手順 | 管理者を1人に固定しない | 記入 |

### L. セキュリティ・ログ

| ID | 種別 | 確認内容 | 実行コマンド/手順 | 期待結果 | 実行結果 |
|---|---|---|---|---|---|
| L-001 | Read | 管理API認証 | app/api確認 | 認証なしで管理API不可 | 記入 |
| L-002 | Design | `CRON_SECRET` | docs確認 | Cloudflare server-to-serverのみ | 記入 |
| L-003 | Design | `ADMIN_SECRET` | docs確認 | ブラウザに渡さない | 記入 |
| L-004 | Read | secret/bodyログ | `rg "console\\.log|console\\.error" scripts app lib` | token/本文全文を出さない | 記入 |
| L-005 | Design | reset tokenログ | docs/実装確認 | reset tokenをログに出さない | 記入 |

### M. 移管可否判定

| ID | 判定条件 | 必須 | 結果 |
|---|---|---:|---|
| M-001 | 必須テストPASS | はい | 記入 |
| M-002 | U-001〜U-010が確定方針として反映 | はい | 記入 |
| M-003 | 本番DB事故防止策あり | はい | 記入 |
| M-004 | 未ログインアクセス不可 | はい | 記入 |
| M-005 | 同期/抽出の権限分離 | はい | 記入 |
| M-006 | MANAGER同期可、SALES同期不可 | はい | 記入 |
| M-007 | ジョブログ追跡可能 | はい | 記入 |
| M-008 | 二重実行防止 | はい | 記入 |
| M-009 | staging migration/起動確認済み | はい | 記入 |
| M-010 | secret実値漏れなし | はい | 記入 |
| M-011 | 一覧が勝手にリロードされない | はい | 記入 |

## 11. 実行コマンド

### 11.1 読み取り・静的確認

```powershell
git status --short
Get-Content -LiteralPath package.json
Get-Content -LiteralPath .gitignore
Get-Content -LiteralPath prisma.config.ts
rg -n "enum UserRole|GMAIL_QUERY|gmail.readonly|migrate reset|seed|CRON_SECRET|ADMIN_SECRET" docs prisma scripts app lib --glob "!app/generated/**"
rg -n "client_secret\s*[:=]|refresh_token\s*[:=]|access_token\s*[:=]|ya29\.|GOCSPX-|AIza" docs app components lib scripts prisma package.json .gitignore --glob "!app/generated/**"
```

### 11.2 型・build

```powershell
npm.cmd exec tsc -- --noEmit --pretty false
npm.cmd run build
```

### 11.3 読み取り系Gmail/抽出確認

```powershell
npm.cmd run gmail:stats -- --from=2026-03-01
npm.cmd run gmail:extract:duplicates
npm.cmd run gmail:extract:mismatches
```

### 11.4 DB更新系は原則未実行

以下はDB更新を伴うため、移管前テストでは原則実行しない。

```powershell
npm.cmd run gmail:sync
npm.cmd run gmail:classify
npm.cmd run gmail:extract
```

実行する場合は、以下を満たすこと。

- stagingまたはローカルDBであること
- `DATABASE_URL` が本番ではないこと
- `--limit` 付きで少量にすること
- 実行前件数を記録すること
- 重複確認・mismatch確認を実行すること
- ロールバック方法を記載すること

## 12. 期待結果

- secret実値が検出されない
- 本番危険コマンドは方針として禁止されている
- Gmail取得は `sho.sato@skv.co.jp` / `userId=me` / `to:ses@skv.co.jp`
- Gmail scopeは `gmail.readonly`
- Gmail削除、既読化、ラベル操作、送信、添付保存はない
- `UserRole` に `ADMIN` / `MANAGER` / `SALES` / `VIEWER` / `SYSTEM` がある
- 認証/RBAC/ジョブログ/job lockは未実装なら移管不可要件として記録される
- TypeScriptとbuildが成功する
- stats/duplicates/mismatchesが実メール本文を出さずに確認できる
- DB更新系は安全条件なしでは実行しない

## 13. 実行結果記入欄

結果は `docs/release/network-migration-test-report-v0.1.md` に記録する。

| テストID | 結果 | メモ |
|---|---|---|
| A-001〜M-011 | 未実行 | レポートに記入 |

## 14. 未解決課題

2026-05-12時点で、認証/RBAC、Gmail同期管理API、`CRON_SECRET` / `ADMIN_SECRET` 認証、`mail_sync_runs` / `job_locks`、production guard、本番Gmail OAuth env化はlocal確認まで完了している。

移管前に残る主な未解決課題:

- Vercel/Neon/Cloudflare staging未作成
- staging環境でのmigration、ログイン、一覧表示、同期API実HTTP確認
- Cloudflare Worker Cronからstaging APIを呼ぶ確認
- SMTP環境変数設定後のpassword resetメール実送信確認
- 重大エラー通知先と運用手順書の整備
- production guard対象外の局所的なDB更新APIについて、認証/RBACと対象範囲をstagingで再確認

## 15. 移管可否判定

判定基準:

- `PASS`: 本番公開前の必須条件を満たす
- `CONDITIONAL`: staging移管は可能だが、本番公開前に修正必須
- `BLOCKED`: staging移管または本番公開に進めない

初期想定:

現時点では認証、RBAC、同期管理API、job lock、ジョブログ、production guard、本番Gmail OAuth env化はlocal確認まで完了している。ただしstaging実機確認が未完了のため、本番移管は引き続き `BLOCKED` とする。staging移管は、staging専用DBとstaging用envを設定し、本番DBへ接続しない前提で `CONDITIONAL` とする。
