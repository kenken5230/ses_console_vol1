# SES営業管理コンソール向け マッチ候補保存レビュー画面 要件定義前ディープリサーチ

## 結論サマリ

Codex側のローカル調査報告は、**dry-run と保存済み候補を分離すること、候補を `Project` / `Person` の複製ではなく「導出されたレビュー対象」として扱うこと、`review event` を append-only で持つこと、PII を最小化すること、Proposal やメール送信を人間レビュー後の別フローに追い出すこと**という意味で、要件定義の骨格としてかなり良い方向です。要件定義書ではこの骨格を維持しつつ、外部のベストプラクティスに照らして **データ最小化、監査ログ、競合制御、stale 判定、reason taxonomy、停止条件** を明文化すると、仕様抜けが大きく減ります。 fileciteturn0file0 citeturn6view3turn33view0turn27view0turn35view0

外部調査から見た最大の補強点は四つあります。第一に、**保存するのは「説明可能な要約」と「レビュー痕跡」であり、原文やPIIではない**という原則です。NIST は PII の最小必要原則を強調しており、PII は氏名などの直接識別子だけでなく、他情報と結び付けて個人を識別できる情報や employment information まで含み得ると整理しています。OWASP もログや監査には PII、メールアドレス、ファイルパス、秘密情報を直接残さず、必要ならマスク・ハッシュ・疑似匿名化すべきだとしています。 citeturn6view3turn32view2turn32view0turn33view0

第二に、**レビュー画面は単なる一覧画面ではなく、監査可能な意思決定面である**という点です。OWASP はイベント記録に「when, where, who, what」を求め、GitHub の enterprise audit log も、ユーザー／システム活動の閲覧、検索、エクスポート、ストリーミング、API 取得を前提に設計しています。したがって、この機能でも `status` の現在値だけでは足りず、**誰が、いつ、どの根拠で、何を承認・却下・再オープン・アーカイブしたか**をイベントとして別建てで残すべきです。 citeturn6view1turn33view0turn19view0

第三に、**「重複防止」「リトライ安全性」「同時更新防止」は別問題として分離すべき**です。HTTP では `GET` は safe、`PUT` / `DELETE` は idempotent と定義され、`POST` / `PATCH` は原則 idempotent ではありません。Stripe はこの弱点を補うために idempotency key を使い、同一キーの再送に同一結果を返し、パラメータ不一致ならエラーにする設計を公開しています。さらに RFC 9110 は `If-Match` を state-changing method の lost update 防止に使うべき条件付きリクエストとして定義しています。要件定義では **業務上の一意性キー、API リトライ用 idempotency key、楽観ロック用 version / ETag** を明確に切り分ける必要があります。 citeturn25view0turn26view0turn5view0turn27view0turn34view1

第四に、**将来 AI 提案や再ランキングに進む場合に備え、今の MVP から human review 境界と override telemetry を設計しておくべき**です。NIST AI RMF は、人間の役割と責任を明確に定義しないと AI を含む人間・システム協働は不安定になり、透明性不足が bias を増幅しうると指摘しています。また、**人間がどの頻度で、どんな理由でシステム出力を覆したか**は収集・分析価値があるとしています。人材マッチング研究でも、過去の accepted / rejected 履歴は person-job fit 改善に有用ですが、その履歴自体が人間や組織の偏りを含みうるため、自由記述より **構造化された reason code と review telemetry** で残すほうが要件定義として安全です。 citeturn23view1turn35view0turn18academia1turn18academia3turn36academia3

## 調査結果

今回の外部調査では、ATS/CRM の個別製品の「そのまま真似るべき画面」よりも、**採用マッチング研究、監査ログ標準、PII 保護、HTTP/API 標準、provenance 標準**から移植可能な設計原則を抽出する方が、要件定義に使いやすいと判断しました。理由は、公開ベンダー資料の UI 詳細は製品差が大きい一方で、**最小化・説明可能性・監査・安全な mutation・履歴の由来管理**は製品横断で再利用しやすいからです。W3C PROV も provenance を「あるデータを生み出した entities, activities, people に関する情報」と定義しており、今回の `source tracking` と `saved match suggestion` の分離方針と相性が良いです。 fileciteturn0file0 citeturn31view0turn33view0turn27view0turn6view3

