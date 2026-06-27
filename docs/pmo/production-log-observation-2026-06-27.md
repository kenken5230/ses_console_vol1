# Production Log Observation 2026-06-27

## 目的

本番ログで観測された `POST /api/admin/gmail/sync-run` 500 を、secret-safe に記録します。

この文書はread-only観測です。deploy、DB write、migration/schema変更、env/config変更、cleanupは行っていません。

## 観測範囲

- Vercel project: `ses-console-vol1`
- Production URL: `https://ses-console-vol1.vercel.app`
- 目的: production-facingな500の存在を、secret値を出さずに記録する

## 観測結果

production logsで以下の失敗が観測されています。

- path: `POST /api/admin/gmail/sync-run`
- status: 500
- cadence: 約15分ごとに見える

この500はログイン/パスワード再設定失敗とは別系統の可能性がありますが、production-facingな運用リスクとして追跡します。

## 現時点の解釈

- 定期実行、cron、またはサーバー側の自動呼び出しが存在する可能性があります。
- full logをrepoへ貼り付けていないため、根因は未確定です。
- Gmail token、DB URL、cookie、raw Gmail data、secretを含み得るため、深掘りはsecret-safe diagnostics経由に限定します。

## 安全に進められること

- `/api/admin/gmail/sync-run` routeのコード確認
- 必要env名の存在/形式だけを確認するhelper追加
- DB-free / Gmail API-free のsanitizer test追加
- sanitized runbook更新

## 承認が必要なこと

- production env/config変更
- production redeploy単独操作
- productionのsync route実行
- Gmail token / cookie / DB URL / raw message内容の閲覧
- production/staging/shared DB write

## 推奨ステータス

`READY_FOR_DB_FREE_TRIAGE`

ログイン復旧をブロックしませんが、Gmail sync-runのDB-free診断とsanitizer強化を別PRで進める価値があります。
