# UI Change Ledger 2026-06-15

## Purpose

`#53` / `#54` / `#55` の変更を、ユーザー影響が分かる粒度で記録する。特に `#53` は既存UI導線を削除・非表示化しており、ユーザー確認済みの first-parent `main` snapshot を正常基準として復旧対象を分類する。

## Baseline

ユーザー確認済みの基準は first-parent `main` の `71b9a09b029c1e05dcaf13f0cc9bf159c93d5d6d` snapshot。これは `Merge pull request #49 from kenken5230/codex/proposal-traceability-draft-status-prereqs-design` 直後の画面を指す。`#49` 自体をUI実装PRとみなす意味ではなく、ユーザーが「ここまでは機能とか大丈夫そう」と示した比較基準として扱う。

`#53` の比較で直接使った main 側の基準は `bb6097f64d1f0c0c3ea1ffc3b21a42a8295d6bd4`（`Merge pull request #44 from kenken5230/codex/match-review-requirements` 後）で、この時点でも下記の既存UI導線は残っていた。

確認できていた主な導線:

- 上位ナビ: 人材マスタ、案件(フリーランス・派遣)、求人(転職)、一斉配信、単価相場、レポート
- Header右側: 市場分析、設定アイコン、ユーザー名/role
- 検索エリア: 注力案件/要員、フィルター、検索履歴、情報更新、Gmail同期、並び替え、作成
- 一覧/詳細: 案件メニュー、コピー、編集、アーカイブ、提案開始、未分類へ移行

## #53 Recovery Main Alignment

PR/branch:

- PR: `#53`
- Branch: `codex/recovery-main-alignment-20260614`
- Merge SHA: `43748a7588aefa9716fdcc3f447dc8387d347b2c`
- Head SHA: `18f1b88796b5aaf08980b8ce326d262b4a3ae68b`
- Main comparison used: `bb6097f..18f1b887`

### Added Features

| Item | Files | User impact |
|---|---|---|
| 未分類メールの除外キーワード適用 | `app/page.jsx` | 未分類メールでも除外キーワードが効く。これは維持対象。 |
| docs/status入口と現状表 | `docs/status/*`, `docs/README.md`, `PROGRESS.md` | 状態把握はしやすくなったが、内容に「撤去済み」判断が混ざり、今回修正が必要。 |
| market-analysis docs整理 | `docs/themes/market-analysis/*` | docs配置整理。機能削除ではない。 |
| `tsconfig.tsbuildinfo` hygiene | `.gitignore`, `tsconfig.tsbuildinfo` | generated fileの混入を減らす。維持対象。 |

### Deleted / Hidden / Changed UI

| Change | Files | Category | User impact | Rollback / Restore |
|---|---|---|---|---|
| `SearchHistoryModal.jsx` を削除 | `components/SearchHistoryModal.jsx` | A | 検索履歴モーダルが開けない。 | hotfixで復旧。#55のDB-backed版は後続統合。 |
| 検索履歴ボタン/導線を削除 | `components/SearchToolbar.jsx`, `app/page.jsx` | A | 検索履歴を見られない。 | hotfixで `onOpenHistory` とボタンを復旧。 |
| `data/mockProjects.js` の `searchHistories` を削除 | `data/mockProjects.js` | A | 基準snapshotの検索履歴UIが表示できない。 | hotfixで旧UI用データを復旧。ただしmock-onlyのため、有効表示にするかは要承認。 |
| 提案開始 handler を削除 | `app/page.jsx` | A | 案件から提案開始導線が消える。 | hotfixでは `提案開始（未実装）` として復旧し、クリック時にDB登録なしを明示する。 |
| 案件一覧の提案開始メニューを削除 | `components/ProjectTable.jsx` | A | 行メニューから提案開始導線が消える。 | hotfixでは `提案開始（未実装）` として復旧する。 |
| 案件詳細の提案開始ボタンを削除 | `components/ProjectDetailPane.jsx` | A | 詳細ドロワーから提案開始導線が消える。 | hotfixでは `提案開始（未実装）` として復旧する。 |
| `proposalIds` を削除 | `app/page.jsx`, `components/ProjectTable.jsx` | B | 実データ連動なしに `提案開始済み` を出すと誤解を招く。 | hotfixでは復旧しない。実DB連携後に実データ状態と連動して戻す。 |
| Header navを案件だけに縮小 | `components/Header.jsx` | A | 人材マスタ、求人、一斉配信、単価相場、レポートが消えたように見える。 | hotfixで基準snapshotのnavへ復旧。ただし実ページ未確認の項目は有効表示にするか要承認。 |
| 設定アイコンを削除 | `components/Header.jsx` | A | 設定導線が消えた。 | hotfixで復旧。設定画面実装状況は別確認。 |
| 案件コピーをURLからID/案件名テキストに変更 | `app/page.jsx` | B | 基準snapshotと挙動が変わるが、`/projects/{id}`ページが存在しないためURL復旧は危険。 | hotfixでは案件ID/案件名コピーを維持する。URLコピーは実ページ作成後に復旧する。 |
| 詳細action permissionから `proposal` を除外 | `app/page.jsx` | A | 権限チェック対象から外れ、提案開始導線復旧時に不整合が出る。 | hotfixで `proposal` を戻す。 |

