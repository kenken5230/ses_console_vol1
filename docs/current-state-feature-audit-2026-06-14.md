# SES Console current-state feature audit

作成日: 2026-06-14 JST

## 1. 結論

今の一番大きな問題は、機能個別の不具合よりも、作業ツリーとGit運用が混線していることです。

- 現在のチェックアウトは `codex/market-analysis-docs` で、`origin/main` より 87 commits 古い。
- `origin/main` には `/imports`、`/market-analysis`、`/matches`、MatchSuggestion系API、source tracking、CSV import などがあるが、現在のルート本体には存在しない。
- その一方で、現在のルートには `docs/themes/matching/` など、実装済みであるかのようなdocsが未追跡ファイルとして存在する。
- さらに `__pr_match_suggestion_review_controls/` と `old/worktrees/**` に大量の別worktreeが同居しており、`tsconfig.json` がそれらを型検査対象にしてしまう。
- 結果として、`npm run typecheck` と `npm run build` が信頼できる検証入口として機能していない。

つまり「作られたはずなのに使えない」の主因は、機能が完全に消えたというより、複数PR/複数worktree/古いbranch/未追跡docsが同じフォルダ内で混ざり、現在見ているアプリ本体とドキュメントが一致していないことです。

## 2. 調査した現在地

Git状態:

- current branch: `codex/market-analysis-docs`
- upstream: `origin/codex/market-analysis-docs`
- current HEAD: `0ed0705 Add market analysis research docs`
- `HEAD..origin/main`: 87 commits behind
- working tree: dirty
- untracked major directory: `__pr_match_suggestion_review_controls/`
- ignored but present: `old/worktrees/**`, `.next/`, `app/generated/prisma/`

現在の未コミット差分:

- modified: `.gitignore`, `PROJECT_MEMO.md`, `docs/README.md`, `package.json`
- modified Gmail/API files:
  - `app/api/dashboard-data/route.ts`
  - `app/api/mail-notifications/[id]/extract/route.ts`
  - `lib/gmail-extract-entities.ts`
  - `scripts/gmail-extract-preview.ts`
  - `scripts/gmail-extract-to-entities.ts`
  - `scripts/gmail-extract-unlinked.ts`
  - `scripts/gmail-extraction.ts`
- untracked docs/scripts/tests:
  - `PROGRESS.md`
  - `docs/shared/**`
  - `docs/themes/**`
  - Gmail quality audit/eval/test scripts
  - `tests/fixtures/gmail-extraction-quality/golden.json`

## 3. 現在のルート本体でできていること

### 3.1 認証/RBAC

できている:

- メールアドレス/パスワードログイン
- HMAC署名cookie session
- session API
- logout
- password reset token作成/消費
- SMTP送信はNodemailer化済み
- `ADMIN`, `MANAGER`, `SALES`, `VIEWER`, `SYSTEM` role定義
- API側で `requireAuth` / `requireAnyRole` を使用

できていない/不足:

- 管理画面からのユーザー作成、招待、role変更
- Google OAuth / SSO
- role別仕様の完全な棚卸しと自動テスト
- password resetメール送信の本番運用方針確定

関連docs:

- `PROJECT_MEMO.md` に O-012/O-013/O-014 として課題あり
- `docs/release/public-release-readiness-v0.2.md` に公開準備観点あり

### 3.2 メインコンソール

できている:

- `/` の単一画面
- 案件/要員/未分類タブ
- DBから案件、要員、未分類メールを取得
- キーワード検索
- quick filter
- 詳細drawer
- ページング
- 表示件数切替
- filter modal
- keyword modal
- Gmail同期ボタンは `ADMIN` / `MANAGER` のみ表示

できていない/不足:

- ヘッダーの `人材マスタ`, `求人`, `一斉配信`, `単価相場`, `レポート` はボタン表示のみでroutingなし。
- 検索履歴はDBではなく `data/mockProjects.js` の固定配列。
- `コピー` は `/projects/{id}` を作るが、`app/projects/[id]` route がない。
- `提案開始` は `console.log` と通知だけでDB登録なし。
- `data/mockProjects.js` に古いmock案件データが残り、現在は主にUI設定だけが使われている。

### 3.3 案件

できている:

- 案件一覧表示
- 案件詳細表示
- 案件作成
- 案件編集
- 案件アーカイブ
- 元メール付き案件を未分類へ戻す
- Gmail抽出品質情報の一部表示

できていない/不足:

- 案件個別ページ
- 提案開始/Proposal作成
- 商流、担当者、会社情報の高度な編集UI
- 案件履歴、提案履歴、配信履歴との接続

