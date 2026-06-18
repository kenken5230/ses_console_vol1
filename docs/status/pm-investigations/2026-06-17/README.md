# PM Investigations 2026-06-17

2026-06-17 の親PM調査結果を集約するフォルダです。基準は latest main commit `db0c60b6f0ae3c80bdac9b1dcced2e56794784be` です。

この PR は docs-only です。コード実装、package 変更、API 変更、DB write、schema 変更、migration（DB構造を変える手順）は行いません。

## 調査一覧

| Doc | 内容 |
|---|---|
| [search-history-db-backed-plan.md](./search-history-db-backed-plan.md) | #55 を stale（古い main を基準にした状態）として扱い、#55R を latest main から作り直す方針 |
| [market-search-gmail-recheck.md](./market-search-gmail-recheck.md) | Market / Search / Gmail の再確認結果、A/B/C分類、承認待ちAPIやDB applyの整理 |
| [react-duplicate-key-warning.md](./react-duplicate-key-warning.md) | React duplicate key warning の優先度と確認箇所 |
| [browser-qa-runbook.md](./browser-qa-runbook.md) | 通常ログインだけで行う Browser QA 観点。cookie/token/auth proxy は使わない |
| [worktree-cleanup-ledger-plan.md](./worktree-cleanup-ledger-plan.md) | worktree（別ブランチ用の作業フォルダ）整理台帳と削除承認フロー |

## 実装済み扱いしてよいもの

- latest main `db0c60b6f0ae3c80bdac9b1dcced2e56794784be` までに入っている UI safety state は、main 基準の既存状態として扱う。
- Market analysis の既存画面と導線は、現 main に存在する範囲で確認対象にする。
- docs/status 配下の 2026-06-15 の復旧台帳・状態表は、現状確認の参照元として使う。

## 未実装扱いのもの

- #55 の DB-backed SearchHistory はそのまま main に入れる前提にしない。latest main から #55R として作り直す。
- SearchHistory の実DB保存、DB write smoke（最低限の書き込み動作確認）、migration は未実施として扱う。
- real proposal write、Gmail会社補完の apply、dashboard API 変更、worktree削除は未実装・未実施として扱う。
- public response に `userId` を出さない方針、own-user isolation（自分のデータだけ見える隔離）は実装確認が必要な項目として残す。

## 承認待ち

- dashboard API を触る変更。
- Gmail会社補完の apply。preview（確認だけ）と apply（DB更新）を分離し、DB接続先確認と rollback（戻す手順）を用意してから承認を取る。
- DB write smoke、migration、deploy、worktree削除。
- #55R の作成後、Ready for review や merge に進む判断。

## Index Link

`docs/status/README.md` は他PRと衝突しやすい status index なので、この PR では変更しません。index link は後続統合で追加します。
