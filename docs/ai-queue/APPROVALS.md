﻿# APPROVALS.md — 承認待ち

このファイルは、AI単独で実行できない操作の承認待ち一覧です。決済/課金、大量削除、顧客や第三者への送信、秘密の外部持ち出しは常にNEEDS_HUMANです。

## A-20260627-001 rule repo git管理化

- 状態: NEEDS_HUMAN
- 対応タスク: H1 / T-20260627-004
- 要約: `C:\Users\ke919\OneDrive\ドキュメント\1234project\rule_AI_development` を git 管理下に置く。
- 理由: `git init` と初回commit前に、secret混入がないか人間確認が必要。
- AI推奨: ルールrepoをgit管理化し、初回commit前に人間がsecret混入を確認する。
- 禁止: Codex単独で `git init` / 初回commitを実行しない。
- 更新時刻: 2026-06-27T19:25:00+09:00

## A-20260627-002 scripts と DECISIONS の書込隔離

- 状態: DONE
- 対応タスク: H2 / B1 / B2
- 要約: `scripts/` と `docs/ai-queue/DECISIONS.md` を Codex 書込不可にACL/別アカで隔離する。
- 理由: 全自動運用の真正性を担保するため。Codex自身が自分をロックする操作は信頼境界にならない。
- 結果: H2の実現方式は、ローカルACLではなくGitHub branch protection + required checks + CODEOWNERS + Codex token権限制限へ置き換え。#166/#169はmain反映済み。
- 次の承認: #6 branch protection有効化は A-20260629-009、#7 Codex token権限制限は A-20260629-010 で追跡する。
- 禁止: Codex単独でACL変更、branch protection変更、token権限変更をしない。
- 更新時刻: 2026-06-29T15:20:00+09:00

## A-20260627-003 standing authorization token

- 状態: NEEDS_HUMAN
- 対応タスク: H3 / B1 / B2
- 要約: 委任オートマージ用 standing authorization token の発行・保管方法を決める。
- 理由: 秘密=4例外。repo平文保存は禁止。Codexは値を読まない、保存しない、出力しない。
- AI推奨: `docs/pmo/standing-authorization-token-policy-2026-06-27.md` の方針案に沿い、OS資格情報/安全なsecret manager/ユーザー操作のいずれかで保管する。repoには識別子だけを書く。
- 禁止: token値をAIに貼らない、repoに保存しない。
- 更新時刻: 2026-06-27T22:30:00+09:00

## A-20260627-004 PowerShell実行ポリシー標準化

- 状態: NEEDS_HUMAN
- 対応タスク: H4
- 要約: `powershell -ExecutionPolicy Bypass -File` を標準にするか、署名運用にするかを確定する。
- 理由: 現状は `-ExecutionPolicy Bypass -File` が指定されているが、長期運用では人間が方針を確定した方がよい。
- AI推奨: `docs/pmo/powershell-execution-policy-standard-2026-06-27.md` の方針案に沿い、短期は `powershell -NoProfile -ExecutionPolicy Bypass -File` を標準化し、H2完了後に署名運用を検討する。
- 禁止: Codex単独でマシン全体の実行ポリシーを変更しない。
- 更新時刻: 2026-06-27T22:50:00+09:00

## A-20260627-005 rule foundation PR の Ready / merge

- 状態: DONE
- 対応タスク: T-20260627-001 / T-20260627-002
- 要約: ルール基盤PR #159 は main へ反映済み。
- 理由: safety-gate PASS、削除差分なし、Vercel green、rollback事前確認、内部監査OKを満たしたため。LARGE CHANGE記録は `DECISIONS.md` を書き換えずPRコメントに残した。
- 結果: #159 merged。main merge commit `24dc7160834ee0360709214f1e8ba52e92ae5384`。
- 注意: H2/H3は未完了のため、委任オートマージ / 本番deploy自動は引き続き無効。
- 更新時刻: 2026-06-27T23:55:00+09:00

## A-20260629-006 H2 docs-only PR の Ready / merge