Codex報告の中で、そのまま要件定義に引き継いでよい点は明確です。**dry-run は read-only のまま残すこと、保存済み候補は別 API / 別ビューにすること、`match_suggestions` と `review_events` を分けること、`Project` / `Person` の raw text を suggestion テーブルに複製しないこと、Proposal / Distribution / メール送信を MVP 外に置くこと**は、外部調査とも整合します。特に人材領域では free text の skill sheet や job post には hidden semantics や domain coverage の不足が残りやすく、自動化だけで完結させるより、人間レビューに必要な要約情報を出す方が堅実です。 fileciteturn0file0 citeturn30academia3turn23view4turn23view1

一方で、Codex報告に追加すべき観点は少なくありません。最重要なのは、**saved suggestion が「保存時点の score snapshot」であり、source-of-truth の現在状態ではない**ことを明示する設計です。NIST AI RMF は、データセットが元の文脈から切り離されたり stale になったりしうると指摘しており、これは AI だけではなく、ルールベースの deterministic matching にもそのまま当てはまります。したがって suggestion には `scoringVersion` だけでなく、**`projectVersion` / `personVersion` / `sourceSnapshotHash` / `evaluatedAt` / `stalenessState`** を持たせ、上流更新が入ったら「保存された評価は古い」と分かるようにすべきです。 citeturn35view0turn6view3turn31view0

また、**reason code を三種類に分離する**ことも要件定義に加えるべきです。すなわち、`system reason`（例: 必須スキル一致、単価互換）、`system warning`（例: 欠損、location 要確認）、`human decision reason`（例: WRONG_ROLE, CLIENT_FREEZE, DUPLICATE）です。これを分けないと、将来「なぜ却下されたのか」「ルールの誤差なのか、営業判断なのか」「後続モデル学習に使ってよいラベルなのか」が判別できません。NIST は人間の設計・運用判断が bias を持ち込みうること、また AI 出力に対する人間の overrule の頻度と理由を収集・分析する価値を指摘しています。人材マッチング研究も、過去の accepted / rejected 履歴が有用な signal である一方、その解釈には文脈が必要だと示しています。 citeturn35view0turn18academia1turn18academia3

一般的な SaaS/CRM/ATS 設計の観点から見ると、候補レビュー画面で重要なのは **「一覧の速さ」より「説明と操作の可逆性」** です。NIST AI RMF は explainable / interpretable であることが、運用者や監督者が出力を文脈化する助けになるとし、Explainable hiring pipeline の研究も extracted entities と matching rationales を見せることの実務価値を示しています。したがって画面は、**score 合計だけでなく breakdown、warning、根拠、比較観点、stale / duplicate / blocker badge、履歴タイムライン**が中心であるべきです。営業の「一瞬で判断したい」という要望に引きずられて explanation を削ると、後で監査可能性とレビュー品質が落ちます。 citeturn23view4turn18academia0turn30academia3

要件定義書の章立てには、Codex報告の案に加えて、**データ鮮度、競合制御、reason taxonomy、retention、oversight metrics** を章として独立させることを勧めます。具体的には、背景と目的、業務フロー、権限、状態遷移、一覧と詳細 UI、review queue、API、データモデル、source tracking 境界、PII / redaction、監査ログ、重複・冪等性・同時更新、停止条件、指標、段階的リリース、未決事項、の順が扱いやすいです。これは Codex 報告の章立てを、OWASP の監査・保護・保持、RFC の conditional request / idempotency、NIST の human oversight / trustworthiness 観点で補強した形です。 fileciteturn0file0 citeturn33view0turn27view0turn35view0

## 推奨MVPスコープ

