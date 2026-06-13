# マッチ候補保存/レビュー画面 要件定義書 v0.2

## 1. 目的

本書は、SES営業管理コンソールにおける「マッチ候補保存/レビュー画面」の要件を定義する。

本機能は、deterministic matching の出力をそのまま提案・メール送信へ進めるための自動化機能ではない。システムが算出した Project x Person の候補を、人間が監査可能な形で保存し、確認し、判断履歴を残すためのレビュー境界である。

v0.2では、v0.1の骨格を維持しつつ、以下を実装判断可能な粒度まで明確化する。

- `APPROVED` と下流工程への進行可否を分離する。
- Primary Status の状態遷移表を追加する。
- tenant / organization の分離方針をデータモデルへ追加する。
- MVPで扱う assignee / SLA / source evidence / audit export の範囲を絞る。
- PIIの保存禁止だけでなく、join表示、権限、監査、ログ出力禁止を要件化する。
- 実装前に決める未決事項と、後続フェーズでよい事項を分ける。

## 2. 入力資料

本書は以下の資料を統合して作成する。

- Codex調査報告 v0.1
- 要件定義書 v0.1
- GPT Deep Research出力
- GPTによるv0.1レビュー指摘
- 既存ブランチ群の設計調査結果

## 3. v0.2での判断

v0.2では、以下を要件上の判断として採用する。

| 項目 | v0.2判断 |
| --- | --- |
| `APPROVED` | 人間がマッチ候補として妥当と判断した状態を表す。提案作成・メール作成・送信許可を意味しない。 |
| 下流進行可否 | `promotionEligible` または `downstreamReadiness` で別途表す。 |
| blocker | `APPROVED` を必ず禁止するものではない。下流工程への進行を止める条件として扱う。 |
| `NEEDS_REVIEW` | Primary Statusとして残す。system-derivedな初期状態であり、人間の確認待ちを表す。 |
| assignee / SLA | MVPでは永続的な担当者割当・SLA管理を実装しない。queueの年齢表示とフィルタまでに留める。 |
| tenant / org | `tenantId` を必須のデータ分離キーとする。`organizationId` は利用可能な場合に保持する。 |
| `OTHER` reason | MVPでは原則使用しない。自由記述理由はPII混入リスクがあるため後続フェーズ扱いとする。 |
| source evidence | MVPではsafe summaryと状態表示まで。raw evidence表示・添付・exportはMVP外。 |
| audit export | MVP外。ただしreview eventのschemaは将来export可能な形で保持する。 |

## 4. 背景

SES営業では、案件と人材の候補を短時間で見つける必要がある。一方で、候補の妥当性は、スキル一致、稼働時期、単価、商流、勤務地、過去接点、提案先との関係など複数要素に左右される。

そのため、matching engine の出力を即時に営業アクションへ接続すると、古い情報、重複候補、説明不能な判断、PIIの過剰露出、誤送信に繋がるリスクがある。

本機能は、候補を保存し、人間が確認し、判断履歴を残し、下流工程へ進めてよい候補だけを明示的に識別するための業務画面である。

## 5. 用語

| 用語 | 定義 |
| --- | --- |
| Dry-run候補 | matching engine が一時的に算出した未保存候補。 |
| Saved Suggestion | 人間またはAPI操作により保存されたマッチ候補。 |
| MatchSuggestion | Saved Suggestionを表すドメインレコード。 |
| Review Event | 候補に対する保存・承認・却下・アーカイブ・再オープンなどの監査イベント。 |
| Source Record | 候補生成に関係した入力元データへの安全な参照。 |
| Primary Status | 候補の主状態。業務上のレビュー状態を表す。 |
| 直交フラグ | Primary Statusとは別軸で保持する状態。stale、duplicate、blockerなど。 |
| Promotion | 提案作成、メールドラフト作成、メール送信、配信ログ作成などの下流工程へ進めること。 |
| promotionEligible | 下流工程へ進める条件を満たしているかを表すbooleanまたは算出結果。 |
| downstreamReadiness | 下流工程へ進む準備状態。`READY` / `BLOCKED` / `NEEDS_CHECK` などで表す。 |

## 6. 対象ユーザーと権限

### 6.1 ロール

MVPでは以下のロールを対象とする。

| ロール | 想定ユーザー | MVP権限 |
| --- | --- | --- |
| ADMIN | 管理者、責任者 | すべての閲覧、保存、レビュー操作、監査閲覧 |
| MANAGER | 営業責任者、レビュー担当 | 候補閲覧、保存、レビュー操作、限定監査閲覧 |

