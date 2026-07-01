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

### T-20260627-014 H2 enforcement runbook draft

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: Codex
- 起票時刻: 2026-06-28T00:25:00+09:00
- 詳細: H2をGitHubブランチ保護、必須CI、CODEOWNERS、fine-grained token制限で有効化するための人間向け手順書をDraft PRで提案する。
- 検証: `docs/pmo/h2-enforcement-runbook.md` を追加。設定変更なし、secret値なし、DB/schema/env/package/lockfile変更なし、削除差分0。
- rollback: このDraft PR/commitを破棄またはrevertする。
- 承認要否: GitHub branch protection、token権限変更、auto-merge設定はNEEDS_HUMAN。手順書作成のみTier 1。
- 結果: #165 Ready化後にsquash merge済み。merge commit `ed5f0c4e83dbe6d5f3f5afe50759f10d144d81bd`。
- 更新時刻: 2026-06-29T10:20:00+09:00

### T-20260627-015 H2 profile update draft

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: Codex
- 起票時刻: 2026-06-28T00:30:00+09:00
- 詳細: `AI_PROJECT_PROFILE.md` §4へ、H2実現方式案としてGitHub branch protection、required CI checks、CODEOWNERS、Codex token権限制限を追記する。状態は `PENDING / disabled for now` のまま維持する。
- 検証: Profile更新のみ。委任オートマージON化なし、GitHub設定変更なし、secret値なし、削除差分0。
- rollback: このDraft PR/commitを破棄またはrevertする。
- 承認要否: H2有効化と委任ON化はNEEDS_HUMAN。Profile提案のみTier 1。
- 結果: #167 を最新mainへ通常mergeで追従し、Ready化後にsquash merge済み。merge commit `4eda58233ba6cf92171c367ed5689020209d4ca9`。
- 更新時刻: 2026-06-29T10:20:00+09:00

### T-20260627-016 H2 handoff checklist draft

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: Codex
- 起票時刻: 2026-06-28T00:35:00+09:00
- 詳細: Kenが一度だけ実行するGitHub設定操作を5項目以内でまとめた `docs/pmo/h2-handoff-2026-06-27.md` をDraft PRで提案する。
- 検証: docsのみ、設定変更なし、secret値なし、DB/schema/env/package/lockfile変更なし、削除差分0。
- rollback: このDraft PR/commitを破棄またはrevertする。
- 承認要否: 実際のGitHub設定操作とtoken権限変更はNEEDS_HUMAN。handoff作成のみTier 1。
- 結果: #168 を最新mainへ通常mergeで追従し、Ready化後にsquash merge済み。merge commit `76d6a433c64d6a4d494d6f3a284eb25d262bb3c2`。
- 更新時刻: 2026-06-29T10:20:00+09:00

### T-20260629-017 post-H2 docs merge sync

- 状態: DONE
- 種別: docs
- リスク区分: low
- 起票者: Codex
- 起票時刻: 2026-06-29T10:20:00+09:00
- 詳細: 承認済みH2 docs-only PR #165/#167/#168 のmerge結果と、H2手動PR #166/#169 の残承認待ちを `PROGRESS.md` / `docs/ai-queue/` / `docs/status/` へ同期する。
- 検証: open PR、checks、merge commits、削除差分0、safety-gateを確認する。
- rollback: この同期PR/commitをrevertする。
- 承認要否: 不要。docs-only、DB/schema/env/package/lockfile変更なし。
- 更新時刻: 2026-06-29T10:20:00+09:00

### T-20260629-018 H2 safety gate / CODEOWNERS main反映

- 状態: DONE
- 種別: workflow/config
- リスク区分: mid
- 起票者: user
- 起票時刻: 2026-06-29T12:20:00+09:00
- 詳細: ユーザー明示承認に基づき、#166 `ai-safety-gate` workflow と #169 `CODEOWNERS` を順にReady化してsquash mergeした。#166は #170 merge後のmainへ追従し、PR差分を `.github/workflows/ai-safety-gate.yml` 1ファイルへ縮小。#169は #166 merge後のmainへ追従し、PR差分を `.github/CODEOWNERS` 1ファイルへ縮小。
- 検証: #166/#169とも削除差分0、DB/schema/env/package/lockfile変更なし。#169 merge後の `origin/main` は `57afd28791bdd1a3cd2c3ab4ed9e779f8f089534`。本番URLはHTTP 200、Vercel status success。
- rollback: 対象merge commitのrevert PRで戻す。GitHub branch protection / PAT権限 / heartbeat設定は変更していない。
- 承認要否: 実mergeはユーザー承認済み。以後のbranch protection有効化とtoken権限制限は別のNEEDS_HUMAN。
- 更新時刻: 2026-06-29T15:20:00+09:00

