# マッチ候補保存/レビュー画面 要件定義書 v0.1

作成日: 2026-06-08

## 1. 目的

SES営業管理コンソールに、案件と要員のマッチ候補を保存し、人間がレビュー、承認、却下、アーカイブできる画面とAPIを追加する。

本機能は、deterministic matching の結果をそのまま提案やメール送信へ進めるものではない。候補を「監査可能なレビュー対象」として保存し、営業判断の根拠、状態、履歴を残すための機能である。

## 2. 入力資料

本要件定義書は、次の調査結果を統合して作成した。

| 種別 | 参照 |
|---|---|
| Codexローカル調査 | `docs/themes/matching/research/match-suggestion-save-review-research-v0.1.md` |
| GPT Deep Research | `deep-research-report.md` |

採用方針:

- Codex調査の「dry-runと保存済み候補を分離する」「PIIを最小化する」「Proposal/メールはMVP外にする」という骨格を採用する。
- GPT Deep Researchの「stale判定」「reason taxonomy」「append-only監査」「三層の整合性制御」「STOP条件」を補強要件として採用する。
- APIパスは既存/先行ブランチの構造に合わせ、`/api/matches/suggestions` 配下を採用する。

## 3. 背景

現在の構想では、既存の `Project` と `Person` を deterministic scoring で組み合わせ、候補を確認する `/matches` dry-run review がある。

次の段階では、単発のdry-run結果をその場で見るだけでなく、営業や管理者が後からレビューできるように、候補を保存する必要がある。

一方で、SES営業データには個人名、会社名、メール、本文、スキルシート、取引先情報などの機微情報が含まれる。そのため、保存済み候補は `Project` / `Person` の生データ複製ではなく、説明可能かつredactedなレビュー対象として扱う。

## 4. 用語

| 用語 | 意味 |
|---|---|
| dry-run candidate | deterministic matching により一時的に算出された未保存候補 |
| saved suggestion | DBに保存されたマッチ候補 |
| review queue | 人間が優先確認すべき保存済み候補のキュー |
| review event | 承認、却下、アーカイブ、再オープンなどの履歴イベント |
| source evidence | CSV/Gmail/Notion/manual/APIなど、候補の根拠となる出所情報 |
| stale | 保存時点から案件/要員/根拠データが更新され、候補が古くなった状態 |
| promotion blocker | Proposal draftなど後続フローへ進む前に解消すべき停止条件 |

## 5. 対象ユーザーと権限

### 5.1 ロール

| ロール | MVPでの扱い |
|---|---|
| `ADMIN` | 全機能利用可能 |
| `MANAGER` | 全機能利用可能 |
| `SALES` | MVPでは対象外。将来read-only閲覧を検討 |

### 5.2 権限要件

| 操作 | 必要権限 |
|---|---|
| dry-run候補閲覧 | `ADMIN` / `MANAGER` |
| 保存済み候補一覧閲覧 | `ADMIN` / `MANAGER` |
| review queue閲覧 | `ADMIN` / `MANAGER` |
| 候補保存 | `ADMIN` / `MANAGER` + confirmation |
| approve / reject / archive / reopen | `ADMIN` / `MANAGER` |
| source evidence詳細閲覧 | `ADMIN` / `MANAGER`。将来はfield-level権限を検討 |
| audit export | MVP外。将来 `ADMIN` 限定で検討 |

## 6. MVPスコープ

### 6.1 MVPに含める

- dry-run候補の閲覧
- dry-run候補から選択保存
- 保存済み候補一覧
- 保存済み候補詳細
- review queue
- approve
- reject with reason
- archive
- reopen
- review event記録
- 重複保存防止
- stale判定
- duplicate判定
- promotion blocker表示
- PII-safe preview
- source evidence summary表示
- migration未適用時の安全なエラー表示

### 6.2 MVPに含めない