MVPでは一般営業担当の個別ロール制御は対象外とする。将来フェーズでは、個人担当、チーム単位、閲覧専用ロールを追加できるようにする。

### 6.2 権限要件

- すべてのAPIは `tenantId` によるデータ分離を必須とする。
- `organizationId` が存在する環境では、一覧、詳細、review event、source bridgeも同一organization内に制限する。
- ADMIN / MANAGERのみがreview decisionを実行できる。
- PIIを含むmaster dataのjoin表示は、候補レコードへの保存ではなく、権限確認後の都度取得に限定する。
- PIIを含むdetail表示を実行した事実は監査対象とする。
- MVPではassigneeによる閲覧制限を行わない。

## 7. MVPスコープ

### 7.1 MVPに含める

- Dry-run候補の閲覧
- Dry-run候補からの選択保存
- 保存済み候補一覧
- 保存済み候補詳細
- Review Queue
- approve / reject / archive / reopen
- Review Eventのappend-only記録
- stale / duplicate / warning / blockerの表示
- source evidenceのsafe summary表示
- PII-safe preview
- `APPROVED` と `promotionEligible` の分離
- `tenantId` によるデータ分離
- APIの冪等性、競合制御、重複制御
- 主要KPIの算出に必要な最低限のイベント

### 7.2 MVPに含めない

- Proposal draft作成
- メールドラフト作成
- メール送信
- DistributionLog作成
- AIによる自動レビュー判断
- market analysis scoreの統合
- raw source evidenceの表示
- 添付ファイル本文の表示
- audit export
- SLA管理
- 永続的なqueuePriority管理
- assigneeのassign / unassign操作
- bulk approve / bulk reject
- 自由記述の`OTHER` reason
- PIIを含む一覧表示

## 8. 業務フロー

1. ユーザーが案件または人材を起点にmatching dry-runを実行する。
2. システムが候補一覧を返す。
3. ユーザーが保存対象を選択する。
4. システムが保存前に重複、stale、warning、source evidence状態を評価する。
5. 保存可能な候補を `SUGGESTED` または `NEEDS_REVIEW` として保存する。
6. 新規保存時に `SAVED` review eventを記録する。
7. ユーザーがReview Queueまたは保存済み候補一覧から候補を確認する。
8. ユーザーがapprove / reject / archive / reopenを実行する。
9. システムが状態遷移、reason、競合、権限を検証する。
10. システムがreview eventをappend-onlyで記録する。
11. `APPROVED` になった候補について、別途 `promotionEligible` を算出する。
12. `promotionEligible = true` の候補のみ、後続フェーズでproposal/emailへ接続可能とする。

## 9. 状態設計

### 9.1 Primary Status

| Status | 意味 | 備考 |
| --- | --- | --- |
| `SUGGESTED` | 保存済みで、通常レビュー対象になっている候補。 | 初期保存状態の基本値。 |
| `NEEDS_REVIEW` | warningや確認事項により、人間の確認が必要な候補。 | system-derivedな初期状態またはreopen後の状態。 |
| `APPROVED` | 人間がマッチ候補として妥当と判断した候補。 | 下流工程へ進める許可ではない。 |
| `REJECTED` | 人間が候補として不適切と判断した候補。 | decision reason必須。 |
| `ARCHIVED` | 現時点でレビュー対象から外した候補。 | 削除ではない。 |

`REOPENED` はPrimary Statusではなく、review event typeとして扱う。reopen後のPrimary Statusは `NEEDS_REVIEW` とする。

### 9.2 `APPROVED` とDownstream Readinessの分離

`APPROVED` は、reviewerが「このProject x Personの組み合わせはマッチ候補として妥当」と判断した状態である。

`APPROVED` は以下を意味しない。

- Proposal draftを作成してよい。
- メールドラフトを作成してよい。
- メールを送信してよい。
- DistributionLogを作成してよい。
- 下流工程の入力要件がすべて満たされている。

下流工程へ進める可否は、Primary Statusとは別に `promotionEligible` または `downstreamReadiness` として表す。

`promotionEligible = true` の条件は以下をすべて満たすこととする。

- `status = APPROVED`
- `promotionBlockers` が空である。
- `stalenessState = FRESH`
- `duplicateState` が下流工程を妨げる状態ではない。
- required source evidenceが不足していない。
- critical warningが未確認のまま残っていない。
- proposal/email側の必須入力が揃っている。
- tenant / organization境界に違反していない。

### 9.3 直交フラグ

Primary Statusとは別軸で以下を保持する。