### T-20260629-019 heartbeat governance gate rule proposal

- 状態: WAITING_APPROVAL
- 種別: docs/rule
- リスク区分: mid
- 起票者: user
- 起票時刻: 2026-06-29T15:20:00+09:00
- 詳細: heartbeat自律進行ループのresume/status有効化は、main branch protectionとCodex実行トークン権限制限が両方有効になるまでAI判断で行わない、というガバナンスゲートを `AI_WORK_RULES.md` / `AI_WORK_RULES_SHORT.md` へ追記するDraft PRを作成。
- 結果: #171 `Add heartbeat governance resume gate` はDraft/open。mergeable CLEAN、Vercel / ai-safety-gate / typecheck / test / build はsuccess。CODEOWNERS対象のためReady化/mergeは人間レビュー待ち。
- rollback: #171をcloseするか、merge後ならrevert PRで戻す。
- 承認要否: #171のレビュー、Ready化、merge判断はNEEDS_HUMAN。
- 更新時刻: 2026-06-29T15:20:00+09:00

### T-20260629-020 LLLタスク停止状態

- 状態: WAITING_APPROVAL
- 種別: governance
- リスク区分: low
- 起票者: user
- 起票時刻: 2026-06-29T15:20:00+09:00
- 詳細: ruleタスク完了後、残バックログを「LLLタスク」として停止扱いにする。ユーザーが「LLLタスク」または対象タスク名で再開指示するまで、AI判断で残タスクを進めない。
- 現在の残り: #171 merge判断、#7完了確認、H1 rule repo git管理化、H3 standing authorization token、H4 PowerShell運用判断。
- 完了: #6 GitHub branch protection はユーザー承認に基づきCodexが設定済み。`main` はprotected=true、required checksは `ai-safety-gate,typecheck,test,build,Vercel`、CODEOWNERS review必須、approval 1、admin enforcement true、force push/deletion禁止。
- 確認済み: #7 Codex実行トークン権限制限はけんさん操作でfine-grained PATへ差し替え済み。Codex側のread-only確認ではrepo参照は可能だが、branch protection詳細APIは `Resource not accessible by personal access token` となり、branch protection/settings系の権限が外れていることを確認。
- 追加確認: GCM資格情報を消去し、`gh auth setup-git` 後、handoffではない機能ブランチでpush到達性を検証。結果は403ではなくnon-fast-forward拒否で、古い資格情報による403は解消。
- ブロック理由: #6/#7の技術ゲートは概ね達成。ただし #7完了宣言はけんさん確認待ち。heartbeat resume / status有効化はユーザーの明示再開指示があるまで実行しない。#171 rule PRの人間レビュー/merge判断も未完了。
- 承認要否: LLL再開指示、または個別タスク名での再開指示が必要。
- 更新時刻: 2026-07-01T10:45:00+09:00

### T-20260701-021 #173 status sync review / worktree metadata cleanup gate

- 状態: WAITING_APPROVAL
- 種別: docs/governance
- リスク区分: low
- 起票者: user / Codex
- 起票時刻: 2026-07-01T13:10:00+09:00
- 詳細: Claudeが誤って実作業した #173 `docs: sync approval packets to #149/#150 merged state` をCodexがread-onlyレビューした。#173はDraft/openのまま活かし、Ready化/merge/closeはしない。残置した `.git/worktrees/ses_console_vol1_docs_status_sync_wt` は既存のworktree cleanup承認ゲートへ1項目として積む。
- #173確認: 変更は `docs/pmo/approval-waiting-packet-2026-06-24.md` と `docs/pmo/next-approval-gates-2026-06-26.md` の2ファイルのみ。#149 `256a443` / #150 `17c632b` は `origin/main` の祖先で、`test:search-history-ui-context` は `package.json` の個別scriptと集約 `npm test` に配線済み。CI/Vercelはsuccess。
- cleanup対象候補: `.git/worktrees/ses_console_vol1_docs_status_sync_wt`。確認時点では `logs` / `refs` / `ORIG_HEAD` が残り、`ReadOnly, Directory, Archive, ReparsePoint` 属性を含む。今は削除しない。
- 検証: `gh pr view 173`、`gh pr diff 173`、`git merge-base --is-ancestor 256a443 origin/main`、`git merge-base --is-ancestor 17c632b origin/main`、`git show origin/main:package.json`、metadata `Test-Path` / 属性確認。
- rollback: docs記録のみ。誤記があればこのPR/commitをrevertまたは修正する。
- 承認要否: #173のReady化/mergeは人間判断。metadata cleanupは fresh dry-run、属性確認、バックアップ方針、削除対象の単一性確認を揃えた別承認が必要。
- 承認参照: A-20260701-011
- 更新時刻: 2026-07-01T13:10:00+09:00
