# マッチ候補保存/レビュー画面 詳細設計書

## 1. 目的

本書は、マッチ候補保存/レビュー画面のPhase 1-AからPhase 1-Eまでの詳細設計を定義する。

Phase 1-Aは実装済みの内容を設計として追認し、Phase 1-B以降は実装前の詳細方針を定義する。

## 2. ディレクトリ設計

想定する主なファイル配置は以下とする。

```text
prisma/schema.prisma
prisma/migrations/<timestamp>_match_suggestions_phase_1a/migration.sql
lib/matching/match-suggestion-schema.ts
lib/matching/match-suggestion-read-api.ts
lib/matching/match-suggestion-write-api.ts
lib/matching/match-suggestion-review-workflow.ts
lib/matching/match-suggestion-safe-serializer.ts
app/api/matches/suggestions/route.ts
app/api/matches/suggestions/[id]/route.ts
app/api/matches/suggestions/review-queue/route.ts
components/matching/SavedSuggestionsPanel.jsx
components/matching/ReviewQueuePanel.jsx
components/matching/MatchSuggestionDetailPane.jsx
```

Phase 1-Bではread-only APIに必要なファイルだけを追加する。

## 3. Phase 1-A 詳細設計

### 3.1 Prisma enum

追加するenum:

- `MatchSuggestionStatus`
- `MatchSuggestionReviewEventType`
- `MatchStalenessState`
- `MatchDuplicateState`
- `MatchSourceEvidenceState`
- `MatchWarningSeverity`
- `MatchAttentionState`
- `MatchDownstreamReadiness`
- `MatchSuggestionSourceType`
- `MatchSuggestionEvidenceRole`

### 3.2 `MatchSuggestion`

主なfield:

- `id`
- `tenantId`
- `organizationId`
- `projectId`
- `personId`
- `suggestionPairKey`
- `suggestionRevisionKey`
- `status`
- `score`
- `scoreBand`
- `systemReasonCodes`
- `systemWarningCodes`
- `warningSeverity`
- `stalenessState`
- `duplicateState`
- `sourceEvidenceState`
- `attentionState`
- `promotionBlockers`
- `promotionEligible`
- `downstreamReadiness`
- `scoringVersion`
- `taxonomyVersion`
- `redactionPolicyVersion`
- `createdByUserId`
- `lastReviewedAt`
- `lastReviewedByUserId`
- `lockVersion`

保存禁止:

- 会社名
- 個人名
- email
- phone
- address
- mail subject
- mail body
- skill sheet full text
- raw CSV row
- local path
- secret

### 3.3 index

必須index:

- unique `tenantId + suggestionPairKey`
- unique `tenantId + suggestionRevisionKey`
- `tenantId + status + createdAt`
- `tenantId + status + lastReviewedAt`
- `tenantId + warningSeverity`
- `tenantId + stalenessState`
- `tenantId + duplicateState`
- `tenantId + sourceEvidenceState`
- `tenantId + promotionEligible`

### 3.4 `MatchSuggestionReviewEvent`

append-only前提。

主なfield:

- `tenantId`
- `organizationId`
- `suggestionId`
- `eventType`
- `fromStatus`
- `toStatus`
- `actorUserId`
- `reasonCode`
- `systemSnapshot`
- `requestId`
- `idempotencyKey`

Phase 1-Bではread-onlyで参照するだけ。Phase 1-D/Eでwriteする。

### 3.5 `MatchSuggestionSourceRecord`

候補とsource trackingのbridge。

主なfield:

- `tenantId`
- `organizationId`
- `suggestionId`
- `sourceType`
- `sourceRecordId`
- `evidenceRole`
- `safeSummary`

raw payloadは保存しない。

## 4. Phase 1-B 詳細設計

Phase 1-Bの詳細は `match-suggestion-phase-1b-detail-design.md` に分割して記載する。本書では全体との接続点を定義する。

### 4.1 read-only service

read-only serviceは以下を提供する。

- tenant context parse
- query parse
- Prisma where builder
- Prisma orderBy builder
- safe serializer
- migration missing判定
- list/detail/review queue fetcher

### 4.2 DB write禁止

Phase 1-Bのserviceで使用可能なPrisma method:

- `findMany`
- `findFirst`
- `count`

使用禁止:

- `create`
- `createMany`
- `update`
- `updateMany`
- `delete`
- `deleteMany`
- `upsert`
- `$executeRaw`
- `$queryRaw` は原則禁止。migration missing判定のためにも使用しない。

### 4.3 responseに含めるもの

- ID参照
- status
- score
- flags
- reason/warning codes
- blockers
- readiness
- timestamps
- versions
- review event safe fields
- source record safe fields

### 4.4 responseに含めないもの

- Project title
- Person name
- Company name
- Contact name
- Email
- Phone
- Mail subject/body
- Skill sheet body
- Raw source

## 5. Phase 1-C 詳細設計

### 5.1 UI component

UIは以下の構成にする。

