# Gmail分類・データ取得品質 調査記録 v0.1

作成日: 2026-06-10(同日追記: 第10章〜第11章 取得開始日・リアルタイム性・読み込み性能)
調査者: Claude (read-only調査。コード・DBへの変更は一切行っていない)
対象DB: ローカル `ses_console_dev`(localhost)

## 1. 調査目的

ユーザー依頼に基づく2点の調査。

1. 案件・要員・その他の選別を「役割に沿ってさらに分別」できるようにならないか。
   - 案件に要員が混入する/その逆が発生している。
   - 「その他」は基本的に空欄になるよう、案件と要員へ選別したい。
2. データベースの取得不備の可能性。
   - メール本文が入っていない、項目が埋まっていない可能性の検証。

## 2. 調査方法(すべて読み取り専用)

- コード読解: 同期 [scripts/gmail-sync-mail-notifications.ts](../../scripts/gmail-sync-mail-notifications.ts)、分類 [scripts/gmail-classification-rules.ts](../../scripts/gmail-classification-rules.ts)、抽出 [scripts/gmail-extraction.ts](../../scripts/gmail-extraction.ts) / [lib/gmail-extract-entities.ts](../../lib/gmail-extract-entities.ts)、本文処理 [lib/gmail-message-body.ts](../../lib/gmail-message-body.ts)、管理ジョブ [lib/gmail-admin-jobs.ts](../../lib/gmail-admin-jobs.ts)、手動再分類API [app/api/mail-notifications/[id]/extract/route.ts](../../app/api/mail-notifications/[id]/extract/route.ts)
- DB集計: `pg` 経由の SELECT のみ(category分布、本文NULL率、項目充足率、取り違え件数)
- 既存read-only監査: `npm run gmail:extract:quality-audit -- --limit=2000 --type=all`(内部上限500で直近500通をスキャン)

## 3. パイプライン全体像

```
Gmail API → sync(mail_notifications保存) → classify(category付与) → extract(projects/persons生成)
```

- sync: `format=full` で取得し text/plain・text/html を収集。`buildMailBodyContent` が plain 不在時に html→text 変換で `bodyText` を補完(※後述の通りこの補完は2026-05-26追加)。既存メールは `--refresh-existing` 指定がない限り**スキップされ更新されない**。
- classify: `classifyMailByRules` が subject + `bodyText` + `normalizedBody` を対象にキーワード判定。**`bodyHtml` は一切参照しない**。
- extract: `extractFromMail` は **`category` の値だけで案件/要員のルーティングを決定**(`PROJECT_INTRO`→案件、それ以外→要員)。本文は `buildExtractionBodyText` で bodyText→bodyHtml→normalizedBody→snippet→subject の順にフォールバック。
- 管理ジョブ(`runGmailAdminJob`)の classify/extract は1回あたり最大500件(既定50件)しか処理しない。全件処理はスクリプト実行が前提。

## 4. 発見事項A: 本文未取得が大量に存在(②の回答・最重要)

### 4.1 実態

| 指標 | 件数 |
|---|---:|
| mail_notifications 総数 | 25,698 |
| `body_text` NULL | **8,958 (34.9%)** |
| `normalized_body` NULL | 8,958(同一行) |
| `body_text`・`body_html` 両方NULL | 0 |
| 文字化け(U+FFFD)を含む本文 | 0 |
| subject NULL / from_email NULL | 0 / 0 |

本文NULLの8,958件は**全件 `body_html` を保持**(平均約6,200文字)し、snippetも全件存在する。つまり「Gmailから取れていない」のではなく、**HTMLメールをテキスト化してbodyTextに落とす処理が無い時期に取り込まれた**ことが原因。

### 4.2 原因の特定

- html→text フォールバック([lib/gmail-message-body.ts](../../lib/gmail-message-body.ts) の `pickBestBodyText`)はコミット `f008f1e`(2026-05-26)で追加された。
- メールは全件2026-05中に取込済み。projects/persons の生成日は**2026-05-08〜05-11**で、フォールバック追加より前。
- sync は既存メールをスキップするため、修正後も過去分の `body_text` は NULL のまま残っている。

### 4.3 影響1: 分類が「件名のみ」で行われた

classify は `bodyHtml` を読まないため、本文NULLメールは実質件名だけで分類された。

