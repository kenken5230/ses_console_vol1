# SES Console 公開前準備チェックリスト・設計書 v0.1

作成日: 2026-05-11

## 1. 目的

社内メンバーが SES Console を閲覧できる状態にする前に、公開時の事故要因を洗い出し、設計方針とチェックリストを整理する。

このドキュメントでは、まだ本番デプロイは行わない。コード変更、DB変更、認証実装、同期管理画面実装も行わない。公開前に必要な確認事項、設計方針、実装タスクを明確にする。

## 2. 現在の前提

- アプリ: Next.js / React
- DB: PostgreSQL
- ORM: Prisma v7 / PostgreSQL adapter
- ローカルDB名: `ses_console_dev`
- Gmail取得対象: `sho.sato@skv.co.jp` のGmail上で見えている `to:ses@skv.co.jp` 宛メール
- `ses@skv.co.jp` はGoogleグループであり、OAuth対象ではない
- Gmail API userId: `me`
- Gmail API scope: `https://www.googleapis.com/auth/gmail.readonly`
- Gmail push通知、Pub/Sub、ラベル操作、既読化、送信、添付保存は未実装
- 画面は案件、要員、未分類タブを中心にしたMOC段階
- 現在はログイン制御、権限制御、同期管理画面、本番用ジョブログは未整備

## 3. 公開可否の結論

現時点で、社内公開前に必ず整えるべきブロッカーがある。

| 観点 | 判定 | 理由 |
|---|---|---|
| secrets / refresh token管理 | 要対応 | ローカル `secrets/` 前提のため、サーバー運用時の保管場所と権限分離が必要 |
| DB分離 | 要対応 | 開発DBと共有DB/本番DBを明確に分けないと、seedやreset事故が起きる |
| Gmail取得アカウント | 要判断 | `sho.sato@skv.co.jp` 個人アカウント依存は運用リスクが高い |
| ログイン制御 | 要実装 | 社内公開では誰が見られるかを制御する必要がある |
| 同期/抽出権限 | 要実装 | `gmail:sync` / `gmail:classify` / `gmail:extract` はDB更新を伴うため、閲覧者には実行させない |
| ジョブログ | 要実装 | 同期や抽出の失敗時に、誰がいつ何を実行したか追えない |
| migration事故防止 | 要対応 | 本番DBでは `migrate reset`、seed、手動truncateを禁止する必要がある |

したがって、次の段階は「社内公開用の認証、権限、環境分離、運用ログ」を先に設計・実装すること。

## 4. secrets / .env / refresh token の安全な管理方法

### 4.1 現在の状態

- OAuthクライアントJSON: `secrets/gmail-oauth-client.json`
- Gmail OAuth token: `secrets/gmail-token.json`
- `.gitignore` で `secrets/`、`gmail-oauth-client.json`、`*.secret.json`、`.env*` は除外済み
- Prisma接続は `DATABASE_URL` を使用
- Gmail設定は以下の環境変数を使用
  - `GMAIL_AUTH_USER`
  - `GMAIL_USER_ID`
  - `GMAIL_QUERY`
  - `GMAIL_INITIAL_SYNC_LIMIT`
  - `GMAIL_SYNC_FROM`
  - `GMAIL_SYNC_TO`
  - `GMAIL_SYNC_PAGE_SIZE`
  - `GMAIL_SYNC_MAX_RESULTS`
  - `GMAIL_CLASSIFY_LIMIT`
  - `GMAIL_EXTRACT_LIMIT`

### 4.2 公開前の方針

ローカル開発では `secrets/` 配下でよいが、共有サーバーや本番では以下に変更する。

- OAuth client secret と refresh token はリポジトリに置かない
- refresh token はログ、画面、Issue、チャットに出さない
- サーバー上では環境変数、Secret Manager、または権限管理された秘密ファイルに保存する
- OneDrive配下の作業ディレクトリに本番tokenを置かない
- 本番用tokenと開発用tokenを分ける
- 漏えい時はOAuth tokenを失効し、再認証する手順を運用手順書に書く
- `.env.example` にはキー名だけ載せ、値は載せない

### 4.3 推奨する本番secret構成

