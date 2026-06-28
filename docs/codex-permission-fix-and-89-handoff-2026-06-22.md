# Codex 引き継ぎ — 権限不具合の修正 & #89 続き（2026-06-22）

宛先: 再起動後の Codex（OpenAI Codex Desktop, workspace = `ses_console_vol1`）
作成: Claude Code（Opus 4.8）。ユーザーは再起動のためいったん離席中。

---

## 0. まず最初にやること（権限が直ったかの検証）

権限プロファイルの不具合を修正済み。**完全再起動後**、shell tool で以下が通るか確認してから本作業に入ること。

```
Get-Location
[System.Environment]::UserName
Test-Path -LiteralPath "C:\Users\ke919\OneDrive\ドキュメント\1234project\ses_console_vol1"
Test-Path -LiteralPath "C:\Users\ke919\OneDrive\ドキュメント\1234project\__qa_project_company_contact_link_20260621"
git -C "C:\Users\ke919\OneDrive\ドキュメント\1234project\__qa_project_company_contact_link_20260621" status -sb
```

期待: `Get-Location` 成功 / `Test-Path` が `True` / `git status` が読める。
もし**まだ同じエラー**（`Restricted read-only access requires the elevated Windows sandbox backend`）が出る場合は、再起動が不完全（古い backend が残存）。Codex を**タスクトレイからも完全終了**して再起動し直すこと。それでも再発するならユーザーに報告。

---

## 1. 何が壊れていて、どう直したか

- **症状**: shell tool が `Get-Location` すら `Restricted read-only access requires the elevated Windows sandbox backend` で全停止。
- **真因**: カスタム権限プロファイル `sesconsole-safe`（`extends=":workspace"` ＋ `.env`/`*.db`/secret deny）は **elevated（昇格）Windows サンドボックスが必須**。しかし `~/.codex/config.toml` の `[windows] sandbox = "unelevated"` が非昇格を強制 → サンドボックス構築が毎回拒否されていた。
- **修正（`~/.codex/config.toml`）**:
  - `default_permissions = ":danger-full-access"`（フルアクセス）に変更
  - `[permissions.sesconsole-safe]` 定義を削除
  - `[windows] sandbox = "unelevated"` は維持（フルアクセスは制限不要なので非昇格でOK）
- **バックアップ**: `~/.codex/backups/config.toml.20260622-remove-sesconsole-safe.bak`, `~/.codex/backups/default.rules.20260622-secret-read-guard.bak`

→ いまは **フルアクセス**。worktree を含む全パスを root 追加なしで読める/操作できる。

---

## 2. 必ず守るルール（フルアクセスなので“サンドボックスの代わり”）

権限がフルアクセスになった分、秘密保護は**ルールで担保**する。詳細はリポジトリ直下 `AGENTS.md`（Codex が自動ロード, コミット済み e067dc9）と `AI_WORK_RULES.md` を参照。要点:

- 明示承認なしに、以下の**値を読まない・出力しない**。存在確認（設定済み/未設定）のみ:
  `.env*`, `**/*.pem` `**/*.key` `**/*.p12` `**/*.pfx`, `**/*secret*` `**/*credentials*`,
  `**/*.db` `**/*.sqlite*` `**/*.dump`, `~/.ssh` `~/.aws` `~/.azure` gcloud config
- 破壊的操作（`rm -rf`, ワイルドカード削除, `git reset --hard`, `git clean`, force push, `prisma migrate reset`, docker volume 削除, 本番/共有DB write, deploy）は `~/.codex/rules/default.rules` でブロック/承認必須。AI 単独で実行しない。
- `.env` 系のシェル読取（`Get-Content .env` 等）も `default.rules` で `forbidden` 追加済み。

---

## 3. #89 の続き（本来の作業）

対象 worktree:
- QA: `C:\Users\ke919\OneDrive\ドキュメント\1234project\__qa_project_company_contact_link_20260621`
- 実装候補（dirty の可能性, 慎重に）: `C:\Users\ke919\OneDrive\ドキュメント\1234project\__project_company_contact_link_ui_impl_20260620`

PR #89 状態（引き継ぎ時点）:
- Draft / open、latest head `c7ef8b6a4c4a8817d8a571144a0cf4b6d81d8db7`、`Update #89 contract test allowlists`、changed 23 files、Vercel success
- 非DB検証 pass: `npm ci --ignore-scripts` / `npx prisma generate`(ダミー `DATABASE_URL`) / `npm test` / `npm run typecheck` / `npm run test:project-company-contact-link-ui` / `git diff --check`
- package/lockfile/schema/env diff: なし、deleted files: なし

残り（いずれも DB ブロックで未実行 → 権限が直れば worktree を読んで再開可能）:
- DB classification: Not run / Blocked
- real DB write smoke: Not run / Blocked（production/staging/shared/unknown DB は write 禁止。local/test のみ、対象ID・件数・rollback を提示し監査を通してから）
- login-after Browser QA: Not run / Blocked
- Ready 判断: blocked

進め方は `AI_WORK_RULES.md` の体制（親PM/監査/PMO/テクニカルリード/実行者）に従い、ユーザー確認最小化の範囲で自律的に進める。merge/Ready化/close/DB write/deploy は内部承認＋（必要なら）ユーザー承認。

---

## 4. やってはいけない
秘密ファイルの中身の読取・表示・要約・外部送信。production/staging/shared/unknown DB への write。明示承認なしの破壊的・外部影響操作。
