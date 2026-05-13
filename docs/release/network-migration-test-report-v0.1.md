# ネットワーク移管前 テスト実行レポート v0.1

作成日: 2026-05-12

## 1. テスト概要

`docs/release/network-migration-test-spec-v0.1.md` に基づき、社内ネットワークまたはstaging/本番環境へ移管する前の確認を行った。

今回は本番デプロイ、本番DB接続、DB更新を伴う同期・分類・抽出は実行していない。Codexで確認可能な範囲として、リポジトリ整合性、secret管理方針、Prisma/Next.jsビルド、Gmail read-only取得、既存DB統計、抽出重複チェックを確認した。

## 2. 実行環境

| 項目 | 内容 |
|---|---|
| 実行日 | 2026-05-12 |
| workspace | `C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1` |
| DB接続 | ローカル `.env` の `DATABASE_URL` |
| Gmail取得 | `userId=me` / `q=to:ses@skv.co.jp` |
| Gmail scope | `gmail.readonly` |
| 本番DB | 未接続 |
| 本番デプロイ | 未実施 |

## 3. 作成・更新したドキュメント

| ファイル | 内容 |
|---|---|
| `docs/release/network-migration-test-spec-v0.1.md` | ネットワーク移管前テスト仕様書 |
| `docs/release/network-migration-test-report-v0.1.md` | 本レポート |
| `docs/release/network-migration-open-issues-v0.1.md` | 未解決課題一覧 |
| `docs/release/public-release-readiness-v0.2.md` | 末尾の旧残事項セクションを確定方針へ更新 |
| `docs/release/public-release-review-tasks-v0.1.md` | U-001〜U-010を確認済みタスクとして更新 |

## 3.1 P0認証実装後の追記

追記日: 2026-05-12

ネットワーク移管前BLOCKED理由のうち、認証・パスワードリセット・API Route共通guard・RBACの初期実装を追加した。

追加・変更した主な範囲:

- `prisma/schema.prisma`
- `prisma/migrations/20260512090000_auth_p0/migration.sql`
- `lib/auth.ts`
- `lib/mailer.ts`
- `app/api/auth/*`
- `app/api/dashboard-data/route.ts`
- `app/api/projects/route.ts`
- `app/api/persons/route.ts`
- `app/api/entities/move-to-unclassified/route.ts`
- `app/api/mail-notifications/[id]/extract/route.ts`
- `app/page.jsx`
- `components/LoginPanel.jsx`
- `components/Header.jsx`
- `components/SearchToolbar.jsx`
- `components/ProjectTable.jsx`
- `components/ProjectDetailPane.jsx`
- `components/PersonDetailPane.jsx`
- `components/UnclassifiedMailDetailPane.jsx`
- `app/globals.css`

DB更新について:

- migration SQLは作成済み。
- production DBには未接続。
- local DB `ses_console_dev` へauth migrationを適用済み。
- 初回適用時にSQLファイル先頭BOMが原因で失敗したため、migrationをrolled-backに解決し、BOMなしSQLへ修正して再適用した。
- `password_hash` は既存ユーザー互換のためnullable。未設定ユーザーはpassword login不可。
- 初期パスワード配布ではなく、password reset URLから設定する方針。

## 3.2 P0認証/RBAC実機確認追記

追記日: 2026-05-12

local DB `ses_console_dev` と一時起動したローカルNext.js dev serverで、認証/RBACの実HTTP確認を行った。本番DB、本番デプロイ、production相当環境には接続していない。

検証用ユーザー:

| role | email | 状態 |
|---|---|---|
| ADMIN | `p0-admin@example.invalid` | active / password hashあり |
| MANAGER | `p0-manager@example.invalid` | active / password hashあり |
| SALES | `p0-sales@example.invalid` | active / password hashあり |
| VIEWER | `p0-viewer@example.invalid` | active / password hashあり |
| SALES | `p0-inactive@example.invalid` | inactive / password hashあり |
| SALES | `p0-unset@example.invalid` | active / password hashなし |

実行前の安全条件:

- DB更新はlocal DB `ses_console_dev` の検証用 `p0-*` ユーザーに限定。
- 本番DB、staging DB、production相当DBには接続していない。
- reset token、reset URL、password、AUTH_SECRET、SMTP passwordは出力していない。
- ロールバックする場合は、`p0-*` ユーザーを無効化、またはlocal DBから整理する。

