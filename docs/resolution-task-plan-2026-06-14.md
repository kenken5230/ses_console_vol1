# SES Console resolution task plan

作成日: 2026-06-14 JST

このファイルは `docs/current-state-feature-audit-2026-06-14.md` の課題を、解決タスク・作業順・検証結果・追加発生タスクとして追跡するための台帳です。

## 方針

- まず検証基盤を直す。`typecheck` / `test` / `build` が信用できない状態では、個別機能の完了判定をしない。
- 既存の未コミット変更は巻き戻さない。
- 1タスクごとに対象テストを行う。
- 似た課題グループが終わったら、グループ単位の回帰確認を行う。
- DB write、migration、branch大移動、worktree削除は、保全方針なしに実行しない。

## タスク一覧

| ID | Group | Task | Status | Test / Result |
|---|---|---|---|---|
| R-001 | P0 Verification | `tsconfig.json` が別worktreeと生成物を拾わないようにする | Done | `npm.cmd run typecheck` pass |
| R-002 | P0 Verification | ルート直下PR worktreeをGit未追跡ノイズから外す | Done | `git status --short --branch` で `__pr_match_suggestion_review_controls/` が消えた |
| R-003 | P0 Verification | Prisma schema/clientの健全性を確認する | Done | `npx.cmd prisma validate`, `npx.cmd prisma generate` pass |
| R-004 | P0 Verification | Gmail quality testを継続する | Done | `npm.cmd test` pass。50 fixtures、current accuracy 0.96、extraction failures 0 |
| R-005 | P0 Verification | production buildを完了させる | Done | `npm.cmd run build` pass。sandboxではNext worker `spawn EPERM` のため通常権限で確認 |
| R-006 | P0 Git Alignment | current branchと`origin/main`の差分を機能単位で整理する | Done | `git diff --name-status HEAD..origin/main`、`git log HEAD..origin/main`、merge-base確認 |
| R-007 | P0 Git Alignment | `origin/main`追従の安全な作業方針を決める | Done | 履歴はfast-forward可能。ただしdirty tracked/untracked overlapがあるため、この作業内ではmergeしない方針にした |
| R-008 | P0 Docs Alignment | docsに「current branch」と「origin/main」の前後差を明記する | Done | この台帳とfeature auditに反映済み |
| R-009 | P1 UI Truthfulness | Headerの未接続navと設定ボタンを閉じる | Done | `rg`確認、`npm.cmd run typecheck` pass、`npm.cmd run build` pass |
| R-010 | P1 UI Truthfulness | `提案開始` の仮実装を閉じる | Done | `rg`確認、`npm.cmd run typecheck` pass、`npm.cmd run build` pass |
| R-011 | P1 UI Truthfulness | 存在しない `/projects/{id}` へのcopy URLを解消する | Done | `rg "/projects/" app components data` no hit、clipboard内容を案件ID/案件名へ変更 |
| R-012 | P1 Search History | 固定mock検索履歴を画面から外す | Done | `SearchHistoryModal.jsx`削除、`searchHistories` mock削除、`rg`確認、build pass |
| R-013 | P1 Person | 要員編集API/UIを追加するか、未実装として導線を閉じる | Pending | 追加実装が必要。現時点では大きい独立タスクとして残す |
| R-014 | P1 Backlog | Proposal、CSV import、Market analysis、Matchingの現状をbacklogへ同期する | In Progress | `origin/main`には存在するため、branch統合方針とセットで扱う |
| R-015 | P0 Verification | `tsconfig.tsbuildinfo` が検証のたびに差分になる問題を止める | Done | `incremental: false`、`tsconfig.tsbuildinfo`削除、`npm.cmd run typecheck` pass、build pass |

## 追加発生タスク

| ID | Source | Task | Status |
|---|---|---|---|
| A-001 | R-001 | TypeScript/Nextが巨大メモリを使う場合、`.next/types` と generated Prisma の扱いを再設計する | Not Needed |
| A-002 | R-005 | buildがsandbox `spawn EPERM` で止まる場合、昇格実行とNode残プロセス確認を標準手順化する | Done |
| A-003 | R-006 | `origin/main`追従時にGmail未コミット改善と衝突する場合、Gmail改善を別patchとして保全する | Pending |
| A-004 | R-012 | DB-backed search history API/UIを実装する | Pending |
| A-005 | Browser | ログイン後UIを自動目視できるよう、local検証用ユーザーのpassword seedまたはtest-only session fixtureを用意する | Pending |
| A-006 | R-014 | `origin/main`の実装済み機能を安全に取り込むためのclean branch/worktreeを作る | Pending |

