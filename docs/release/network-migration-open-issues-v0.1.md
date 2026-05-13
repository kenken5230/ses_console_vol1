# ネットワーク移管前 未解決課題 v0.1

作成日: 2026-05-12

## 1. 判定概要

現時点では、社内公開・本番公開は `BLOCKED` とする。

理由は、画面表示、Gmail取り込み、分類、抽出の土台は動作しており、認証/RBAC、同期管理API、`CRON_SECRET` / `ADMIN_SECRET` 保護、job lock、ジョブログ、production guard、本番Gmail OAuth env化はlocal確認まで完了したが、staging検証が未完了のため。

## 2. 必須対応

| ID | 優先度 | 状態 | 課題 | 影響 | 推奨対応 |
|---|---:|---|---|---|---|
| O-001 | P0 | PASS | メール/パスワード認証のlocal実HTTP確認完了 | stagingでは再確認が必要 | staging検証はO-010で扱う |
| O-002 | P0 | PASS | パスワードリセットの安全な代替確認完了 | SMTP実送信はenv設定後に確認が必要 | SMTP実送信は運用設定時に確認 |
| O-003 | P0 | PASS | API Routeのrole別local実HTTP確認完了 | stagingでは再確認が必要 | staging検証はO-010で扱う |
| O-004 | P0 | PASS | 同期・分類・抽出の管理APIを実装済み | stagingでは再確認が必要 | `/api/admin/gmail/sync-run` をCron/手動共通APIとして維持 |
| O-005 | P0 | PASS | `CRON_SECRET` / `ADMIN_SECRET` によるAPI保護を実装済み | stagingではsecret設定確認が必要 | ブラウザへsecretを渡さない方針を維持 |
| O-006 | P0 | PASS | job lock / 二重実行防止を実装済み | stagingでは同時実行確認が必要 | `job_locks` のlease方式を運用 |
| O-007 | P0 | PASS | sync run logs を実装済み | stagingではログ閲覧確認が必要 | `mail_sync_runs` を運用確認に使う |
| O-008 | P0 | PASS | 本番DB事故防止guardを追加済み | stagingで再確認が必要 | seed / Gmail同期・分類・抽出系CLIはproduction相当で拒否する |
| O-009 | P0 | PASS | 本番Gmail OAuth env化を実装済み | stagingでenv登録後の再確認が必要 | Vercel staging/productionでは `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` を使う |
| O-010 | P0 | FAIL | staging未作成・未検証 | 本番公開前ゲートを満たせない | Neon staging database/branch、Vercel staging deployを作成しmigrationと起動確認を行う |

## 3. 重要対応

| ID | 優先度 | 課題 | 影響 | 推奨対応 |
|---|---:|---|---|---|
| O-011 | P1 | Gmailテスト/統計コマンドが件名・送信者をコンソール出力する | ログに業務メール情報が残る可能性がある | migration検証用には件数中心のsafe outputモードを追加 |
| O-012 | P1 | root `README.md` がなく、実体は `docs/README.md` | 参照ドキュメント名と実ファイルに差がある | root READMEを追加するか、参照を `docs/README.md` に統一 |
| O-013 | P1 | Neon Free容量監視が未実装 | Gmail本文長期保存で容量超過の恐れ | bodyText/bodyHtmlサイズ統計と保存方針見直し手順を作る |
| O-014 | P1 | 重大エラー通知先が未実装 | 同期失敗に気づきにくい | `ADMIN_EMAILS` または通知設定に基づくADMIN通知を実装 |
| O-015 | P1 | Cloudflare / Vercel / Neon 複数管理者の運用手順が未作成 | 担当者変更時の復旧が難しい | 権限移譲、token再発行、環境変数引き継ぎ手順を運用手順書に追加 |

## 4. 保留してよい事項

| ID | 課題 | 保留理由 |
|---|---|---|
| D-001 | Google Workspaceログイン | 初期ログイン方式はメール/パスワードで確定済み |
| D-002 | Gmail取得専用アカウント作成 | 当面は `sho.sato@skv.co.jp` で運用し、専用アカウントは将来候補 |
| D-003 | Gmail push通知 / PubSub | 初期同期は15分Cronと手動更新でよい |
| D-004 | Gmailラベル操作 / 既読化 / 返信 / 送信 | Gmail scopeは `gmail.readonly` のみで、公開前方針から対象外 |
| D-005 | AI分類 / AI抽出 | 現段階はルール分類と抽出改善を優先 |

## 5. 次の推奨順

1. staging環境でmigration、ログイン、一覧、同期APIを確認する。
2. Cloudflare Worker Cronをstaging APIに対してテストする。
3. SMTP環境変数を設定した環境でpassword resetメール実送信を確認する。
4. 重大エラー通知先と運用手順書を整備する。
5. production guard対象外の局所的なDB更新APIについて、認証/RBACと対象範囲をstagingで再確認する。