- Proposal作成
- Proposal draft作成
- メールドラフト生成
- メール送信
- AI API呼び出し
- AIによる自動承認
- AI reranking
- Notion API連携
- CSV実データのGitコミット
- market analysisとのスコア統合
- 実名/会社名/メール本文/スキルシート全文をsuggestionに保存
- 物理削除
- 監査ログの外部SIEM連携

## 7. 業務フロー

```text
Project / Person
  -> deterministic matching dry-run
  -> dry-run candidates
  -> reviewer selects candidates
  -> supervised save
  -> saved suggestions
  -> review queue
  -> approve / reject / archive / reopen
  -> approved suggestions
  -> future proposal draft flow
```

重要な境界:

- `GET /api/matches/dry-run` は永続的にread-onlyとする。
- 保存は明示的なmutationでのみ行う。
- 承認済みでも、自動でProposalやメールへ進めない。
- downstreamに進めるには、別要件で定義されるSTOP条件を満たす必要がある。

## 8. 状態設計

### 8.1 Primary Status

MVPのprimary statusは次の5つに限定する。

| status | 意味 | 主な遷移 |
|---|---|---|
| `SUGGESTED` | 保存済み。明示レビュー前 | `NEEDS_REVIEW`, `APPROVED`, `REJECTED`, `ARCHIVED` |
| `NEEDS_REVIEW` | warning/review reasonにより確認優先 | `APPROVED`, `REJECTED`, `ARCHIVED` |
| `APPROVED` | 人間が候補として妥当と判断済み | `ARCHIVED`, 将来 `CONVERTED` |
| `REJECTED` | 不適合として却下 | 明示的 `REOPENED` のみ |
| `ARCHIVED` | active queueから除外 | 明示的 `REOPENED` のみ |

### 8.2 直交フラグ

次の概念はprimary statusに混ぜず、別フィールドとして扱う。

| フラグ | 目的 |
|---|---|
| `stalenessState` | 保存後にProject/Person/sourceが更新されたか |
| `duplicateState` | 既存/過去候補との重複状態 |
| `promotionBlockers[]` | 後続Proposal draftへ進めない理由 |
| `attentionState` | UI上の注意状態 |
| `warningSeverity` | warningの重要度 |

理由:

- status数の増殖を防ぐ。
- review queueの状態遷移を単純に保つ。
- 「承認済みだが後続に進めない」状態を表現できる。

## 9. 機能要件

### 9.1 Dry-run候補閲覧

| ID | 要件 |
|---|---|
| FR-001 | `Project` と `Person` を deterministic scoring で組み合わせた候補を閲覧できる |
| FR-002 | dry-run候補は保存されていない一時結果として表示する |
| FR-003 | dry-run APIはDB書き込みを行わない |
| FR-004 | dry-run APIはmutation風パラメータを拒否する |
| FR-005 | score、score band、reason codes、warning codes、compatibility summaryを表示する |
| FR-006 | raw text、会社名、個人名、メール、住所、本文、スキルシート全文は返さない |

### 9.2 候補保存

| ID | 要件 |
|---|---|
| FR-101 | reviewerはdry-run候補を選択して保存できる |
| FR-102 | 保存前に確認モーダルを表示する |
| FR-103 | 保存APIはconfirmation tokenを必須にする |
| FR-104 | 保存APIは最大件数を制限する |
| FR-105 | 保存APIはclient scoreを信用せず、server-sideで再計算または検証する |
| FR-106 | 保存APIは重複候補をskipまたは既存候補として返す |
| FR-107 | 保存結果は作成件数、skip件数、既存件数、エラー件数のsafe summaryで返す |
| FR-108 | 保存時にreview eventをappendする |

### 9.3 保存済み候補一覧

| ID | 要件 |
|---|---|
| FR-201 | 保存済み候補を一覧表示できる |
| FR-202 | status、score band、warning有無、stale、duplicate、reviewer、作成日で絞り込める |
| FR-203 | score順、新着順、review優先、queue priority順で並び替えできる |
| FR-204 | 一覧にはshort id、counts、codes、timestampsを中心に表示する |
| FR-205 | 一覧でPIIを含む自然文プレビューを主表示しない |

