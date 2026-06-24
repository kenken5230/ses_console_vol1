# AI運用ルール 横展開ガイド

この文書は、SES consoleで整備したAI運用ルールを、けんさんの他プロジェクトへ横展開するための手順です。

基本の開発方針、進め方、ユーザー確認最小化、安全ゲート、5役割体制、heartbeat自律進行は、プロジェクトが変わっても原則同じです。

プロジェクトごとの差分は、AIがread-onlyで調査して仮設定を作り、けんさんが非エンジニアでも判断できる形で最小限だけ決めます。

## 横展開で作るもの

各プロジェクトには、原則として以下を置いてください。

| ファイル | 目的 |
|---|---|
| `AGENTS.md` | Codex / AIエージェントが起動時に読む入口 |
| `AI_WORK_RULES.md` | 詳細なAI作業ルール |
| `AI_WORK_RULES_SHORT.md` | 毎回貼る用、短縮版ルール |
| `AI_PROJECT_PROFILE.md` | プロジェクト固有の設定、危険ゲート、検証コマンド、通知先 |
| `scripts/codex-notify.ps1` | PC完了音、必要に応じたスマホ通知ヘルパー |

テンプレートは以下を使ってください。

- `docs/templates/AGENTS.template.md`
- `docs/templates/AI_PROJECT_PROFILE.template.md`

`AI_WORK_RULES.md` と `AI_WORK_RULES_SHORT.md` は、原則このrepoの最新版をそのままコピーします。

## 共通ルールとプロジェクト設定の上下関係

`AI_PROJECT_PROFILE.md` は、プロジェクト固有の判断基準、追加制約、local / test限定runbook、内部承認で進めてよい低リスク範囲を定義するためのファイルです。

共通ルールでユーザー確認必須、または危険ゲートとされている操作を、`AI_PROJECT_PROFILE.md` で緩和してはいけません。

`AI_PROJECT_PROFILE.md` は共通ルールを弱めるものではなく、プロジェクトごとの追加条件を明確にするものです。

## 全プロジェクト共通で変えない方針

以下は、けんさんの開発ではプロジェクトが変わっても基本的に固定です。

- 安全性、復元可能性、秘密情報保護、ユーザー作業保護を最優先する
- ユーザーに細かい技術判断を投げすぎない
- AIチーム内で安全確認できる作業は、承認待ちで止まらず進める
- 親PM、監査サブ、監視サブ(PMO)、テクニカルリード、実行者の役割セットで進める
- AIチームは指示待ちの作業者集団ではなく、止めてよい地点以外では自分たちでタスクを発見、実行、監査、修正、再分類し続ける独立した開発組織として動く
- 実行者、監査、PMO、テクニカルリードは自発的に次タスク、差し戻し、残リスクを出す
- 小PR単位ではなく、順番単位 / テーマ単位で完了まで進める
- 状態確認、open PR確認、承認待ち確認は開始入力であり、それ自体を成果物や完了として扱わない
- タスク完了ごとに、次タスク生成、`READY` / `BLOCKED` / `WAITING_APPROVAL` / `DONE` 分類を行う
- `READY` が残る限り、ユーザーに「続けますか」と聞かず進める
- 承認待ちや危険ゲートは局所ブロックとして扱い、他テーマや別PRに `READY` がないか探して進める
- heartbeatは、全テーマ横断の安全な自律進行ループとして扱う
- dirtyな主workspaceは新規作業のbaseにしない
- 削除、DB write、本番影響、秘密情報、仕様変更、権限変更、deployなどは危険ゲートとして扱う
- Ready化、merge、closeは軽く扱わず、内部確認と既存ゲートを通す

## プロジェクトごとに決めること

プロジェクトごとの差分は、`AI_PROJECT_PROFILE.md` に集約してください。

AIは最初にrepoをread-onlyで調査し、分かる範囲を埋めます。

けんさんへ確認するのは、技術細部ではなく、以下のような事業判断、安全判断、運用判断だけにしてください。

- main merge が production deploy を起動するか
- docs-only / test-only / 明らかな低リスクPRを、Ready化 / merge / close補強ルールへ回してよい候補範囲
- DB writeを許す環境があるか。許す場合は local / test に限定するか
- staging / production / shared 環境をどこまで触ってよいか
- worktree / branch / 古いPRの整理をどこまでAIに任せるか
- 完了通知をPC音だけにするか、スマホ通知も使うか
- heartbeatの頻度、時間帯、1回あたりの目安時間
- プロジェクト固有の絶対に壊してはいけない画面、業務フロー、データ
- メール送信、SMS、決済、外部API、課金、cron / queue / background jobをAI単独で触ってよい範囲