実HTTP確認結果:

| テスト | 期待 | 結果 |
|---|---:|---:|
| ADMIN login | 200 | 200 |
| MANAGER login | 200 | 200 |
| SALES login | 200 | 200 |
| VIEWER login | 200 | 200 |
| wrong password | 401 | 401 |
| password未設定ユーザーlogin | 401 | 401 |
| `isActive=false` ユーザーlogin | 401 | 401 |
| dashboard未ログイン | 401 | 401 |
| dashboard ADMIN/MANAGER/SALES/VIEWER | 200 | 200 |
| projects POST ADMIN/MANAGER/SALES | guard通過後400 | 400 |
| projects POST VIEWER | 403 | 403 |
| persons POST ADMIN/MANAGER/SALES | guard通過後400 | 400 |
| persons POST VIEWER | 403 | 403 |
| move-to-unclassified ADMIN/MANAGER/SALES | guard通過後400 | 400 |
| move-to-unclassified VIEWER | 403 | 403 |
| mail extract ADMIN/MANAGER/SALES | guard通過後404 | 404 |
| mail extract VIEWER | 403 | 403 |
| logout | 200 | 200 |
| logout後、Cookieなしdashboard | 401 | 401 |
| password reset request | 202 | 202 |

Password reset token確認:

| テスト | 期待 | 結果 |
|---|---:|---:|
| reset token TTL | 30分 | 30分 |
| token平文保存 | false | false |
| token hash length | 64 | 64 |
| reset confirm | 200 | 200 |
| 使用済みtoken再利用 | 400 | 400 |
| reset request responseにtokenらしき値 | false | false |

UI確認:

- 未ログイン時は `LoginPanel` を表示し、アプリ本体を表示しない実装になっている。
- `VIEWER` では作成ボタン、編集、アーカイブ、未分類移行、案件/要員化ボタンを非表示にする実装になっている。
- ADMIN / MANAGER / SALES は案件/要員作成・編集・未分類移動のUI導線を表示する実装。
- 当時、同期管理API/同期ボタンは未実装だったため対象外とした。これは本レポート3.3のO-004〜O-007実装で解消済み。
- ブラウザ目視ではなく、実装確認とHTTP確認での判定。

## 3.3 P0同期管理API / job lock / ジョブログ実装後の追記

追記日: 2026-05-12

ネットワーク移管前P0のうち、O-004〜O-007 / F-005〜F-008 を実装した。

追加・変更した主な範囲:

- `prisma/schema.prisma`
- `prisma/migrations/20260512103000_gmail_admin_jobs/migration.sql`
- `lib/gmail-admin-jobs.ts`
- `app/api/admin/gmail/sync-run/route.ts`
- `app/api/admin/gmail/sync-runs/route.ts`
- `app/api/admin/gmail/sync-runs/latest/route.ts`
- `app/page.jsx`
- `components/SearchToolbar.jsx`
- `components/ProjectDetailPane.jsx`

実装内容:

- `POST /api/admin/gmail/sync-run` をCron/手動更新の共通APIとして追加。
- 実行modeは `pipeline` / `sync` / `classify` / `extract` を受けられる設計にした。初期UIは `pipeline` を呼ぶ。
- 手動実行はログイン済み `ADMIN` / `MANAGER` のみ許可。`SALES` / `VIEWER` は403。
- Cron実行は `Authorization: Bearer CRON_SECRET`、運用用サーバー間実行は `Authorization: Bearer ADMIN_SECRET` で保護。
- `job_locks` によるDB lease方式で `gmail_sync_pipeline` の二重実行を防止。
- `mail_sync_runs` に実行者、実行元、mode、件数、status、エラー概要を保存。
- APIレスポンスとログにはsecret/token/メール本文全文を返さない。
- 画面上は `ADMIN` / `MANAGER` のみ「Gmail同期」ボタンを表示し、完了後も一覧を自動リロードせず、手動更新を促す。

DB更新について:

- production DBには未接続。
- local DB `ses_console_dev` へ `20260512103000_gmail_admin_jobs` migrationを適用済み。
- DB更新テストはlocal DBに限定し、API実行は `maxResults=1` の少量上限で確認した。
- ロールバックする場合は、local DBの `job_locks` / `mail_sync_runs` の検証ログを確認し、必要に応じてlocal DBのみで整理する。

