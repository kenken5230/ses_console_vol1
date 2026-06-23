# Open PR approval packet (2026-06-24)

この文書は、ユーザーが戻ったときに open PR #104 から #121 を一括で見て「何を承認すればよいか」を判断するための承認パケットです。

- 対象: [#104](https://github.com/kenken5230/ses_console_vol1/pull/104) から [#121](https://github.com/kenken5230/ses_console_vol1/pull/121)
- 確認時点: 2026-06-24 JST
- GitHub metadata 上の状態: #104-#115, #117-#121 は Open / non-draft / mergeable CLEAN。#116 は Open / Draft / HOLD。
- 本 PR の範囲: docs-only の新規ファイル追加のみ。既存ファイルは変更しない。

## Non-engineer summary

いま開いている PR は、おおまかに「説明資料の整理」「本番・DB・CSV・Gmail まわりの安全ガード」「SearchHistory の確認計画」「market analysis のテスト」「worktree 削除候補の整理」です。

ユーザーが判断することは、主に次の 2 点です。

1. 本番 Vercel deploy が走ることを理解したうえで、どの順番で merge を承認するか。
2. merge とは別に、worktree 削除、DB write、手動 deploy / redeploy、CSV apply guard の実行・解除を承認するか。

推奨は「docs-only と DB-free guard から順に merge 承認し、#116 だけは #113 merge 後まで HOLD」です。まだ本番 deploy を走らせたくない場合は、どの PR も merge しない選択が安全です。

## Absolute gates

merge は production Vercel deploy をトリガーします。merge 承認は「本番 deploy が走ることの承認」を含みます。

ただし、以下は merge 承認とは別ゲートです。PR を merge しても実行してはいけません。

- worktree 削除、branch 削除、cleanup コマンド実行
- DB write、migration、schema 変更、production / shared DB への書き込み
- 手動 deploy、redeploy、rollback deploy、Vercel 設定変更
- CSV apply 実行、CSV apply guard の緩和・解除
- SearchHistory の POST save / real-DB Browser QA
- `.env` や秘密ファイルの閲覧、出力、コピー、要約
- Ready 化、merge、close の代理実行

## Theme map

| Theme | PRs | User-facing meaning |
|---|---|---|
| docs整理 | [#105](https://github.com/kenken5230/ses_console_vol1/pull/105), [#114](https://github.com/kenken5230/ses_console_vol1/pull/114), [#119](https://github.com/kenken5230/ses_console_vol1/pull/119), [#120](https://github.com/kenken5230/ses_console_vol1/pull/120), [#121](https://github.com/kenken5230/ses_console_vol1/pull/121) | README / 承認計画 / 安全出力計画 / 運用引き継ぎを読みやすくする。 |
| 安全ガード | [#108](https://github.com/kenken5230/ses_console_vol1/pull/108), [#113](https://github.com/kenken5230/ses_console_vol1/pull/113), [#115](https://github.com/kenken5230/ses_console_vol1/pull/115), [#116](https://github.com/kenken5230/ses_console_vol1/pull/116), [#117](https://github.com/kenken5230/ses_console_vol1/pull/117), [#118](https://github.com/kenken5230/ses_console_vol1/pull/118) | 本番・共有 DB・認証・mutation entrypoint・Gmail write path を誤操作しにくくする。#116 は HOLD。 |
| Gmail | [#106](https://github.com/kenken5230/ses_console_vol1/pull/106), [#109](https://github.com/kenken5230/ses_console_vol1/pull/109), [#111](https://github.com/kenken5230/ses_console_vol1/pull/111), [#118](https://github.com/kenken5230/ses_console_vol1/pull/118) | Gmail 分類、本文 fallback、会社候補 auto-apply 判定、person remediation apply の安全性を固める。 |
| SearchHistory | [#107](https://github.com/kenken5230/ses_console_vol1/pull/107), [#112](https://github.com/kenken5230/ses_console_vol1/pull/112) | no-write QA 計画と UI context guard。DB write / POST save は別ゲート。 |
| market analysis | [#110](https://github.com/kenken5230/ses_console_vol1/pull/110) | query / filter / row limit などを DB-free tests で固定する。 |
| worktree cleanup | [#104](https://github.com/kenken5230/ses_console_vol1/pull/104) | 削除候補一覧の docs。実削除は merge とは別承認。 |

## Recommended merge order

古い計画 [#114](https://github.com/kenken5230/ses_console_vol1/pull/114) の順序は、#105 -> #110 -> #111 -> #109 -> #106 -> #113 -> #108 -> #107 -> #112 -> #104 でした。今回の推奨順は、その流れを保ちながら #115 / #117 / #118 / #119 / #120 / #121 を挿入します。

| Order | PR | Status | Why this position |
|---:|---|---|---|
| 1 | [#105 Clarify docs README](https://github.com/kenken5230/ses_console_vol1/pull/105) | Ready merge待ち | docs entry point。低リスクで最初に入れやすい。 |
| 2 | [#114 Add open PR merge approval plan](https://github.com/kenken5230/ses_console_vol1/pull/114) | Ready merge待ち | 既存の merge/deploy 承認計画。今回の packet と併読する土台。 |
| 3 | [#119 Add safe-output contract test plan](https://github.com/kenken5230/ses_console_vol1/pull/119) | Ready merge待ち | docs-only。以降の safety guard の観点を整理する。 |
| 4 | [#120 Add root README index draft plan](https://github.com/kenken5230/ses_console_vol1/pull/120) | Ready merge待ち | docs-only。#105 と衝突しない計画ファイル。 |
| 5 | [#121 Add operations handoff runbook](https://github.com/kenken5230/ses_console_vol1/pull/121) | Ready merge待ち | docs-only。ops 確認は merge 後も別ゲート。 |
| 6 | [#110 Add market analysis query guard tests](https://github.com/kenken5230/ses_console_vol1/pull/110) | Ready merge待ち | test-only / DB-free。#114 の順序を維持。 |
| 7 | [#111 Add Gmail classification characterization tests](https://github.com/kenken5230/ses_console_vol1/pull/111) | Ready merge待ち | test-only / DB-free。Gmail 判定土台を先に固定する。 |
| 8 | [#115 Add production guard contract test](https://github.com/kenken5230/ses_console_vol1/pull/115) | Ready merge待ち | production guard の DB-free contract。後続 safety guard の前に置く。 |
| 9 | [#117 Add auth source contract test](https://github.com/kenken5230/ses_console_vol1/pull/117) | Ready merge待ち | auth 出力の静的 contract。DB-free。 |
| 10 | [#109 Add Gmail message body fallback guard](https://github.com/kenken5230/ses_console_vol1/pull/109) | Ready merge待ち | Gmail 本文 fallback の実装 guard。#114 の順序を維持。 |
| 11 | [#106 Add Gmail company auto-apply contract guard](https://github.com/kenken5230/ses_console_vol1/pull/106) | Ready merge待ち | auto-apply 判定を保守的にする DB-free helper/tests。 |
| 12 | [#113 Harden import dry-run safety guards](https://github.com/kenken5230/ses_console_vol1/pull/113) | Ready merge待ち | CSV / Notion dry-run guard。#116 再開の前提。 |
| HOLD | [#116 Add mutation entrypoint production guard contract](https://github.com/kenken5230/ses_console_vol1/pull/116) | HOLD | #113 merge 後に rebase / scope 再確認してから Draft 解除判断。現時点では merge しない。 |
| 13 | [#108 Harden person owner preflight DB target guards](https://github.com/kenken5230/ses_console_vol1/pull/108) | Ready merge待ち | DB 接続前 guard。#114 の順序を維持。 |
| 14 | [#118 Add Gmail person remediation production guard](https://github.com/kenken5230/ses_console_vol1/pull/118) | Ready merge待ち | Gmail person remediation apply path の production guard。DB/API 実行は別ゲート。 |
| 15 | [#107 Add SearchHistory browser QA plan](https://github.com/kenken5230/ses_console_vol1/pull/107) | Ready merge待ち | docs-only no-write QA plan。DB write QA は別ゲート。 |
| 16 | [#112 Add SearchHistory UI context guard](https://github.com/kenken5230/ses_console_vol1/pull/112) | Ready merge待ち | UI context guard。POST save / real-DB QA は別ゲート。 |
| 17 | [#104 Add worktree cleanup approval list](https://github.com/kenken5230/ses_console_vol1/pull/104) | Ready merge待ち | approval list docs。実 worktree 削除と branch 削除を必ず分離するため最後。 |

## PR status table

| PR | Theme | Current state | Merge decision | Separate gate |
|---|---|---|---|---|
| [#104](https://github.com/kenken5230/ses_console_vol1/pull/104) | worktree cleanup | Open / Ready / CLEAN | Ready merge待ち | worktree deletion, branch deletion, cleanup command execution |
| [#105](https://github.com/kenken5230/ses_console_vol1/pull/105) | docs整理 | Open / Ready / CLEAN | Ready merge待ち | none beyond production deploy awareness |
| [#106](https://github.com/kenken5230/ses_console_vol1/pull/106) | Gmail | Open / Ready / CLEAN | Ready merge待ち | actual Gmail apply/write workflow |
| [#107](https://github.com/kenken5230/ses_console_vol1/pull/107) | SearchHistory | Open / Ready / CLEAN | Ready merge待ち | DB write, POST save, Browser real-DB QA |
| [#108](https://github.com/kenken5230/ses_console_vol1/pull/108) | safety guard | Open / Ready / CLEAN | Ready merge待ち | HTTP smoke against approved DB target |
| [#109](https://github.com/kenken5230/ses_console_vol1/pull/109) | Gmail | Open / Ready / CLEAN | Ready merge待ち | Gmail API / DB-backed extraction checks |
| [#110](https://github.com/kenken5230/ses_console_vol1/pull/110) | market analysis | Open / Ready / CLEAN | Ready merge待ち | DB aggregation smoke, if any |
| [#111](https://github.com/kenken5230/ses_console_vol1/pull/111) | Gmail | Open / Ready / CLEAN | Ready merge待ち | classification behavior change PRs, if any |
| [#112](https://github.com/kenken5230/ses_console_vol1/pull/112) | SearchHistory | Open / Ready / CLEAN | Ready merge待ち | DB write, POST save, Browser real-DB QA |
| [#113](https://github.com/kenken5230/ses_console_vol1/pull/113) | safety guard | Open / Ready / CLEAN | Ready merge待ち | DB duplicate scan with `--db-duplicates=on`, CSV apply |
| [#114](https://github.com/kenken5230/ses_console_vol1/pull/114) | docs整理 | Open / Ready / CLEAN | Ready merge待ち | none beyond production deploy awareness |
| [#115](https://github.com/kenken5230/ses_console_vol1/pull/115) | safety guard | Open / Ready / CLEAN | Ready merge待ち | none beyond production deploy awareness |
| [#116](https://github.com/kenken5230/ses_console_vol1/pull/116) | safety guard | Open / Draft / CLEAN | HOLD | Resume only after #113 merges, then rebase / rerun / review before Ready |
| [#117](https://github.com/kenken5230/ses_console_vol1/pull/117) | safety guard | Open / Ready / CLEAN | Ready merge待ち | none beyond production deploy awareness |
| [#118](https://github.com/kenken5230/ses_console_vol1/pull/118) | Gmail / safety guard | Open / Ready / CLEAN | Ready merge待ち | DB/API apply execution |
| [#119](https://github.com/kenken5230/ses_console_vol1/pull/119) | docs整理 / safety | Open / Ready / CLEAN | Ready merge待ち | implementation of safe-output tests |
| [#120](https://github.com/kenken5230/ses_console_vol1/pull/120) | docs整理 | Open / Ready / CLEAN | Ready merge待ち | actual README/docs index edits |
| [#121](https://github.com/kenken5230/ses_console_vol1/pull/121) | docs整理 / ops | Open / Ready / CLEAN | Ready merge待ち | dashboard changes, env edits, deploys, OAuth/infra operations |

## User decision options

| Option | Decision | What happens | What remains blocked |
|---|---|---|---|
| A | 推奨順でmerge承認 | #104-#115, #117-#121 を上の順で承認。#116 は HOLD のまま。 | worktree deletion, DB write, deploy operations, CSV apply, SearchHistory real-DB QA |
| B | docs-onlyだけ先 | #105, #114, #119, #120, #121 を先に承認。必要なら #104 は最後に回す。 | code/test guard PRs, #116, all separate gates |
| C | safety guardだけ先 | #115, #117, #113, #108, #118 を中心に承認。#116 は #113 merge 後まで HOLD。 | docs整理、SearchHistory DB QA、worktree cleanup execution |
| D | まだmergeしない | 本番 deploy を走らせない。すべて open のまま維持。 | すべての merge と別ゲート操作 |

## Pre-merge final checklist

各 PR の merge 承認前に、少なくとも以下を確認します。

- PR が Open / non-draft である。例外: #116 は Draft / HOLD のため merge しない。
- 最新 head に対して required checks / Vercel checks が成功している。
- merge により production Vercel deploy が走ることを承認者が理解している。
- schema / migration / env / package / lockfile 変更がない、または別途明示承認されている。
- 削除差分がないことを確認している。
- DB write、CSV apply、worktree 削除、SearchHistory real-DB QA を同時に実行しない。
- deploy 後に見る画面・ログ・確認項目が決まっている。
- rollback は原則 revert PR で行うことを承認者が理解している。

## Rollback / revert policy

原則は「revert PR を作って main に戻す」です。直接 `git reset --hard`、force push、production DB の巻き戻し、worktree 削除で対応しません。

- docs-only / test-only PR: revert PR で戻す。production deploy は再度走るため、Vercel deploy 完了確認を行う。
- Gmail / SearchHistory / safety guard 実装 PR: revert PR 後、対象画面・CLI・guard の動作確認を行う。DB write は別承認なしに実施しない。
- #113: dry-run guard の revert は CSV / Notion dry-run の安全水準を下げる可能性があるため、revert 前に代替 guard を確認する。
- #116: 現時点では HOLD のため rollback 対象に含めない。#113 merge 後に再開する場合は、独立した review / validation / rollback 方針を作る。
- #104: docs を revert しても worktree 実削除が戻るわけではない。実削除は別ゲートで、実行前に最新 `git worktree list` と未 push / 未 commit 差分を再確認する。

## Not performed by this packet

- Ready / merge / close
- DB connection, DB write, migration, schema change
- Gmail API / Notion API / application API execution
- production deploy / manual redeploy / rollback deploy
- worktree deletion, branch deletion, cleanup command execution
- `.env` or secret-file read
- CSV apply or guard relaxation