| 種別 | 開発 | 共有/本番 |
|---|---|---|
| `DATABASE_URL` | `.env` | デプロイ先の環境変数 |
| Gmail OAuth client | `secrets/gmail-oauth-client.json` | Secret Manager、またはサーバー内の権限制限ファイル |
| Gmail refresh token | `secrets/gmail-token.json` | Secret Manager、またはサーバー内の権限制限ファイル |
| `GMAIL_QUERY` 等 | `.env` | デプロイ先の環境変数 |

### 4.4 公開前チェック

- [ ] `.env` と `secrets/` がGit管理対象に入っていない
- [ ] 本番tokenがOneDrive同期対象に置かれていない
- [ ] tokenの読み取り権限がサーバープロセスのみに限定されている
- [ ] refresh token漏えい時の失効手順がある
- [ ] ログにtoken、client secret、認証URLのcodeが出ない

## 5. 開発DBと共有DB/本番DBの分離方針

### 5.1 DB環境

| 環境 | DB名例 | 用途 | seed |
|---|---|---|---|
| local | `ses_console_dev` | 個人開発、検証 | 可 |
| staging | `ses_console_staging` | 社内確認前の共有検証 | 原則不可、必要時のみ専用seed |
| production | `ses_console_prod` | 本番運用 | 禁止 |

### 5.2 分離ルール

- `DATABASE_URL` は環境ごとに完全に分ける
- 開発DBのtoken、メール、抽出データを本番DBへコピーしない
- 本番では `npm.cmd run seed` を実行しない
- 本番では `prisma migrate reset` を実行しない
- 本番migrationはレビュー済みSQLまたは `prisma migrate deploy` のみ
- 本番DBへの直接接続権限は最小人数に限定する
- バックアップ取得とリストア手順を公開前に確認する

### 5.3 公開前チェック

- [ ] `DATABASE_URL` がlocal/staging/productionで分離されている
- [ ] production用DBにseed実行権限を持つ運用手順がない
- [ ] 本番DBのバックアップと復元手順がある
- [ ] migration前に `prisma migrate status` を確認する手順がある
- [ ] destructive commandを実行しない運用ルールがある

## 6. Gmail取得アカウント `sho.sato@skv.co.jp` 依存リスク

### 6.1 リスク

| リスク | 内容 | 影響 |
|---|---|---|
| 個人アカウント依存 | `sho.sato@skv.co.jp` が退職、停止、権限変更された場合に同期が止まる | 高 |
| グループ配信依存 | Gmail上で `to:ses@skv.co.jp` として見えるメールのみ取得できる | 高 |
| OAuth失効 | パスワード変更、OAuth同意取り消し、管理ポリシー変更でtokenが無効化される | 中 |
| メールボックス個人混在 | 個人宛メールとグループ配信メールが同じGmail上に存在する | 中 |
| 監査性 | 誰のアカウントでメールを読んでいるかが固定される | 中 |

### 6.2 当面の運用

短期的には `sho.sato@skv.co.jp` で継続できる。ただし社内公開前には、同期失敗時にすぐ分かるログと通知を用意する。

### 6.3 公開前チェック

- [ ] `sho.sato@skv.co.jp` が `ses@skv.co.jp` 宛メールを継続受信できる
- [ ] OAuth token失効時の再認証担当者が決まっている
- [ ] Gmail同期失敗を管理者が確認できる
- [ ] 個人メールを誤って画面表示しないよう、`GMAIL_QUERY=to:ses@skv.co.jp` を固定する

## 7. Gmail取得専用アカウントを作る場合の変更点

### 7.1 推奨

社内メンバーに公開するなら、将来的には取得専用アカウントを推奨する。

例:

- `ses-ingest@skv.co.jp`
- `ses-console@skv.co.jp`

このアカウントを `ses@skv.co.jp` のGoogleグループ受信メンバーに追加し、Gmail APIのOAuth認証をこのアカウントで行う。

### 7.2 変更点