| Field | 値 | 用途 |
| --- | --- | --- |
| `stalenessState` | `FRESH` / `STALE` / `UNKNOWN` | 元データの鮮度判断。 |
| `duplicateState` | `NONE` / `POSSIBLE_DUPLICATE` / `DUPLICATE_CONFIRMED` | 重複候補の判定。 |
| `sourceEvidenceState` | `NONE` / `OPTIONAL_PRESENT` / `OPTIONAL_MISSING` / `REQUIRED_MISSING` / `STALE` | source evidenceの有無と重要度。 |
| `warningSeverity` | `NONE` / `LOW` / `MEDIUM` / `HIGH` / `CRITICAL` | reviewerに示す警告の重大度。 |
| `attentionState` | `NORMAL` / `NEEDS_ATTENTION` | review queue上の注意喚起。 |
| `promotionBlockers[]` | blocker codeの配列 | 下流工程へ進めない理由。 |

### 9.4 状態遷移要件

MVPではPrimary Statusの遷移を以下に限定する。

| from | action | to | actor | required reason | event | guard |
| --- | --- | --- | --- | --- | --- | --- |
| none | save | `SUGGESTED` | ADMIN / MANAGER | 不要 | `SAVED` | 重複制御、tenant一致 |
| none | save with warnings | `NEEDS_REVIEW` | ADMIN / MANAGER | 不要 | `SAVED` | warningまたは確認事項あり |
| `SUGGESTED` | approve | `APPROVED` | ADMIN / MANAGER | 不要 | `APPROVED` | 未確認critical warningなし |
| `NEEDS_REVIEW` | approve | `APPROVED` | ADMIN / MANAGER | warning確認済み | `APPROVED` | 未確認critical warningなし |
| `SUGGESTED` | reject | `REJECTED` | ADMIN / MANAGER | 必須 | `REJECTED` | allowed reason code |
| `NEEDS_REVIEW` | reject | `REJECTED` | ADMIN / MANAGER | 必須 | `REJECTED` | allowed reason code |
| `SUGGESTED` | archive | `ARCHIVED` | ADMIN / MANAGER | 任意 | `ARCHIVED` | なし |
| `NEEDS_REVIEW` | archive | `ARCHIVED` | ADMIN / MANAGER | 任意 | `ARCHIVED` | なし |
| `APPROVED` | archive | `ARCHIVED` | ADMIN / MANAGER | 任意 | `ARCHIVED` | downstream未実行 |
| `REJECTED` | reopen | `NEEDS_REVIEW` | ADMIN / MANAGER | 必須 | `REOPENED` | なし |
| `ARCHIVED` | reopen | `NEEDS_REVIEW` | ADMIN / MANAGER | 必須 | `REOPENED` | なし |

`STALE`、`DUPLICATE`、`BLOCKED_FOR_DOWNSTREAM` はPrimary Statusにしない。これらは `stalenessState`、`duplicateState`、`promotionBlockers[]` で表現する。

### 9.5 critical warningとblockerの扱い

`promotionBlockers[]` は下流工程への進行を止めるための条件であり、必ずしも `APPROVED` を禁止しない。

ただし、以下はapprove操作自体を禁止する。

- reviewerが確認していないcritical warningが残っている。
- tenant / organization境界が不明または矛盾している。
- 候補のProjectまたはPerson参照が存在しない。
- PII guard failedにより安全表示できない。
- lockVersion不一致により同時更新が検出された。

## 10. 機能要件

### 10.1 Dry-run候補閲覧

- ユーザーは案件または人材を起点にdry-run候補を閲覧できる。
- dry-run結果は保存済み候補とは別扱いとする。
- dry-run結果には候補のsafe summary、score、主要なsystem reason、warningを表示する。
- dry-run結果にはPII、raw source、local path、secretを含めない。
- dry-run結果から候補を選択して保存できる。

### 10.2 候補保存

- ユーザーはdry-run候補から1件または複数件を保存できる。
- 保存時に `suggestionPairKey` と `suggestionRevisionKey` を生成または受け取る。
- 同一tenant内で重複候補を検出する。
- 保存済み候補が既に存在する場合、二重作成を避け、既存候補への参照を返す。
- duplicate応答は新規保存ではないため、`SAVED` review eventを追加しない。
- 新規保存時に `SAVED` review eventを記録する。
- warningありの候補は `NEEDS_REVIEW` として保存できる。
- 保存APIは `Idempotency-Key` とrequest fingerprintに対応する。

### 10.3 保存済み候補一覧