| category | 総数 | うち本文NULL(件名のみ分類) |
|---|---:|---:|
| project_intro | 15,146 | 4,928 (32.5%) |
| person_intro | 10,062 | 3,860 (38.4%) |

### 4.4 影響2: 項目が埋まらない(「項目が埋まってない」の主因)

エンティティ生成時の抽出も件名のみで実行されたため、本文NULL由来のエンティティはほぼ全項目が空。

**persons(計4,112件、うち本文NULLメール由来1,830件=44.5%)**

| 項目NULL率 | 本文ありメール由来 (2,280) | 本文NULLメール由来 (1,830) |
|---|---:|---:|
| 希望単価 | 2.3% | **98.6%** |
| 稼働開始 | 1.9% | **94.7%** |
| 経歴サマリ | 82.1% | **100%** |
| 年齢 | 6.7% | **99.9%** |

**projects(計5,067件、うち本文NULLメール由来1,492件=29.5%)**

| 項目NULL率 | 本文あり由来 (3,574) | 本文NULL由来 (1,492) |
|---|---:|---:|
| 単価上限 | 14.9% | **85.1%** |
| 開始月 | 5.8% | **55.2%** |
| 勤務地 | 8.3% | **92.7%** |

→ **「項目が埋まっていない」のは抽出ロジックの弱さ以前に、入力となる本文がDB上で欠けていることが支配的要因。**

なお本文ありでも経歴サマリ82%NULLなど、`ラベル:値`形式(`valueAfterLabel`/`blockAfterLabel`)しか拾えない抽出器の限界も存在する(■見出し型、【】区切り型は非対応)。

### 4.5 復旧の選択肢(コード修正はcodex担当)

1. **DB内バックフィル**: 既存 `body_html` から `htmlToText` で `body_text`/`normalized_body` を再生成する一括スクリプト(Gmail再アクセス不要・最速)。
2. **再同期**: `npm run gmail:sync -- --refresh-existing`(Gmail APIを叩き直すためクォータと時間を消費)。
3. バックフィル後に **全件再分類**(`npm run gmail:classify`は対象全件を処理する)→ **未リンク再抽出**(`npm run gmail:extract:unlinked -- --apply`)、既存の空エンティティは抽出結果での更新方針が別途必要(現状の extract は既存エンティティを skip するだけで**フィールドを埋め直さない**)。

リスク留意: `decodeBase64Url` は UTF-8 固定デコード。現データに文字化けは検出されなかったが、ISO-2022-JP等のレガシーcharsetメールが来た場合に化けるリスクは残る(charsetヘッダ参照は未実装)。

## 5. 発見事項B: 案件⇄要員の取り違えの構造(①の回答)

### 5.1 実データでの取り違え・混入

| 観測 | 件数 |
|---|---:|
| projects のうち source mail が `person_intro` のもの | 21 |
| projects のうち source mail が `seminar` のもの | 1 |
| persons のうち source mail が `project_intro` のもの | 0 |
| 1通のメールに PROJECT と PERSON 両方の extracted リンク | 22 |
| 直近500通のquality-audit: PERSON_SUBJECT_LOOKS_LIKE_PROJECT 警告 | 79 |
| 同: PROJECT_SUBJECT_LOOKS_LIKE_PERSON 警告 | 52 |
| 同: CLASSIFICATION_SIGNAL_CONFLICT(両シグナル拮抗) | 118 |

**追記(2026-06-10 続報)**: 上記21+1件の取り違えprojectsは**全件 `archived` 済み**であることを確認した(projects の archived はちょうど22件で一致。`gmail:extract:mismatches` のアクティブ取り違えは0件)。つまり過去に `gmail:extract:archive-mismatches` 相当の補修が一度実行されており、**「両リンクメール22通」= アーカイブ済みproject + 現役person のペア**で、現役データ上の取り違えは現時点では解消済み。ただしこれは「カテゴリが後から訂正されたケース」だけが補修された状態であり、**カテゴリ自体が誤ったまま(第5.2章の構造問題)のものは検出対象外**である点に注意。本文バックフィル→再分類(P1〜P2)を実行するとカテゴリ反転が新たに発生するため、その後に mismatch report → archive の補修サイクル(P6)を再実行する運用が必須。