| 項目 | 現在 | 専用アカウント化後 |
|---|---|---|
| `GMAIL_AUTH_USER` | `sho.sato@skv.co.jp` | `ses-ingest@skv.co.jp` 等 |
| Gmail OAuth token | `sho.sato@skv.co.jp` のtoken | 専用アカウントのtoken |
| Gmail userId | `me` | `me` のまま |
| Gmail query | `to:ses@skv.co.jp` | 原則同じ |
| DBの `mail_accounts.email` | 現在の取得アカウント | 専用アカウントに追加または切替 |

### 7.3 注意点

- Google Workspace管理者でなくてもアプリは実装できるが、専用Gmailアカウント作成は社内管理者作業になる可能性が高い
- 専用アカウントが `ses@skv.co.jp` の配信を受けていることをGmail検索で確認する
- 既存の `mail_notifications.sourceAccountId` と新しい取得アカウントの扱いを整理する
- 既存データと新規データの重複を避けるため、切替日は明確に記録する

## 8. ログイン制御の実装方針

### 8.1 方針

社内公開時はログイン必須にする。未ログインユーザーはアプリ本体を閲覧できない。

Next.jsでは以下のいずれかを検討する。

| 候補 | 概要 | メモ |
|---|---|---|
| Auth.js / NextAuth | Google OAuthでログイン | Next.jsとの相性がよい |
| デプロイ先の認証機能 | Cloudflare Access、Google IAP等 | アプリ実装を小さくできる |
| 独自ログイン | DBユーザーとパスワード | 初期段階では推奨しない |

初期はGoogle Workspaceドメイン制限を前提にする。

### 8.2 ユーザー管理

既存schemaには `users.role` がある。

現在の想定ロール:

- `ADMIN`
- `MANAGER`
- `SALES`
- `VIEWER`
- `SYSTEM`

ログイン時はGoogleメールアドレスを `users.email` と照合し、存在しないユーザーはアクセス不可または承認待ちにする。

### 8.3 公開前チェック

- [ ] ログインなしで画面/APIにアクセスできない
- [ ] `users.isActive=false` のユーザーはアクセスできない
- [ ] Google Workspaceドメイン制限を行う
- [ ] API Routeも認証を必須にする
- [ ] 管理者だけが同期・抽出系APIを実行できる

## 9. 閲覧・同期・抽出の権限方針

### 9.1 権限マトリクス

| 操作 | ADMIN | MANAGER | SALES | VIEWER | SYSTEM |
|---|---:|---:|---:|---:|---:|
| 案件/要員/未分類の閲覧 | 可 | 可 | 可 | 可 | 不要 |
| 案件/要員の作成 | 可 | 可 | 可 | 不可 | 不要 |
| 案件/要員の編集 | 可 | 可 | 可 | 不可 | 不要 |
| 未分類から案件/要員へ移動 | 可 | 可 | 可 | 不可 | 不要 |
| Gmail手動同期 | 可 | 可または不可を要判断 | 不可 | 不可 | 可 |
| Gmail分類実行 | 可 | 可または不可を要判断 | 不可 | 不可 | 可 |
| Gmail抽出実行 | 可 | 可または不可を要判断 | 不可 | 不可 | 可 |
| migration/DB管理 | 可。ただし画面から不可 | 不可 | 不可 | 不可 | 不可 |
| ユーザー管理 | 可 | 不可 | 不可 | 不可 | 不可 |

### 9.2 基本方針

- 閲覧とDB更新操作を分離する
- Gmail同期、分類、抽出は「業務データを増やす処理」なので管理者操作にする
- 手動同期ボタンを置く場合も、一般閲覧者には表示しない
- 同期中は二重実行を防ぐ
- 同期完了後も一覧を勝手にリロードしない
- 新着データがあることだけ通知し、ユーザーが明示的に更新したときに画面へ反映する

## 10. `gmail:sync` / `gmail:classify` / `gmail:extract` 管理画面の必要性

### 10.1 必要性

社内公開後はCLIを直接実行する運用ではなく、管理画面または管理APIから実行できる状態が望ましい。

理由:

- 実行者、開始時刻、終了時刻、件数、失敗理由を記録できる
- 二重実行を防げる
- 実行権限を制御できる
- 画面から手動同期できる
- エラー時に確認しやすい

### 10.2 管理画面に必要な機能