### 9.4 保存済み候補詳細

| ID | 要件 |
|---|---|
| FR-301 | 保存済み候補の詳細を表示できる |
| FR-302 | score breakdownを表示する |
| FR-303 | skill overlap summaryを表示する |
| FR-304 | rate/date/location compatibilityを表示する |
| FR-305 | warning/review flagsを表示する |
| FR-306 | review event timelineを表示する |
| FR-307 | source evidence summaryを表示する |
| FR-308 | stale/duplicate/promotion blockerを表示する |

### 9.5 Review Queue

| ID | 要件 |
|---|---|
| FR-401 | reviewerは確認優先候補をreview queueで確認できる |
| FR-402 | queueは `NEEDS_REVIEW`、`SUGGESTED`、warningあり、review reasonありを優先する |
| FR-403 | queue priorityはpromotion blocker、stale、attention、warning severity、age、score bandを考慮する |
| FR-404 | assignee未設定候補を識別できる |
| FR-405 | queue ageとlast touchedを表示できる |

### 9.6 レビュー操作

| ID | 要件 |
|---|---|
| FR-501 | reviewerは候補をapproveできる |
| FR-502 | reviewerは候補をrejectできる |
| FR-503 | reject時はstructured reason codeを必須にする |
| FR-504 | reviewerは候補をarchiveできる |
| FR-505 | reviewerはrejected/archived候補を明示的にreopenできる |
| FR-506 | すべての状態変更はreview eventとしてappend-onlyで記録する |
| FR-507 | 物理削除は行わない |
| FR-508 | free text noteはMVPでは原則使用しない。使う場合はredaction guardを必須にする |

## 10. Reason Taxonomy

### 10.1 System Reason Codes

system reasonは、候補が上がった理由を表す。

- `MATCH_SKILL_REQUIRED_OVERLAP`
- `MATCH_SKILL_NICE_TO_HAVE_OVERLAP`
- `MATCH_RATE_COMPATIBLE`
- `MATCH_RATE_UNKNOWN`
- `MATCH_RATE_MISMATCH`
- `MATCH_START_COMPATIBLE`
- `MATCH_START_UNKNOWN`
- `MATCH_LOCATION_COMPATIBLE`
- `MATCH_LOCATION_UNKNOWN`
- `MATCH_ROLE_COMPATIBLE`

### 10.2 System Warning Codes

system warningは、候補の品質や不確実性を表す。

- `MATCH_MISSING_PROJECT_SKILLS`
- `MATCH_MISSING_PERSON_SKILLS`
- `MATCH_LOW_FIELD_COVERAGE`
- `MATCH_REVIEW_REQUIRED`
- `MATCH_STALE_PROJECT`
- `MATCH_STALE_PERSON`
- `MATCH_STALE_SOURCE`
- `MATCH_DUPLICATE_ACTIVE`
- `MATCH_DUPLICATE_REJECTED`
- `MATCH_DOWNSTREAM_BLOCKED`

### 10.3 Human Decision Reason Codes

human decision reasonは、人間の判断理由を表す。

- `WRONG_ROLE`
- `SKILL_GAP`
- `RATE_MISMATCH`
- `DATE_MISMATCH`
- `LOCATION_MISMATCH`
- `DUPLICATE`
- `STALE_PROJECT`
- `STALE_PERSON`
- `CLIENT_CONFLICT`
- `PERSON_UNAVAILABLE`
- `PROJECT_CLOSED`
- `LOW_CONFIDENCE`
- `OTHER`

### 10.4 Taxonomy要件

| ID | 要件 |
|---|---|
| RT-001 | system reason、system warning、human decision reasonを混在させない |
| RT-002 | rejectではhuman decision reasonを1つ以上必須にする |
| RT-003 | reason codeは将来の集計/学習に使えるよう構造化する |
| RT-004 | free text noteをreasonの代替にしない |

## 11. データモデル要件

### 11.1 `MatchSuggestion`

保存済み候補を表す。

推奨フィールド:

| フィールド | 要件 |
|---|---|
| `id` | UUID |
| `projectId` | `Project` 参照 |
| `personId` | `Person` 参照 |
| `status` | primary status |
| `score` | 保存時点の整数score |
| `scoreBand` | `HIGH` / `MEDIUM` / `LOW` / `REVIEW` |
| `scoringVersion` | scoring logicのversion |
| `evaluatedAt` | score算出日時 |
| `projectVersion` | 保存時に見たProject更新versionまたはupdatedAt |
| `personVersion` | 保存時に見たPerson更新versionまたはupdatedAt |
| `sourceSnapshotHash` | source/evidence snapshotのhash |
| `suggestionPairKey` | `projectId + personId` の業務重複防止キー |
| `suggestionRevisionKey` | `projectId + personId + scoringVersion + sourceSnapshotHash` の版キー |
| `attentionState` | UI注意状態 |
| `stalenessState` | `FRESH` / `STALE_PROJECT` / `STALE_PERSON` / `STALE_SOURCE` / `UNKNOWN` |
| `duplicateState` | `NONE` / `ACTIVE_DUPLICATE` / `PAST_REJECTED` / `SUPERSEDED` |
| `promotionBlockers` | 後続フロー停止理由配列 |
| `warningCount` | warning count |
| `reviewReasonCount` | review reason count |
| `reasonCodes` | system reason codes |
| `warningCodes` | system warning codes |
| `reviewFlags` | review flags |
| `compatibilitySummary` | rate/date/location/role等のsafe summary |
| `skillOverlapSummary` | skill overlap counts |
| `redactedPreview` | PII-safe preview |
| `reviewAssigneeUserId` | 担当reviewer。MVPでは任意 |
| `createdByUserId` | 保存者 |
| `reviewedByUserId` | 最終reviewer |
| `reviewedAt` | 最終review日時 |
| `archivedAt` | archive日時 |
| `lockVersion` | 楽観ロック用整数 |
| `createdAt` / `updatedAt` | timestamps |

### 11.2 `MatchSuggestionReviewEvent`

状態変更や判断履歴をappend-onlyで表す。

推奨フィールド:

| フィールド | 要件 |
|---|---|
| `id` | UUID |
| `interactionId` | batch saveや一連の操作を束ねるID |
| `matchSuggestionId` | 対象候補 |
| `action` | `CREATED` / `SAVED` / `REVIEW_REQUESTED` / `APPROVED` / `REJECTED` / `ARCHIVED` / `REOPENED` |
| `fromStatus` | 変更前status |
| `toStatus` | 変更後status |
| `actorUserId` | 操作者 |
| `actorRole` | 操作者role |
| `reasonCodes` | human decision reason |
| `result` | `SUCCEEDED` / `FAILED` |
| `policyVersion` | 適用したpolicy version |
| `requestId` | API request ID |
| `uiSurface` | 操作画面 |
| `entityVersionsSeen` | 操作時に見ていたProject/Person version |
| `stalenessStateAtDecision` | 操作時のstale状態 |
| `noteRedacted` | 任意。MVPでは原則未使用 |
| `createdAt` | event日時 |

### 11.3 `MatchSuggestionSourceRecord`

保存済み候補とsource trackingを接続する。

MVPでは任意項目として扱う。source evidenceがなくても既存Project/Personの候補保存は可能にする。

推奨role:

- `PROJECT_EVIDENCE`
- `PERSON_EVIDENCE`
- `MATCH_EVIDENCE`

## 12. 保存しないデータ

`MatchSuggestion` には次を保存しない。

- 会社名の生値
- 個人名の生値
- メールアドレス
- 電話番号
- 住所
- メール件名
- メール本文
- スキルシート全文
- 添付ファイル本文
- raw CSV row
- raw Notion payload
- local file path
- token
- password
- API key
- connection string
- secret

業務上、会社名や個人名の表示が必要な場合でも、suggestionに複製せず、権限確認後にmaster dataからjoin表示する。

## 13. API要件

### 13.1 Read-only API

