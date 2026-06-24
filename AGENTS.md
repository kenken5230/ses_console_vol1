# AGENTS.md — Codex / AI エージェント運用ルール

このファイルは Codex（および `AGENTS.md` を自動読み込みする AI エージェント）が起動時に読むプロジェクトルールです。
権限は `:danger-full-access`（フルアクセス）で運用し、安全性は **サンドボックスではなく「このルール」と「default.rules」で担保**します。
詳細な体制・進め方は [`AI_WORK_RULES.md`](AI_WORK_RULES.md) / [`AI_WORK_RULES_SHORT.md`](AI_WORK_RULES_SHORT.md) を参照してください。

## 1. 秘密情報・機微ファイルは読まない / 出力しない（最優先）

明示承認なしに、以下を **読み取り・表示・コピー・要約・外部送信しない**こと。
値が必要な処理でも、値そのものは出力せず「設定済み / 未設定」などの**存在確認にとどめる**。

- 環境ファイル: `.env`, `.env.*`（全ディレクトリ。`**/.env`, `**/.env.*`）
- 鍵・証明書: `**/*.pem`, `**/*.key`, `**/*.p12`, `**/*.pfx`
- 名前に秘密を含むファイル: `**/*secret*`, `**/*credentials*`
- DB データ / ダンプ: `**/*.db`, `**/*.sqlite`, `**/*.sqlite3`, `**/*.dump`
- ユーザー資格情報ディレクトリ: `~/.ssh`, `~/.aws`, `~/.azure`, `~/.config/gcloud`, `~/AppData/Roaming/gcloud`

スキーマ定義（`prisma/schema.prisma` 等）やコードは編集可。保護対象はあくまで「秘密の“値”が入ったファイル」。
`DATABASE_URL` 等が必要なコマンドは、ダミー値（プロセス限定の環境変数）で代替できないか先に検討する。

## 2. 破壊的・外部影響操作

再帰削除 / ワイルドカード削除 / `git reset --hard` / `git clean` / force push / Docker volume 削除 / `prisma migrate reset` / 本番・共有 DB への write / deploy などは、
`~/.codex/rules/default.rules` でブロックまたは承認必須に設定済み。AI 単独では実行しない。
削除差分は commit / PR 前に `git diff --name-status --diff-filter=D` で必ず確認する。

## 3. 権限まわりの背景（2026-06-22）

旧 `sesconsole-safe` 権限プロファイルは、Windows の非昇格サンドボックス（`[windows] sandbox = "unelevated"`）と両立できず、
「Restricted read-only access requires the elevated Windows sandbox backend」で shell tool が全停止していたため**廃止**した。
現在はフルアクセス＋本ルール運用。経緯は `~/.codex/config.toml` のコメント、旧定義は `~/.codex/backups/config.toml.20260622-remove-sesconsole-safe.bak` を参照。
サンドボックスによる秘密ファイルの強制ブロックに戻したい場合は、プロファイルを復元し `[windows] sandbox = "elevated"`（初回に昇格セットアップが必要）にする。

## 4. 文字コード

日本語Markdownは原則UTF-8 BOM付きで扱う。例外が必要な場合は理由を残す。

PowerShellで表示確認する場合は、必ず `Get-Content -Encoding UTF8` を使う。

厳密な破損確認は、`.NET` のUTF-8読み込みで行う。

`cmd type`、PowerShellのANSI/Default読み、CP932/Shift_JIS扱いの表示結果で文字化けしても、ファイル破損と判断しないこと。

文字化けを見つけた場合は、編集前に以下を確認する。

```powershell
$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath "対象.md"))
$utf8 = New-Object System.Text.UTF8Encoding($false, $true)
$utf8.GetString($bytes) | Out-Null
```

UTF-8としてエラーなくデコードでき、本文の日本語が正常表示される場合は、CP932/ANSI表示側の問題として扱う。

相手側の環境がUTF-8 BOM付きでも読めない場合でも、元のUTF-8版をCP932/Shift_JISへ変換して上書きしないこと。

必要な場合は、CP932版を別ファイルとして作成し、元のUTF-8版を正とする。
