﻿# HEARTBEAT.md — 引き継ぎ

## 2026-06-27T19:25:00+09:00 rule foundation session

### セッション情報

- 対象repo: `kenken5230/ses_console_vol1`
- 作業worktree: `C:\Users\ke919\OneDrive\ドキュメント\1234project\__rule_foundation_20260627`
- branch: `codex/rule-foundation-20260627`
- base: `origin/main` at `17c632b`
- session start ref for safety gate: `17c632b22bc438140fbf012c7305602f077baebf`
- 主workspace: dirtyのため保全。reset/clean/checkout/stashなし。

### 完了

- T1: `AI_PROJECT_PROFILE.md` を作成し、main deploy影響、rollback、staging有無を安全側で仮記入。
- T2: `docs/ai-queue/` と `scripts/safety-gate.ps1` を初期配置。
- H1-H4 を `APPROVALS.md` に起票。
- T4/B1/B2/B3 を `BLOCKERS.md` に記録。
- commit後 safety-gate は PASS。ただし624行追加のため LARGE CHANGE フラグあり。

### 検証根拠

- `git remote -v`: repo URL確認。
- `gh pr list --repo kenken5230/ses_console_vol1 --json statusCheckRollup`: Vercel Preview確認。
- `gh api repos/kenken5230/ses_console_vol1/commits/17c632b22bc438140fbf012c7305602f077baebf/status`: main commit の Vercel success確認。
- `package.json`: build commandが `prisma generate && next build` であることを確認。
- `git status`: 主workspaceがdirtyのため、clean worktreeで作業。
- rollback: このルール基盤commitまたはPRをrevertする。merge前に再確認が必要。

### 次回継続

- DONE: T-20260627-003 最新mainの実アプリ入口特定。`docs/status/app-entrypoint-baseline-2026-06-27.md` を参照。
- BLOCKED: T-20260627-007 実ブラウザ入口確認。本番ログイン復旧またはlocal/testログイン準備後に実施。
- DONE: T-20260627-005 standing authorization token 運用方針案。`docs/pmo/standing-authorization-token-policy-2026-06-27.md` を参照。
- DONE: T-20260627-006 PowerShell 実行ポリシー標準化案。`docs/pmo/powershell-execution-policy-standard-2026-06-27.md` を参照。
- DONE: T-20260627-008 Gmail sync-run sanitizer refresh。`docs/status/gmail-sync-run-dbfree-diagnostics-2026-06-27.md` を参照。
- H1-H4: 人間確認待ち。
- B1/B2/T4: H1/H2/H3完了待ち。

### 承認待ち

- A-20260627-001: rule repo git管理化。
- A-20260627-002: scripts と DECISIONS の書込隔離。
- A-20260627-003: standing authorization token。
- A-20260627-004: PowerShell実行ポリシー標準化。
- DONE: A-20260627-005 rule foundation PR の Ready / merge。#159 merged at `24dc7160834ee0360709214f1e8ba52e92ae5384`。

### 禁止事項遵守

- secret値の読み取り/出力なし。
- DB writeなし。
- migration/schema変更なし。
- Ready化/merge/本番deployなし。
- worktree削除/branch削除なし。
- 主workspaceのdirty差分操作なし。

## 2026-06-27T23:55:00+09:00 post-#163 queue/status sync

### セッション情報

- 対象repo: `kenken5230/ses_console_vol1`
- 作業worktree: `C:\Users\ke919\OneDrive\ドキュメント\1234project\__post163_queue_sync_20260627`
- branch: `codex/post163-queue-sync-20260627`
- base: `origin/main` at `d379da60dcef1765ac46424261b252fb21dc4242`
- 主workspace: dirtyのため保全。reset/clean/checkout/stashなし。

### 完了

- #159〜#163 のmain反映後状態を `PROGRESS.md` と `docs/status/post163-current-state-2026-06-27.md` に記録。
- #147/#151/#154/#156/#157/#158 がclosed済みで、branch削除なしであることを記録。
- A-20260627-005 をDONEへ更新。
- T-20260627-009 をDONEとして追加。
- stale #154/#157 相当を T-20260627-010 / T-20260627-011 としてBLOCKEDへ切り分け。
- `gh pr list` / `gh issue list` で open PR 0 / open issue 0 を確認。

### 次回継続

- BLOCKED: T-20260627-004 rule md 保守ループ。H1待ち。
- BLOCKED: T-20260627-007 実ブラウザ入口確認。本番ログイン復旧またはlocal/testログイン準備待ち。
- BLOCKED: T-20260627-010 / T-20260627-011。`scripts/` freezeのため、H2完了後の例外承認または非scripts redesign待ち。
- WAITING_APPROVAL: H1 rule repo git管理化、H2 write isolation、H3 standing authorization token、H4 PowerShell policy。

### 禁止事項遵守

- secret値の読み取り/出力なし。
- DB writeなし。
- migration/schema変更なし。
- worktree削除/branch削除なし。
- 主workspaceのdirty差分操作なし。

## 2026-06-28T00:15:00+09:00 H2 CI gate draft

### 完了

- T-20260627-012 を起票。
- `.github/workflows/ai-safety-gate.yml` をDraft PR材料として追加。
- check名を `ai-safety-gate` / `typecheck` / `test` / `build` に固定。
- branch protectionやrepository settingsは変更していない。

### 次回継続

- 人間がGitHub branch protectionで必須checkに設定するまでは強制力なし。
- このPRは `.github/workflows` 追加を含むため、local safety-gateはdeploy-chain hintでBLOCK想定。
