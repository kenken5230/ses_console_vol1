# Open PR #104-#113 merge / deploy approval plan (2026-06-24)

このメモは、ユーザー不在中に open PR #104-#113 を誤って merge / deploy しないための承認待ち整理です。

- 対象: #104, #105, #106, #107, #108, #109, #110, #111, #112, #113
- 状態確認: 2026-06-24 JST 時点の GitHub PR metadata
- 共通状態: 全対象 PR は Open / non-draft / mergeable / Vercel 系チェック成功
- 判定: 「Ready 候補」だが、merge は production Vercel deploy をトリガーするため、ユーザー明示承認なしに実行禁止
- この文書の PR も Draft のまま扱い、merge 承認フロー自体を変更しない

## Absolute gates

merge は本番 Vercel deploy トリガーです。ユーザーの明示承認なしに、以下を実行しないでください。

- PR の Ready 化、merge、close
- production deploy を誘発する操作
- DB 接続、DB write、migration、schema 変更、env/package/lockfile 変更
- 秘密ファイルの閲覧、出力、コピー、要約
- worktree 削除、branch 削除、`git reset --hard`、`git clean`
- #104 に含まれる worktree cleanup コマンドの実行
- #107 / #112 に関連する SearchHistory の DB write、POST save、Browser real-DB QA

## Recommended approval order

推奨 merge 承認順は次の通りです。

1. #105 Clarify docs README
2. #110 Add market analysis query guard tests
3. #111 Add Gmail classification characterization tests
4. #109 Add Gmail message body fallback guard
5. #106 Add Gmail company auto-apply contract guard
6. #113 Harden import dry-run safety guards
7. #108 Harden person owner preflight DB target guards
8. #107 Add SearchHistory browser QA plan
9. #112 Add SearchHistory UI context guard
10. #104 Add worktree cleanup approval list

理由:

- docs / test-only / DB-free の安全確認を先に merge する。
- Gmail 系は characterization / body fallback / auto-apply guard の順で、判定土台から適用安全策へ進める。
- #113 は import dry-run の安全 guard なので SearchHistory 実操作系より先に入れる。
- SearchHistory 関連の #107 / #112 は DB write / POST save / Browser real-DB QA を別ゲートに分離したまま後段で確認する。
- #104 は PR merge 承認と実 worktree 削除承認を必ず分離するため最後に置く。

## PR readiness table