local実HTTP確認結果:

| テスト | 期待 | 結果 |
|---|---:|---:|
| sync-run 未ログイン | 401 | 401 |
| sync-run SALES | 403 | 403 |
| sync-run VIEWER | 403 | 403 |
| sync-run ADMIN classify | 200 | 200 |
| sync-run MANAGER classify | 200 | 200 |
| sync-run bad bearer | 403 | 403 |
| sync-run Cron classify | 200 | 200 |
| sync-run ADMIN_SECRET classify | 200 | 200 |
| sync-run already_running | 202 | 202 |
| sync-run ADMIN sync | 200 | 200 |
| sync-run ADMIN pipeline | 200 | 200 |
| APIレスポンスに `bodyText` が含まれない | false | false |
| `GET /api/admin/gmail/sync-runs` ADMIN | 200 | 200 |
| `GET /api/admin/gmail/sync-runs/latest` MANAGER | 200 | 200 |
| sync run APIレスポンスにsecretが含まれない | false | false |
| `mail_sync_runs` に実行ログが保存される | true | true |
| `mail_sync_runs` にsecretが含まれない | false | false |

追加確認:

- `npm.cmd run gmail:extract:duplicates` は0件。
- `npm.cmd run gmail:extract:mismatches` は0件。
- ブラウザではログイン画面の表示まで確認。ブラウザ自動操作側のemail input制約により、ログイン後UIの自動目視は未完了。ただしrole別HTTPと実装確認では `ADMIN` / `MANAGER` のみ同期ボタン表示、`SALES` / `VIEWER` 非表示になることを確認した。

## 3.4 P0 production guard / Gmail OAuth env化実装後の追記
追記日: 2026-05-12

O-008 / O-009 の実装として、production相当環境での危険なDB更新CLIを拒否する `production guard` と、Vercel staging/productionでは `secrets/*.json` を読まずGmail OAuth情報を環境変数から読む構成を追加した。

追加・変更した主な範囲:

- `lib/production-guard.ts`
- `prisma/seed.ts`
- `scripts/gmail-sync-mail-notifications.ts`
- `scripts/gmail-classify-mail-notifications.ts`
- `scripts/gmail-extract-to-entities.ts`
- `scripts/gmail-extract-archive-mismatches.ts`
- `scripts/gmail-common.ts`
- `scripts/gmail-auth.ts`

production guard対象:

- `npm.cmd run seed`
- `npm.cmd run gmail:sync`
- `npm.cmd run gmail:classify`
- `npm.cmd run gmail:extract`
- `npm.cmd run gmail:extract:archive-mismatches`

guard判定:

- `NODE_ENV=production`
- `VERCEL_ENV=production`
- `DATABASE_URL` のhost / database / branch等がproduction相当に見える場合

Gmail OAuth env化:

- Vercel staging/production相当では `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` を必須にする。
- `GMAIL_REDIRECT_URI` は必要に応じてenvで指定する。
- ローカル開発では既存の `secrets/gmail-oauth-client.json` / `secrets/gmail-token.json` を引き続き利用できる。
- `gmail.readonly` scope、`userId=me`、`GMAIL_QUERY=to:ses@skv.co.jp` の前提は維持する。
- env不足時は不足しているenv名だけを返し、secret実値は出さない。

追加確認結果:

| 確認項目 | 結果 |
|---|---|
| `NODE_ENV=production` で `npm.cmd run seed` | PASS。production guardで拒否。DB書き込みなし |
| `NODE_ENV=production` で `npm.cmd run gmail:sync` | PASS。production guardで拒否。Gmail取得・DB書き込みなし |
| `NODE_ENV=production` で `npm.cmd run gmail:classify -- --limit=1` | PASS。production guardで拒否。DB書き込みなし |
| `NODE_ENV=production` で `npm.cmd run gmail:extract -- --limit=1` | PASS。production guardで拒否。DB書き込みなし |
| `NODE_ENV=production` で `npm.cmd run gmail:extract:archive-mismatches` | PASS。production guardで拒否。DB書き込みなし |
| production guard直接判定 | PASS。localは0件、production/database名production相当は検知 |
| Vercel preview相当でGmail env不足 | PASS。不足env名のみ表示、secret値なし |
| Vercel preview相当でGmail env mock読込 | PASS。envからclient/token構成を読込 |
| ローカル `secrets/*.json` fallback | PASS。localでは既存認証ファイルを利用可能 |
| `npm.cmd run gmail:test` | PASS。DB保存なしのread-only取得。メール本文はレポート未記載 |
| secret pattern scan | PASS。検出は変数名・型名・redaction patternのみで、secret実値なし |