MVP の目的は、**deterministic matching の結果を「提案候補」ではなく「レビュー対象」として保存し、人間が明示的に承認・却下・アーカイブできるようにすること**です。ルールベースの score は候補生成には向いていますが、候補をそのまま downstream action に進めるのは避けるべきです。NIST AI RMF が述べる human oversight は AI 専用の論点ではなく、高ステークスなマッチング判断全般で有効であり、Codex報告の「Proposal 作成・メール送信は別フロー」という非ゴール設定は維持すべきです。 fileciteturn0file0 citeturn23view1turn35view0

MVP に入れるべきものは、**dry-run 候補の閲覧、選択保存、saved suggestions 一覧、suggestion 詳細、review queue、approve / reject / archive / reopen、監査イベント、dedupe、stale 判定、PII-safe preview** です。一方で、**Proposal 自動生成、メールドラフト、自動送信、AI による自動承認、自由記述ノート中心の運用、外部 source の raw payload 複製、market analysis の混在**は見送るのが安全です。読み取り系の dry-run は `GET` の safe semantic に従い状態を変えず、保存やレビュー更新は明示的な mutation で分離すべきです。 citeturn25view0turn26view0turn5view0turn23view1

MVP で特に重要なのは、**「APPROVED だから downstream に進める」ではなく、「APPROVED かつ STOP 条件がゼロなら downstream 候補に昇格できる」**という二段構えにすることです。これにより `status` と downstream readiness を分離できます。NIST は trustworthiness を文脈依存で評価すべきとし、Codex報告も Proposal / mail を別要件に分けていますから、ここは状態一つで跨がせないほうが安全です。 fileciteturn0file0 citeturn23view4turn35view0

Proposal 作成やメール送信に進む前の STOP 条件は、最低でも次を定義しておくべきです。**保存時点より `Project` / `Person` が更新されている、critical warning が残っている、duplicate 判定が付いている、最近の `REJECTED` と同一条件で再提案されている、PII redaction 検査に引っかかった、reviewer が最終確認を完了していない、provenance が必須なのに source evidence が不足している**、のいずれかです。これらは suggestion を止める「業務 blocker」であり、`status` とは別管理にするほうが実務で扱いやすいです。 citeturn35view0turn33view0turn31view0

## 推奨データモデル

データモデルは、**master data、source tracking、derived suggestion、review audit** を明確に分けた bounded context として定義するのが最も安定します。`Project` と `Person` は source-of-truth、`SourceRecord` は CSV / Gmail / Notion / manual import の由来管理、`MatchSuggestion` はその時点の導出物、`MatchSuggestionReviewEvent` は可観測な意思決定履歴、`MatchSuggestionSourceEvidence` は suggestion と source tracking を結ぶブリッジ、という分担です。これは Codex報告の方向性と一致し、W3C PROV の provenance 概念とも整合します。 fileciteturn0file0 citeturn31view0

primary status は MVP では **`SUGGESTED`、`NEEDS_REVIEW`、`APPROVED`、`REJECTED`、`ARCHIVED`** の五つで十分です。ただし、**`STALE`、`DUPLICATE`、`BLOCKED_FOR_DOWNSTREAM` を status に増やさず、`stalenessState`、`duplicateState`、`promotionBlockers[]` という直交フラグにする**ことを推奨します。こうすると active queue の状態遷移が単純になり、監査と集計も分かりやすくなります。これは Codex案の簡潔さを保ちながら、過剰な state explosion を避けるための設計上の補強です。 fileciteturn0file0 citeturn35view0turn33view0

`MatchSuggestion` の主な項目は、`suggestionId`、`tenantId`、`projectId`、`personId`、`status`、`score`、`scoreBand`、`scoringVersion`、`evaluatedAt`、`projectVersion`、`personVersion`、`sourceSnapshotHash`、`reasonCodes`、`warningCodes`、`reviewFlags`、`compatibilitySummary`、`skillOverlapSummary`、`redactedPreview`、`attentionState`、`queuePriority`、`reviewAssigneeUserId`、`reviewedByUserId`、`reviewedAt`、`archivedAt`、`lockVersion`、`suggestionPairKey`、`suggestionRevisionKey` です。ここで重要なのは、**master data の複製ではなく、説明可能で redacted な snapshot とレビュー制御に必要なメタデータだけを持たせる**ことです。 citeturn6view3turn32view0turn33view0turn35view0