| API | 目的 |
|---|---|
| `GET /api/matches/dry-run` | dry-run候補の取得 |
| `GET /api/matches/suggestions` | 保存済み候補一覧 |
| `GET /api/matches/suggestions/:id` | 保存済み候補詳細 |
| `GET /api/matches/suggestions/review-queue` | review queue取得 |

共通要件:

- server stateを変更しない。
- mutation風パラメータを拒否する。
- responseはPII-safe summaryを中心にする。
- migration未適用時は安全な503を返す。

拒否するパラメータ例:

- `save`
- `apply`
- `create`
- `createProposal`
- `draftEmail`
- `sendEmail`
- `write`
- `delete`

### 13.2 Mutation API

| API | 目的 |
|---|---|
| `POST /api/matches/suggestions` | 候補保存 |
| `PATCH /api/matches/suggestions/:id/decision` | approve / reject |
| `PATCH /api/matches/suggestions/:id/archive` | archive |
| `POST /api/matches/suggestions/:id/reopen` | reopen |

### 13.3 保存API要件

| ID | 要件 |
|---|---|
| API-101 | `Idempotency-Key` を受け付ける |
| API-102 | 同一 `Idempotency-Key` の再送は同一結果を返す |
| API-103 | 同一keyでpayloadが不一致の場合はエラーにする |
| API-104 | `confirmation` に `SAVE_MATCH_SUGGESTIONS` を要求する |
| API-105 | `limit` を必須にし、最大値を設定する |
| API-106 | server-side recompute / validateを行う |
| API-107 | `suggestionPairKey` / `suggestionRevisionKey` により業務重複を制御する |
| API-108 | Proposal / DistributionLog / Mail へ書き込まない |

### 13.4 更新API要件

| ID | 要件 |
|---|---|
| API-201 | `If-Match` または `lockVersion` を必須にする |
| API-202 | version不一致時は `412 Precondition Failed` または `409 Conflict` を返す |
| API-203 | 不正遷移を拒否する |
| API-204 | reject時はreason codeを必須にする |
| API-205 | 成功時はreview eventをappendする |
| API-206 | physical deleteを行わない |

## 14. 整合性要件

### 14.1 三層の整合性制御

| 制御 | 目的 | 例 |
|---|---|---|
| 業務重複防止 | 同じ案件 x 要員候補の重複防止 | `suggestionPairKey` / `suggestionRevisionKey` |
| リトライ安全性 | POST再送の安全性 | `Idempotency-Key` |
| 同時更新防止 | 複数reviewerの競合防止 | `If-Match` / `lockVersion` |

これらを混同しない。

### 14.2 重複方針

- activeな同一pairは原則1件にする。
- scoringVersionまたはsourceSnapshotHashが変わった場合は新revisionとして扱える。
- 新revision作成時、旧active候補は `ARCHIVED` または `SUPERSEDED` 扱いにする。
- `REJECTED` の同一revisionは自動再作成しない。
- `REJECTED` / `ARCHIVED` の復帰は明示的 `reopen` のみ。

### 14.3 Stale方針

候補保存時に見ていた `Project` / `Person` / source evidence のversionと、現在値を比較する。

staleの例:

- Projectが更新された。
- Personが更新された。
- source recordが更新された。
- scoringVersionが古い。
- related source evidenceがarchiveされた。

stale候補はreview queueで目立たせ、approve時には再確認または再計算を要求する。

## 15. STOP条件

`APPROVED` であっても、次の条件がある場合はProposal draftやメール作成に進めない。

- Projectが保存時点から更新されている。
- Personが保存時点から更新されている。
- source evidenceが必須なのに不足している。
- `critical` warningが残っている。
- duplicate判定が残っている。
- 直近の `REJECTED` と同一条件で再提案されている。
- PII redaction検査に失敗している。
- reviewerの最終確認が完了していない。
- target company/contactが未定義。
- sales mail accountが未定義。
- Proposal/email用の別要件が未承認。

## 16. 画面要件

### 16.1 画面構成