## 4. 実行したコマンド

| 区分 | コマンド | 結果 |
|---|---|---|
| Git状態 | `git status --short` | PASS。ただし既存の未コミット変更が多数あり |
| docs確認 | `rg` / `Get-Content` によるdocs確認 | PASS。一部旧確認待ち表現を修正 |
| package確認 | `Get-Content package.json` | PASS |
| `.gitignore`確認 | `Get-Content .gitignore` | PASS |
| secret静的検査 | `rg` による token/client secret候補検索 | PASS。実値らしき値は検出なし |
| Prisma/schema確認 | `rg` による role/schema/Gmail関連確認 | PASS/FAIL混在 |
| API認証確認 | `rg` と実HTTPによる `app/api` のauth/role確認 | PASS。既存APIへguard適用済み、role別実HTTP確認済み |
| TypeScript | `npm.cmd exec tsc -- --noEmit --pretty false` | PASS |
| Next build | `npm.cmd run build` | PASS。webpack cache warningあり |
| Prisma Client生成 | `npm.cmd exec prisma generate` | PASS |
| local gmail admin migration | `npm.cmd exec -- prisma migrate deploy` | PASS。`20260512103000_gmail_admin_jobs` をlocal DBへ適用 |
| migration状態 | `npm.cmd exec -- prisma migrate status` | PASS。Database schema is up to date |
| 管理同期API実HTTP確認 | 一時dev server + Node fetch | PASS。未ログイン401、SALES/VIEWER 403、ADMIN/MANAGER 200、Cron/Admin secret 200、already_running 202 |
| 管理同期API pipeline確認 | 一時dev server + Node fetch | PASS。`pipeline` modeを `maxResults=1` で実行 |
| ジョブログ確認 | `mail_sync_runs` 直接確認 | PASS。件数/status/source/triggerを確認、secretや本文全文なし |
| Gmail統計 | `npm.cmd run gmail:stats -- --from=2026-03-01` | PASS |
| 抽出重複確認 | `npm.cmd run gmail:extract:duplicates` | PASS。重複0件 |
| 抽出不整合確認 | `npm.cmd run gmail:extract:mismatches` | PASS。不整合0件 |
| Gmail read-only取得 | `npm.cmd run gmail:test` | PASS。ネットワーク権限昇格後に50件取得 |
| Prisma Client生成 | `npm.cmd exec prisma generate` | PASS |
| local auth migration | `npm.cmd exec -- prisma migrate deploy` | PASS。初回BOM失敗後に修正し再適用 |
| migration状態 | `npm.cmd exec -- prisma migrate status` | PASS。Database schema is up to date |
| password hash検証 | `hashPassword` / `verifyPassword` 直接確認 | PASS。正しいpasswordはtrue、誤ったpasswordはfalse |
| 未ログインAPI拒否 | route handler直接呼び出し | PASS。dashboard/projects/persons/moveToUnclassified は401 |
| auth API基本応答 | password reset request / login missing | PASS。reset requestは202、login不足入力は400 |
| secret pattern scan | `rg` によるtoken候補検索 | PASS。実値は検出なし。docs内の検索パターン文字列のみ検出 |
| role別実HTTP確認 | 一時dev server + Node fetch | PASS。ADMIN/MANAGER/SALES/VIEWERの期待応答を確認 |
| password reset token検証 | tokenを出力しない直接確認 | PASS。30分TTL、hash保存、使用済み再利用不可 |

## 5. PASSした項目

### A. リポジトリ・ドキュメント整合性

- `docs/README.md` と `docs/` 配下の主要ドキュメントを確認できた。
- SES Consoleの主軸が「案件 / 要員 / 未分類」であり、HR / FINANCE / MARKETING / 管理部採用を業務分類ロジックに使わない方針がドキュメントに残っている。
- U-001〜U-010は確認待ちではなく、確定方針としてテスト仕様書に反映した。
- `public-release-readiness-v0.2.md` の旧「確認が必要」表現を確定方針へ更新した。

### B. secrets / .env / token管理