## P0 Verification group result

- `tsconfig.json` の `exclude` に `old/**`, `__pr_*/**`, `app/generated/prisma/**`, `.next/cache/**`, `dist`, `out` を追加。
- `.gitignore` に `__pr_*/` を追加。
- `tsconfig.json` の `incremental` を `false` に変更し、追跡済みの `tsconfig.tsbuildinfo` を削除。
- `.gitignore` に `tsconfig.tsbuildinfo` を追加。
- `npm.cmd run typecheck`: pass。以前のout-of-memoryは再現しない。
- `Test-Path tsconfig.tsbuildinfo`: `False`。検証後にbuild info差分が再生成されない。
- `npx.cmd prisma validate`: pass。
- `npx.cmd prisma generate`: pass。
- `npm.cmd test`: pass。50 fixtures、current accuracy 0.96、extraction failures 0。
- `npm.cmd run build`: pass。sandboxでは `spawn EPERM`、通常権限ではpass。

## P0 Git Alignment result

- current branch: `codex/market-analysis-docs`
- merge-base: current HEADと`origin/main`のmerge-baseが一致しており、コミット履歴だけならfast-forward可能。
- `origin/main`はcurrent HEADから87 commits ahead。
- `origin/main`側には `/imports`, `/market-analysis`, `/matches`, 関連API/lib/tests/source tracking/CSV import/migrations が入っている。
- ただしcurrent working treeにはtracked/untrackedの重複変更が多い。
- overlap tracked examples: `.gitignore`, `app/api/dashboard-data/route.ts`, `app/api/mail-notifications/[id]/extract/route.ts`, `docs/README.md`, `lib/gmail-extract-entities.ts`, `package.json`, `scripts/gmail-extraction.ts` など。
- overlap untracked examples: `PROGRESS.md`, `docs/shared/**`, `docs/themes/**`, `scripts/gmail-extraction-quality-*`, `tests/fixtures/gmail-extraction-quality/golden.json` など。
- 結論: この作業中にdirty treeへfast-forward/mergeはしない。安全策は、clean branch/worktree from `origin/main` を作り、必要なGmail改善とdocsをportすること。

## P1 UI Truthfulness group result

対象:

- Headerの未接続メニューと設定ボタン
- Project row/detailの仮 `提案開始`
- 存在しない `/projects/{id}` をコピーする処理
- 固定mock検索履歴

変更:

- `components/Header.jsx`: 未接続nav配列を削除し、現画面だけをactive表示。
- `components/ProjectTable.jsx`: `提案開始` row actionを削除。
- `components/ProjectDetailPane.jsx`: `提案開始` detail actionを削除。
- `app/page.jsx`: `handleAddProposal`を削除。コピー処理は案件URLではなく案件ID/案件名テキストをコピー。
- `components/SearchToolbar.jsx`: 検索履歴ボタンを削除。
- `components/SearchHistoryModal.jsx`: 削除。
- `data/mockProjects.js`: `searchHistories` mockを削除。

タスク別確認:

- R-009: Header導線は実装済み画面のみ残した。`rg`で未接続設定導線なし。
- R-010: `handleAddProposal|onAddProposal|提案開始|project proposal draft` は手書きUIに残存なし。
- R-011: `/projects/` は `app components data` に残存なし。
- R-012: `SearchHistoryModal|検索履歴|onOpenHistory|searchHistories` は手書きUI/dataに残存なし。

グループテスト:

- `npm.cmd run typecheck`: pass。
- `npm.cmd run build`: pass。
- `npm.cmd test`: pass。50 fixtures、current accuracy 0.96、extraction failures 0。
- Browser check: `http://localhost:3100` を開き、未ログイン画面で `検索履歴`, `提案開始`, `設定`, `/projects/` が表示されないことを確認。ログイン後UIの自動目視はlocal seedにpasswordがないため未完了。A-005へ追加。