- ユーザーは保存済み候補を一覧できる。
- 一覧ではtenant境界を跨いだ候補を表示しない。
- 一覧ではPIIを表示しない。
- 一覧はPrimary Status、staleness、duplicate、source evidence、warning、保存日時、最終レビュー日時でフィルタできる。
- 一覧はscore、保存日時、review ageでソートできる。
- MVPではassigneeでのフィルタは実装しない。

### 10.4 保存済み候補詳細

- ユーザーは候補詳細を閲覧できる。
- 詳細ではsafe summary、system reason、system warning、review history、source evidence summaryを表示する。
- Project / PersonのPIIを含むmaster dataは、権限確認後に都度join表示する。
- join表示した事実は監査イベントまたは監査ログに残す。
- raw source evidence、添付本文、メール本文、CSV raw rowは表示しない。

### 10.5 Review Queue

- ユーザーはレビューが必要な候補をqueueとして閲覧できる。
- queue対象は `SUGGESTED` と `NEEDS_REVIEW` を基本とする。
- `warningSeverity`、`sourceEvidenceState`、`stalenessState`、`duplicateState` により優先表示できる。
- MVPでは永続的なqueuePriorityは保存しない。表示上の優先度は算出値とする。
- MVPではassigneeを保存・変更するUIを提供しない。

### 10.6 レビュー操作

- ユーザーは候補をapproveできる。
- ユーザーは候補をrejectできる。
- ユーザーは候補をarchiveできる。
- ユーザーはrejectedまたはarchived候補をreopenできる。
- rejectとreopenではreason codeを必須とする。
- archive reasonは任意とする。
- review操作は競合制御を必須とする。
- review操作の結果はappend-only eventとして保存する。

## 11. Reason Taxonomy

### 11.1 System Reason Codes

matching engineが候補を出した説明として以下を保持する。

- `SKILL_MATCH`
- `ROLE_MATCH`
- `INDUSTRY_MATCH`
- `RATE_MATCH`
- `AVAILABILITY_MATCH`
- `LOCATION_MATCH`
- `CONTRACT_CONDITION_MATCH`
- `PAST_CONTACT_SIGNAL`
- `MANUAL_SOURCE_SIGNAL`

### 11.2 System Warning Codes

reviewerに確認を促す警告として以下を保持する。

- `STALE_PROJECT`
- `STALE_PERSON`
- `POSSIBLE_DUPLICATE`
- `LOW_SCORE`
- `MISSING_REQUIRED_SOURCE_EVIDENCE`
- `SOURCE_EVIDENCE_STALE`
- `RATE_MISMATCH`
- `AVAILABILITY_MISMATCH`
- `LOCATION_UNCLEAR`
- `CONTACT_TARGET_UNCLEAR`
- `PII_GUARD_FAILED`

### 11.3 Human Decision Reason Codes

reject reasonはMVPで以下に限定する。

- `SKILL_MISMATCH`
- `RATE_MISMATCH`
- `AVAILABILITY_MISMATCH`
- `LOCATION_MISMATCH`
- `CONTRACT_CONDITION_MISMATCH`
- `DUPLICATE`
- `STALE_INFORMATION`
- `INSUFFICIENT_EVIDENCE`
- `BUSINESS_PRIORITY_LOW`
- `DO_NOT_CONTACT`

reopen reasonはMVPで以下に限定する。

- `SOURCE_UPDATED`
- `MATCHING_RULE_UPDATED`
- `HUMAN_RECONSIDERATION`
- `DUPLICATE_RESOLVED`
- `STALE_RESOLVED`

MVPでは `OTHER` を提供しない。自由記述noteはPII混入リスクがあるため、後続フェーズでredaction guard、最大文字数、監査、権限制御と合わせて再検討する。

### 11.4 Taxonomy要件

- reason codeは表示文言と内部codeを分離する。
- 表示文言はUI側でローカライズ可能にする。
- `taxonomyVersion` を保存し、後から判断理由の意味が追跡できるようにする。
- 廃止されたreason codeも過去イベントの表示に必要なため保持する。

## 12. データモデル要件

### 12.1 `MatchSuggestion`

保存済み候補を表す。