- `.gitignore` に `.env*`、`secrets/`、`gmail-oauth-client.json`、`*.secret.json` が含まれている。
- 静的検索では、secret実値、refresh token実値、client secret実値らしき値は検出されなかった。
- 検出されたのは変数名、型名、コマンド文字列であり、secret実値ではない。

### C. Gmail取得前提

- `ses@skv.co.jp` はOAuth対象にしない方針が反映されている。
- OAuth認証対象は当面 `sho.sato@skv.co.jp`。
- Gmail API `userId` は `me`。
- 初期クエリは `to:ses@skv.co.jp`。
- `deliveredto:ses@skv.co.jp` を初期実装で使わない方針が反映されている。
- Gmail scopeは `gmail.readonly`。

### D. ビルド・型チェック

- `npm.cmd exec tsc -- --noEmit --pretty false` は成功した。
- `npm.cmd run build` は成功した。
- build時にwebpack cache warningは出たが、ビルド自体は成功した。

### E. Gmail / 抽出確認

- `gmail:test` はDB保存なしで50件取得できた。
- `gmail:stats -- --from=2026-03-01` でローカルDB内の3月以降データを集計できた。
- `gmail:extract:duplicates` は0件だった。
- `gmail:extract:mismatches` は0件だった。

## 6. FAILした項目

| ID | 項目 | 結果 | 影響 |
|---|---|---|---|
| F-001 | メール/パスワード認証 | PASS | local実HTTPでlogin/logout、誤password、password未設定、`isActive=false`拒否を確認 |
| F-002 | パスワードリセット | PASS | SMTP未設定のため実送信は未実行だが、安全な代替確認として202応答、30分TTL、hash保存、使用済みtoken再利用不可、token非表示を確認 |
| F-003 | API Route認証 | PASS | 未ログイン401、ログイン済みdashboard 200、更新系APIのrole別401/403/guard通過を確認 |
| F-004 | RBAC | PASS | ADMIN/MANAGER/SALESは既存更新系APIのguard通過、VIEWERは403を確認。同期管理APIはADMIN/MANAGERのみ許可、SALES/VIEWERは403を確認 |
| F-005 | 管理同期API | PASS | `POST /api/admin/gmail/sync-run`、`GET /api/admin/gmail/sync-runs`、`GET /api/admin/gmail/sync-runs/latest` を実装しlocal実HTTP確認済み |
| F-006 | `CRON_SECRET` / `ADMIN_SECRET` 保護 | PASS | Bearer secretなし/誤りは拒否、正しいCron/Admin secretのみ通過。secretはブラウザに渡していない |
| F-007 | job lock / 二重実行防止 | PASS | `job_locks` のlease方式で同時実行時に `202 already_running` を返すことを確認 |
| F-008 | sync run logs | PASS | `mail_sync_runs` に実行者、実行元、件数、statusを保存し、secret/token/メール本文全文が含まれないことを確認 |
| F-009 | production guard | PASS | seed / Gmail同期・分類・抽出系CLIにproduction guardを追加し、production相当では安全に拒否することを確認 |
| F-010 | 本番Gmail OAuth env化 | PASS | Vercel staging/production相当では `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` から読む構成に変更。localのみ `secrets/*.json` fallbackを許可 |
| F-011 | staging検証 | FAIL | Neon/Vercel/Cloudflare staging未作成・未検証 |

## 7. WARN項目

| ID | 項目 | 内容 | 対応案 |
|---|---|---|---|
| W-001 | README参照 | ユーザー指定は `README.md` だが、実ファイルは `docs/README.md` | root READMEを追加するか、参照を統一 |
| W-002 | Gmailテスト出力 | `gmail:test` / `gmail:stats` は件名・送信者を表示する | 移管検証向けに件数中心のsafe outputを追加 |
| W-003 | build warning | webpack cache warningが出る | 再現性が高い場合のみ調査。build自体は成功 |
| W-004 | 内部 `deleteMany` | `app/api/projects/route.ts` にprojectSkill/projectTagの整理用 `deleteMany` がある | 本番DB事故防止guardとは別に、更新APIの認証必須化が必要 |
| W-005 | 並列実行時の一時的な `tsc` 失敗 | `npm.cmd run build` と `npm.cmd exec tsc` を並列実行した際、`.next/types` 再生成中の一時的な欠落で `TS6053` が出た | build完了後に `tsc` を単独再実行してPASS確認済み |

