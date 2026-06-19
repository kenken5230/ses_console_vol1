# Codex Windows Sandbox Preflight v0.1

作成日: 2026-06-20 JST

## 目的

CodexでWindows環境の実装、merge、conflict解消、Prisma確認に入る前に、sandbox、PowerShell、npm、Prisma、proxy、workspace permissionの詰まりを短時間で切り分ける。

このpreflightは安全確認用です。schema、migration、package、DB、deployの変更は含めません。

## 作業前コマンド

PowerShellでは `npm` / `npx` ではなく、明示的に `npm.cmd` / `npx.cmd` を使う。`npm.ps1` / `npx.ps1` はExecution Policyで失敗することがある。

```powershell
git status -sb
git --version
node --version
npm.cmd --version
npx.cmd prisma --version
```

Prisma CLIやengine取得で失敗する場合でも、実装やconflict解消へ進む前に最低限ここまで確認する。

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
```

`DATABASE_URL` が必要な検証では、実DB URLを貼らない。必要な場合はそのPowerShellセッション内だけのダミー値を使い、値はdocs、ログ、PR本文に残さない。

## Windows Sandbox確認

次のようなread-only sandboxエラーが出る場合は、PR branchの更新やconflict解消へ進まない。

```text
windows sandbox: Restricted read-only access requires the elevated Windows sandbox backend
```

この状態では `git status`、npm、Prisma、diff確認、pushの検証が信頼できない。shell権限またはworkspace permissionを直してから再開する。

## Proxy / Env確認

Prisma engine取得がproxyで失敗する例:

```text
connect ECONNREFUSED 127.0.0.1:9
```

proxyやPrisma engine関連の環境変数は、値を出さずに「設定されているか」だけを見る。

```powershell
$names = @(
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
  "no_proxy",
  "PRISMA_ENGINES_MIRROR",
  "PRISMA_QUERY_ENGINE_BINARY",
  "PRISMA_SCHEMA_ENGINE_BINARY"
)

foreach ($name in $names) {
  if (Test-Path -LiteralPath "Env:$name") {
    "$name=<set>"
  }
}
```

一時的に外す場合は、現在のPowerShellセッション内だけで行う。恒久設定は変更しない。

```powershell
Remove-Item Env:HTTP_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:ALL_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:http_proxy -ErrorAction SilentlyContinue
Remove-Item Env:https_proxy -ErrorAction SilentlyContinue
Remove-Item Env:all_proxy -ErrorAction SilentlyContinue
```

## Workspace Permission確認

`C:\Users\ke919\.codex\config.toml` を確認する場合も、secret値は表示しない。

注意:

- `:workspace_roots` 配下には絶対パスを書かない。
- workspace rootから見た相対パスでwrite/read範囲を指定する。
- `.env*`、secret、credential、private key、DB dump、SQLite、SQL dumpはdeny対象にする。
- `**/backups/**` はdeny専用として扱い、activeなread許可にしない。

絶対パスをworkspace permissionに入れると、descendant pathエラーでsandboxが壊れることがある。

## Conflict解消の禁止事項

`schema.prisma`、migration、`package.json`、lockfileを含むconflictは、GitHub Web Editorや未検証の手貼りで解消しない。

禁止:

- DB write
- migration作成、適用、reset
- deploy
- secret値、DB URL、token、private keyの表示
- `git reset`
- `git clean`
- `git checkout --`
- `git restore`
- stashでの退避
- worktree削除
- `git add .`

schema / migration / package conflictは、通常shellで検証できるclean worktreeに最新 `main` から作り直し、必要最小差分だけを別PRにする。

## 標準確認

docs-onlyでも、可能な範囲で以下を確認する。

```powershell
git status -sb
git diff --check
rg -n "^(<<<<<<<|=======|>>>>>>>)" .
rg -n "(DATABASE_URL|TOKEN|SECRET|PRIVATE_KEY)\s*[:=]\s*[^<\s]" docs
rg -n "://[^/\s:]+:[^@\s]+@" docs
rg -n "BEGIN [A-Z ]*PRIVATE KEY" docs
```

コードやPrismaに触る場合は、追加で以下を通す。

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
```

検証に必要な環境変数は、値をPR本文やdocsへ残さない。失敗した場合は、何が未検証かだけを明記する。