## 横展開手順

1. 対象プロジェクトで、latest mainからclean worktreeまたはclean branchを作る。
2. `AGENTS.md` がなければ `docs/templates/AGENTS.template.md` をコピーして作る。
3. `AI_WORK_RULES.md` と `AI_WORK_RULES_SHORT.md` をこのrepoの最新版からコピーする。
4. `AI_PROJECT_PROFILE.md` がなければ `docs/templates/AI_PROJECT_PROFILE.template.md` から作る。
5. `scripts/codex-notify.ps1` が必要ならコピーする。
6. AIが対象repoをread-onlyで調査し、`AI_PROJECT_PROFILE.md` の分かる範囲を仮記入する。
7. 仮記入した値には、根拠ファイル、確信度、未確認理由を残す。
8. 分からない項目やTODOは `解決済み`、`AI推奨`、`けんさん確認`、`保留 / 安全側デフォルトあり` に分ける。
9. けんさんへ聞く項目は、非エンジニアにも分かる確認カードにする。
10. 日本語Markdownは `Get-Content -Encoding UTF8` で表示確認し、厳密な破損確認は `.NET` のUTF-8読み込みで行う。CP932/ANSI表示で化けた結果を正としない。
11. 文字化け、BOM、削除差分、秘密情報混入を確認する。
12. ルール導入PRを作り、docs-onlyとして内部監査を通す。
13. main mergeがproduction deployを起動するrepoでは、docs-onlyでもdeploy影響を確認してからmergeする。

## AIがけんさんに聞くときの形

悪い聞き方:

```text
このrepoのmiddlewareとauth callbackがruntime gateに抵触します。mergeしてよいですか？
```

良い聞き方:

```text
このプロジェクトはログインまわりを触ると全ユーザーに影響する可能性があります。
AIだけで進める範囲を次から選んでください。

A. ログインまわりは調査とDraft PRまで。Ready/mergeは毎回けんさん確認。
B. 低リスクなテスト追加だけAI内部承認でmerge可。挙動変更は確認。
C. 既存バグの明確な修正はAI内部承認でmerge可。ただし権限や公開範囲変更は確認。

推奨: B
```

## 導入完了条件

横展開が完了したと言えるのは、以下を満たした時です。

- `AGENTS.md` がAI起動時の入口になっている
- `AI_WORK_RULES.md` / `AI_WORK_RULES_SHORT.md` がrepo内で管理されている
- `AI_PROJECT_PROFILE.md` にプロジェクト固有の危険ゲート、検証コマンド、通知、deploy影響がまとまっている
- `AI_PROJECT_PROFILE.md` のTODOが、解決済み、AI推奨、けんさん確認、保留 / 安全側デフォルトありに分類されている
- AIが仮記入した項目に、根拠ファイル、確信度、未確認理由が残っている
- 日本語MarkdownがUTF-8としてエラーなくデコードでき、本文の日本語が正常表示される
- CP932/ANSI表示の文字化けをファイル破損として扱っていない
- CP932/Shift_JIS版が必要な場合は、元UTF-8ファイルを上書きせず、別ファイルとして作成する方針になっている
- 削除差分なし、秘密情報混入なし、UTF-8としての文字化けなし
- 監査サブ、PMO、テクニカルリードが導入内容を確認している
- けんさんが判断すべき未決定事項が、承認待ちリストとして分かりやすく残っている

## 横展開後の運用

横展開後は、通常の作業と同じく以下で進めます。

- 依頼は順番単位 / テーマ単位で受ける
- 親PMがタスクを切り、サブエージェントに分配する
- 監査、PMO、テクニカルリードが自発的に差し戻しと次タスクを出す
- 状態確認だけで終わらず、`READY` 探索、投入、成果確認、次タスク生成、再分類まで行う
- 承認待ちがあっても、他に安全な `READY` があれば進める
- heartbeatごとに全テーマを見て、安全作業を進め、危険ゲートはそのタスクだけ承認待ちへ積み、別の `READY` を探し、次回へ引き継ぐ