## 8. 未実行の項目と理由

| 項目 | 未実行理由 |
|---|---|
| CLI `npm.cmd run gmail:sync` の全件実行 | DB更新を伴うため。代替として管理API経由で `sync` / `pipeline` を `maxResults=1` で確認 |
| CLI `npm.cmd run gmail:classify` の全件実行 | DB更新を伴うため。代替として管理API経由で `classify` を `maxResults=1` で確認 |
| CLI `npm.cmd run gmail:extract` の全件実行 | DB更新を伴うため。代替として管理API経由で `pipeline` を `maxResults=1` で確認 |
| `npm.cmd run gmail:extract:archive-mismatches` | DB更新を伴うため |
| `npm.cmd run seed` | DB更新を伴うため通常実行は未実行。ただし `NODE_ENV=production` でproduction guardが拒否することを確認 |
| staging `prisma migrate deploy` | staging DB未作成のため。local DBには `20260512103000_gmail_admin_jobs` まで適用済み |
| `prisma migrate reset` | 危険コマンドのため実行禁止 |
| `prisma db push` | production事故につながる恐れがあるため実行禁止 |
| Vercel staging deploy | 未作成のため |
| Cloudflare Worker Cron | 未作成のため |
| ログイン後UIのブラウザ自動目視 | ブラウザ自動操作側のemail input制約で未完了。ログイン画面表示とHTTP/RBACは確認済み |
| password resetメール確認 | API実装済みだが、SMTP環境変数未設定のため実送信は未実行 |

## 9. DB統計確認結果

`gmail:stats -- --from=2026-03-01` により、3月以降のメールがローカルDB上で集計できることを確認した。

実メール件名、送信者、本文は本レポートに貼り付けない。

| 項目 | 結果 |
|---|---:|
| total | 25,696 |
| sinceFrom | 25,696 |
| sourceProjects | 5,066 |
| sourcePersons | 4,109 |
| mailEntityLinks | 25,227 |
| extractionResults | 25,227 |
| duplicate projects/persons/links/results | 0 |
| mismatched active projects/persons | 0 |

カテゴリ別件数はローカルDBで確認済み。メール本文や実メール件名は記録しない。

## 10. 確定方針として反映したユーザー判断

- U-001 初期ログイン方式: メール/パスワード方式で進める
- U-002 パスワードリセットメール送信元: `MAIL_FROM` / SMTP系envで管理し、実値はsecret扱い
- U-003 MANAGER権限: 手動同期・分類・抽出を条件付きで許可
- U-004 SALES権限: 同期・分類・抽出は不可
- U-005 staging: 本番公開前に必ず作る
- U-006 Neon容量不足時: 初期は無料枠、容量不足時は使用量監視・bodyHtml制限・有料化を検討
- U-007 Gmail取得専用アカウント: 当面 `sho.sato@skv.co.jp`、将来専用アカウントを検討
- U-008 同期エラー通知先: 初期はADMIN向け通知・確認導線を作る
- U-009 Cloudflare / Vercel / Neon 管理者: 複数管理者推奨、運用手順に記録
- U-010 パスワードポリシー: 最低12文字、reset URL有効期限30分、token/secret非表示

## 11. 移管可否

| 対象 | 判定 | 理由 |
|---|---|---|
| 社内公開 | BLOCKED | 認証/RBAC、管理API保護、job lock、ジョブログ、production guard、本番Gmail OAuth env化はlocal確認済みだが、staging実機確認が未完了 |
| 本番公開 | BLOCKED | staging未検証のため。本番公開前にNeon/Vercel/Cloudflare stagingでmigration、ログイン、一覧、同期APIを確認する必要あり |
| staging限定検証 | CONDITIONAL | production guardとGmail OAuth env化は完了。staging環境変数を登録し、staging DBに限定して確認するなら次工程へ進行可能 |

## 12. 次にやるべき修正・実装タスク

1. Neon staging database/branch と Vercel staging deploy でmigration、ログイン、一覧、同期APIを確認する。
2. Cloudflare Worker Cronをstaging APIに対してテストする。
3. SMTP環境変数を設定した環境でpassword resetメール実送信を確認する。
4. 同期失敗時のADMIN向け通知、運用手順書、複数管理者運用を整備する。
5. production guard対象外の局所的な `deleteMany` は、API認証/RBACと対象範囲が限定されていることをstagingで再確認する。