- 手動同期ボタン
- 同期中ステータス表示
- 最終同期日時
- 取得件数、作成件数、更新件数、失敗件数
- 分類件数
- 案件抽出件数、要員抽出件数、skip件数
- エラー一覧
- 実行者
- 実行ログ詳細

### 10.3 実装方針

初期は以下のようにする。

1. 管理者のみアクセス可能な管理画面を作る
2. 管理画面から同期APIを実行する
3. API内で二重実行ロックを確認する
4. 同期、分類、抽出を順番に実行する
5. 実行結果をDBに保存する
6. 一覧画面には「新着あり」通知だけを出す
7. ユーザーが更新ボタンを押したときだけ一覧を再取得する

## 11. エラー発生時のログ確認方法

### 11.1 現状

現在は主にCLI出力で同期、分類、抽出の結果を確認している。

確認コマンド:

```powershell
npm.cmd run gmail:stats -- --from=2026-03-01
npm.cmd run gmail:extract:duplicates
npm.cmd run gmail:extract:mismatches
```

### 11.2 公開前に必要なログ

本番前には、ジョブ実行履歴をDBに残すことを推奨する。

追加候補テーブル:

- `mail_sync_runs`
- `mail_sync_run_logs`

保存したい項目:

- 実行ID
- 実行種別: sync / classify / extract / all
- 実行者
- startedAt / finishedAt
- status: running / success / failed / cancelled
- query
- fetched / created / updated / skipped / failed
- projectCreated / personCreated
- errorMessage
- errorStack。ただしtokenやsecretは含めない

### 11.3 公開前チェック

- [ ] 同期失敗時に管理者が確認できるログがある
- [ ] 失敗したメールIDや件名を追える
- [ ] tokenやclient secretがログに出ない
- [ ] ログの保存期間を決める
- [ ] 重大エラー時の通知先を決める

## 12. デプロイ先候補

### 12.1 候補

| 候補 | 長所 | 注意点 |
|---|---|---|
| Vercel + 外部PostgreSQL | Next.jsと相性がよい | 長時間ジョブや定期実行は設計が必要 |
| Render / Railway / Fly.io | Webアプリとジョブを同居しやすい | 運用監視と権限設計が必要 |
| 社内サーバー / VPS | cronや秘密ファイル管理を自由にできる | セキュリティ、バックアップ、SSLを自前で見る必要 |
| Google Cloud Run + Cloud SQL | Gmail/Google連携と相性がよい | Cloud Run JobsやSecret Manager設計が必要 |

### 12.2 初期推奨

長時間のGmail同期と15分おきジョブを考えると、以下のどちらかが扱いやすい。

- Cloud Run + Cloud SQL + Secret Manager + Cloud Scheduler
- VPS/社内サーバー + PostgreSQL + cron + reverse proxy

Vercelを使う場合は、同期ジョブを別基盤に分ける設計を先に決める。

## 13. デプロイ前に必要な環境変数一覧

### 13.1 必須

| 環境変数 | 用途 | 例 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL接続 | 値はsecret管理 |
| `GMAIL_AUTH_USER` | OAuth認証した実体アカウント | `sho.sato@skv.co.jp` または専用アカウント |
| `GMAIL_USER_ID` | Gmail API userId | `me` |
| `GMAIL_QUERY` | 取得対象クエリ | `to:ses@skv.co.jp` |
| `GMAIL_INITIAL_SYNC_LIMIT` | 初期テスト取得件数 | `50` |
| `GMAIL_SYNC_FROM` | 同期開始日 | `2026-03-01` |
| `GMAIL_SYNC_PAGE_SIZE` | Gmail APIページサイズ | `500` |

### 13.2 任意

| 環境変数 | 用途 |
|---|---|
| `GMAIL_SYNC_TO` | 同期終了日を限定する検証用 |
| `GMAIL_SYNC_MAX_RESULTS` | 同期最大件数を制限する検証用 |
| `GMAIL_CLASSIFY_LIMIT` | 分類件数制限 |
| `GMAIL_EXTRACT_LIMIT` | 抽出件数制限 |
| `NODE_ENV` | 実行環境 |

