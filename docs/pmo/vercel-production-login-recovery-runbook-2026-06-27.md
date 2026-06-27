# Vercel Production Login Recovery Runbook 2026-06-27

## 目的

`https://ses-console-vol1.vercel.app/` の通常ログインとパスワード再設定を復旧するための、secret-safe な手順です。

このrunbookは本番環境の値を表示しません。証跡は `set` / `not set`、`length OK` / `length NG`、`pair complete` / `pair incomplete` のような非秘密情報だけで記録します。

## 現状

- #148 で secret-safe な auth readiness diagnostics は main に入りました。
- #149 / #150 / #159 / #160 / #161 / #162 も main に反映済みです。
- 本番パスワード再設定失敗は、Vercel Production env/config不足、SMTP設定不足、またはactive user/password readiness不足の可能性があります。
- 本runbookでは、本番DB write、直接パスワード再設定、migration/schema変更、auth bypass、cookie/token注入は扱いません。

## 最低限必要なProduction env名

通常ログイン:

- `DATABASE_URL`
- `AUTH_SECRET`

パスワード再設定メール:

- `SMTP_HOST`
- `MAIL_FROM`

必要に応じて:

- `SMTP_PORT`
- `SMTP_USER` と `SMTP_PASSWORD`
- `APP_URL` または `APP_BASE_URL`

## オーナー作業手順

1. Vercel dashboardで project `ses-console-vol1` を開く。
2. Production environment variables を開く。
3. 必須env名が存在するか確認する。
4. `AUTH_SECRET` が32文字以上か、値を表示せず確認する。
5. SMTP認証が必要な場合、`SMTP_USER` と `SMTP_PASSWORD` が両方あるか確認する。
6. `APP_URL` または `APP_BASE_URL` がproduction URLを指すか確認する。
7. env変更後、latest production commitをredeployする。
8. secret-safe readiness evidenceを取得する。
9. 通常ログインとパスワード再設定を、通常認可フローだけで確認する。

## 報告テンプレート

```text
Target: Vercel project ses-console-vol1 / Production
Latest commit redeployed: <short sha>
DATABASE_URL: set / not set
AUTH_SECRET: set, length OK / set, length NG / not set
SMTP_HOST: set / not set
MAIL_FROM: set / not set
SMTP auth pair: complete / incomplete / not used
APP_URL or APP_BASE_URL: set / not set
Redeploy: success / failed
auth:login-readiness sanitized result: PASS / WARN / FAIL
Password reset request: accepted / failed
Normal login: success / failed
```

## 記録禁止

- DB URL
- password hash
- SMTP password
- reset token
- cookie
- session token
- raw user list
- 個人情報を含むnetwork dump / screenshot

## read-onlyで許可できる確認例

```powershell
npx.cmd --yes vercel project ls
npx.cmd --yes vercel env ls production
npx.cmd --yes vercel logs https://ses-console-vol1.vercel.app --since 2h
```

`vercel env pull` はsecret値をlocal fileへ書くため、このrunbookでは禁止です。

## stop条件

- projectが `ses-console-vol1` ではない。
- environmentがProductionではない。
- コマンドがsecret値を出力しそう。
- `DATABASE_URL` または `AUTH_SECRET` の存在を確認できない。
- SMTP設定が不完全だが、パスワード再設定が必要。
- redeployが失敗。
- env/config correction後もreadinessがFAIL。
- 復旧にproduction DB write、password hash更新、migration/schema変更、auth bypassが必要。

## 次のゲート

本番ログインが復旧したら、通常ログインのみでproduction read-only QAへ進みます。

本番DB write、直接ユーザー復旧、guarded write routeの本番実行は別ゲートです。