保存してよい情報と、suggestion テーブルに保存しないほうがよい情報は、次のように分けるのが安全です。

| suggestion テーブルに保存してよい | suggestion テーブルに保存しない |
|---|---|
| 内部ID、score、score band、version、warning / reason code、互換性の要約、safe source reference、review status、review timestamps、redacted preview | 個人名、会社名の生値、メール、電話、住所、メール本文、件名、スキルシート全文、添付ファイル本文、ローカルファイルパス、アクセス token、接続文字列、秘密情報 |

この整理は、NIST の最小必要原則、PII の linkability、OWASP の logging で除外・マスクすべきデータの整理と整合しています。もし会社名や氏名の表示が業務上どうしても必要なら、**suggestion レコードに複製せず、権限制御された detail view で master data から都度 join 表示**する方がよいです。 citeturn6view3turn32view2turn33view0

重複設計は、**一つの `projectId × personId` を表す業務キー**と、**同じペアの別 revision を区別する版キー**を分けるのが実用的です。たとえば `suggestionPairKey = hash(projectId, personId)`、`suggestionRevisionKey = hash(projectId, personId, scoringVersion, sourceSnapshotHash)` の二層です。active な suggestion は pair 単位で一つに制限し、snapshot や scoringVersion が変わったときだけ新 revision を作り、旧版は `archiveReasonCode=SUPERSEDED` で閉じる設計が扱いやすいです。これにより「同じ候補の再保存」と「新条件での再評価」を区別できます。 citeturn5view0turn27view0turn34view1

source tracking 連携は、`MatchSuggestion` が raw source を所有しない前提で設計するべきです。Gmail なら suggestion 側には `sourceRecordId`、`sourceType=GMAIL`、`extractedAt`、`evidenceKind`、`safeFragmentHash` 程度を持たせ、本文や添付は source tracking 側に閉じ込めます。CSV / Gmail / Notion は **“どこから来たか” の責務**、saved suggestion は **“その結果どうレビューされたか” の責務**です。W3C PROV の provenance 概念を当てはめるなら、suggestion は entity、保存処理は activity、reviewer と source system は agent として整理できます。 citeturn31view0turn33view0

## 推奨画面構成

画面は、同一ナビゲーション配下で **`Dry-run candidates`、`Saved suggestions`、`Review queue`、`Archive / history`** の四ビューに分けるのが扱いやすいです。Codex報告の `/matches` ベースの情報設計は活かせますが、dry-run と saved suggestion を同一一覧に混ぜると、「一時試算」と「監査対象」を取り違えやすくなります。そこで、一覧レイアウトは流用しても、**ビューの責務は分離**した方が良いです。 fileciteturn0file0 citeturn25view0turn19view0

候補一覧では、suggestion short ID、project / person short ID、status、score、score band、attention state、stale / duplicate badge、warning count、reviewer、updatedAt、source evidence count を主列にします。ここで重要なのは、**PII を含む自然文プレビューを一覧の主役にしないこと**です。NIST は context of use と linkability を重視しており、OWASP も PII や file paths の露出を避けるよう勧めています。したがって一覧は **識別よりトリアージ**に寄せるべきです。 citeturn32view0turn33view0

詳細ペインでは、合計 score より **「なぜこの候補が上がったのか」「何が危ないのか」** を見せます。おすすめの構成は、`score breakdown`、`must-have / nice-to-have overlap`、`rate/date/location compatibility`、`warning / review flags`、`source evidence summary`、`stale state`、`decision timeline`、`human decision reason` です。NIST は explainability / interpretability が監督者と運用者の理解を助けるとし、Explainable matching 研究も抽出 entity と rationale の可視化を重視しています。 citeturn23view4turn18academia0

