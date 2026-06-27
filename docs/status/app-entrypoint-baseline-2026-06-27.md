# 実アプリ入口確認メモ 2026-06-27

## 目的

最新 `origin/main` の実アプリについて、Next.js の入口、主要画面、主要API導線を read-only で確認する。

このメモは、後続の「入口が塞がる致命バグ修正」や「Header 結線 / 提案作成 / 要員編集」へ進む前のベースラインです。

## 対象

- repo: `kenken5230/ses_console_vol1`
- base: `origin/main`
- 確認commit: `24dc7160834ee0360709214f1e8ba52e92ae5384`
- 確認方法: ソースコードの read-only 確認
- DB write: なし
- secret値の読み取り/出力: なし
- 製品コード変更: なし

## 主要入口

| 入口 | ファイル | 状態 | メモ |
|---|---|---|---|
| Root layout | `app/layout.jsx` | 存在 | `html lang="ja"` とグローバルCSSの入口 |
| Dashboard `/` | `app/page.jsx` | 存在 | `Home` がメインダッシュボード。未認証時は `LoginPanel` を表示 |
| `/matches` | `app/matches/page.jsx` | 存在 | `MatchingReviewPage` を表示 |
| `/market-analysis` | `app/market-analysis/page.jsx` | 存在 | 市場分析画面。`/api/market-analysis` を利用 |
| `/imports` | `app/imports/page.jsx` | 存在 | `ImportReviewPage` を表示 |

## 認証入口

独立した `/login` や `/reset` ページはありません。

ログインとパスワード再設定UIは `components/LoginPanel.jsx` に集約されています。

- 通常ログイン: `app/api/auth/login/route.ts`
- セッション確認: `app/api/auth/session/route.ts`
- ログアウト: `app/api/auth/logout/route.ts`
- パスワード再設定受付: `app/api/auth/password-reset/request/route.ts`
- パスワード再設定確定: `app/api/auth/password-reset/confirm/route.ts`

パスワード再設定リンクは専用ページではなく、`/?resetToken=...` へ戻す設計です。

## ダッシュボード構造

`app/page.jsx` が `/api/auth/session` でログイン状態を確認し、ログイン済みの場合は `/api/dashboard-data` を読みます。

主な表示単位:

- `案件`
- `要員`
- `未分類`

タブ定義は `data/mockProjects.js` の `tabs` から供給され、`components/SearchToolbar.jsx` が描画します。

各タブの主なコンポーネント:

- 案件: `components/ProjectTable.jsx` / `components/ProjectDetailPane.jsx`
- 要員: `components/PersonTable.jsx` / `components/PersonDetailPane.jsx`
- 未分類: `components/UnclassifiedMailTable.jsx` / `components/UnclassifiedMailDetailPane.jsx`

## Header / Navigation

`components/Header.jsx` の上部ナビでは、現時点で通常リンクとして動くのは `/market-analysis` です。

その他の上部ナビは active / coming soon 扱いで、実ページへの通常リンクではありません。

`/matches` は存在しますが、メインHeaderから直接リンクされていません。

`/imports` は存在しますが、メインHeaderから直接リンクされていません。`/matches` 画面内に `Imports` リンクがあります。

## 権限ガード

`/matches` と `/imports` は UI / API の両方で `ADMIN` または `MANAGER` を要求します。

確認した主なガード:

- `components/MatchingReviewPage.jsx`
- `components/ImportReviewPage.jsx`
- `app/api/matches/dry-run/route.ts`
- `app/api/matches/suggestions/route.ts`
- `app/api/imports/route.ts`
- `app/api/imports/source-records/route.ts`

Dashboard の作成/編集/未分類移行は `ADMIN` / `MANAGER` / `SALES` 系の権限を見ています。

Gmail同期系は `ADMIN` / `MANAGER` が中心です。

## 実害候補

現時点の read-only 確認で、入口として注意が必要な点は以下です。

1. `/matches` は画面として存在するが、メインHeaderから直接到達できない。
2. `/imports` は画面として存在するが、メインHeaderから直接到達できない。
3. `/market-analysis` は直接URLで開けるが、未認証時はページ内のAPI呼び出しが認証エラーになり、Dashboardと同じLoginPanel導線にはならない可能性がある。
4. `/matches` と `/imports` は `ADMIN` / `MANAGER` 前提のため、VIEWERやSALESで通常ログインすると「入口がない/権限不足」に見えやすい。

## 次にやること

このメモはコード変更ではなく入口の地図です。

次の段階では、実ブラウザで以下を確認してください。

- 通常ログインできるか
- Dashboard `/` が表示されるか
- `案件` / `要員` / `未分類` タブが表示されるか
- `/market-analysis` がログイン済みで表示されるか
- `ADMIN` / `MANAGER` 権限の通常セッションで `/matches` と `/imports` が表示されるか
- Headerに `/matches` / `/imports` を見せるべきか、coming soonのままにするべきか

## 判定

T3 の「入口特定」は完了です。

ただし、実ブラウザでのログイン後スクリーンショット確認は未実施です。これは本番ログイン復旧やlocal/testログイン準備と依存するため、別タスクとして扱います。