さらに本文NULLメールのHTML本文をSQLで直接照合すると:

- 本文NULLの `person_intro` 3,860件中 **170件** に案件系の強い定型句(「案件のご紹介」「要員募集」等)が存在
- 本文NULLの `project_intro` 4,928件中 **988件** に要員系の強い定型句(「要員のご紹介」「弊社フリーランス」「個人事業主」等)が存在

→ 本文バックフィル+再分類で相当数のカテゴリが入れ替わる見込み(=現状の取り違えの多くは「件名のみ分類」の副作用)。

### 5.2 ルール分類器の構造的弱点([scripts/gmail-classification-rules.ts](../../scripts/gmail-classification-rules.ts))

1. **strongルールは「1キーワード一致で即確定」**(`matchStrongRule` は最初に当たったルールを返す)。配列順は project→person→project→project 固定で、スコア比較をしない。
2. **汎用語がstrongルールに混在**: person側の「スキルシート」「経歴書」「個人事業主」「プロパー」「対応可」「対応可能」「経験豊富」「お任せ」は、案件紹介メールの応募条件・商流欄(例:「個人事業主可」「スキルシート添付の上ご応募ください」)に頻出し、案件メールを0.93でperson_intro確定させる。逆にproject側の「案件」「万円」「単価」「常駐」は要員紹介メール(希望単価60万円〜等)にも頻出。
3. **件名→全文の2段階だが、全文判定でも同じ「1語即決」**のため、引用文・署名・定型フッターの語でも確定してしまう。
4. 手動分類API(extract route)はカテゴリを`MANUAL`で固定するが、entityは**カテゴリ変更後も残置**されるため、後からclassifyを再実行してカテゴリが反転すると「person_introメール由来のproject」のような不整合が残る(上記21+1件の主因と推定)。補修用に `gmail:extract:mismatches` / `gmail:extract:archive-mismatches` が既に存在する。

### 5.3 「役割に沿った再分別」の土台は既にあるが未接続

[scripts/gmail-extraction.ts](../../scripts/gmail-extraction.ts) の `classifyMailExtractionQuality` は subject/body 両面で projectScore・personScore・excludedScore を算出し `predictedType (project/person/other/excluded)` を返す。**しかし現状は警告・needsReview付けにのみ使われ、ルーティング(`extractFromMail`)は `category` を盲信している。**

- ルーティングへの採用は①の要望(役割に沿った再分別)への最短経路。
- ただし現状のままでは使えない欠陥がある: `excludedSignalWords` に「配信停止」「unsubscribe」が含まれ、**SES一斉配信メールの標準フッターに反応**する。quality-audit(直近500通)では predictedType が excluded=163 / other=65 / project=159 / person=113 となり、正常メールの3割超をexcluded判定した。本文末尾のフッター除去か、excluded判定の件名限定化が前提条件。
- なお既存 extraction_results(25,228件)は旧版 `gmail-regex-v0.1` 初期に生成され、`classificationScoreSummary` が**全件未記録**(predictedType NULL)。現行コードの品質情報はDBにまだ反映されていない。

## 6. 発見事項C: 「その他」を空にできるか(①の回答続き)

現状の OTHER カテゴリ 288件の内訳:

| 区分 | 件数 | 内容 |
|---|---:|---|
| OTHER + excluded | 204 | 全件「返信メール」由来(reply判定→OTHER+除外)。ダッシュボードの未分類一覧には出ない |
| OTHER + 非excluded | 84 | ダッシュボード「その他/未分類」に表示される対象 |
| NEEDS_REVIEW | 2 | 微量 |

84件のうち **77件(92%)は本文NULL**であり、その77件の `body_html` を照合すると **77件全件に案件系キーワード、76件に要員系キーワードが存在**。つまり「その他」がほぼ空にならない直接原因も本文未取得であり、**本文バックフィル→再分類で「その他(非除外)」はほぼ解消可能**と見込まれる。残る数件は手動分類API(案件/要員ボタン)で個別処理できる。

## 7. 修正候補の整理(codex向け・優先順)

