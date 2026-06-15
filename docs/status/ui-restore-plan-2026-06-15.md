# UI Restore Plan 2026-06-15

## Policy

過去チャット、既存docs、追加開発ブランチにある機能を、未実装と誤判定して消さない。既存画面に出ていた導線は、削除ではなく次のいずれかで扱う。

- `Restore now`: hotfixで戻す
- `Keep pending`: 別PR/追加開発として残す
- `Hide only with approval`: 非表示にするなら明示承認を取る
- `Remove with ledger`: 削除でよいが変更台帳に残す

## Baseline Note

この計画で「基準snapshot」と呼ぶものは first-parent `main` の `71b9a09b029c1e05dcaf13f0cc9bf159c93d5d6d` で、`Merge pull request #49 from kenken5230/codex/proposal-traceability-draft-status-prereqs-design` 直後のユーザー確認済み画面を指す。`#49` 自体をUI実装PRとみなす意味ではない。

`#53` の実差分確認では、main 側の直接比較基準として `bb6097f64d1f0c0c3ea1ffc3b21a42a8295d6bd4`（`Merge pull request #44 from kenken5230/codex/match-review-requirements` 後）も使用している。

## Restore Targets

| UI / Flow | Regression source | Classification | Decision | PR / Task | Test |
|---|---|---|---|---|---|
| Header nav: 人材マスタ、案件、求人、一斉配信、単価相場、レポート | #53 | A | Restore now | `codex/restore-console-ui-regression-20260615` hotfix | Browser visual QA / typecheck |
| Header settings icon | #53 | A | Restore now | hotfix | Browser visual QA / typecheck |
| 市場分析ボタン | unchanged | C | Keep | no change | Browser visual QA |
| SearchHistoryModal old UI | #53 | A | Restore now as baseline | hotfix | Browser visual QA / typecheck |
| Search history DB-backed UI/API | #55 | C | Keep pending | #55 after hotfix | `npm.cmd run test:search-history` / typecheck / build |
| 検索履歴ボタン | #53 | A | Restore now | hotfix, later #55 upgrades behavior | Browser visual QA |
| `searchHistories` mock data | #53 | A | Restore now for baseline | hotfix | typecheck |
| 案件一覧 row menu `提案開始` | #53 | A | Restore now | hotfix | Browser visual QA |
| 案件詳細 `提案開始` | #53 | A | Restore now | hotfix | Browser visual QA |
| `handleAddProposal` no-write placeholder | #53 | A | Restore now | hotfix | Browser visual QA |
| `proposalIds` display hook | #53 | B | Do not restore until it is linked to real proposal data; avoid fake `提案開始済み` state | later proposal DB PR | typecheck |
| `/projects/{id}` copy behavior | #53 | B | Do not restore broken URL copy; use案件ID/案件名 copy until a real route exists | hotfix + follow-up approval | Browser visual QA |
| 未分類メール exclude search | #53 | C | Keep | hotfix keeps this change | test / Browser visual QA |
| dependency security update | #54 | C | Keep, but follow up `next typegen` failure | #54 follow-up task | typecheck / build |

## Hotfix PR Scope

Branch: `codex/restore-console-ui-regression-20260615`

Included:

- Restore baseline snapshot Header nav/settings.
- Restore search history button, modal, and mock baseline data.
- Restore no-write proposal start entry points in project table/detail.
- Keep copy action, but do not restore broken `/projects/{id}` URL copy until a real route exists.
- Keep #53 useful fix for unclassified mail exclude search.
- Add this ledger and restore plan.

Not included:

- #55 DB-backed SearchHistory merge.
- DB write smoke.
- DB migration.
- production/staging deploy.
- worktree deletion.

## Approval Required

| Item | Why approval is required |
|---|---|
| Merge hotfix to `main` | User approved #53/#54/#55 flow only. This is a new hotfix PR/branch. |
| Hide Header nav/settings again | Existing UI was visible in the baseline snapshot; hiding it affects user workflows. |
| Re-enable `/projects/{id}` URL copy | There is no `app/projects/[id]` page in the current app, so URL copy would hand users a dead route. |
| Merge #55 after hotfix | Rebase conflicts and DB write API require full test gates. |
| Execute DB write smoke | Explicitly not approved. |
| DB migration or production/staging operations | Explicitly not approved. |
| Worktree deletion | Requires target list, statuses, commands, and reapproval. |

## Safety State Decision Matrix

| UI / flow | Safety state | Click result | Merge readiness |
|---|---|---|---|
| mock-based `SearchHistoryModal` | Button restored; modal is labeled `サンプル検索履歴` and explains no DB read/write | Applies only a sample keyword condition. | Safe as sample UI; real DB-backed history remains #55. |
| DB登録しない `提案開始` | Visible as `提案開始（未実装）`; no `提案開始済み` state | Shows `提案開始は未実装です。DB登録は行われません。` | Safe as explicit not-implemented notice; real proposal write flow remains separate. |
| `/projects/{id}` URL copy | Broken URL copy is not restored | Copies案件ID/案件名 text only. | Safe until a real `/projects/[id]` route exists. |
| Header nav/settings | Unimplemented items are disabled/coming-soon with `aria-disabled` and title | Disabled items do not trigger no-op actions; `市場分析` remains an enabled real link. | Safe as non-clickable visual restoration. |

## Test Plan

Task-level tests:

1. Header/nav restore
   - `npm.cmd run typecheck`
   - Browser visual QA: top nav and settings visible
2. Search history baseline restore
   - `npm.cmd run typecheck`
   - Browser visual QA: button opens modal, item applies keyword
3. Proposal start restore
   - `npm.cmd run typecheck`
   - Browser visual QA: row menu/detail button show no-write notice
4. Docs ledger
   - `git diff --check`
   - docs grep for stale "撤去済み"/misleading removed UI wording

Group tests:

- `npx.cmd prisma validate`
- `npx.cmd prisma generate`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd audit --audit-level=high`
- Browser visual QA for `/`, `/imports`, `/matches`, `/market-analysis`

## Current Test Notes

- `npm.cmd audit --audit-level=high`: PASS, 0 vulnerabilities.
- `npx.cmd prisma validate`: blocked in hotfix worktree because `.env` is not present there and Prisma cannot resolve `DATABASE_URL`.
- `npm.cmd run typecheck`: blocked by #54 script `next typegen && tsc --noEmit`; current installed Next CLI treats `typegen` as a directory/invalid command in this worktree.

These blockers are recorded as environment/package follow-up, not as UI hotfix behavior failures. Do not hide them.

## Sequence

1. Finish hotfix code/docs.
2. Resolve validation blockers without DB write/migration.
3. Run task tests and group tests.
4. Push hotfix branch and open PR, or ask approval before merge if PR already exists.
5. Comment on #53/#54/#55 with this ledger and restore plan.
6. After hotfix is reviewed, resume #55 rebase and preserve DB-backed SearchHistory.