### 13.3 ログイン実装後に必要になる候補

| 環境変数 | 用途 |
|---|---|
| `AUTH_SECRET` | セッション署名 |
| `AUTH_GOOGLE_ID` | GoogleログインOAuth client id |
| `AUTH_GOOGLE_SECRET` | GoogleログインOAuth client secret |
| `ALLOWED_EMAIL_DOMAINS` | 許可ドメイン |
| `ADMIN_EMAILS` | 初期管理者 |

## 14. migration / seed / migrate reset の事故防止策

### 14.1 禁止事項

本番では以下を禁止する。

- `prisma migrate reset`
- `npm.cmd run seed`
- `prisma db push`
- 手動truncate
- 手動delete
- 開発用 `.env` のまま本番コマンド実行

### 14.2 実行前チェック

- [ ] 実行環境名を確認する
- [ ] 接続先DB名を確認する
- [ ] `prisma migrate status` を確認する
- [ ] migration内容をレビューする
- [ ] バックアップ取得済みである
- [ ] ロールバック方針を確認する

### 14.3 仕組みとして入れたい安全策

- 本番では `seed` scriptを実行できないようにガードを入れる
- `NODE_ENV=production` かつ `DATABASE_URL` がproductionの場合、危険コマンドを止める
- migrationはCI/CDまたは管理者のみ実行
- 本番DBユーザーは必要最小限の権限にする
- アプリ実行ユーザーにschema変更権限を持たせない

## 15. 運用手順書に書くべき内容

社内公開前に、別途運用手順書として以下を作る。

- 初回セットアップ手順
- 環境変数の設定方法
- Gmail OAuth再認証手順
- Gmail同期の手動実行手順
- 15分おき自動同期の確認方法
- 同期失敗時の確認手順
- 分類ルール変更手順
- 抽出前プレビュー手順
- 重複確認手順
- 案件/要員/未分類の確認手順
- ログインユーザー追加/停止手順
- 権限変更手順
- migration実行手順
- バックアップ/リストア手順
- 障害発生時の連絡先
- refresh token漏えい時の停止/再発行手順

## 16. 公開前チェックリスト

### 16.1 セキュリティ

- [ ] ログインなしで画面/APIを見られない
- [ ] Google Workspaceドメインまたは許可ユーザーで制限している
- [ ] DB更新APIは権限チェックしている
- [ ] Gmail同期APIはADMINまたは許可ロールのみ実行できる
- [ ] `.env`、OAuth client secret、refresh tokenがGit管理されていない
- [ ] 本番tokenがOneDrive等の同期フォルダに置かれていない
- [ ] ログにsecretが出ない

### 16.2 DB

- [ ] local/staging/productionのDBが分離されている
- [ ] 本番DBバックアップがある
- [ ] 本番seed禁止
- [ ] 本番reset禁止
- [ ] migration手順が決まっている
- [ ] アプリ用DBユーザーの権限が最小化されている

### 16.3 Gmail同期

- [ ] `GMAIL_QUERY=to:ses@skv.co.jp` を確認済み
- [ ] 同期対象アカウントが決まっている
- [ ] 専用アカウントにするか判断済み
- [ ] 15分おき自動同期の実行方式が決まっている
- [ ] 手動同期の権限が決まっている
- [ ] 二重同期防止の仕組みがある
- [ ] 同期結果ログが確認できる

### 16.4 UI/業務

- [ ] 一覧が勝手にリロードされない
- [ ] 新着データは通知だけ出し、ユーザー操作で反映する
- [ ] 同時編集時の競合検知方針がある
- [ ] 編集中アラートまたはロック方針がある
- [ ] 未分類から案件/要員へ移す導線がある
- [ ] 要確認データの確認フローがある

### 16.5 運用

- [ ] 管理者が同期/分類/抽出を確認できる
- [ ] エラー時の確認方法がある
- [ ] 障害時の連絡先が決まっている
- [ ] 退職/異動時のアカウント停止手順がある
- [ ] token再発行手順がある

## 17. タスク化

### 17.1 タスク見直し結果

