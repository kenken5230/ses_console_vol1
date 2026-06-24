# AI_PROJECT_PROFILE.md

このファイルは、各プロジェクト固有のAI運用設定です。

共通ルールは `AI_WORK_RULES.md` / `AI_WORK_RULES_SHORT.md` に置き、このファイルにはプロジェクトごとに決める項目だけを書いてください。

AIは最初にrepoをread-onlyで調査して仮記入し、けんさんには技術細部ではなく、非エンジニアにも分かる選択肢で必要項目だけ確認します。

## 1. プロジェクト基本情報

| 項目 | 値 |
|---|---|
| プロジェクト名 | TODO |
| repo | TODO |
| default branch | TODO |
| 主な技術 | TODO |
| 主workspace運用 | dirtyなら新規作業baseにしない |
| 権限運用 | TODO。danger-full-access / sandbox / default.rules有無を記録 |
| ルール導入日 | TODO |
| 最終更新日 | TODO |

## 1.5 共通ルールとの関係

`AI_PROJECT_PROFILE.md` は、共通ルールを弱めるためのファイルではありません。

共通ルールでユーザー確認必須、または危険ゲートとされている操作は、このProfileでも緩和できません。

このProfileに書いてよいのは、プロジェクト固有の追加制約、local / test限定runbook、内部承認へ回せる低リスク候補、検証コマンド、通知、docs配置、判断基準です。

## 2. AI運用方針

| 項目 | 標準値 |
|---|---|
| 作業単位 | 小PR単位ではなく、順番単位 / テーマ単位 |
| 体制 | 親PM、監査サブ、監視サブ(PMO)、テクニカルリード、実行者 |
| ユーザー確認 | 本当にユーザー判断が必要なものだけ |
| 自律進行 | 状態確認だけで終わらず、`READY` が残る限り進める |
| 開発組織運営 | 親PM、監査、PMO、TL、実行者がタスク発見、実行、監査、修正、再分類を自発的に回す |
| 承認待ちの扱い | 局所ブロックとして積み、他テーマや別PRの `READY` を探して進める |
| heartbeat | 全テーマ横断の安全な自律進行ループ。open PRなし、承認待ち1件だけで終了しない |
| 完了通知 | ユーザー向け完了単位、承認待ち到達、2〜6時間程度の自律作業セッション単位 |

## 3. 確認なしで進めてよい範囲

このプロジェクトで、AI内部承認だけで進めてよい範囲を記入してください。

- read-only調査: TODO
- docs更新: TODO
- テスト追加 / 修正: TODO
- 小さなUI修正: TODO
- 明らかなバグ修正: TODO
- Draft PR作成: TODO
- PR本文更新 / コメント追記: TODO
- Ready化 / merge / auto-merge: 確認なしでは原則不可。例外候補を置く場合も、9章に対象範囲、前提条件、禁止条件を明記し、heartbeatや自動継続ループでは実行しない
- low-risk merge候補として内部承認に回せる範囲: TODO。実行は必ずReady化 / merge / close補強ルール、削除差分、CI、deploy影響、rollback確認を通す。未設定なら不可

## 4. けんさん確認が必須な範囲

共通ルールに加えて、このプロジェクト固有で確認必須にするものを記入してください。

- production / staging / shared DB write: 原則禁止、必要ならけんさん確認
- migration / schema変更: TODO
- deploy: TODO
- 権限 / 認証 / 公開範囲変更: TODO
- 仕様、画面挙動、業務フロー変更: TODO
- データ削除 / 大量ファイル削除: TODO
- worktree削除 / branch削除: TODO
- プロジェクト固有の危険領域: TODO

## 4.5 外部影響・自動処理

外部へ影響する処理は、AI単独不可または条件付き可として明確に分類してください。

| 項目 | AI単独可否 | 条件 / 禁止事項 |
|---|---|---|
| メール送信 | TODO | 実送信は原則けんさん確認 |
| SMS / 電話 / push通知 | TODO | 実送信は原則けんさん確認 |
| 決済 / 課金 / 契約 | 不可 | 必ずけんさん確認 |
| 外部API write | TODO | 対象、件数、rollback、外部影響を明記 |
| webhook送信 | TODO | 秘密値、顧客情報、個人情報を送らない |
| cron / scheduled job | TODO | 本番実行、頻度変更、停止は確認 |
| queue / background job | TODO | 永続データ変更や外部送信があれば確認 |
| batch / bulk operation | TODO | 件数上限、dry-run、rollback必須 |