### Text Changes

| Change | Category | User impact | Rollback / Restore |
|---|---|---|---|
| コピー通知を「案件URLをコピーしました」から「案件情報をコピーしました」へ変更 | B | 既存操作と文言が変わる。 | hotfixでは壊れたURLを避けるため `案件情報をコピーしました` を維持する。 |
| docsに「UIから未実装『提案開始』は撤去済み」等を記録 | B | 実態とユーザー期待に反する状態記録になる。 | docsを no-write placeholder / DB-backed pending に修正。 |

### Navigation Changes

| Change | Category | User impact | Rollback / Restore |
|---|---|---|---|
| Header nav itemsを6件から1件へ削減 | A | 既存機能が消えたように見える。 | hotfixで復旧。 |
| 設定アイコン削除 | A | 設定導線が消える。 | hotfixで復旧。 |
| 市場分析ボタンは残存 | C | `/market-analysis` 導線は維持。 | 変更なし。 |

### Button / Flow Changes

| Change | Category | User impact | Rollback / Restore |
|---|---|---|---|
| 検索履歴ボタン削除 | A | 検索履歴利用不可。 | hotfixで復旧。 |
| 提案開始ボタン/メニュー削除 | A | 営業フロー入口が消える。 | hotfixで復旧。 |
| コピー挙動変更 | B | 共有URLがコピーできない可能性。 | hotfixでは壊れたURLを避け、案件ID/案件名コピーにする。 |

### API Changes

| Change | User impact | Rollback / Restore |
|---|---|---|
| #53内では新規API追加なし | 直接影響なし | なし |
| 未分類メール検索で除外キーワードを追加適用 | 未分類メール検索が改善 | 維持対象 |

### Package / Dependency Changes

| Change | User impact | Rollback / Restore |
|---|---|---|
| #53内で主要dependency変更なし | 直接影響なし | なし |
| `tsconfig.json` exclude調整 | typecheck対象整理 | 問題があれば該当excludeを戻す |

### DB / Migration / Env

| Item | Result |
|---|---|
| DB schema変更 | なし |
| migration | なし |
| env追加/変更 | なし |
| DB write smoke | 未実行 |

### #53 Classification Summary

| Category | Items |
|---|---|
| A: 完全に戻すべき | 検索履歴ボタン/導線、SearchHistoryModalの入口、提案開始導線、Header nav、設定アイコン、proposal権限チェック。ただし未実装/サンプル箇所はsafety stateで戻す。 |
| B: 今は非表示/変更でもよいが承認が必要 | `proposalIds` / `提案開始済み` 表示、`/projects/{id}` URLコピー、コピー文言、未実装扱いdocs記述 |
| C: 削除でよいが変更履歴に残す | `tsconfig.tsbuildinfo`削除、docs移動、未分類メール除外検索追加は維持 |

## #54 Dependency Security Audit

PR/branch:

- PR: `#54`
- Branch: `codex/dependency-security-audit-20260615`
- Merge SHA: `d44d7e38f388b043e3eed760f307ea73d5a40e17`
- Head SHA: `2e18ca829c08a969af3277a51dc8e4c7eb9f9b99`
- Main comparison used: `43748a7..2e18ca8`

### Added / Changed Features

| Item | Files | User impact |
|---|---|---|
| npm audit high以上を0件化 | `package.json`, `package-lock.json` | security posture改善。 |
| Next major update | `package.json`, `package-lock.json` | build/typecheck挙動が変わる。UI表示や型生成に影響の可能性。 |
| dynamic route handler型をNext 16形式へ変更 | `app/api/**/[id]/**/route.ts` | APIの型互換対応。挙動維持が前提。 |
| `next-env.d.ts` routes type import追加 | `next-env.d.ts` | Next型生成に依存。 |
| `tsconfig.json`調整 | `tsconfig.json` | 型チェック対象とJSX設定が変わる。 |