### 3.4 要員

できている:

- 要員一覧表示
- 要員詳細表示
- 要員作成
- 元メール付き要員を未分類へ戻す
- Gmail抽出品質情報の一部表示
- Gmail由来で氏名が取れない場合に `氏名未取得（GMAIL-xxxx）` 表示へ寄せる未コミット改善あり

できていない/不足:

- 要員編集API/UI
- 要員アーカイブ専用UI
- 要員個別ページ
- 提案/マッチング/配信履歴との接続

### 3.5 未分類メール/Gmail取り込み

できている:

- Gmail OAuth helper scripts
- Gmail message sync
- rule-based classification
- extraction to Project/Person
- admin API `POST /api/admin/gmail/sync-run`
- sync run history API
- job lock
- sync/classify/extract pipeline
- 未分類メールを案件/要員として扱う手動導線
- 案件/要員を未分類に戻す手動導線
- Gmail抽出品質 fixture test
- Gmail抽出品質 eval
- Gmail person remediation preview/apply scripts

検証結果:

- `npm.cmd test` は権限昇格後に pass
- current quality eval:
  - totalFixtures: 50
  - current accuracy: 0.96
  - extraction failures: 0

できていない/不足:

- Gmail push通知/PubSub
- ラベル操作/既読化
- 添付保存
- AI分類
- 大量applyの運用完了確認
- staging/productionでの継続運用確認

### 3.6 Prisma/DB

できている:

- `prisma validate` pass
- `prisma generate` pass
- 現在のschemaは構文として有効
- 認証、Gmail sync, Projects, Persons, MailNotifications, ExtractionResults, AuditLog等の基礎modelあり

不足:

- 現在のルート本体には `MatchSuggestion` / `SourceRecord` / import source tracking 系の最新migrationがない。
- `origin/main` には追加済みだが、現在のbranchには反映されていない。

## 4. `origin/main` にはあるが、現在のルート本体にない機能

`git diff --name-status HEAD..origin/main` で確認した主要差分です。

### 4.1 Source import / CSV import

`origin/main` にはある:

- `app/imports/page.jsx`
- `app/api/imports/route.ts`
- `app/api/imports/source-records/route.ts`
- `app/api/imports/source-records/[id]/route.ts`
- `components/ImportReviewPage.jsx`
- `lib/import-review.ts`
- `scripts/csv-import-dry-run.ts`
- `scripts/csv-import-apply.ts`
- CSV fixtures/tests
- `prisma/migrations/20260604193000_import_source_tracking_foundation/migration.sql`

現在のルート本体にはない。

### 4.2 Market analysis

`origin/main` にはある:

- `app/market-analysis/page.jsx`
- `app/api/market-analysis/route.ts`
- `components/market-analysis/**`
- `lib/market-analysis/**`
- `tests/market-analysis/**`

現在のルート本体には `docs/market-analysis/**` だけがあり、実装はない。

### 4.3 Matching / MatchSuggestion

`origin/main` にはある:

- `app/matches/page.jsx`
- `app/api/matches/dry-run/route.ts`
- `app/api/matches/suggestions/route.ts`
- `app/api/matches/suggestions/[id]/route.ts`
- `app/api/matches/suggestions/review-queue/route.ts`
- `app/api/matches/suggestions/[id]/review/route.ts`
- `components/MatchingReviewPage.jsx`
- `lib/match-*.ts`
- `scripts/match-*.test.ts`
- `prisma/migrations/20260606113000_match_suggestion_persistence_foundation/migration.sql`

現在のルート本体にはない。

注意:

- `docs/themes/matching/README.md` はこれらが存在する前提で書かれている。
- しかし現在のルート本体には実装がないため、docsと実体が矛盾している。
- `__pr_match_suggestion_review_controls/` にはそれらの実装が見えるが、別worktreeであり、現在のアプリ本体ではない。

## 5. できていない/壊れている主要原因

### P0-1. 現在のcheckoutが古い

現在の `codex/market-analysis-docs` は `origin/main` から87 commits遅れている。

これにより、ユーザーやdocsが期待する機能が、今開いているルート本体には存在しない。

影響:

- `/matches` がない
- `/market-analysis` がない
- `/imports` がない
- MatchSuggestion schema/migrationがない
- source tracking schema/migrationがない
- related tests/scriptsがない

### P0-2. worktreeがルート配下に混入している

問題のディレクトリ:

- `__pr_match_suggestion_review_controls/`
- `old/worktrees/**`

観測:

- `old` は `.gitignore` にあるが、TypeScriptは `.gitignore` を見ない。
- `__pr_match_suggestion_review_controls/` は `.gitignore` にないため、Gitにも未追跡として出続ける。
- `old` と `__pr...` だけで、`.ts/.tsx` が 2236 files ある。
- 現在本体の `.ts/.tsx` はおよそ 41 files。

影響:

- `npm run typecheck` が4GB近く使って out of memory。
- `npm run build` もNextの型検証段階で詰まる可能性が高い。
- 検索結果にも別PRのファイルが混ざり、現在の実装把握を誤らせる。

### P0-3. `tsconfig.json` が広すぎる

現在:

```json
"include": [
  "next-env.d.ts",
  ".next/types/**/*.ts",
  "**/*.ts",
  "**/*.tsx"
],
"exclude": [
  "node_modules"
]
```

問題:

- `old/worktrees/**`
- `__pr_match_suggestion_review_controls/**`
- `app/generated/prisma/**`
- その他一時worktree

まで拾う。

結果:

- `npm.cmd run typecheck` は out of memory。
- `npm.cmd run build` はPrisma generate後、3分timeout。

### P0-4. docsが現在の本体を表していない

例:

- `docs/themes/matching/README.md` は `/matches` や saved suggestion APIs を実装済みのように記述。
- 現在のルート本体には該当実装がない。
- `docs/market-analysis/implementation-plan.md` は「今回は実装しない」と書く一方、`origin/main` には実装がある。

これは「何ができているのか」を判断する人間とAIの両方を混乱させる。

### P1-1. ヘッダーと画面の見た目が未実装機能を示している

`components/Header.jsx` のnav:

- 人材マスタ
- 案件
- 求人
- 一斉配信
- 単価相場
- レポート

これらはボタンで、リンクやルーティングがない。

影響:

- 実装済み機能に見えるが、押しても何も起きない。
- ユーザーが「できない」と感じる直接原因になる。

### P1-2. Proposal/提案導線が仮実装

`提案開始` は:

- `console.log`
- 通知表示
- DB登録なし

Proposal modelはschemaにあるが、UI/APIとしてProposal作成は未実装。

### P1-3. 検索履歴が固定mock

`SearchHistoryModal` は `data/mockProjects.js` の `searchHistories` を表示するだけ。

DB保存、ユーザー別履歴、現在条件の保存はない。

### P1-4. copy URL先がない

案件詳細のcopy URLは `/projects/{id}` を生成するが、そのrouteがない。

### P1-5. Person編集がない

要員は作成と詳細表示はあるが、編集API/UIがない。

## 6. ドキュメント棚卸し

### 存在するdocs

基礎:

- `docs/README.md`
- `PROJECT_MEMO.md`
- `PROGRESS.md` ただし未追跡

DB:

- `docs/db-design-v0.1.md`

Gmail:

- `docs/gmail/gmail-ingest-design-v0.1.md`
- `docs/gmail/gmail-ingest-implementation-status-v0.1.md`
- `docs/gmail/gmail-classification-analysis-v0.1.md`
- `docs/gmail/gmail-classification-and-data-quality-investigation-v0.1.md` ただし未追跡
- `docs/gmail/gmail-classification-review-sql-v0.1.sql` ただし未追跡

Release/公開準備:

- `docs/release/public-release-readiness-v0.1.md`
- `docs/release/public-release-readiness-v0.2.md`
- `docs/release/public-release-review-tasks-v0.1.md`
- `docs/release/network-migration-test-spec-v0.1.md`
- `docs/release/network-migration-test-report-v0.1.md`
- `docs/release/network-migration-open-issues-v0.1.md`

Market analysis:

- `docs/market-analysis/research.md`
- `docs/market-analysis/mvp-proposal.md`
- `docs/market-analysis/implementation-plan.md`
- `docs/market-analysis/data-inventory.md`
- `docs/market-analysis/analysis-axes.md`

Theme docs:

- `docs/themes/README.md`
- `docs/themes/ses-sales-console/**`
- `docs/themes/gmail-remediation/**`
- `docs/themes/matching/**`

Shared docs:

- `docs/shared/README.md`
- `docs/shared/quality/two-pass-task-test-policy-v0.1.md`
- `docs/shared/operations/chat-progress-coordination-v0.1.md`
- `docs/shared/operations/codex-windows-sandbox-preflight-v0.1.md`
- `docs/shared/operations/workspace-folder-organization-2026-06-12.md`

### 欠けているdocs

必要だがない/弱い:

- 現在のcheckout向けの「機能実装状態マトリクス」
- `origin/main` と current working tree の差分を説明する復旧手順
- API endpoint一覧とrole別可否表
- UIメニュー別の実装/未実装一覧
- user story / acceptance criteria / Definition of Done
- Sprint Backlog
- Release train / PR merge順 / branch cleanup手順
- worktree作成・退避・削除の実運用ルール
- build/typecheck/testが通るための `tsconfig` 除外方針
- staging smoke checklistの最新版
- Proposal機能の現在状態と次の実装単位
- Header navの実装方針

### docs運用上の問題

- `PROGRESS.md` と `docs/shared/**` が未追跡なので、運用ルールとして存在してもリポジトリの正式状態ではない。
- docsが「現在branch」ではなく「別branch/mainの未来状態」を説明している。
- BK/backup docsが増えているが、何を読めば現在判断できるかが弱い。

## 7. 検証結果

### pass

```powershell
npm.cmd test
```

結果:

- Gmail extraction quality tests passed
- quality eval succeeded
- current accuracy: 0.96
- extraction failures: 0

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
```

結果:

- schema valid
- Prisma Client generated

### failed / blocked

```powershell
npm run typecheck
```

PowerShellの `npm.ps1` execution policy で失敗。

```powershell
npm.cmd run typecheck
```

TypeScriptが out of memory。

主因:

- `tsconfig.json` が `old/worktrees/**` や `__pr.../**` を拾う。

```powershell
npm.cmd run build
```

通常sandboxでは `spawn EPERM`。

権限昇格後:

- 3分timeout
- `.next/` は更新されたがbuild完了は確認できず
- 4GB超のNodeプロセスが残り、停止が必要だった

推定:

- Next buildの型検証が広すぎる `tsconfig` の影響を受けている可能性が高い。

## 8. 不要/邪魔しているもの

高優先で整理すべき:

- `__pr_match_suggestion_review_controls/`
  - ルート直下にある別worktree。
  - Git未追跡。
  - 検索/型検査/人間の理解を邪魔している。
- `old/worktrees/**`
  - `.gitignore` されていても `tsconfig` には拾われる。
  - 退避場所としてはよいが、型検査対象から除外必須。
- `app/generated/prisma/**`
  - 生成物としてignoreされているが、`tsconfig` では除外されていない。
- `data/mockProjects.js`
  - 現在はUI設定とmock検索履歴と古いmock案件が混在。
  - 使っている部分と使っていない部分を分けるべき。
- Headerの未接続nav
  - 機能があるように見せてしまう。
- `提案開始` の仮実装
  - Proposal機能があるように見せてしまう。

## 9. 優先復旧計画

### P0: まず状態を一本化する

1. 現在の作業ツリーを保全する。
2. 新しいclean worktreeまたは現在ルートを `origin/main` に合わせる。
3. `__pr_match_suggestion_review_controls/` をルート外へ移すかignoreする。
4. `old/worktrees/**` を `tsconfig.json` の `exclude` に入れる。
5. `app/generated/prisma/**` も `tsconfig.json` の `exclude` に入れる。
6. `npm.cmd run typecheck` / `npm.cmd run build` が完了する状態を作る。

### P0: docsと実装の現在状態を合わせる

1. `docs/current-state-feature-audit-2026-06-14.md` を起点にする。
2. `docs/themes/*/README.md` に「current branchではなくorigin/main前提」などの状態ラベルを付ける。
3. `PROGRESS.md` を正式にtrackするか、運用しないなら削除する。
4. docs-only PRと実装PRを混ぜない。

### P1: 見た目だけの機能を明示的に閉じる

1. Header navを実装済みrouteだけに絞る、または disabled表示にする。
2. `提案開始` を disabledにするか、Proposal draft実装PRへ分離する。
3. `/projects/{id}` routeがないならcopy URLを無効化する。
4. 検索履歴はDB保存するか、mockであることが分かるUIにする。

### P1: Scrum運用に必要な土台を作る

1. Product Backlog: themesごとではなく、ユーザー価値単位で整理。
2. Sprint Backlog: 今スプリントで触るissue/PRだけを明示。
3. Definition of Ready: DB/migration/env/owner確認が揃ってから着手。
4. Definition of Done: typecheck/build/test、docs更新、staging smokeの条件を明記。
5. WIP制限: 同時worktree/同時PRを制限する。

## 10. 現時点の機能状態マトリクス

| 領域 | 現在ルート本体 | origin/main | docs状態 | 判定 |
|---|---|---|---|---|
| ログイン/セッション | あり | あり | あり | 実装済み |
| password reset | あり | あり | あり | 実装済み、SMTP運用課題 |
| 案件一覧/詳細 | あり | あり | あり | 実装済み |
| 案件作成/編集 | あり | あり | あり | 実装済み |
| 案件アーカイブ | あり | あり | 一部あり | 実装済み |
| 要員一覧/詳細 | あり | あり | あり | 実装済み |
| 要員作成 | あり | あり | あり | 実装済み |
| 要員編集 | なし | 要確認 | 不足 | 未実装 |
| 未分類メール一覧/詳細 | あり | あり | あり | 実装済み |
| 未分類から案件/要員化 | あり | あり | あり | 実装済み |
| Gmail sync pipeline | あり | あり | あり | 実装済み、staging運用課題 |
| Gmail quality eval | 未コミットあり | あり | あり | 現在は未追跡混在 |
| CSV import | なし | あり | source-tracking docsはmain側 | 現在ルートでは未実装 |
| Source tracking | なし | あり | main側あり | 現在ルートでは未実装 |
| Market analysis | docsのみ | あり | あり | current/docs不一致 |
| Matching dry-run | なし | あり | あり | current/docs不一致 |
| Saved MatchSuggestion APIs | なし | あり | あり | current/docs不一致 |
| MatchSuggestion review update | なし | あり | あり | current/docs不一致 |
| Proposal作成 | 導線を閉じた | 設計中心 | あり | 未実装、仮通知は削除済み |
| メール配信/一斉配信 | なし | 要確認 | 要件あり | 未実装 |
| レポート | なし | 市場分析はあり | 要件あり | currentでは未実装 |
| Search history | 導線を閉じた | DB modelあり | 不足 | mock UIは削除済み、実装タスク残 |
| Header nav | 実装済み画面のみ表示 | 要確認 | 不足 | 未接続navは削除済み |
| typecheck | pass | 要確認 | preflight docsあり | 復旧済み |
| build | pass | 要確認 | preflight docsあり | 復旧済み |

## 11. 次にやるべき最小PR案

### PR-A: repo hygiene / verification recovery

目的:

- まず検証可能な状態を取り戻す。

内容:

- `tsconfig.json` exclude追加
  - `old/**`
  - `__pr_*`
  - `app/generated/prisma/**`
- `.gitignore` に `__pr_*/` 追加
- `data/mockProjects.js` の使用箇所を分離する準備
- build/typecheck/testを再実行

### PR-B: checkout alignment

目的:

- 現在作業ツリーと `origin/main` の差を解消する。

内容:

- `origin/main` に追従したclean branchで作業する。
- 現在のGmail未コミット改善を必要なら小さくcherry-pick。
- docsを現在状態に合わせる。

### PR-C: UI truthfulness

目的:

- 使えないものを使えるように見せない。

内容:

- Header navを実装済みrouteだけにする。
- Proposal開始をdisabled/Coming soon化、または実装PRへ分離。
- copy URLを無効化またはroute追加。
- SearchHistoryをmockと明示するか、DB保存実装へ分離。

## 12. 修正着手後の更新

この調査後に `docs/resolution-task-plan-2026-06-14.md` のタスクとして、以下は修正済みになった。

- `tsconfig.json` / `.gitignore` の検証基盤復旧。
- `tsconfig.tsbuildinfo` を追跡対象から外し、検証のたびに作業ツリーが汚れる問題を解消。
- Headerの未接続navと設定ボタン削除。
- Project table/detailの仮 `提案開始` 導線削除。
- 存在しない `/projects/{id}` copyを、案件ID/案件名テキストcopyへ変更。
- 固定mock検索履歴UIと `searchHistories` mock削除。

確認済み:

- `npm.cmd run typecheck`: pass。
- `Test-Path tsconfig.tsbuildinfo`: `False`。
- `npx.cmd prisma validate`: pass。
- `npx.cmd prisma generate`: pass。
- `npm.cmd run build`: pass。
- `npm.cmd test`: pass。50 fixtures、current accuracy 0.96、extraction failures 0。
- Browser: 未ログイン画面で削除対象導線が表示されないことを確認。ログイン後UIの自動目視にはlocal検証用password seedまたはtest session fixtureが必要。

## 13. 補足

PowerShellで `Get-Content` を使うとUTF-8文書が文字化けする場合がある。`Get-Content -Encoding UTF8` または `rg` では正しく読めたため、今回見えた文字化けはファイル破損ではなく調査コマンド側の読み方の問題だった。

また、PowerShellでは `npm` が `npm.ps1` execution policyで止まるため、Windowsでは原則 `npm.cmd` / `npx.cmd` を使う必要がある。