## 5. CI / test / build

AIが使ってよい検証コマンドを記入してください。

| 種別 | コマンド | 備考 |
|---|---|---|
| install | TODO | lockfile変更に注意 |
| lint | TODO |  |
| typecheck | TODO |  |
| unit test | TODO |  |
| integration test | TODO | DB接続が必要なら要分類 |
| build | TODO |  |
| smoke | TODO | read-onlyかwriteか明記 |

## 6. deploy / production影響

| 項目 | 値 |
|---|---|
| main mergeでproduction deployが走るか | TODO |
| deploy provider | TODO |
| preview deployの有無 | TODO |
| production deployの確認方法 | TODO |
| deployをAI単独で実行してよいか | 原則不可 |
| docs-only merge時の扱い | TODO |

## 7. DB / 永続データ

| 環境 | AI write可否 | 条件 |
|---|---|---|
| local | TODO | 対象、件数、rollback、cleanup必須 |
| test | TODO | 対象、件数、rollback、cleanup必須 |
| staging | 原則不可 | 必要ならけんさん確認 |
| production | 不可 | 必ずけんさん確認 |
| shared / unknown | 不可 | 分類できるまでwrite禁止 |

DB接続が必要なpreflight、DB write smoke、fixture作成、cleanupは、対象DB分類と監査サブ確認を先に行ってください。

## 8. 秘密情報 / 読まないファイル

共通ルールに加えて、このプロジェクト固有の秘密ファイル、資格情報、個人情報を記入してください。

- `.env`, `.env.*`: 読まない、表示しない
- secret / credentials / key / cert: 読まない、表示しない
- DB dump / sqlite / local DB: 読まない、表示しない
- プロジェクト固有の秘密ファイル: TODO
- 個人情報 / 顧客情報の場所: TODO

値が必要な場合でも、AIは値そのものを出力せず、設定済み / 未設定の確認にとどめてください。

## 9. branch / PR / merge

| 項目 | 値 |
|---|---|
| branch prefix | `codex/` |
| PR初期状態 | Draft |
| Ready化 | 内部OK必須。heartbeatでは自動実行しない |
| merge | 原則けんさん確認。例外は、production deployなし、削除差分なし、危険ファイル変更なし、CI OK、監査サブOK、このProfileで明示許可された低リスク範囲に限定 |
| merge method | TODO |
| auto-merge可否 | 原則不可。許可する場合も上記merge条件を満たすPRのみ |
| PR本文必須項目 | changed files, deleted files, DB/schema/env/package/lockfile, 検証, 未実行検証, rollback |

## 10. heartbeat automation

| 項目 | 値 |
|---|---|
| 使用するか | TODO |
| 頻度 | TODO |
| 稼働時間帯 | TODO |
| 1回の目安 | 2〜6時間程度、または安全に切れる単位 |
| 自動実行してよい範囲 | read-only確認、docs、PR整理、低リスク実装、テスト、Draft PR作成 |
| 自動実行しない範囲 | PR Ready化、merge、close、DB write、migration/schema、deploy、worktree/branch削除、秘密情報処理、runtime/auth/DB/schema/env/config/API契約/package/lockfile/削除差分を含む危険変更の確定 |
| 終了時に残すもの | 完了事項、消化したREADY、次回継続READY、承認待ち、ブロッカー、短時間終了時の空振り証跡 |

推奨heartbeat指示文:

```text
このプロジェクトの残タスクを安全に継続してください。
まず状態確認を行い、残タスクを `DONE` / `READY` / `WAITING_APPROVAL` / `BLOCKED` に分類してください。
状態確認だけ、open PRなし、承認待ち1件だけを理由に終了しないでください。
`READY` があれば、承認不要の低リスク作業を可能な限り進めてください。
read-only確認、CI確認、PRコメント整理、docs更新、承認待ちリスト更新、サブエージェント監査、低リスク実装、テスト、Draft PR作成までは進めてよいです。
1つ終わったら、成果から次タスクを生成し、監査・PMO・テクニカルリードの指摘を反映して再分類し、新しい `READY` があれば続けてください。
ただし PR Ready化、merge、close、DB write、migration/schema変更、production/staging/shared DB操作、deploy、worktree削除、branch削除、秘密情報・個人情報・秘密値の読み取り、表示、要約、外部送信、runtime/auth/DB/schema/env/config/API契約/package/lockfile/削除差分を含む危険変更の確定は行わず、承認待ちとして整理してください。
10分未満で終わる場合、または `READY` がないとして終わる場合は、確認した範囲、`READY` がなかった理由、承認待ち/ブロック分類、他に探した `READY`、次に動ける条件を残してください。
最後に、完了事項、消化した `READY`、次回継続 `READY`、承認待ち、ブロッカー、短時間終了時の空振り証跡を短く残してください。
```