`/matches` 配下で次のビューを持つ。

| ビュー | 目的 |
|---|---|
| Dry-run candidates | 未保存候補の確認 |
| Saved suggestions | 保存済み候補一覧 |
| Review queue | 優先レビュー |
| Archive / rejected history | 監査・再発防止 |

### 16.2 一覧列

- suggestion short ID
- project short ID
- person short ID
- status
- score
- score band
- attention state
- stale badge
- duplicate badge
- warning count
- review reason count
- promotion blocker count
- source evidence count
- assignee
- reviewer
- updatedAt
- reviewedAt

### 16.3 詳細ペイン

- score breakdown
- required skill overlap
- nice-to-have skill overlap
- technology overlap
- rate compatibility
- date compatibility
- location compatibility
- role compatibility
- warning codes
- review flags
- source evidence summary
- stale state
- duplicate state
- promotion blockers
- decision timeline
- human decision reason

### 16.4 操作UI

| 操作 | UI要件 |
|---|---|
| Save selected | 確認モーダル、保存件数、書き込み対象、非ゴールを表示 |
| Approve | blockerがゼロの場合のみ有効 |
| Reject | reason code必須 |
| Archive | active queueから外すが履歴は残る文言にする |
| Reopen | 過去statusとreasonを表示して確認する |

### 16.5 UI文言方針

- 「承認」は「提案候補として妥当」と表現し、送信やProposal作成を意味させない。
- 「アーカイブ」は「非表示/保留」であり削除ではないことを明示する。
- 「保存」は「候補保存」であり、Project/Person自体を変更しないことを明示する。

## 17. PII / Redaction / 監査要件

### 17.1 PII要件

| ID | 要件 |
|---|---|
| SEC-001 | suggestionにはraw textやPIIを保存しない |
| SEC-002 | API responseにメール、電話、住所、本文、ローカルパス、secretを返さない |
| SEC-003 | docs/test outputに実名、メール、本文、ローカルパス、secretを出さない |
| SEC-004 | redactedPreviewはsafe keyとbucket/count/code中心にする |
| SEC-005 | rare combinationによる再識別リスクに注意する |

### 17.2 監査要件

| ID | 要件 |
|---|---|
| AUD-001 | review eventはappend-onlyで記録する |
| AUD-002 | 「いつ、誰が、何を、なぜ、どうしたか」を追跡できる |
| AUD-003 | batch saveや一連の操作は `interactionId` で束ねられる |
| AUD-004 | log/auditへのアクセスは将来監査できる設計にする |
| AUD-005 | physical deleteではなくarchiveを使う |
| AUD-006 | audit exportを将来追加できるschemaにする |

## 18. CSV/source tracking連携方針

source trackingは、CSV/Gmail/Notion/manual/APIなどの「由来」を扱う。

match suggestionは、Project x Person の「レビュー判断」を扱う。

連携方針:

- `SourceRecord` を `MatchSuggestion` の代替にしない。
- `EntitySourceLink` を Project x Person のマッチ表現に流用しない。
- source evidenceは `MatchSuggestionSourceRecord` で任意接続する。
- MVPではsource evidence必須にしない。
- CSV/Gmail/Notionのraw payloadはsuggestionへ複製しない。

## 19. Market Analysis連携方針

market analysisは、営業がどの市場セルを攻めるかを判断するための補助情報である。

MVPではmatch suggestionのfit scoreと混ぜない。

将来連携する場合:

- `prioritySignal` として別表示する。
- `fit score` とは別軸で説明する。
- market analysisの集計値を候補承認の自動根拠にしない。
- review queueの並び替え補助として利用する。

## 20. テスト/検証要件