review queue は、単なる未処理一覧ではなく、**priority queue** として設計した方が良いです。推奨ソートキーは `promotionBlockers`、`stalenessState`、`attentionState`、`warningSeverity`、`age`、`scoreBand`、`assignee` です。さらに assignee、queue age、last touched を持たせると、「共有 inbox 化して誰も見ない」問題を減らせます。これは Codex の `review queue` 発想を、NIST の human role 明確化と、採用プロセスの情報過多・トリアージ負荷の現実で補強した設計です。 fileciteturn0file0 citeturn23view1turn28news0

承認・却下・アーカイブ操作は、**説明責任が残る UI** にするべきです。`APPROVE` は blocker がゼロのときだけ有効化し、`REJECT` は structured reason code を必須にし、`ARCHIVE` は active queue から外すだけで履歴削除を意味しない UI 文言にします。自由記述ノートを許可するなら MVP では admin 限定にするか、保存前に email / phone / company name / path を検出して redact するガードを入れるべきです。 citeturn33view0turn6view3turn32view2

## 推奨API構成

API 設計の原則は明快です。**読み取りは safe、保存は retry-safe、更新は conditional** にします。`GET /api/matches/dry-run`、`GET /api/match-suggestions`、`GET /api/match-suggestions/{id}`、`GET /api/match-suggestions/review-queue` は read-only で、HTTP の safe semantic に従って server state を変えないことを要件に書いてください。`GET` に `save=true` のような mutation パラメータを持たせないことも要件です。 citeturn25view0turn26view3

mutation は、**`POST /api/match-suggestions`、`PATCH /api/match-suggestions/{id}/decision`、`PATCH /api/match-suggestions/{id}/archive`、`POST /api/match-suggestions/{id}/reopen`** のように分けるのが安全です。特に `decision` は `APPROVE` / `REJECT` / `REOPEN` を payload の `action` で切り替え、`If-Match` か `lockVersion` を必須にして lost update を防ぎます。複数人が同じ candidate を見ている状況では、`412 Precondition Failed` か `409 Conflict` を返して再読込を促すべきです。 RFC 9110 は `If-Match` を state-changing method の accidental overwrite 防止に使うこと、`409` は current state との conflict、`412` は precondition failure に使うことを定義しています。 citeturn27view0turn34view1turn34view2

保存 API には、**server-side recompute / validate、件数上限、confirmation token、idempotency key** を入れてください。Codex報告どおり client の score をそのまま信用しないのは正しいです。そのうえで Stripe の流儀を取り入れ、`Idempotency-Key` は client が生成し、同じ key の再送には同じ結果を返し、パラメータ不一致ならエラーにします。key 自体に email や個人識別子を含めないことも明文化しておくべきです。 fileciteturn0file0 citeturn5view0

ここで要件定義に必ず書き分けたいのは、**三層の整合性**です。`suggestionPairKey` は業務重複防止、`Idempotency-Key` は transport retry 安全性、`If-Match` / `lockVersion` は同時更新防止です。この三つは用途が異なるので、混ぜると運用で事故が起きます。たとえば「同じ POST を二重送信した」問題と、「同じ候補を別条件で再保存した」問題と、「別レビューアーが先に状態を更新した」問題は、返すべきエラーも処理も違います。 citeturn5view0turn27view0turn34view1

API の返却 payload は suggestion レコードでも review event でも **safe summary 中心**に寄せます。詳細に含めるのは short ID、codes、counts、band、timestamps、redacted preview、safe source references で、full text や contact 情報は原則返さない設計が望ましいです。監査目的の event API は admin 向けに検索・フィルタ・エクスポートを前提にしておくと、GitHub の enterprise audit log のような運用に近づきます。 citeturn19view0turn33view0turn6view3

## 安全性 PII 監査要件

