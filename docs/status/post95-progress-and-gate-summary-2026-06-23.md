# Post-#95 Progress and Gate Summary 2026-06-23

Observed at: 2026-06-23 15:23 JST

Scope: docs-only status sync after PR #92 through #95. This report does not change code, API, DB, schema, env, package, or lockfile files.

## けんさん向け要約

#92 から #95 では、「AIが安全に自律作業するためのルール」と「Gmail会社候補やPerson owner linkを、どこまで自動で進めてよいかの境界」を整理しました。

いまの状態は、DB更新を先に進めたのではなく、DB更新の前に必要な信号機を増やした段階です。Gmail会社候補は読み取り専用の候補として扱い、apply、つまりDBへ反映する処理はまだ未実装・未実行です。Person owner linkも、実際のHTTP write smokeはまだ走らせず、接続先・fixture・rollback・権限確認を先にそろえる形へ固めています。

次にAIだけで進めやすいのは、最新main前提の計画整理、読み取り専用preflightの準備、テスト観点の棚卸し、worktree cleanup台帳作成です。DBへ書く、候補をapplyする、worktreeを削除する、主workspaceのdirtyを動かす作業は、けんさん確認が必要です。

## #92-#95で完了したこと

| PR | 完了した内容 | いまの意味 |
|---|---|---|
| #92 | `AGENTS.md`, `AI_WORK_RULES.md`, `AI_WORK_RULES_SHORT.md` を追加 | 秘密ファイルを読まない、危険操作を勝手にしない、主workspaceを雑に触らない、という運用ルールがリポジトリ内に明文化された。 |
| #93 | Gmail company apply gate runbookを追加し、read-only candidate designへapply境界を追記 | Gmail会社候補はまだ助言・確認用。DB反映へ進むには、PM/audit/PMO/TL観点の承認、rollback、target件数、証跡が必要になった。 |
| #94 | Person owner link preflightとHTTP smoke runbookを強化し、関連テストも更新 | 実DB write前に、接続先分類、feature guard、session、fixture、rollback、AuditLog確認で止める条件が明確になった。 |
| #95 | Gmail company boundary testsを追加 | Gmail会社候補や抽出品質の境界が壊れていないかを、コード内のテストで見張れる状態になった。 |

## 機能テーマ別の現状

| テーマ | 現状 | 次の扱い |
|---|---|---|
| AI運用ルール | #92で正式化済み。秘密ファイル、DB実体、外部影響操作、主workspace dirtyへの配慮が文章化された。 | 新しい作業はこのルール前提で開始する。docs-onlyでも秘密値や接続URLは残さない。 |
| Gmail会社補完 | read-only候補検出は存在する。#93でapply gate、#95で境界テストが入った。 | previewとapplyを分けたまま、将来apply PRを設計する。DB writeは承認まで不可。 |
| Person owner link | API/route smokeの準備は進んでいるが、実HTTP write smokeは未実行。#94でpreflightが硬くなった。 | synthetic/disposable fixtureを選び、read-only preflight evidenceを作ってから、write smoke承認を取る。 |
| SearchHistory | #91で保存済み検索履歴のfilter復元は直った。古いDB-backed #55はそのまま入れず、latest mainから#55Rとして再設計する扱い。 | 実DB保存、DB write smoke、own-user isolationを確認する計画から再開する。 |
| worktree cleanup | 主workspaceはdirty。古いworktreeも残っている。削除・merge・reuseは未実行。 | まず削除しない台帳を作る。削除候補ごとにdirty、未push、関連PR、秘密/DB実体の可能性を確認して承認を取る。 |

## 残ゲート

| ゲート | 状態 | 進む条件 |
|---|---|---|
| 実DB preflight | 未実行または未完了扱い | 接続先を秘密値なしで分類し、production/staging/sharedに見える場合は停止。読み取り専用でfixture状態だけ確認する。 |
| 実DB write smoke | 未実行 | 対象DB、fixture IDs、operator session、request body、rollback owner、実行時間、証跡保存をけんさんが明示承認する。 |
| Gmail candidate apply | 未実装・未実行 | 既存Company linkのみか、新規Company作成を許すか、generic domain/LOW confidence/fallbackの扱いを決める。local/test限定writeとrollback計画が必要。 |
| worktree削除 | 未実行 | 各worktreeのdirty、untracked、未push、関連PR、削除不可条件を台帳化し、削除コマンド実行前に個別承認を取る。 |
| 主workspace dirty整理 | 未実行 | 主workspaceは別作業者や過去作業の変更を含む前提。勝手に戻さず、ファイル単位で残す・退避・捨てる判断を確認する。 |

## 今すぐAIだけで進めてよいもの

- 最新main前提のdocs整理、進捗整理、runbook整理。
- DBへ接続しないコード・テスト観点の調査。
- 秘密値を読まない範囲のファイル一覧・差分確認。
- 削除しない前提のworktree cleanup台帳作成。
- Gmail company applyやSearchHistory #55Rの実装前設計。
- Person owner linkの承認依頼用チェックリスト作成。

## けんさん確認が必要なもの

- DB接続を伴うpreflight。特に接続先分類が必要な場合。
- DB write smoke、rollback、AuditLog確認、fixture cleanup。
- Gmail company candidateをapply対象にする設計判断。
- dashboard APIへGmail候補を載せるかどうかの判断。
- worktree削除、branch削除、主workspace dirtyの整理。
- production/staging/shared環境へのアクセス、deploy、PR merge/close/openなど外部状態を動かす操作。

## 次の大きめ作業単位候補

| 候補 | 目安 | 内容 | 承認要否 |
|---|---:|---|---|
| Person owner link preflight evidence pack | 45-75分 | 書き込みなしで、必要なfixture条件、接続先分類項目、確認文面、証跡テンプレートを作る。DB接続を実行する直前で止める。 | DB接続前に要確認 |
| Gmail company apply design pack | 60-90分 | #93/#95を前提に、preview UI、apply endpoint、audit reason、rollback、generic/LOW/fallback扱いを設計する。 | 設計だけならAI可。write方針は要確認 |
| SearchHistory #55R rebuild plan | 45-90分 | latest mainからDB-backed SearchHistoryを作り直すため、API/UI/test/DB write smokeの範囲を分ける。 | 実装前計画はAI可。DB write smokeは要確認 |
| Worktree cleanup ledger | 30-60分 | 削除せず、既知worktreeと主workspace dirtyの扱いを台帳化し、削除不可条件と承認単位を明確にする。 | 台帳作成はAI可。削除は要確認 |
| Post-#95 QA gate map | 30-60分 | #92-#95後のテスト、Browser QA、production read-only確認、未実行理由を表にまとめる。 | AI可 |

## 明示的に未実行

- DB接続、DB write、migration、schema変更。
- code/API/env/package/lockfile変更。
- production/staging/shared DB操作。
- worktree削除、branch削除、主workspace dirty整理。
- 秘密ファイルの読み取り、秘密値の出力。
