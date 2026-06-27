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

- 状態: DONE
- 種別: investigate
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T19:00:00+09:00
- 詳細: latest `origin/main` からclean worktreeを作り、ローカル起動、ログイン、ダッシュボード、案件/要員/未分類、`/matches`、`/market-analysis`、`/imports` を目視する。壊れている所だけ実害ベースで列挙し、ログイン後ダッシュボードのスクショを1枚保存する。
- 検証: `docs/status/app-entrypoint-baseline-2026-06-27.md` に主要入口、権限ガード、実害候補を記録。今回はread-only入口特定として完了し、実ブラウザ到達確認は別タスク化。
- rollback: 調査のみ。製品コード変更なし。
- 承認要否: 不要。ただし本番DB、本番ユーザー、本番パスワードには触れない。
- 更新時刻: 2026-06-27T22:10:00+09:00
- メモ: 実ブラウザでのログイン後スクリーンショット確認は未実施。これは本番ログイン復旧またはlocal/testログイン準備後の別タスク。

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

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T20:00:00+09:00
- 詳細: H3の実行準備として、standing authorization token の生成方法、桁数/エントロピー、repo平文保存禁止、1トークン=1タスク=1HEAD、使用後token-consumed、検証手順をdocsにドラフトする。
- 検証: `docs/pmo/standing-authorization-token-policy-2026-06-27.md` を追加。docsのみ、secret値なし、token生成なし、保管なし、削除差分なし。
- rollback: Draft PR/commitをrevertする。
- 承認要否: 実際のtoken発行・保管はNEEDS_HUMAN。docs提案のみTier 1。
- 承認参照: A-20260627-003
- 更新時刻: 2026-06-27T22:30:00+09:00

### T-20260627-006 PowerShell 実行ポリシー標準化案

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-27T20:00:00+09:00
- 詳細: H4の実行準備として、署名運用または `powershell -ExecutionPolicy Bypass -File` 標準化の手順案をdocsにドラフトする。
- 検証: `docs/pmo/powershell-execution-policy-standard-2026-06-27.md` を追加。docsのみ、マシン設定変更なし、削除差分なし。
- rollback: Draft PR/commitをrevertする。
- 承認要否: マシンの実行ポリシー変更はNEEDS_HUMAN。docs提案のみTier 1。
- 承認参照: A-20260627-004
- 更新時刻: 2026-06-27T22:50:00+09:00

### T-20260627-007 実ブラウザ入口確認

- 状態: BLOCKED
- 種別: qa
- リスク区分: mid
- 起票者: Codex
- 起票時刻: 2026-06-27T22:10:00+09:00
- 詳細: 通常ログイン後に Dashboard、案件/要員/未分類、`/market-analysis`、`/matches`、`/imports` の到達可否をブラウザで確認し、スクリーンショットを残す。
- 検証: 画面到達可否、権限ロール、スクリーンショット、コンソールエラー有無。
- rollback: 調査のみ。
- 承認要否: 本番環境ではread-only通常ログインのみ。local/testで行う場合はDB接続先分類とログインユーザー準備が必要。
- ブロック理由: 本番ログイン復旧またはlocal/testログイン準備が先。
- 更新時刻: 2026-06-27T22:10:00+09:00

### T-20260627-008 Gmail sync-run sanitizer refresh

- 状態: DONE
- 種別: code+docs+test
- リスク区分: low
- 起票者: Codex
- 起票時刻: 2026-06-27T23:20:00+09:00
- 詳細: stale PR #156 の有用部分を最新mainへ救出し、`sanitizeOperationalError` にDB URL redactionを追加する。`scripts/` freezeに合わせ、追加テストは `tests/` 配下へ置く。production sync実行やGmail API呼び出しは行わない。
- 検証: `npx.cmd tsx tests/gmail-sync-run-safety.test.ts`、`scripts/safety-gate.ps1`、削除差分0、rollback pre-check。
- rollback: このPR/commitをrevertする。
- 承認要否: 不要。DB-free、secret-free、production操作なし。
- 更新時刻: 2026-06-27T23:20:00+09:00

### T-20260627-009 post-#163 queue/status sync

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: Codex
- 起票時刻: 2026-06-27T23:55:00+09:00
- 詳細: #159〜#163 と stale PR close 後の状態を `PROGRESS.md`、`docs/ai-queue/`、`docs/status/` に同期する。古い #159 承認待ちを完了扱いへ更新し、残タスクを `WAITING_APPROVAL` / `BLOCKED` として整理する。
- 検証: `docs/status/post163-current-state-2026-06-27.md` を追加し、`PROGRESS.md` を最新mainへ同期し、open PR/open issueが0であることを `gh pr list` / `gh issue list` で確認。
- rollback: このPR/commitをrevertする。
- 承認要否: 不要。docs-only、DB/schema/env/package/lockfile変更なし。
- 更新時刻: 2026-06-27T23:55:00+09:00

### T-20260627-010 script hardening follow-up

- 状態: BLOCKED
- 種別: test/chore
- リスク区分: mid
- 起票者: Codex
- 起票時刻: 2026-06-27T23:55:00+09:00
- 詳細: stale #154 相当の safe-output / diagnostic hardening を、現行の `scripts/` freeze ルールに抵触しない形へ再設計する。
- 検証: 未定。再設計後にDB-free test、safety-gate、削除差分0を確認する。
- rollback: 未着手。
- 承認要否: `scripts/` を触る場合はH2完了後の例外承認または別ゲートが必要。
- ブロック理由: #159以降、`scripts/` は読み取り検証のみ。旧 #154 はこのルールに合わないためclosed済み。
- 更新時刻: 2026-06-27T23:55:00+09:00

### T-20260627-011 Gmail admin env readiness follow-up

- 状態: BLOCKED
- 種別: docs/test/chore
- リスク区分: mid
- 起票者: Codex
- 起票時刻: 2026-06-27T23:55:00+09:00
- 詳細: stale #157 相当の Gmail admin env readiness helper を、secret値を出さず、`scripts/` freeze にも抵触しない形へ再設計する。
- 検証: 未定。docs-only redesign または明示承認済みhelperとして再起票する。
- rollback: 未着手。
- 承認要否: `scripts/` を触る場合はH2完了後の例外承認または別ゲートが必要。
- ブロック理由: #159以降、`scripts/` は読み取り検証のみ。旧 #157 はこのルールに合わないためclosed済み。
- 更新時刻: 2026-06-27T23:55:00+09:00
