# QUEUE.md — タスクキュー

このファイルを、このプロジェクト内のAI連続稼働キューの正とします。会話履歴ではなく、このキュー、`APPROVALS.md`、`DECISIONS.md`、`BLOCKERS.md`、`HEARTBEAT.md` を読んで状態復元します。

## 運用ルール

- 状態は `READY` / `IN_PROGRESS` / `WAITING_APPROVAL` / `BLOCKED` / `DONE` / `DONE(rejected)`。
- `DECISIONS.md` は初期化後、Codexは書き換えません。
- `scripts/` は初期配置後、Codexは検証読み取りだけにします。
- merge / Ready化 / 本番deploy自動は H2/H3 完了まで無効です。

## タスク一覧

### T-20260627-001 Profile化

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T19:00:00+09:00
- 詳細: `ses_console_vol1` の `AI_PROJECT_PROFILE.md` を作成し、main deploy影響、rollback、staging有無を安全側で仮記入する。
- 検証: `git remote -v`、`gh pr list --json statusCheckRollup`、`gh api .../commits/<sha>/status`、`package.json` をread-only確認。
- rollback: このPR/commitをrevertする。
- 承認要否: 不要
- 更新時刻: 2026-06-27T19:25:00+09:00

### T-20260627-002 ai-queue と safety-gate 初期化

- 状態: DONE
- 種別: chore
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T19:00:00+09:00
- 詳細: `docs/ai-queue/` を初期化し、`scripts/safety-gate.ps1` を配置する。既存 `AGENTS.md` は main に正常版があるため上書きしない。
- 検証: `docs/ai-queue/*` と `scripts/safety-gate.ps1` の存在確認、`powershell -ExecutionPolicy Bypass -File scripts/safety-gate.ps1 -SessionStartRef <session-start-head>`。
- rollback: このPR/commitをrevertする。
- 承認要否: 不要
- 更新時刻: 2026-06-27T19:25:00+09:00

### T-20260627-003 最新 main の実アプリ入口確認

- 状態: READY
- 種別: investigate
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T19:00:00+09:00
- 詳細: latest `origin/main` からclean worktreeを作り、ローカル起動、ログイン、ダッシュボード、案件/要員/未分類、`/matches`、`/market-analysis`、`/imports` を目視する。壊れている所だけ実害ベースで列挙し、ログイン後ダッシュボードのスクショを1枚保存する。
- 検証: 各画面の到達可否、致命バグ実リスト、スクショ。
- rollback: 調査のみ。製品コード変更なし。
- 承認要否: 不要。ただし本番DB、本番ユーザー、本番パスワードには触れない。
- 更新時刻: 2026-06-27T19:25:00+09:00
- メモ: ユーザー指示により、T1/T2完了後に一旦停止するため、このタスクは LLLタスクとして次回再開候補。

### T-20260627-004 ルールmd保守ループ確立

- 状態: BLOCKED
- 種別: chore
- リスク区分: mid
- 起票者: user
- 起票時刻: 2026-06-27T19:00:00+09:00
- 詳細: safety-gate/監査が穴を検知、同一BLOCKER再発、参照不整合/誤記発見をトリガーに、起票、提案、承認、反映を1周回す。
- 検証: 実例で1周。
- rollback: ルール変更PRをrevert。
- 承認要否: H1完了まで提案も保留。
- 承認参照: A-20260627-001
- 更新時刻: 2026-06-27T19:25:00+09:00

### T-20260627-005 standing authorization token 運用方針案

- 状態: READY
- 種別: docs
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T20:00:00+09:00
- 詳細: H3の実行準備として、standing authorization token の生成方法、桁数/エントロピー、repo平文保存禁止、1トークン=1タスク=1HEAD、使用後token-consumed、検証手順をdocsにドラフトする。
- 検証: docsのみ、secret値なし、token生成なし、保管なし、削除差分なし。
- rollback: Draft PR/commitをrevertする。
- 承認要否: 実際のtoken発行・保管はNEEDS_HUMAN。docs提案のみTier 1。
- 承認参照: A-20260627-003
- 更新時刻: 2026-06-27T20:00:00+09:00

### T-20260627-006 PowerShell 実行ポリシー標準化案

- 状態: READY
- 種別: docs
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T20:00:00+09:00
- 詳細: H4の実行準備として、署名運用または `powershell -ExecutionPolicy Bypass -File` 標準化の手順案をdocsにドラフトする。
- 検証: docsのみ、マシン設定変更なし、削除差分なし。
- rollback: Draft PR/commitをrevertする。
- 承認要否: マシンの実行ポリシー変更はNEEDS_HUMAN。docs提案のみTier 1。
- 承認参照: A-20260627-004
- 更新時刻: 2026-06-27T20:00:00+09:00