| Field | 必須 | 説明 |
| --- | --- | --- |
| `id` | yes | 候補ID。 |
| `tenantId` | yes | データ分離の必須キー。 |
| `organizationId` | no | 組織単位の分離がある場合に保持する。 |
| `projectId` | yes | 案件参照。 |
| `personId` | yes | 人材参照。 |
| `suggestionPairKey` | yes | Project x Person の業務重複判定キー。 |
| `suggestionRevisionKey` | yes | matching条件、source、scoreの差分を含むrevisionキー。 |
| `status` | yes | Primary Status。 |
| `score` | no | matching score。 |
| `scoreBand` | no | UI表示用のscore帯。 |
| `systemReasonCodes[]` | yes | システム説明理由。 |
| `systemWarningCodes[]` | no | システム警告。 |
| `warningSeverity` | yes | 警告重大度。 |
| `stalenessState` | yes | 鮮度状態。 |
| `duplicateState` | yes | 重複状態。 |
| `sourceEvidenceState` | yes | source evidence状態。 |
| `promotionBlockers[]` | yes | 下流工程への進行を止める条件。 |
| `promotionEligible` | yes | 下流工程へ進行可能かの算出結果。 |
| `downstreamReadiness` | no | 詳細なready状態。 |
| `scoringVersion` | yes | scoring logicのversion。 |
| `taxonomyVersion` | yes | reason taxonomyのversion。 |
| `redactionPolicyVersion` | yes | redaction policyのversion。 |
| `createdByUserId` | yes | 保存者。 |
| `createdAt` | yes | 保存日時。 |
| `updatedAt` | yes | 更新日時。 |
| `lastReviewedAt` | no | 最終レビュー日時。 |
| `lastReviewedByUserId` | no | 最終レビュー者。 |
| `lockVersion` | yes | 競合制御用version。 |

`MatchSuggestion` には会社名、個人名、メールアドレス、電話番号、メール本文、CSV raw row、添付本文、local path、secretを保存しない。

### 12.2 `MatchSuggestionReviewEvent`

レビュー履歴をappend-onlyで表す。

| Field | 必須 | 説明 |
| --- | --- | --- |
| `id` | yes | event ID。 |
| `tenantId` | yes | データ分離キー。 |
| `organizationId` | no | 組織単位の分離がある場合に保持する。 |
| `suggestionId` | yes | 対象候補ID。 |
| `eventType` | yes | `SAVED` / `APPROVED` / `REJECTED` / `ARCHIVED` / `REOPENED` / `VIEWED_PII_DETAIL`。 |
| `fromStatus` | no | 遷移前status。 |
| `toStatus` | no | 遷移後status。 |
| `actorUserId` | yes | 操作者。 |
| `reasonCode` | no | human decision reason。 |
| `systemSnapshot` | no | safe summaryのみ。 |
| `createdAt` | yes | event作成日時。 |
| `requestId` | yes | API request追跡ID。 |
| `idempotencyKey` | no | 冪等性キー。 |

review eventは更新・削除しない。訂正が必要な場合は新しいeventを追加する。

### 12.3 `MatchSuggestionSourceRecord`

候補とsource trackingを接続するbridge recordである。

| Field | 必須 | 説明 |
| --- | --- | --- |
| `id` | yes | bridge ID。 |
| `tenantId` | yes | データ分離キー。 |
| `organizationId` | no | 組織単位の分離がある場合に保持する。 |
| `suggestionId` | yes | 候補ID。 |
| `sourceType` | yes | `CSV_IMPORT` / `MANUAL` / `SYSTEM` / `EXTERNAL`。 |
| `sourceRecordId` | yes | 元データの安全な参照ID。 |
| `evidenceRole` | yes | `PRIMARY` / `SUPPORTING` / `OPTIONAL`。 |
| `safeSummary` | no | PIIを含まない要約。 |
| `createdAt` | yes | 作成日時。 |

source bridgeはraw payloadを保持しない。safe summaryにもPIIを含めない。

## 13. 保存しないデータ

以下は `MatchSuggestion`、`MatchSuggestionReviewEvent`、`MatchSuggestionSourceRecord` に保存しない。

- 会社名
- 個人名
- メールアドレス
- 電話番号
- 住所
- メール件名
- メール本文
- スキルシート本文
- 添付ファイル本文
- raw CSV row
- raw Notion payload
- local file path
- token
- password
- API key
- connection string
- secret

業務上表示が必要な場合は、候補レコードに複製せず、権限確認後にProject / Person / SourceRecordから都度join表示する。

## 14. API要件

### 14.1 Read-only API

| Method | Path | 用途 |
| --- | --- | --- |
| `GET` | `/api/matches/dry-run` | dry-run候補取得。 |
| `GET` | `/api/matches/suggestions` | 保存済み候補一覧。 |
| `GET` | `/api/matches/suggestions/:id` | 候補詳細。 |
| `GET` | `/api/matches/suggestions/review-queue` | review queue取得。 |

Read API要件:

- すべてtenant filterを必須とする。
- PIIを含む値を標準レスポンスに含めない。
- detail joinが必要な場合は権限確認を行う。
- PII detail joinを行った場合は監査対象にする。
- paginationを必須とする。
- filter条件はstatus、warningSeverity、stalenessState、duplicateState、sourceEvidenceState、createdAt、lastReviewedAtを対象とする。

### 14.2 Mutation API

| Method | Path | 用途 |
| --- | --- | --- |
| `POST` | `/api/matches/suggestions` | dry-run候補の保存。 |
| `PATCH` | `/api/matches/suggestions/:id/decision` | approve / reject。 |
| `PATCH` | `/api/matches/suggestions/:id/archive` | archive。 |
| `POST` | `/api/matches/suggestions/:id/reopen` | reopen。 |

Mutation API要件:

- `Idempotency-Key` を受け付ける。
- `If-Match` または `lockVersion` を用いた競合制御を必須とする。
- 権限、tenant、organization、状態遷移、reason必須条件を検証する。
- 失敗時のerror messageにPIIを含めない。
- 成功時にreview eventをappend-onlyで作成する。

### 14.3 MVPで追加しないAPI

以下はMVPでは追加しない。

- assign / unassign
- SLA設定
- audit export
- bulk approve
- bulk reject
- raw source evidence取得
- proposal draft作成
- email draft作成
- email送信

## 15. 整合性要件

### 15.1 三層の整合性制御

| 層 | 目的 | 代表キー |
| --- | --- | --- |
| 業務重複制御 | 同一Project x Person候補の重複保存を避ける。 | `tenantId` + `suggestionPairKey` |
| 冪等性制御 | 同一保存リクエストの再送を安全に扱う。 | `Idempotency-Key` |
| 同時更新制御 | 複数ユーザーのreview衝突を検出する。 | `If-Match` / `lockVersion` |

### 15.2 重複方針

- 同一tenant内で `suggestionPairKey` が一致する候補は同一組み合わせとして扱う。
- matching条件やsourceが変わる場合は `suggestionRevisionKey` が変わる。
- 既存候補がactiveな場合、新規保存は重複として扱う。
- `DUPLICATE_CONFIRMED` はPrimary Statusではなく `duplicateState` に保持する。
- duplicateが残る候補は `promotionEligible = false` とする。

### 15.3 Stale方針

- 元データが定義期間を超えて古い場合は `STALE` とする。
- stale候補は `APPROVED` 可能だが、原則として `promotionEligible = false` とする。
- stale解消はsource更新または再評価によって行う。
- stale判定の閾値は実装前に決める。

## 16. STOP条件とDownstream Readiness

### 16.1 STOP条件

以下に該当する候補は、proposal/emailなどの下流工程へ進めない。

- `status` が `APPROVED` ではない。
- `promotionBlockers[]` が空ではない。
- `stalenessState = STALE`
- `duplicateState = DUPLICATE_CONFIRMED`
- `sourceEvidenceState = REQUIRED_MISSING`
- `warningSeverity = CRITICAL`
- target contactが未定義である。
- ProjectまたはPersonの参照が存在しない。
- PII guard failedが残っている。
- tenant / organization境界が不明または矛盾している。

### 16.2 Downstream Readiness表示

UIでは `APPROVED` を「承認済み」と表示する。ただし、「提案作成可」「メール作成可」「送信可」といった文言にはしない。

下流工程への準備状態は、別項目として以下のように表示する。

| 状態 | 表示例 | 意味 |
| --- | --- | --- |
| `READY` | 下流準備OK | 下流工程へ進む条件を満たしている。 |
| `BLOCKED` | 下流ブロックあり | blockerが残っている。 |
| `NEEDS_CHECK` | 下流確認待ち | 不足情報またはwarning確認が必要。 |

## 17. 画面要件

### 17.1 画面構成

MVP画面は以下で構成する。

- Dry-run候補一覧
- 保存済み候補一覧
- Review Queue
- 候補詳細ペイン
- Review Event履歴
- Decision操作エリア

### 17.2 一覧列

保存済み候補一覧には以下を表示する。

- safe project summary
- safe person summary
- score / scoreBand
- status
- downstreamReadiness
- warningSeverity
- stalenessState
- duplicateState
- sourceEvidenceState
- createdAt
- lastReviewedAt

一覧では会社名、個人名、メールアドレス、電話番号、メール本文、スキルシート本文を表示しない。

### 17.3 詳細ペイン

詳細ペインには以下を表示する。

- safe summary
- system reason
- system warning
- source evidence safe summary
- promotion blockers
- downstream readiness
- review event history
- decision controls