### Deleted / Hidden UI

なし。#54単体では UIボタン/ナビ/文言の削除は確認なし。

### Text / Navigation / Button Changes

なし。#54単体では UI文言、ナビ、ボタン導線の変更は確認なし。

### API Changes

| API | Change | User impact | Rollback / Restore |
|---|---|---|---|
| `GET /api/imports/source-records/[id]` | `context.params` を `Promise<{ id: string }>` として await | Next 16型互換。APIレスポンスは維持想定。 | Next 14へ戻す場合は旧型へ戻す。 |
| `POST /api/mail-notifications/[id]/extract` | 同上 | 未分類メール抽出APIの型互換。 | 同上。 |
| `PATCH /api/matches/suggestions/[id]/review` | 同上 | matching review APIの型互換。 | 同上。 |
| `GET /api/matches/suggestions/[id]` | 同上 | matching detail APIの型互換。 | 同上。 |

### Package / Dependency Changes

| Change | User impact | Rollback / Restore |
|---|---|---|
| `next` `14.2.15` -> `16.2.9` | major upgrade。typegen/build挙動変更。 | package/lockを#53時点に戻す。 |
| `tsx` `^4.21.0` -> `^4.22.4` | test/script runtime更新。 | package/lockを#53時点に戻す。 |
| overrides追加: `@hono/node-server`, `esbuild`, `hono`, `postcss` | transitive vulnerabilities対策。 | audit結果を見ながら個別解除。 |
| `typecheck`/`lint`: `next typegen && tsc --noEmit` | route型生成を前提化。現hotfix検証では `next typegen` がCLI上で認識されず失敗。 | 要調査。承認なしに戻さない。 |

### DB / Migration / Env

| Item | Result |
|---|---|
| DB schema変更 | なし |
| migration | なし |
| env追加/変更 | なし |
| Prisma validate/generate | `DATABASE_URL` がないworktreeでは失敗。親worktreeの `.env` 参照が必要。 |

### User Impact

- UI削除はないが、Next major updateにより build/typecheck/preview の安定性へ影響する可能性がある。
- 2026-06-15 hotfix検証では `npm.cmd audit --audit-level=high` は `0 vulnerabilities`。
- 2026-06-15 hotfix検証では `npm.cmd run typecheck` が `next typegen` 起点で失敗。UI復旧とは別の#54 follow-upとして扱う。

### Rollback

1. `package.json` / `package-lock.json` / `next-env.d.ts` / `tsconfig.json` を `43748a7` 時点へ戻す。
2. dynamic route handler型を `context: { params: { id: string } }` へ戻す。
3. `npm.cmd ci --ignore-scripts`, `npx.cmd prisma validate`, `npx.cmd prisma generate`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit --audit-level=high` を再実行する。

## #55 DB-backed Search History

PR/branch:

- PR: `#55`
- Branch: `codex/search-history-db-backed-20260615`
- Head SHA: `5344ec91557b9ce7beed7b8f4c2f21288cd411f5`
- Comparison used: `18f1b887..5344ec9`
- Status: rebase/merge作業停止中。UI regression hotfix完了後に再開。

### Added Features

| Item | Files | User impact |
|---|---|---|
| DB-backed SearchHistory API | `app/api/search-histories/route.ts`, `lib/search-history.ts` | 検索条件の保存/取得がDB-backedになる。 |
| SearchHistory UIをDB-backed版へ更新 | `components/SearchHistoryModal.jsx`, `app/page.jsx`, `components/SearchToolbar.jsx` | 検索履歴の保存、取得、再適用が可能になる。 |
| Search history tests | `scripts/search-history.test.ts`, `package.json` | `test:search-history` が追加される。 |
| History modal styles | `app/globals.css` | 検索履歴モーダルに保存UI、空状態、message表示が追加される。 |
| status docs | `docs/status/search-history-db-backed-2026-06-15.md` | DB-backed検索履歴の実装履歴。 |

### Deleted / Hidden UI

なし。#55は #53で消えた検索履歴導線をDB-backed版として戻す方向。

### Text Changes