| Component | 責務 |
| --- | --- |
| `SavedSuggestionsPanel` | 保存済み候補一覧。 |
| `ReviewQueuePanel` | レビュー対象候補一覧。 |
| `MatchSuggestionDetailPane` | 候補詳細。 |
| `MatchSuggestionStatusBadge` | Primary Status表示。 |
| `DownstreamReadinessBadge` | 下流準備状態表示。 |
| `MatchSuggestionFilterBar` | filter/sort/pagination操作。 |

### 5.2 UI state

主なstate:

- selectedSuggestionId
- filters
- sort
- page
- pageSize
- loading
- error

### 5.3 PII-safe UI

UIはAPI responseに存在するfieldだけを表示する。Project/Person/Company/Mailへ追加fetchしない。

一覧・詳細ともに名称表示ではなくsafe refを使う。

例:

```text
Project ref: <uuid-short>
Person ref: <uuid-short>
```

### 5.4 Review Queue表示

表示項目:

- status
- queuePriority
- queueReasons
- warningSeverity
- stalenessState
- duplicateState
- sourceEvidenceState
- reviewAgeHours

## 6. Phase 1-D 詳細設計

### 6.1 save API

`POST /api/matches/suggestions`

入力:

- tenantId
- dryRunCandidateIdまたはcandidate payload
- projectId
- personId
- suggestionPairKey
- suggestionRevisionKey
- score
- scoreBand
- systemReasonCodes
- systemWarningCodes
- sourceRecords
- version fields

必須:

- tenantId
- projectId
- personId
- suggestionPairKey
- suggestionRevisionKey
- scoringVersion
- taxonomyVersion
- redactionPolicyVersion

### 6.2 idempotency

`Idempotency-Key` を受け付ける。

保存mutationでは `tenantId + Idempotency-Key` を `MatchSuggestionIdempotencyRecord` に保存する。レコードにはrequest fingerprint、resultType、suggestionIdを保持する。

- 同一key + 同一payload: 既存結果をreplayする。
- 同一key + payload不一致: `409 IDEMPOTENCY_PAYLOAD_MISMATCH` を返す。
- replay時はreview eventを追加しない。

### 6.3 duplicate

`tenantId + suggestionPairKey` で既存active候補を探す。

既存候補がある場合:

- 既存recordを返す
- 新規 `MatchSuggestion` は作成しない
- review eventは作成しない
- idempotency recordに `resultType = DUPLICATE` を保存する

### 6.4 event

新規保存が成立した場合のみ `SAVED` eventを作る。

duplicate応答では「保存済み候補を返す」だけであり、新規保存ではないため `SAVED` eventを作らない。

## 7. Phase 1-E 詳細設計

### 7.1 transition

状態遷移は要件定義v0.2の表に限定する。

### 7.2 lockVersion

mutationは `lockVersion` または `If-Match` を必須にする。

更新条件:

```ts
where: {
  id,
  tenantId,
  lockVersion
}
```

更新時:

```ts
lockVersion: { increment: 1 }
```

### 7.3 reason

reject / reopenはreason必須。

MVPで許可するreasonのみ受け付ける。`OTHER` は禁止。

### 7.4 event append

status更新とreview event追加はtransactionで行う。

transaction内:

1. current suggestion取得
2. transition validation
3. suggestion update
4. review event create

## 8. Serializer詳細

### 8.1 list item

list itemは詳細より少ないfieldだけ返す。

### 8.2 detail

detailはreview event/source recordを含めるが、systemSnapshotはPhase 1-Bでは返さない。

### 8.3 error response

error responseには以下だけを含める。

- `message`
- `code`
- `details` optional

detailsにもPIIを入れない。

## 9. Tenant詳細

### 9.1 Phase 1のtenant取得

既存authにtenantがないため、Phase 1ではquery/headerから取得する。

### 9.2 将来方針

将来はsession userにtenant/organizationを持たせ、query/header指定を内部的に検証する。

## 10. Migration missing詳細

Prisma error code:

- `P2021`
- `P2022`

PostgreSQL code:

- `42P01`
- `42703`

これらをschema not readyとして503に変換する。

## 11. セキュリティ詳細

- APIはADMIN/MANAGERのみ。
- tenantId必須。
- PII join禁止。
- raw source禁止。
- error/logにPII禁止。
- mutationではlockVersion必須。

## 12. 結合ポイント

| 結合先 | Phase | 方針 |
| --- | --- | --- |
| matching dry-run | 1-D | save inputとして接続。 |
| project/person master | 1-D/E以降 | ID参照のみ。PII joinはしない。 |
| source tracking | 1-D | source bridgeとして接続。 |
| proposal/email | Phase 3 | Phase 1では接続しない。 |

## 13. 実装順序

1. Phase 1-A schemaを確定する。
2. Phase 1-B read-only APIを実装する。
3. Phase 1-C UI下地を実装する。
4. Phase 1-D save API/UIを実装する。
5. Phase 1-E review mutationを実装する。
6. 結合テストを追加する。
7. コンポーネントテストを追加する。