| Order | PR | Current status | Scope | Approval note |
|---:|---|---|---|---|
| 1 | [#105](https://github.com/kenken5230/ses_console_vol1/pull/105) | Ready candidate | `docs/README.md` docs-only | 既存 docs entry point の読みやすさ改善。最初に入れてよい低リスク枠。 |
| 2 | [#110](https://github.com/kenken5230/ses_console_vol1/pull/110) | Ready candidate | Market analysis DB-free tests | test-only。UI/DB 集計実行は変更しない。 |
| 3 | [#111](https://github.com/kenken5230/ses_console_vol1/pull/111) | Ready candidate | Gmail classification DB-free characterization tests | test-only。分類ロジック変更なし。 |
| 4 | [#109](https://github.com/kenken5230/ses_console_vol1/pull/109) | Ready candidate | Gmail message body fallback guard | 実装変更あり。Gmail API/DB なし。本文選択の境界確認を本番 deploy 後に画面・抽出結果で見る。 |
| 5 | [#106](https://github.com/kenken5230/ses_console_vol1/pull/106) | Ready candidate | Gmail company auto-apply contract guard | DB-free helper/tests。新規 Company 作成 semantics は導入しない。 |
| 6 | [#113](https://github.com/kenken5230/ses_console_vol1/pull/113) | Ready candidate | CSV / Notion import dry-run safety guard | `--db-duplicates=on` のみ read-only DB duplicate scan。default / off / auto は DB read なし。 |
| 7 | [#108](https://github.com/kenken5230/ses_console_vol1/pull/108) | Ready candidate | Person owner-link DB target preflight guard | unsafe target で DB 接続前に止める guard。HTTP smoke 実行は別確認。 |
| 8 | [#107](https://github.com/kenken5230/ses_console_vol1/pull/107) | Ready candidate | SearchHistory no-write Browser QA plan docs | docs-only。DB write / POST save / Browser real-DB QA は別ゲート。 |
| 9 | [#112](https://github.com/kenken5230/ses_console_vol1/pull/112) | Ready candidate | SearchHistory UI context guard | UI helper 実装変更あり。DB write / POST save / Browser real-DB QA は別ゲート。 |
| 10 | [#104](https://github.com/kenken5230/ses_console_vol1/pull/104) | Ready candidate | Worktree cleanup approval list docs | PR merge 承認と実 worktree 削除承認を分離。merge しても削除コマンド実行は禁止。 |

## Residual risks and rollback

共通 rollback 方針:

- 原則は revert PR で戻す。
- schema / migration / env / package / lockfile 変更なしの PR は戻しやすい。
- ただし merge は production deploy を伴うため、deploy 後の画面確認は必要。
- revert 後も Vercel production が期待状態へ戻ったことを確認する。

PR 別の残リスク:

- #105: docs-only。rollback は revert PR。残リスクは README のリンク文脈・案内順が他 PR と一時的にずれること。
- #110: test-only。rollback は revert PR。残リスクは CI / typecheck 側のテスト前提が main の直近変更とずれること。
- #111: test-only。rollback は revert PR。残リスクは characterization が現行挙動を固定し、後続の分類改善 PR で期待値更新が必要になること。
- #109: Gmail body fallback 実装変更。rollback は revert PR。残リスクは plain text / HTML fallback 境界で抽出本文が変わること。deploy 後に代表メールの表示・抽出確認が必要。
- #106: Gmail company auto-apply 判定 helper。rollback は revert PR。残リスクは将来の auto-apply 候補が従来より advisory-only になり、期待より保守的に止まること。
- #113: import dry-run safety guard。rollback は revert PR。残リスクは DB duplicate scan が明示 `--db-duplicates=on` のみになるため、従来 auto 期待の運用があれば手順更新が必要。
- #108: Person owner-link preflight guard。rollback は revert PR。残リスクは shared/common 判定優先により、既存 smoke 手順の target naming と合わない場合に実行前停止が増えること。
- #107: SearchHistory Browser QA plan docs-only。rollback は revert PR。残リスクは QA 計画の順序・観点が現行 UI とずれること。実 QA は別承認。
- #112: SearchHistory UI context guard 実装変更。rollback は revert PR。残リスクは sessionStorage の壊れた payload / scope normalization 周辺で再適用 UI の見え方が変わること。DB write / POST save / Browser real-DB QA は別ゲート。
- #104: cleanup approval list docs。rollback は revert PR。残リスクは approval list が古くなること。PR merge と実 worktree 削除承認は別で、削除前に最新 `git worktree list` で再照合する。

## Separate approval gates

#104:

- PR merge 承認と実 worktree 削除承認を分ける。
- #104 を merge しても、記載された `git worktree remove` コマンドは実行しない。
- 実削除する場合は、削除対象 path、対応 branch、未 push / 未 commit 差分の有無を再確認してから別承認を取る。

#107 / #112:

- SearchHistory の DB write、POST save、Browser real-DB QA は別ゲート。
- normal login 以外の auth bypass、cookie injection、token injection は禁止。
- real DB を使う QA は、対象 DB、実行操作、rollback / cleanup 手順を明記してから別承認を取る。

#113:

- `--db-duplicates=on` のみ read-only DB duplicate scan を許可する設計。
- default / off / auto は DB read なし。
- DB duplicate scan を実施する場合も、DB write ではなく read-only であること、対象 DB が承認済みであることを別確認する。

## Human checklist before each merge

各 PR の merge 承認前に確認すること:

- PR がまだ Open / mergeable である。
- Vercel / required checks が最新 head で成功している。
- merge すると production Vercel deploy が走ることを承認者が理解している。
- schema / migration / env / package / lockfile 変更がない、または別途承認されている。
- 削除差分がないことを確認している。
- deploy 後に見る画面・操作が決まっている。
- rollback は revert PR を原則とすることを承認者が理解している。

## Do not perform during owner absence

- まとめて一括 merge しない。
- Ready / merge / close / deploy を代理実行しない。
- DB write や本番データ更新を伴う検証をしない。
- #104 の cleanup 対象 worktree を削除しない。
- SearchHistory の POST save / real-DB Browser QA を実施しない。
