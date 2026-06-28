# SES Console Theme Input BK v0.1

作成日: 2026-06-04  
目的: SES Consoleの大テーマ要望を要件定義へ統合する前のBK。  
対象: ユーザーが共有した「consoleでやりたいこと」の大項目と、現行repo棚卸しに使った根拠。

## 1. BK方針

- このBKはDB更新、既存データ更新、削除、schema migrationを伴わない。
- 実装前に、要望の大枠と現行repoの根拠を保存する。
- 要件定義・設計・BK・タスク化の判断材料として使う。
- secret、DB接続URL、token、password、connection stringの実値は書かない。

## 2. ユーザー要望の大テーマ控え

ユーザーが作りたいものは、単なる案件管理ではなく、Notionにある営業データを移行したうえで、AIマッチング、提案、メール、進捗管理、統計分析までできるSES営業統合console。

大テーマ:

1. Notionで管理しているSES営業データをconsoleへ移行する。
2. 案件データを構造化して管理する。
3. 要員データを同じconsole上で管理する。
4. AIで案件と要員を自動マッチングする。
5. AIに提案判断を補助させる。
6. 案件・要員の検索を高度化する。
7. 提案リストを作り、営業活動を管理する。
8. メール送信までconsole内で完結させる。
9. メール・提案履歴を案件や要員に紐づける。
10. Notionで見ていたグラフや統計をconsoleで見る。
11. 営業KPI・売上見込みを見える化する。
12. 会社・取引先・商流情報も管理する。
13. 案件作成・要員登録・情報更新を標準化する。
14. SES営業のオペレーションを一つのconsoleに集約する。

## 3. 現行repo棚卸しに使った根拠

確認した主なファイル:

- `prisma/schema.prisma`
- `app/api/dashboard-data/route.ts`
- `app/api/projects/route.ts`
- `app/api/persons/route.ts`
- `app/api/mail-notifications/[id]/extract/route.ts`
- `app/api/admin/gmail/sync-run/route.ts`
- `components/ProjectCreateDrawer.jsx`
- `components/PersonCreateDrawer.jsx`
- `components/SearchToolbar.jsx`
- `components/ProjectTable.jsx`
- `components/ProjectDetailPane.jsx`
- `components/PersonTable.jsx`
- `lib/gmail-extract-entities.ts`
- `lib/gmail-admin-jobs.ts`
- `lib/mailer.ts`
- `scripts/gmail-extraction.ts`
- `scripts/gmail-person-remediation-preview.ts`
- `docs/themes/gmail-remediation/BK/feature-backlog-and-task-list-v0.1.md`
- `docs/themes/gmail-remediation/design/gmail-person-remediation-supervised-ops-v0.1.md`
- `docs/shared/quality/two-pass-task-test-policy-v0.1.md`

## 4. 現行repoの高レベル認識

着手済みまたは土台あり:

- 案件、要員、会社、担当者、商流、提案、配信履歴、検索履歴、メール、抽出結果、監査ログのDBモデル。
- 案件・要員の一覧、詳細、作成drawer、キーワード/条件検索UI。
- Gmail取り込み、分類、抽出、未分類メールから案件/要員へ移す導線。
- Gmail由来要員名の安全remediation。
- SMTP送信基盤。ただし現状は主に認証・パスワード再設定用途。
- RBAC、ログイン、Gmail同期admin API。

未着手または業務機能として未完成:

- Notion import/export設計と安全移行CLI。
- AIマッチング、AI提案判断、自然文検索。
- 提案リストの正式作成、ステータス更新、営業進捗画面。
- 案件紹介、推薦、面談調整メールの作成・送信UI。
- 統計ダッシュボード、KPI、売上見込み。
- 会社/取引先管理の専用画面。
- 入力標準化の完全なバリデーション設計。
- 一部UI文言の文字化け修正。

## 5. BK後の成果物

このBKをもとに、以下のmdを作成する。

- `docs/themes/ses-sales-console/requirements/ses-sales-console-integrated-requirements-v0.1.md`
- `docs/themes/ses-sales-console/BK/ses-sales-console-theme-backlog-v0.1.md`