PII 要件では、**「保存しない」だけでなく「見せない」「ログに残さない」「export しない」** を分けて定義する必要があります。NIST は PII の最小必要原則と linkability を重視しており、同じデータ項目でも context によってリスクが変わると述べています。OWASP は logs から sensitive PII、personal names、phone numbers、email addresses、file paths、secrets を直接残さないよう勧めています。したがって suggestion 詳細の `redactedPreview` も、**canonical skill tags、availability bucket、rate bucket、remote / onsite flag 程度**にとどめ、rare combination による再識別にも注意すべきです。 citeturn6view3turn32view0turn32view2turn33view0

監査イベントに残すべき最低項目は、OWASP の整理をそのまま応用すると、**いつ、どこで、誰が、何を、なぜ、どの結果にしたか**です。具体的には `eventId`、`interactionId`、`occurredAt`、`actorUserId`、`actorRole`、`requestId`、`sourceIp`、`uiSurface`、`suggestionId`、`previousStatus`、`newStatus`、`decisionAction`、`reasonCodes`、`result`、`policyVersion`、`reviewNoteRedacted`、`entityVersionsSeen`、`stalenessStateAtDecision` を推奨します。特に `interactionId` は、batch save や一連の review 操作を束ねるキーとして有効です。 citeturn33view0turn6view1

ログと監査データは、**改ざん防止、アクセス制御、検索性、保持期間**まで含めて要件化してください。OWASP は central log collection、tamper detection、log access 自体の記録と監視、保持期間前の破棄禁止・超過保持禁止を推奨しています。GitHub も audit log の閲覧、検索、エクスポート、API 取得、ストリーミングを前提にしています。MVP では外部 SIEM 連携までは不要でも、**論理的に append-only な review event と、後から export できる audit trail** は必須です。 citeturn33view0turn19view0

権限設計は MVP では `ADMIN` / `MANAGER` を mutation 可能、`SALES` は将来 read-only か限定 detail view、という切り方が無難です。さらに suggestion 詳細の中でも、**codes / counts / bands は広く見せられるが、source evidence や master detail の join 表示はより強い権限が必要**という field-level も検討してください。NIST は authorized access の広がり自体が PII リスクを上げると指摘しており、access logging の必要性も OWASP が強調しています。 citeturn32view0turn6view5turn33view0

将来 AI 自動提案や reranking に進むなら、今の時点で **override telemetry、reason taxonomy、versioned scoring features、fairness review の入口** を残しておくべきです。NIST AI RMF は、人間がどの程度 AI 出力に異議を唱えられるか、どの頻度と理由で overrule したかの収集価値を明示しています。person-job fit 研究でも、過去の accepted / rejected 履歴は有用ですが、構造化された履歴がないと学習可能性と説明可能性が落ちます。したがって MVP では AI を入れなくても、**後続学習に使える review telemetry の形**だけは整えておくのが得策です。 citeturn35view0turn18academia1turn18academia3turn36academia3

## 段階的リリース計画と未決事項

### 段階的リリース計画

段階的リリースは、Codex案をベースに **読み取り → 保存 → 判断 → 拡張** の順に進めるのが最も安全です。`GET` を安全に保ち、audit と PII 制御を先に固めたうえで mutation を開くことが、HTTP semantics、監査ログ設計、human oversight の観点からも自然です。 fileciteturn0file0 citeturn25view0turn33view0turn35view0

| フェーズ | 目的 | 含めるもの |
|---|---|---|
| 先行準備 | 状態と監査の定義確定 | status / reason taxonomy / retention / RBAC / STOP 条件の合意 |
| 読み取りフェーズ | 候補確認の土台作り | dry-run、saved suggestion list / detail、review queue の read-only |
| 保存フェーズ | supervised save を開く | POST save、業務 dedupe、idempotency key、snapshot metadata |
| 判断フェーズ | 人間レビューを運用化 | approve / reject / archive / reopen、review event、queue assignment |
| 安全強化フェーズ | stale / provenance / export を整備 | stalenessState、source evidence bridge、audit export |
| 将来拡張 | ranking 改善と優先度補助 | review telemetry 活用、market analysis を secondary signal として接続、必要なら ML reranking |