| ID | 要件 |
|---|---|
| TEST-001 | dry-run APIがDBを書き込まないこと |
| TEST-002 | read-only APIがmutation風パラメータを拒否すること |
| TEST-003 | 保存APIがconfirmationなしで失敗すること |
| TEST-004 | 保存APIがlimit超過で失敗すること |
| TEST-005 | 保存APIが同一 `Idempotency-Key` の再送に同一結果を返すこと |
| TEST-006 | 同一 `Idempotency-Key` でpayload不一致時に失敗すること |
| TEST-007 | 同一pair/revisionを重複作成しないこと |
| TEST-008 | rejected/archivedの自動再作成を防ぐこと |
| TEST-009 | stale候補のapprove時に再確認または失敗すること |
| TEST-010 | reject時にreason codeが必須であること |
| TEST-011 | 不正status遷移を拒否すること |
| TEST-012 | `If-Match` / `lockVersion` 不一致で競合を返すこと |
| TEST-013 | API outputにPII/secret/local pathが混ざらないこと |
| TEST-014 | Proposal / DistributionLog / Mailへ書き込まないこと |
| TEST-015 | migration未適用時に安全な503を返すこと |

## 21. 段階的リリース計画

| Phase | 内容 | DB write |
|---|---|---|
| 0 | 要件定義/設計確定 | なし |
| 1 | schema/migration追加 | migration fileのみ |
| 2 | saved suggestions read-only API | なし |
| 3 | saved suggestions read-only UI | なし |
| 4 | supervised save API/UI | `match_suggestions` / `review_events` のみ |
| 5 | review update API/UI | status / `review_events` のみ |
| 6 | stale/source evidence/audit export強化 | 追加監査/参照のみ |
| 7 | proposal draft要件定義 | なし |
| 8 | proposal draft実装 | 別承認 |
| 9 | email draft/send要件定義 | なし |

## 22. 成功条件

- reviewerが候補を保存し、後からreview queueで確認できる。
- reviewerがapprove/reject/archive/reopenでき、全操作が履歴に残る。
- 同一候補の重複保存が抑止される。
- stale/duplicate/blockerがstatusと分離して表示される。
- API/画面/テスト出力にPIIやsecretが混入しない。
- Proposal作成やメール送信がMVPから完全に分離されている。
- 将来のproposal/email/AI rerankingに進むための安全境界が崩れていない。

## 23. 未決事項

| ID | 論点 | 推奨 |
|---|---|---|
| OQ-001 | `APPROVED` は下流進行可能まで意味するか | 「候補として妥当」に限定し、downstream readinessは別管理 |
| OQ-002 | `NEEDS_REVIEW` をstatusに残すか | MVPでは残す |
| OQ-003 | free text noteを許可するか | MVPでは原則禁止。許可するならredaction guard必須 |
| OQ-004 | source evidenceを保存時必須にするか | MVPでは任意 |
| OQ-005 | `scoreBand` をenumにするかstringにするか | 初期はstringでもよい。要migration方針確認 |
| OQ-006 | `lockVersion` と `ETag/If-Match` の両方を使うか | APIでは `If-Match`、DBでは `lockVersion` を推奨 |
| OQ-007 | `SALES` にread-only閲覧を許可するか | MVP後に検討 |
| OQ-008 | review queueにassignee/SLAを入れるか | MVPで `assignee` と `age` は入れる |
| OQ-009 | rejected候補の再出現条件 | 同一revisionは自動再出現なし。新revisionは履歴表示付きで可 |
| OQ-010 | market analysis接続時期 | MVP外。将来 `prioritySignal` として接続 |

## 24. 要件定義上の結論

マッチ候補保存/レビュー画面は、候補を便利に保存するだけの画面ではない。

本機能の本質は、deterministic matchingの出力を人間が監査可能に判断し、将来のProposal/email/AI補助へ安全に接続するためのレビュー境界を作ることである。

したがって、MVPでは次を最優先する。

1. dry-runとsaved suggestionを分離する。
2. suggestionをProject/Personの複製ではなく導出レビュー対象として扱う。
3. PIIとraw payloadを最小化する。
4. review eventをappend-onlyで残す。
5. 重複、リトライ、同時更新を別々に制御する。
6. stale/duplicate/blockerをstatusに混ぜない。
7. Proposal作成とメール送信を別フェーズへ分離する。