| 優先 | 施策 | 期待効果 | 関連箇所 |
|---|---|---|---|
| P1 | `body_html`→`body_text`/`normalized_body` のDB内バックフィル(または `--refresh-existing` 再同期) | 本文NULL 8,958件解消。分類・抽出の入力が揃う | sync / 新規スクリプト |
| P2 | バックフィル後の全件再分類+「その他(非除外)」再判定 | OTHER 84件→ほぼ0件。subject-only分類34.9%解消 | `gmail:classify` |
| P3 | 既存エンティティの**項目埋め直し**(extractは現状skipするだけ)。needsReview付きエンティティ限定の再抽出更新モード | persons約1,800件・projects約1,500件の空項目を充足 | `lib/gmail-extract-entities.ts` |
| P4 | `predictedType` をルーティングに接続(category と predictedType が食い違う場合は needs_review に落とす等)。前提として `excludedSignalWords` のフッター誤爆修正 | 案件⇄要員の取り違えを構造的に防止 | `extractFromMail` / `classifyMailExtractionQuality` |
| P5 | strongルールの見直し: 1語即決をやめ件名優先+両スコア比較。「対応可」「個人事業主」「スキルシート」等の汎用語をstrongから降格 | 誤確定(0.93固定)の削減 | `gmail-classification-rules.ts` |
| P6 | カテゴリ反転時の既存エンティティ整合運用: `gmail:extract:mismatches` → `archive-mismatches` の定期実行 | 過去分22件は補修済みを確認(アクティブ0件)。P2の再分類後に再発するため、再分類→補修をセット運用にする | 既存スクリプト |
| P7 | charset対応(ISO-2022-JP等)のデコード(将来リスク対応。現データ被害0件) | 文字化け予防 | `decodeBase64Url` |

## 8. 補足メモ

- 管理ジョブ(pipeline)の classify/extract は1回最大500件のため、全件処理はCLIスクリプト実行が前提。
- 「NORMAL_CONTACT」カテゴリは定義のみで未使用(0件)。
- 重複統合は sender+subject 一致(`senderSubjectFilters`)で機能しており、25,228 extraction_results が projects 5,067 / persons 4,112 に集約されている。
- 既存の関連ドキュメント: [gmail-classification-analysis-v0.1.md](gmail-classification-analysis-v0.1.md)(2026-05-11時点の分類精査)、[docs/themes/gmail-remediation/](../themes/gmail-remediation/README.md)(person名補修・抽出品質のResearch-to-PR方針)。本調査はその後段(本文バックフィルと再分別)を扱う。

## 9. 実行した主な検証コマンド(すべて読み取り専用)

```
node scripts/check-db-target.cjs
npm run gmail:extract:quality-audit -- --limit=2000 --type=all   # 内部上限500
# pg経由のSELECT: category分布 / body_text NULL率 / html keyword照合 /
# persons・projects項目充足率(本文有無別) / mismatch件数 / entity link集計
```

---

## 10. 追加調査(2026-06-10): 取得開始日・リアルタイム性・読み込み性能

### 10.1 「Gmailを2026/1/1から取得する」設定になっているか → **なっていない**

- 取得開始日のコード上のデフォルトは **`2026-03-01`**([scripts/gmail-common.ts:76](../../scripts/gmail-common.ts) `syncFrom: process.env.GMAIL_SYNC_FROM ?? "2026-03-01"`)。
- ローカルの `.env` / `.env.local` には `GMAIL_SYNC_FROM` / `GMAIL_SYNC_TO` / `GMAIL_QUERY` の指定が**存在せず**、デフォルトがそのまま適用される。実際のGmailクエリは `to:ses@skv.co.jp after:2026/2/28`(after は指定日の前日に変換される仕様)。
- 実データも一致: mail_notifications の最古メールは **2026-03-01(JST)**、最新は **2026-05-12**。**2026年1月・2月分はDBに1通も存在しない。**
- 対応はコード修正不要で、`GMAIL_SYNC_FROM=2026-01-01` を環境変数に設定して過去分を追加同期すればよい(後述の maxResults 上限に注意。1〜2月分は件数が多いため `--limit` を外すかページングを完走させる必要がある)。
- 注意: 本調査で確認できたのは**ローカル環境のみ**。Vercel等デプロイ環境の `GMAIL_SYNC_FROM` はリポジトリから確認できないため、本番側の値は別途確認が必要。

### 10.2 「メールは不変。新着だけ取り込み、過去分は更新しない」という設計思想になっているか → **半分だけ**