将来フェーズでは、現在の deterministic scoring を「第零段の retrieval」として残し、その後に review telemetry を利用した reranking や priority assist を載せるのが自然です。CareerBuilder の大規模 job-candidate matching 研究でも retrieval と reranking の二段構成が採られており、person-job fit 研究でも過去の recruitment history が有効であることが示されています。ただし、人材領域は fairness-sensitive なので、**review telemetry を取り始めた瞬間に自動学習へ進めるのではなく、先に bias / override / reason taxonomy の品質を確認する**べきです。 citeturn11academia8turn18academia3turn36academia3turn35view0

### 未決事項リスト

以下は、実装前に意思決定しておくべき未決事項です。

- `APPROVED` を「提案候補として人間が進めてよい」に限定するか、それとも downstream eligibility まで含めるか。後者にすると STOP 条件の表現が難しくなります。 citeturn35view0
- `NEEDS_REVIEW` を main status に残すか、`SUGGESTED + attentionState=REQUIRES_REVIEW` に寄せるか。status 数を増やしすぎない方が監査と集計は楽です。 citeturn33view0turn35view0
- free text note を MVP で許可するか。許可するなら redaction ルール、保存先、検索可否、export 可否を先に決める必要があります。 citeturn33view0turn6view3
- business dedupe を `projectId × personId` 固定にするか、`scoringVersion` / `sourceSnapshotHash` を revision に含めるか。pair key と revision key を分ける前提で合意した方が後で詰まりにくいです。 citeturn5view0turn27view0
- `REJECTED` の再保存条件をどうするか。snapshot または scoringVersion が変わらない限り再出現させないのか、明示的 `REOPEN` だけにするのかを決める必要があります。 fileciteturn0file0
- `lockVersion` だけで十分か、HTTP の `ETag` / `If-Match` を正式採用するか。API クライアントの増加を考えると後者のほうが標準的です。 citeturn27view0turn34view1
- audit export を MVP に含めるか、それとも admin-only の後続項目にするか。少なくとも export 可能性を阻害しない schema にしておくべきです。 citeturn19view0turn33view0
- source tracking 連携で、source evidence を suggestion 保存時必須にするか任意にするか。MVP は任意、将来 integration で強化、が一番実装負荷と整合しやすいです。 fileciteturn0file0 citeturn31view0
- company name や person name を suggestion detail にどの権限まで見せるか。suggestion record 自体には複製せず、UI join の RBAC で制御するのかを決める必要があります。 citeturn32view0turn33view0
- review queue に assignee と SLA を MVP で入れるか。shared inbox で始めると後で責任の所在が曖昧になりやすいため、少なくとも `unassigned` と `age` は入れたいところです。 citeturn23view1turn28news0
- market analysis をいつ接続するか。接続する場合も `fit score` と混ぜず、`priority signal` として別表示にするのが説明可能性の面で安全です。 fileciteturn0file0 citeturn23view4
- 将来 ML に進むとき、review telemetry をそのまま教師信号に使うのか、誰の判断を正解とみなすのか、bias review をどう挟むのか。ここを曖昧にしたまま review data を溜めると、あとで活用時に困ります。 citeturn35view0turn18academia1turn36academia3

総じて、要件定義で一番大事なのは **「候補保存」は convenience feature ではなく、監査可能な人間レビュー境界を作る機能だ**と定義することです。Codex報告の方向性はその意味で正しく、外部調査で補強すべき本丸は、**PII 最小化、導出物としての suggestion、append-only 監査、三層の整合性制御、データ鮮度、reason taxonomy、STOP 条件**でした。これらを先に文書化できれば、後続の Proposal 作成やメール連携を足すときも、安全境界を崩さずに拡張できます。 fileciteturn0file0 citeturn6view3turn33view0turn27view0turn35view0