ユーザー要望を見直した結果、今回このドキュメントで消化するタスクは「設計・チェックリスト・公開前タスク整理」に限定する。以下はコード変更やDB変更を伴うため、今回の消化対象外としてタスク化のみ行う。

- ログイン制御の実装
- 権限制御の実装
- Gmail同期管理画面の実装
- ジョブログテーブルの追加
- 15分おき自動同期の実装
- 同時編集ロックの実装
- 本番デプロイ

### 17.2 今回消化するタスク

| ID | タスク | 状態 | テスト/確認 |
|---|---|---|---|
| P0 | 既存のscripts、`.gitignore`、Prisma設定、Gmail設定を確認する | 完了 | `package.json`、`.gitignore`、`prisma.config.ts`、`scripts/gmail-common.ts`、`prisma/schema.prisma` を確認 |
| P1 | secrets / refresh token 管理方針を書く | 完了 | 実際のsecret値を記載していないことを確認 |
| P2 | 開発DB/共有DB/本番DBの分離方針を書く | 完了 | `DATABASE_URL` 分離、seed/reset禁止を明記 |
| P3 | `sho.sato@skv.co.jp` 依存リスクと専用アカウント案を書く | 完了 | `GMAIL_AUTH_USER` 切替点を明記 |
| P4 | ログイン制御と権限マトリクスを書く | 完了 | `ADMIN`、`MANAGER`、`SALES`、`VIEWER`、`SYSTEM` の役割を整理 |
| P5 | Gmail同期管理画面とログ設計を書く | 完了 | `gmail:sync`、`gmail:classify`、`gmail:extract` の実行管理を記載 |
| P6 | デプロイ候補と環境変数一覧を書く | 完了 | 必須/任意/ログイン実装後のenvを分離 |
| P7 | migration / seed / reset 事故防止を書く | 完了 | 本番禁止コマンドと実行前チェックを明記 |
| P8 | 運用手順書に必要な項目を書く | 完了 | OAuth再認証、同期、分類、抽出、障害対応を記載 |

### 17.3 次フェーズ実装タスク

| 優先度 | タスク | 内容 | 完了条件 |
|---|---|---|---|
| 1 | ログイン制御 | Googleログインまたはデプロイ先認証を導入 | 未ログインで画面/API不可 |
| 2 | RBAC | `users.role` による権限制御 | 閲覧者が同期/抽出できない |
| 3 | 管理画面 | Gmail同期、分類、抽出の手動実行画面 | 実行者と結果が見える |
| 4 | ジョブログ | `mail_sync_runs` 相当の実行履歴 | 失敗原因を追える |
| 5 | 二重実行防止 | 同期/抽出ジョブのロック | 同時実行しても二重登録しない |
| 6 | 15分おき同期 | cronまたはScheduler | 勝手に一覧を更新せず通知のみ |
| 7 | 同時編集対策 | `updatedAt` 競合チェックまたはロック | 他者更新時に警告できる |
| 8 | 本番デプロイ準備 | DB、secret、環境変数、SSL、バックアップ | stagingで手順確認済み |

## 18. ユーザー確認が必要な事項

公開準備を実装へ進める前に、以下の判断が必要。

1. Gmail取得は当面 `sho.sato@skv.co.jp` のままでよいか、専用アカウントを作るか
2. 社内ログインはGoogle Workspaceログインでよいか
3. 閲覧可能な対象を全社員にするか、許可メンバーだけにするか
4. `MANAGER` にGmail同期/分類/抽出を許可するか
5. デプロイ先をどこにするか
6. 本番DBをどこに置くか
7. 同期エラー通知を誰に出すか
8. 本番公開前にstaging環境を用意するか

## 19. 今回の検証結果

今回の作業はMarkdown作成のみであり、コード変更、DB変更、Gmail API実行、本番デプロイは行っていない。

検証観点:

- secretsの実値を書いていない
- 既存の環境変数とコマンドに基づいている
- 本番で危険な `seed`、`migrate reset`、`db push` の禁止を明記している
- `sho.sato@skv.co.jp` 依存リスクを明記している
- 専用Gmail取得アカウントへの切替点を明記している
- ログイン、権限、同期管理画面、ジョブログ、運用手順の未実装点を明記している