| 観点 | 現状 | 評価 |
|---|---|---|
| sync: 取り込み済みメールの再取得 | 既存メールはスキップ(`--refresh-existing` 指定時のみ更新) | ○ 思想どおり |
| UI: 同期後の一覧自動更新 | 自動更新せず「表示更新は手動で実行してください」と通知のみ | ○ 思想どおり(release docs L506の方針とも一致) |
| sync: 新着の検出方法 | **毎回固定起点(`after:2026/2/28`)で全期間を検索**し、新しい順に maxResults 件(既定50)だけ処理。「前回どこまで取り込んだか」のwatermarkが無い | × 増分思考になっていない |
| sync: Gmail増分API | `historyId` を保存しているが**未使用**。`history.list` / Pub/Sub push(users.watch)とも未実装 | × |
| classify(CLI) | **毎回、手動分類以外の全25,698件をUPDATE** | × 「過去は更新不要」の真逆 |
| classify/extract(cron・管理画面) | 毎回「受信日時の新しい順に最大50件」を再処理。処理済みをなめ直す一方、50件より古い未処理分には永遠に届かない | × |
| 定期実行の稼働状況 | Cloudflare Worker Cron は**設計のみで未作成・未検証**(docs/release/network-migration-test-report-v0.1.md)。mail_sync_runs の実行履歴は**2026-05-11〜12のテスト7回のみ**で、データ鮮度は約1ヶ月前で停止 | × リアルタイム以前に定期同期が動いていない |

結論: 「取り込み済みメールを更新しない」思想は sync に部分的に実装済みだが、**「ナウタイム以降の増分だけを見る」思想は未実装**。毎回の同期が過去全期間の検索から始まり、分類・抽出も「新しい順N件」の再処理でしかない。

### 10.3 あるべき設計思想(明文化・codexへの依頼)

> **メールはイミュータブル(不変)である。**
> 一度取り込んだメールは本文も件名も変わらないため、定常運用で再取得・再分類・再抽出してはならない。
> 定常運用がやることは「**前回取り込んだ時点(ナウタイムwatermark)以降の新着を、できるだけ短い間隔で増分取得し、その新着分だけを分類・抽出する**」ことのみ。
> 過去分への再処理(本文バックフィル、ルール更新後の再分類など)は、定常パイプラインとは**別の明示的なバックフィルジョブ**としてのみ実行する。

具体化の段階(コスト順):

1. **watermark方式**: mail_notifications の `max(receivedAt)` を起点に `after:`(日粒度のため前日指定+既存スキップで重複排除)を毎回組み立てる。固定 `GMAIL_SYNC_FROM` は初回フルバックフィル専用にする。
2. **history.list方式**: 保存済み `historyId` から `users.history.list` で差分のみ取得(APIコール激減。ただし historyId は約1週間で失効するため、失効時は1.へフォールバック)。
3. **push方式(真のリアルタイム)**: `users.watch` + Pub/Sub で新着通知を受けて即時取り込み。インフラ追加が必要なため最終段階。
4. classify / extract は「新着のみ」をデフォルトにする: classify は `classifiedBy = SYSTEM(未分類)` または `classificationVersion <> 現行版` のみ、extract は既存の未リンク条件(`gmail-extract-unlinked` の categoryWhere 相当)をデフォルトパイプラインに組み込む。「最新50件」方式は廃止。

### 10.4 読み込みが重い構造(リアルタイム化の前提障害)

「リアルタイムにしたいが読み込みに時間をかけたくない」という目的に対し、現状の最大のボトルネックは同期ではなく**ダッシュボードの全量ロード**。

- [app/api/dashboard-data/route.ts](../../app/api/dashboard-data/route.ts) は1リクエストで **非アーカイブの全projects(5,045件)+全persons(4,111件)+未分類メール(86件)** を、各エンティティの元メール(`bodyText`+`bodyHtml`+`normalizedBody` の3本文)・全extraction_results(normalizedResult JSON)・会社・スキル・タグ込みで返す。**ページング・フィルタのサーバーサイド処理は一切ない**。
- 実測(ローカルDB): このクエリ群がDBから読み出すテキスト量は **約62MB/リクエスト**(project側 27.3MB + person側 23.8MB + 抽出JSON 10.0MB + 未分類0.7MB)。さらに数千通分の html→text 変換をリクエストごとにサーバーで再実行している。
- フロント([app/page.jsx](../../app/page.jsx))はログイン時・手動更新時・**案件/要員の保存のたび**にこの全量を再取得する。データ量に比例して毎操作が遅くなる構造であり、「新着だけ増分取得」とは逆の思考がUI側にも存在する。

