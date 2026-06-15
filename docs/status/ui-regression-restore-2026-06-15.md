# UI Regression Restore 2026-06-15

## Scope

first-parent `main` の `71b9a09b029c1e05dcaf13f0cc9bf159c93d5d6d` snapshotをユーザー確認済みの基準として、`#53` 以降で消えた既存UI導線を復旧する。依存更新 `#54`、未分類メールの除外検索、Next 16対応などの有効な更新は戻さない。

## Baseline

ユーザー確認で「ここまでは機能とか大丈夫そう」とされた基準:

- Merge pull request `#49` from `codex/proposal-traceability-draft-status-prereqs-design`
- Commit: `71b9a09b029c1e05dcaf13f0cc9bf159c93d5d6d`
- Note: `#49` 自体をUI実装PRとみなす意味ではなく、ユーザーが指定した既存画面の比較snapshotとして扱う。
- 画面上に存在していた導線:
  - 上位メニュー: 人材マスタ、案件、求人、一斉配信、単価相場、レポート
  - `/market-analysis` への市場分析ボタン
  - 設定アイコン
  - 検索履歴ボタン
  - 注力案件/要員、フィルター、並び替え、ページング、作成ボタン
  - 案件一覧/詳細の提案開始導線

## Regression Source

| Range | Result |
|---|---|
| baseline snapshot -> `#8` | 画面スケール調整。今回の主因として扱わない。 |
| `#8` -> `#44` | matching docs追加のみ。UI削除なし。 |
| `#44` -> `#53` | Header nav/settings、SearchHistory UI、提案開始導線、SearchHistory mock dataを削除。今回の復旧対象。 |
| `#53` -> `#54` | dependency/security更新。UI削除なし。 |

## Restore Tasks

| Task | Status | Test |
|---|---|---|
| Headerの既存メニューと設定アイコンを復旧 | In progress | Browser visual QA |
| 検索履歴ボタンと履歴モーダルを復旧 | In progress | typecheck / Browser visual QA |
| 案件一覧/詳細の提案開始導線を復旧 | In progress | typecheck / Browser visual QA |
| `#53` の有効修正を残す | In progress | diff review / tests |
| `#55` DB-backed SearchHistoryは別統合として保持 | Pending | `test:search-history` は #55 統合時 |

## Guardrail

- 既存チャット、docs、追加開発ブランチにある機能を削除扱いしない。
- 画面に出すものは、現時点で no-write placeholder か実装済みかを docs に明記する。
- DB write、migration、production/staging操作は実行しない。
- hotfix PRは作成しても、main mergeはユーザー承認後に行う。

## Current Decision

検索履歴は baseline snapshot 時点のUI導線を復旧しつつ、実履歴ではなく `サンプル検索履歴` と画面上に明示する。`#55` のDB-backed SearchHistoryは別PRの追加開発として統合を継続する。

提案開始は `提案開始（未実装）` として残し、クリック時は `提案開始は未実装です。DB登録は行われません。` を表示する。実DB書き込みの提案作成APIは別タスクに分ける。実データ連動がない `提案開始済み` 表示は出さない。

`/projects/{id}` URLコピーは、現アプリに `app/projects/[id]` が存在しないため復旧しない。コピー導線は案件ID/案件名テキストのコピーに戻し、壊れたURLをユーザーへ渡さない。

Header nav/settingsは見た目だけ復元するが、未実装のnav/settingsを通常クリック可能にはしない。未実装項目は `disabled` / `aria-disabled` / `title` でcoming soonを明示し、dead link/no-opを通常機能に見せない。