PIIを含むProject / Person詳細は、権限確認後の折りたたみ表示または別導線とし、初期表示しない。

### 17.4 操作UI

- approve button
- reject button
- archive button
- reopen button
- reason selector
- warning confirmation checkbox

reject / reopenではreason selectorを必須とする。

MVPではfree text noteを表示しない。

### 17.5 UI文言方針

- `APPROVED` は「候補として承認済み」と表現する。
- `promotionEligible` は「下流準備OK」など別ラベルで表現する。
- 「送信可能」「提案可能」など下流工程を直接示す文言は、該当機能が実装されるまで使わない。
- warningやblockerは、営業ユーザーが次に何を確認すればよいか分かる文言にする。

## 18. PII / Redaction / 監査要件

### 18.1 保存要件

- 候補レコードにはPIIを保存しない。
- review eventにはPIIを保存しない。
- source bridgeにはraw sourceを保存しない。
- safe summary生成時にredaction policyを適用する。
- `redactionPolicyVersion` を保存する。

### 18.2 join表示要件

- PIIを含むmaster detailは、権限確認後にProject / Person / SourceRecordから都度join表示する。
- 一覧画面ではPIIを表示しない。
- 詳細画面でも初期表示はsafe summaryに限定する。
- PII detail表示はADMIN / MANAGERに限定する。
- PII detail表示を行った事実は監査対象にする。

### 18.3 ログ/エラー要件

以下にPIIを含めない。

- API responseの標準項目
- application log
- test output
- error message
- telemetry
- review event
- source bridge safe summary

### 18.4 監査要件

- review eventはappend-onlyとする。
- review eventにはactor、timestamp、action、from/to status、reason code、requestIdを保持する。
- review eventの閲覧はADMIN / MANAGERに限定する。
- PII detail表示の事実を監査対象とする。
- review eventの保持期間は最低5年を仮置きとする。正式な保持期間は運用・契約・法務方針で確定する。
- audit exportはMVP外とする。

## 19. CSV / source tracking連携方針

- CSV取り込み結果はsource recordとして扱う。
- MatchSuggestionにはCSV raw rowを保存しない。
- source recordとの接続は `MatchSuggestionSourceRecord` で表す。
- source evidenceはsafe summary、件数、状態のみをMVPで表示する。
- source evidenceが必須か任意かを `evidenceRole` と `sourceEvidenceState` で表す。
- `REQUIRED_MISSING` は下流工程へのSTOP条件とする。
- `OPTIONAL_MISSING` は表示上の注意に留める。

## 20. Market Analysis連携方針

MVPではmarket analysis scoreを保存済み候補の判断条件へ統合しない。

将来フェーズでは、market analysisの結果を以下の形で連携する。

- warningの補助情報
- scoreBandの補正要素
- review queueの表示優先度
- proposal/email前の追加チェック

ただし、market analysisの結果のみで `APPROVED` や `promotionEligible` を自動確定しない。

## 21. エラー要件

APIは以下のエラーを扱う。

| Status | 用途 |
| --- | --- |
| 400 | 不正なリクエスト。 |
| 401 | 未認証。 |
| 403 | 権限不足またはtenant境界違反。 |
| 404 | 対象候補が存在しない、または権限上見えない。 |
| 409 | 業務重複または状態遷移競合。 |
| 412 | `If-Match` / `lockVersion` 不一致。 |
| 422 | reason不足、状態遷移不可、必須条件不足。 |
| 429 | レート制限。 |
| 503 | 一時的なシステム障害。 |

エラーメッセージにはPII、raw source、local path、secretを含めない。

## 22. KPI / 運用指標

MVPでは以下の指標を算出可能にする。

- review queue滞留件数
- status別候補件数
- approve率
- reject率
- reject reason分布
- duplicate検出率
- stale率
- source evidence不足率
- PII guard検出率
- review完了までの経過時間

SLA達成率はMVPでは正式指標にしない。

## 23. テスト/検証要件

### 23.1 Unit Test

- 状態遷移ルール
- reason必須条件
- `APPROVED` と `promotionEligible` の分離
- `promotionBlockers` 算出
- duplicate判定
- stale判定
- source evidence state判定
- redaction policy

### 23.2 API Test

- tenant境界
- 権限制御
- 保存の冪等性
- `If-Match` / `lockVersion` による競合制御
- review event作成
- PIIを含まないレスポンス
- エラー時にPIIを含まないこと

### 23.3 UI Test

- 一覧表示
- filter / sort
- 詳細ペイン
- approve / reject / archive / reopen
- reason必須UI
- warning確認UI
- PII detailが初期表示されないこと
- downstream readinessがstatusと別表示されること