### 10.5 改善候補(リアルタイム×軽量読み込みの観点で第7章に追加)

| 優先 | 施策 | 期待効果 | 関連箇所 |
|---|---|---|---|
| P8 | `GMAIL_SYNC_FROM=2026-01-01` の設定(本番env含む)+1〜2月分の初回バックフィル同期 | ユーザー要望の取得範囲を充足 | env / 運用 |
| P9 | watermark方式の増分sync(`max(receivedAt)`起点。将来は historyId / history.list) | 毎回の全期間検索を排除。同期が秒〜数十秒で完了し高頻度実行が可能に | `buildSyncOptions` / sync |
| P10 | classify / extract の「未処理のみ」デフォルト化(全件UPDATE・最新50件方式の廃止) | 定常負荷の激減。「過去は更新しない」思想の徹底 | `gmail-admin-jobs.ts` / classify・extractスクリプト |
| P11 | 15分おきcronの本稼働(Cloudflare Worker作成。release docsの既定計画) | 手動ボタン頼みの解消=実質リアルタイム化の第一歩 | インフラ |
| P12 | dashboard-data の分割: 一覧はサマリ列のみ+サーバーサイドページング、メール本文・抽出JSONは**選択時に個別API取得**。本文の html→text はingest時に確定(P1と同根)させレスポンスから排除 | 初期表示数十KB〜数百KBに削減。操作のたびの62MB読み出しを解消 | dashboard-data / page.jsx |
| P13 | 新着>50件時の取りこぼし対策(watermark導入までの暫定: cron間隔とmaxResultsの整合、ページング完走) | メール欠落の防止(現状 約350通/日 に対し50件/回) | sync |

### 10.6 補足

- 「同期後に一覧を勝手に更新せず通知のみ」というUI方針は docs/release/public-release-readiness-v0.1.md(17.3 タスク6「15分おき同期」)に既定として明記済みであり、本追記の方針と矛盾しない。
- sync の既存判定はメッセージIDごとに1クエリ(`findUnique`)発行している。増分化(P9)後は1回あたりの件数が小さくなるため許容範囲だが、バックフィル時は `externalMessageId IN (...)` の一括照合が望ましい。

## 11. 追加検証コマンド(2026-06-10追記分・すべて読み取り専用)

```
# 取得範囲設定の確認
grep GMAIL_SYNC_FROM .env .env.local   # → 未設定(コードデフォルト2026-03-01が適用)
# pg経由のSELECT: message_date/received_atの最小最大 / 月別件数 /
# mail_sync_runs実行履歴 / dashboard-data相当JOINのテキスト総量(MB)
npm run gmail:extract:mismatches       # → アクティブ取り違え 0件(22件は全件archived済み)
```

## 12. 本調査の適用範囲とstaging/本番側の残タスク

- 本調査の数値は**すべてローカル開発DB(`ses_console_dev` @ localhost)**に基づく。
- ローカルの `.env` にはローカルDBの `DATABASE_URL` のみ、`.env.local` には `VERCEL_OIDC_TOKEN` のみが存在し、**staging/本番(Neon)への接続情報はこの環境に無い**。よってstaging/本番DBの本文NULL率・分類分布・取り違え状況は未検証。
- codex / オーナー側の残タスク:
  1. Vercel環境変数の `GMAIL_SYNC_FROM`(および `GMAIL_QUERY` / `GMAIL_SYNC_MAX_RESULTS`)の実値確認。2026/1/1要件にするなら `GMAIL_SYNC_FROM=2026-01-01` へ変更。
  2. staging/本番DBに対して本書第9章・第11章と同じread-onlyクエリを実行し、ローカルと同様の本文NULL・項目未充足が存在するか確認(本番が同じ取込時期のデータなら同じ問題を持つ可能性が高い)。
  3. 確認結果に応じて、P1(本文バックフィル)〜P2(再分類)をstaging→本番の順に適用。
