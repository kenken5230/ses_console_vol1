# AI_PROJECT_PROFILE.md

このファイルは `ses_console_vol1` 固有のAI運用設定です。共通ルールは `AI_WORK_RULES.md` / `AI_WORK_RULES_SHORT.md` を正とし、このProfileはそれを弱めません。

## 1. プロジェクト基本情報

| 項目 | 値 |
|---|---|
| プロジェクト名 | SES console / `ses-console-vol1` |
| repo | `https://github.com/kenken5230/ses_console_vol1` |
| default branch | `main` |
| 主な技術 | Next.js / React / Prisma / Node.js / npm / Vercel |
| 主workspace運用 | dirtyなら新規作業baseにしない。新規作業は latest `origin/main` から clean worktree / clean branch を作る |
| 権限運用 | `danger-full-access`。秘密値は読まない、表示しない。安全性は `AGENTS.md` / `AI_WORK_RULES.md` / `default.rules` で担保 |
| ルール導入日 | 2026-06-27 |
| 最終更新日 | 2026-06-27 |

## 2. deploy / production影響

| 項目 | 値 |
|---|---|
| main mergeでproduction deployが走るか | **yes として扱う**。GitHub statusで main commit に Vercel success が付くため、main mergeはproduction deployゲートとして扱う |
| deploy provider | Vercel |
| preview deployの有無 | あり。open PR の statusCheckRollup に `Vercel` Preview success が付く |
| dedicated staging の有無 | 専用stagingは未確認。PR Previewはあるがstaging相当DBとして扱わない |
| production deploy確認方法 | GitHub commit status / PR checks の `Vercel`、必要に応じて Vercel dashboard の read-only確認 |
| rollback手段 | 原則 `git revert` / revert PR で戻し、Vercelで再deployする。Vercel側は直前のproduction deploymentへのrollback/redeployを候補にする |
| build command | `npm run build` 相当。`package.json` 上は `prisma generate && next build` |
| migration自動実行 | `package.json` build上は `prisma migrate deploy` を含まない。ただしschema/migration変更は別ゲート |

## 3. AIが確認なしで進めてよい範囲

`AI_WORK_RULES.md` の Tier 1 に一致する範囲だけです。

- read-only調査
- docs更新
- テスト追加 / 修正
- lint / typecheck / build
- 明らかなバグのlocal実装とcommit
- Draft PR作成
- PR本文更新

以下は、このProfileでは緩和しません。

- Ready化 / merge / close / deploy
- production / staging / shared DB write
- migration / schema変更
- env / secret / credentials 変更
- 大量削除、重要ファイル削除、worktree削除、branch削除
- 顧客や第三者への送信、課金、秘密の外部持ち出し

## 4. 委任オートマージ状態

| 項目 | 値 |
|---|---|
| 状態 | **PENDING / disabled for now** |
| 理由 | ユーザー指示により、H2（`scripts/` と `docs/ai-queue/DECISIONS.md` の書込隔離）と H3（standing authorization tokenの安全な保管）が完了するまで、自動Ready化 / merge / 本番deployは有効化しない |
| 現在の扱い | merge / Ready化 / 本番deploy が必要になったら `WAITING_APPROVAL` に積む |

## 5. DB / 永続データ

| 環境 | AI write可否 | 条件 |
|---|---|---|
| local | 条件付き可 | 対象DB分類、件数、対象ID、rollback、cleanup、監査を明記 |
| test | 条件付き可 | localと同じ |
| staging | 不可 | 明示承認が必要 |
| production | 不可 | 明示承認が必要 |
| shared / unknown | 不可 | 分類できるまでwrite禁止 |

秘密値や接続文字列の実値はこのProfileに記載しません。

## 6. 検証コマンド

| 種別 | コマンド | 備考 |
|---|---|---|
| typecheck | `npm.cmd run typecheck` | Next typegen + TypeScript |
| test | `npm.cmd test` | package scriptに集約 |
| build | `npm.cmd run build` | Prisma generate + Next build |
| safety gate | `powershell -ExecutionPolicy Bypass -File scripts/safety-gate.ps1 -SessionStartRef <session-start-head>` | commit後は必ずSessionStartRefを渡す |

## 7. 初回read-only調査の根拠

| 項目 | 仮記入値 | 根拠 | 確信度 | 状態 |
|---|---|---|---|---|
| repo | `kenken5230/ses_console_vol1` | `git remote -v` | high | AI推奨 |
| default branch | `main` | `origin/HEAD -> origin/main` | high | AI推奨 |
| main deploy | yes扱い | `gh api .../commits/<sha>/status` に Vercel success | medium | 安全側でyes扱い |
| preview deploy | あり | `gh pr list --json statusCheckRollup` の Vercel Preview success | high | AI推奨 |
| staging | 専用staging未確認 | repo内設定とGitHub/Vercel statusから専用stagingを確認できず | medium | unknown寄り |
| rollback | revert + Vercel redeploy | Git/GitHub運用とVercel deployment status | medium | 安全側 |
| build | `prisma generate && next build` | `package.json` | high | AI推奨 |

## 8. 初回導入チェックリスト

- [x] `AGENTS.md` がある
- [x] `AI_WORK_RULES.md` がある
- [x] `AI_WORK_RULES_SHORT.md` がある
- [x] `AI_PROJECT_PROFILE.md` がある
- [x] `docs/ai-queue/` がある
- [x] `scripts/codex-notify.ps1` がある
- [x] `scripts/safety-gate.ps1` を追加する
- [x] 共通ルールでユーザー確認必須の操作をProfileで緩和していない
- [x] H2/H3完了まで委任オートマージを無効扱いにしている