### 23.4 Regression Test

- dry-run結果が保存済み候補として勝手に扱われないこと
- saved suggestionがproposal/emailへ自動連携されないこと
- reject / archive済み候補がreview queueに残らないこと
- reopen後に `NEEDS_REVIEW` へ戻ること

## 24. 段階的リリース計画

### Phase 1: 保存/レビューMVP

- dry-run候補閲覧
- 候補保存
- 保存済み候補一覧
- review queue
- approve / reject / archive / reopen
- review event
- PII-safe preview
- tenant分離

### Phase 2: 運用改善

- assignee
- SLA
- queue priority永続化
- audit export
- detailed source evidence
- redacted note

### Phase 3: 下流工程連携

- proposal draft
- email draft
- distribution log
- market analysis補助連携
- downstream workflowの専用権限制御

## 25. 成功条件

MVP完了時点で以下を満たす。

- dry-run候補とsaved suggestionが明確に分離されている。
- 候補を保存し、一覧・詳細・review queueで確認できる。
- approve / reject / archive / reopenの状態遷移が制御されている。
- `APPROVED` と下流工程への進行可否が分離されている。
- review eventがappend-onlyで保存される。
- PIIを候補レコードに保存しない。
- 一覧・ログ・エラーにPIIが出ない。
- tenant境界を跨いだ閲覧・更新ができない。
- 重複、stale、source evidence不足が表示・制御される。
- 実装者がAPI、状態、データモデル、テスト観点を判断できる。

## 26. 未決事項

| ID | 論点 | 推奨 |
| --- | --- | --- |
| OQ-001 | stale判定の閾値 | 案件・人材ごとに日数を定義する。 |
| OQ-002 | scoreBandの閾値 | matching engine側のversionと合わせて決める。 |
| OQ-003 | duplicate判定の厳密度 | `projectId + personId`を基本に、source revision差分を許容する。 |
| OQ-004 | source evidence必須条件 | CSV由来、手動由来、system由来で必須度を分ける。 |
| OQ-005 | warning確認UI | `NEEDS_REVIEW` approve時に確認checkboxを入れる。 |
| OQ-006 | PII detail表示の監査粒度 | `VIEWED_PII_DETAIL` eventまたは別audit logで記録する。 |
| OQ-007 | review event保持期間 | 仮置き5年。正式方針で確定する。 |
| OQ-008 | market analysis連携時期 | MVP後に判断する。 |
| OQ-009 | proposal/email連携条件 | Phase 3で専用要件定義を作る。 |
| OQ-010 | redaction policy version管理 | 実装前にpolicy versionの採番方法を決める。 |
| OQ-011 | `tenantId` / `organizationId` の持ち方 | MVPから `tenantId` 必須。`organizationId` は既存モデルに合わせる。 |
| OQ-012 | `APPROVED` と `promotionEligible` を分けるか | 分ける。 |
| OQ-013 | blockerありでapproveを許可するか | 許可する。ただし下流進行はblockerで止める。 |
| OQ-014 | assigneeをMVPで操作可能にするか | MVPでは操作しない。Phase 2へ送る。 |
| OQ-015 | `OTHER` reasonを許可するか | MVPでは許可しない。 |
| OQ-016 | source evidence missingの表現 | optional missingとrequired missingを分ける。 |
| OQ-017 | audit exportをMVPに含めるか | 含めない。schemaのみ将来対応可能にする。 |
| OQ-018 | master data join表示の権限 | ADMIN / MANAGERに限定し、表示事実を監査する。 |
| OQ-019 | bulk approve / rejectを許可するか | MVPでは禁止。bulk saveのみ慎重に許可する。 |
| OQ-020 | scoring/redaction/taxonomy version管理 | `scoringVersion`、`redactionPolicyVersion`、`taxonomyVersion` を保持する。 |

## 27. 要件定義上の結論

マッチ候補保存/レビュー画面は、候補を便利に保存するだけの画面ではなく、matching結果を営業アクションへ接続する前の監査境界である。

MVPでは、候補保存、レビュー、状態遷移、判断履歴、PII-safe表示、tenant分離に集中する。提案作成、メール作成、メール送信、SLA、assignee、audit export、market analysis統合は後続フェーズに分ける。

特に `APPROVED` と下流工程への進行可否を分離することで、「候補として妥当だが、まだ提案・送信には進めない」という業務上重要な状態を表現できる。これにより、レビュー品質、監査可能性、PII安全性、将来の下流連携の拡張性を同時に確保できる。