- 状態: DONE
- 対応タスク: T-20260627-014 / T-20260627-015 / T-20260627-016
- 要約: H2材料PRのうち docs-only 3本（#165 / #167 / #168）を、ユーザー承認に基づきReady化してsquash mergeした。
- 理由: 3本ともdocs-only、削除差分0、DB/schema/env/package/lockfile変更なし。#167/#168は#165 merge後の記録文書競合を、両方の内容を残す形で通常merge追従してから実行した。
- 結果: #165 merged at `ed5f0c4e83dbe6d5f3f5afe50759f10d144d81bd`; #167 merged at `4eda58233ba6cf92171c367ed5689020209d4ca9`; #168 merged at `76d6a433c64d6a4d494d6f3a284eb25d262bb3c2`。
- 注意: #166 AI safety gate workflow と #169 CODEOWNERS はDraftのまま残し、CodexはReady化/mergeしていない。
- 更新時刻: 2026-06-29T10:20:00+09:00

## A-20260629-007 H2 safety gate / CODEOWNERS manual merge

- 状態: DONE
- 対応タスク: H2 / B1 / B2
- 要約: ユーザー明示承認に基づき、#166 `ai-safety-gate` workflow と #169 `CODEOWNERS` をCodexがReady化してsquash mergeした。
- 理由: #166/#169はH2材料として承認済み。#166は `.github/workflows/ai-safety-gate.yml` 1ファイル、#169は `.github/CODEOWNERS` 1ファイルへ縮小してから実行した。
- 結果: #166 merged at `3f4071949c43e948801a629993155e4a4b72b125`; #169 merged at `57afd28791bdd1a3cd2c3ab4ed9e779f8f089534`。
- 注意: GitHub branch protection、PAT権限変更、auto-merge有効化は未実施。#6/#7として別途NEEDS_HUMAN。
- 更新時刻: 2026-06-29T15:20:00+09:00

## A-20260629-008 #171 heartbeat governance gate merge判断

- 状態: NEEDS_HUMAN
- 対応タスク: T-20260629-019
- 要約: #171 `Add heartbeat governance resume gate` のレビュー、Ready化、merge判断。
- 理由: `AI_WORK_RULES.md` / `AI_WORK_RULES_SHORT.md` はCODEOWNERS対象のルール文書。heartbeat resume制限の重要ルール追加であり、人間レビュー必須。
- AI推奨: #6/#7の実施前に、#171の内容が意図通りか確認し、問題なければ人間判断でReady化/mergeする。
- 禁止: Codexは #171 を自動Ready化/mergeしない。
- 更新時刻: 2026-06-29T15:20:00+09:00

## A-20260629-009 #6 GitHub branch protection 有効化

- 状態: DONE
- 対応タスク: H2 / B1 / B2 / T-20260629-020
- 要約: GitHubの `main` branch protection を有効化する。required checks、CODEOWNERS review必須、直push禁止、force push禁止、bypass禁止を設定する。
- 理由: Codexが保護なしmainへ直接影響できる状態を防ぐため。GitHub設定変更はCodex自身が行わない。
- 結果: ユーザー明示承認に基づきCodexが設定。`main` はprotected=true。required checksは `ai-safety-gate,typecheck,test,build,Vercel`。CODEOWNERS review必須、approval 1、dismiss stale reviews有効、admin enforcement true、force push/deletion禁止。
- 注意: token権限制限は未完了。#7完了までheartbeat resumeは不可。
- 更新時刻: 2026-07-01T00:00:00+09:00

## A-20260629-010 #7 Codex実行トークン権限制限

- 状態: NEEDS_HUMAN
- 対応タスク: H2 / H3 / B1 / B2 / T-20260629-020
- 要約: Codex実行用トークンを、repo admin / settings / branch protection 変更権限なしに制限する。
- 理由: Codexがbranch protectionや安全ゲートを自分で外せないようにするため。token値は秘密=4例外。
- 現状: `gh auth status` ではmasked tokenのみ確認。既存GitHub CLI tokenは `repo` scopeを保持しており、GitHub CLIの最小scopeとして `repo` を外せないため、Codex単独ではadmin/settings/branch protection変更能力を十分に除去できない。
- AI推奨: けんさん側でfine-grained PATまたはGitHub App tokenへ差し替え、repo限定で `Contents` / `Pull requests` 中心、`Administration` なし、必要なければ `Workflows` なしにする。token値はAIやrepoに貼らない。
- 禁止: Codexはtoken値を読まない、表示しない、保存しない。既存tokenの破壊的logoutや資格情報削除も実施しない。
- 更新時刻: 2026-07-01T00:00:00+09:00
