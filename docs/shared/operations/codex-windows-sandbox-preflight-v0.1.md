# Codex Windows Sandbox Preflight v0.1

作成日: 2026-06-14 JST

## 1. 目的

Codexで実装、merge、conflict解消、Prisma migrationを扱う前に、Windows sandbox、PowerShell、npm、Prisma、proxy、workspace permissionの詰まりを短時間で判定する。

このpreflightで異常が出た場合は、PR branchを無理に更新しない。特に `schema.prisma`、migration、`package.json` を含むconflictでは、未検証の手作業反映を禁止する。

## 2. 作業前preflight

Codexで実装・merge・conflict解消に入る前に、必ず以下を実行する。

```powershell
git --version
git status -sb
node --version
npm.cmd --version
npx.cmd prisma --version
```

`npx.cmd prisma --version` がPrisma engine取得やproxyで失敗する場合は、次の最小確認に切り替える。

```powershell
npx.cmd prisma validate
```

PowerShellでは `npm` / `npx` ではなく `npm.cmd` / `npx.cmd` を使う。`npm.ps1` / `npx.ps1` はExecution Policyで失敗することがある。

## 3. read-only sandbox判定

以下のエラーが出たら、PR作業には進まない。

```text
windows sandbox: Restricted read-only access requires the elevated Windows sandbox backend
```

この状態では、少なくとも `git status`、merge、npm、Prisma、pushの検証が信頼できない。

禁止:

- GitHub connectorでPR branchを直接更新する
- GitHub Web Editorでconflictを解消する
- `schema.prisma` / migration を未検証で手貼り更新する
- 未検証pushを行う

通常shellが使える環境、または権限profileが修正された環境へ切り替えてから作業する。

## 4. config.toml注意点

active config:

```text
C:\Users\ke919\.codex\config.toml
```

注意:

- `"**/backups/**" = "read"` は絶対にactiveな実効行として入れない。
- `**/backups/**` はdeny専用globとして扱う。
- コメントとして残っているだけならよい。
- activeな実効行としてreadに入っていたら削除する。

`:workspace_roots` 配下には絶対パスを入れない。

NG例:

```toml
"C:/dev" = "write"
"C:/dev/**" = "write"
"C:/dev/ses_console_vol1/**" = "write"
```

理由:

```text
filesystem subpath `C:/dev` must be a descendant path without `:` or `..` components
```

workspace rootsでは、開いているworkspaceから見た相対パスを使う。

例:

```toml
"PROGRESS.md" = "write"
"docs/**" = "write"
"app/**" = "write"
"components/**" = "write"
"lib/**" = "write"
"prisma/**" = "write"
"tests/**" = "write"
"package.json" = "write"
"package-lock.json" = "write"
```

deny側にはsecret、DB実体、鍵、dump類を置く。

例:

```toml
".env" = "deny"
".env.*" = "deny"
"private/**" = "deny"
"secrets/**" = "deny"
".vercel/**" = "deny"
"**/*.db" = "deny"
"**/*.dump" = "deny"
"**/*.sqlite" = "deny"
"**/*.sqlite3" = "deny"
"**/*.sql.gz" = "deny"
"**/*.pem" = "deny"
"**/*.key" = "deny"
"**/*.p12" = "deny"
"**/*.pfx" = "deny"
"**/*secret*" = "deny"
"**/*token*" = "deny"
"**/*credentials*" = "deny"
```

## 5. proxy問題

Prismaが以下で失敗する場合がある。

```text
connect ECONNREFUSED 127.0.0.1:9
```

原因候補:

- `HTTP_PROXY`
- `HTTPS_PROXY`
- `ALL_PROXY`
- 小文字版 `http_proxy` / `https_proxy` / `all_proxy`
- Prisma engine関連の環境変数

確認コマンド:

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
  $item = Get-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
  if ($item) {
    "$name=$($item.Value)"
  }
}
```

セッション内だけ解除する例:

```powershell
Remove-Item Env:HTTP_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:ALL_PROXY -ErrorAction SilentlyContinue
Remove-Item Env:http_proxy -ErrorAction SilentlyContinue
Remove-Item Env:https_proxy -ErrorAction SilentlyContinue
Remove-Item Env:all_proxy -ErrorAction SilentlyContinue
```

恒久変更はしない。必要なら作業セッション内だけ解除する。

## 6. conflict解消時の禁止

`schema.prisma` / migration / `package.json` を含むconflictでは、以下を禁止する。

- GitHub Web Editorでの解消
- GitHub connectorでremote branchを直接更新
- 未検証の巨大schema手貼り
- production DB操作
- `db push`
- `migrate reset`

通常shellで以下を通してからpushする。

1周目:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run test
npm.cmd run typecheck -- --incremental false
npm.cmd run build
git diff --check
```

2周目:

```powershell
npx.cmd prisma validate
npm.cmd run test
npm.cmd run typecheck -- --incremental false
npm.cmd run build
```

## 7. PR #44で学んだこと

PR #44では以下が発生した。

- read-only sandboxでgit / npm / Prismaが使えなかった。
- `"**/backups/**" = "read"` がsandbox構築エラーの原因になった。
- `:workspace_roots` に絶対パスを入れるとdescendant pathエラーになった。
- PowerShellの `npm` は `npm.ps1` Execution Policyで失敗した。
- `npm.cmd` / `npx.cmd` を使う必要があった。
- Prisma engine downloadが `127.0.0.1:9` proxyで失敗した。
- proxy envをセッション内解除して進めた。
- GitHub connector直更新はschema/migration conflictでは危険なので使わなかった。

## 8. 今後の標準フロー

Codex実装タスク開始時:

1. `PROGRESS.md` を読む。
2. `docs/shared/operations/chat-progress-coordination-v0.1.md` を読む。
3. 実装なら `docs/shared/quality/two-pass-task-test-policy-v0.1.md` を読む。
4. sandbox preflightを実行する。
5. `git status -sb` が通ることを確認する。
6. 通らなければ作業に入らず、sandbox問題として切り分ける。

禁止:

- 作業不能環境でPR branchを無理に更新しない。
- GitHub connector直更新でschema/migrationを触らない。
- secret、DB接続URL、個人情報をmdやログに出さない。