## 11. 通知

| 項目 | 値 |
|---|---|
| PC完了音 | TODO |
| スマホ通知 | TODO |
| 通知先 | 環境変数名、OS資格情報名、connector名、チャンネル名などの識別子のみ。URL / token / passwordはrepo保存禁止 |
| 通知する単位 | ユーザー向け完了、承認待ち到達、2〜6時間程度の自律作業セッション、外部ブロッカー |
| 通知しない単位 | 1サブタスク完了、1テスト成功、短い途中報告 |

## 12. PROGRESS / docs

| 種別 | 場所 |
|---|---|
| 進捗 | TODO |
| 承認待ちリスト | TODO |
| ブロッカー一覧 | TODO |
| runbook | TODO |
| DB証跡 | TODO |
| release notes | TODO |

## 13. 文字コード

| 項目 | 値 |
|---|---|
| 日本語Markdown | 原則UTF-8 BOM付き。例外は理由を残す |
| PowerShell表示確認 | `Get-Content -Encoding UTF8` |
| 厳密な破損確認 | `.NET` UTF-8読み込み |
| 避ける読み方 | `cmd type`、ANSI/Default読み、CP932/Shift_JIS扱い |
| 文字化け時の扱い | UTF-8としてエラーなくデコードでき、本文の日本語が正常表示されるか確認し、CP932/ANSI表示だけでファイル破損と判断しない |
| CP932版が必要な場合 | 元ファイルを上書きせず、別ファイルとして作成 |

## 14. read-only調査の根拠

AIが仮記入した項目は、監査できるように根拠を残してください。

| 項目 | 仮記入値 | 根拠ファイル / コマンド | 確信度 | 未確認理由 | 状態 |
|---|---|---|---|---|---|
| TODO | TODO | TODO | high / medium / low | TODO | AI推奨 / けんさん確認 / 保留 |

## 15. 未決定事項

AIは未決定事項を、以下の形で残してください。

| 項目 | AI推奨 | けんさん確認が必要な理由 | 選択肢 | 状態 |
|---|---|---|---|---|
| TODO | TODO | TODO | A / B / C | WAITING_APPROVAL |

### けんさん向け確認カード

未決定事項をけんさんへ出す場合は、以下の形にしてください。

```text
確認したいこと:
TODOをAIだけでどこまで進めてよいか決めたいです。

A. TODO
B. TODO
C. TODO

AI推奨:
B

理由:
TODO

選ばない場合の制限:
TODO
```

## 16. 初回導入チェックリスト

- [ ] `AGENTS.md` がある
- [ ] `AI_WORK_RULES.md` がある
- [ ] `AI_WORK_RULES_SHORT.md` がある
- [ ] この `AI_PROJECT_PROFILE.md` がある
- [ ] `.editorconfig` などで日本語MarkdownのUTF-8扱いが明示されている
- [ ] 共通ルールでユーザー確認必須の操作をProfileで緩和していない
- [ ] TODOが、解決済み / AI推奨 / けんさん確認 / 保留 / 安全側デフォルトありに分類されている
- [ ] AI仮記入項目に、根拠ファイル、確信度、未確認理由が残っている
- [ ] 秘密情報が含まれていない
- [ ] 削除差分がない
- [ ] DB/schema/env/package/lockfile変更がない、または理由が記録されている
- [ ] メール、SMS、決済、外部API、cron / queue / background jobの扱いが分類されている
- [ ] CI / test / build / deploy影響が記録されている
- [ ] 監査サブ、PMO、テクニカルリードが確認している
- [ ] けんさん確認が必要な項目が承認待ちリストにまとまっている