| Change | User impact |
|---|---|
| モーダルに「現在の検索条件を保存し、過去の条件を再適用できます」追加 | 保存操作の説明が明確化。 |
| ボタン「現在の検索を保存」追加 | 検索履歴保存の操作が増える。 |
| 履歴適用ボタンは「適用」 | 基準snapshotの「この条件で検索」から短い文言へ変更。ユーザー確認推奨。 |

### Navigation / Button / Flow Changes

| Change | Category | User impact | Rollback / Restore |
|---|---|---|---|
| 検索履歴ボタンを復旧 | A | 検索履歴へアクセス可能。 | hotfixでも暫定復旧、#55でDB-backedへ置換。 |
| 検索履歴保存ボタン追加 | C | 新規操作追加。 | #55をrevertすれば旧UIへ戻る。 |
| 適用時にfilterValues/checkedFilters/selectedFocus/pageSize/sortKeyを復元 | C | 過去条件の再現性が上がる。 | #55をrevertすれば旧keywordのみ適用へ戻る。 |

### API Changes

| API | Change | User impact | Rollback / Restore |
|---|---|---|---|
| `GET /api/search-histories` | ログインユーザーの履歴取得 | 検索履歴一覧を表示可能。 | #55 revert。 |
| `POST /api/search-histories` | 検索履歴保存 | DB writeが発生する。production/stagingでは承認が必要。 | #55 revert。 |

### Package / Dependency Changes

| Change | Result |
|---|---|
| `test` scriptに `test:search-history` 追加 | 既存テストに検索履歴テストが組み込まれる。 |
| 新規外部dependency | なし |

### DB / Migration / Env

| Item | Result |
|---|---|
| DB schema変更 | なし。既存 `SearchHistory` modelを利用。 |
| migration | なし |
| env追加/変更 | なし |
| DB write | API `POST /api/search-histories` はDB write。production/stagingでは未承認。 |

### User Impact

- 基準snapshotの検索履歴UIを、DB-backedの実装に進化させる追加開発。
- DB writeが含まれるため、実環境smokeは明示承認が必要。
- #53で検索履歴を消したことの復旧先として重要。

### Rollback

1. `18f1b887..5344ec9` の追加差分をrevertする。
2. `package.json` の `test:search-history` を外す。
3. `app/page.jsx` のDB-backed履歴適用ロジックを旧UIまたはhotfix版へ戻す。
4. `npm.cmd run test:search-history`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` を再実行する。

## Open Follow-up From Ledger

| Priority | Item | Reason |
|---|---|---|
| P0 | #53 UI regression hotfix | SearchHistory、提案開始、Header nav/settingsが消えたため。 |
| P0 | #54 `next typegen` follow-up | hotfix worktreeで typecheck が CLI mismatch により失敗。 |
| P0 | #55 rebase再開 | hotfix後にDB-backed SearchHistoryを正しく統合する。 |
| P1 | `/projects/{id}` コピー導線の仕様確認 | 現アプリには `app/projects/[id]` がないため、hotfixではID/案件名コピーを採用。URLコピー復旧は実ページ作成後に承認が必要。 |

## Current Safety State For Restored UI

| UI / flow | Current hotfix state | Click behavior in current hotfix | Safety note | Follow-up |
|---|---|---|---|---|
| mock-based `SearchHistoryModal` | `検索履歴` button is restored, modal is explicitly labeled `サンプル検索履歴` | `サンプル条件を反映` sets only the keyword search value and closes the modal. No DB read/write occurs. | Screen text states this is sample data, no real history save/fetch occurs, and DB-backed behavior is planned in #55. | Replace with #55 DB-backed implementation after approval and full test gates. |
| DB登録しない `提案開始` | Flow is kept visible as `提案開始（未実装）` | Authorized users get `提案開始は未実装です。DB登録は行われません。`; unauthorized users get the existing permission error. No DB write occurs. | `提案開始済み` is not shown because there is no real data link. | Implement real proposal API/write flow in a separate approved PR. |
| `/projects/{id}` URL copy | Broken URL copy is not restored | Copies `案件ID` and `案件名` text instead of `/projects/{id}`. It does not navigate. | There is no `app/projects/[id]` page, so users are not given a dead URL. | Restore URL copy only after a real project detail route exists. |
| Header nav/settings | Visual nav/settings are restored in disabled/coming-soon state for unimplemented items | Unimplemented nav/settings buttons are disabled with `aria-disabled` and title text. `市場分析` remains the real link. | No dead link/no-op is presented as a normal function. | Enable each nav/settings item only when its page/action exists. |
