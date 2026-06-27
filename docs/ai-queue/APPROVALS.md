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

- 状態: NEEDS_HUMAN
- 対応タスク: H2 / B1 / B2
- 要約: `scripts/` と `docs/ai-queue/DECISIONS.md` を Codex 書込不可にACL/別アカで隔離する。
- 理由: 全自動運用の真正性を担保するため。Codex自身が自分をロックする操作は信頼境界にならない。
- AI推奨: 人間または別権限主体が隔離を設定する。
- 禁止: Codex単独でACL変更しない。
- 更新時刻: 2026-06-27T19:25:00+09:00

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

- 状態: WAITING_APPROVAL
- 対応タスク: T-20260627-001 / T-20260627-002
- 要約: ルール基盤PRを main へ反映するか。
- 理由: main merge は Vercel production deploy 直結として扱う。H2/H3完了まで auto merge / Ready化 / 本番deploy自動は無効。
- AI推奨: safety-gate PASS、削除差分なし、Vercel green、内部監査OK、rollback事前確認を満たした後に、人間承認またはH2/H3完了後の委任ルールで進める。
- 注意: safety-gateはPASSだが624行追加のためLARGE CHANGEフラグあり。mergeする場合は事前にrevert/rollback方針を再確認し、merge後に通知とLARGE記録が必要。
- 禁止: この段階でCodex単独のReady化 / merge / 本番deployはしない。
- 更新時刻: 2026-06-27T19:25:00+09:00
