# マッチ候補保存/レビュー画面 Phase 1-B 詳細設計書

## 1. モジュール構成

Phase 1-Bでは、route handlerを薄く保ち、ロジックを `lib/matching` に集約する。

| ファイル | 役割 |
| --- | --- |
| `app/api/matches/suggestions/route.ts` | 一覧APIのNext.js route handler。 |
| `app/api/matches/suggestions/[id]/route.ts` | 詳細APIのNext.js route handler。 |
| `app/api/matches/suggestions/review-queue/route.ts` | Review Queue APIのNext.js route handler。 |
| `lib/matching/match-suggestion-read-api.ts` | query parse、where/order builder、serializer、service関数。 |
| `lib/matching/match-suggestion-schema.ts` | Phase 1-Aで追加したenum/状態/禁止事項定義。 |
| `lib/matching/match-suggestion-read-api.test.ts` | read-only API helperの単体テスト。 |

## 2. 依存関係

route handlerは以下に依存する。

- `NextResponse`
- `prisma`
- `requireAnyRole`
- `authErrorResponse`
- `lib/matching/match-suggestion-read-api`

API helperはNext.jsに依存しない。これによりnode:testで直接検証できる。

## 3. Tenant Context

### 3.1 取得方法

tenantIdは以下の順で取得する。

1. `request.url` の `tenantId`
2. request header `x-tenant-id`

### 3.2 validation

tenantIdは以下の条件を満たす必要がある。

- 1文字以上80文字以下
- 英数字、underscore、hyphen、colonのみ

不正なtenantIdは400を返す。

### 3.3 query適用

すべてのqueryは以下のようにtenant境界を含む。

```ts
where: {
  tenantId,
  ...
}
```

詳細APIでは以下の条件を両方満たす必要がある。

```ts
where: {
  id,
  tenantId
}
```

Prismaのsingle unique queryでは `id + tenantId` の複合uniqueがないため、`findFirst` を使う。

## 4. Query Parser

### 4.1 pagination

入力:

- `page`
- `pageSize`

処理:

- 数値変換できない場合は400
- `page < 1` は400
- `pageSize < 1` は400
- `pageSize > 100` は100へ丸める

### 4.2 filter

対応filter:

- `status`
- `warningSeverity`
- `stalenessState`
- `duplicateState`
- `sourceEvidenceState`
- `createdAtFrom`
- `createdAtTo`
- `lastReviewedAtFrom`
- `lastReviewedAtTo`

enum filterはcomma-separated listを許可する。

例:

```text
status=SUGGESTED,NEEDS_REVIEW
warningSeverity=HIGH,CRITICAL
```

不正enumは400を返す。

date filterはISO-8601または `YYYY-MM-DD` を受け付ける。解析不能な日付は400を返す。

### 4.3 sort

対応sort:

- `createdAt`
- `updatedAt`
- `score`
- `lastReviewedAt`

sortOrder:

- `asc`
- `desc`

未指定時:

```ts
{ createdAt: "desc" }
```

## 5. Prisma Query設計

### 5.1 一覧select

一覧では以下だけをselectする。

- `id`
- `tenantId`
- `organizationId`
- `projectId`
- `personId`
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
- `createdAt`
- `updatedAt`
- `lastReviewedAt`
- `lockVersion`

Project / Person / User / Company / MailNotificationへjoinしない。

### 5.2 詳細select

詳細では一覧selectに加えて以下をselectする。

- `suggestionPairKey`
- `suggestionRevisionKey`
- `scoringVersion`
- `taxonomyVersion`
- `redactionPolicyVersion`
- `createdByUserId`
- `lastReviewedByUserId`
- `reviewEvents`
- `sourceRecords`

reviewEvents:

- `id`
- `eventType`
- `fromStatus`
- `toStatus`
- `actorUserId`
- `reasonCode`
- `createdAt`
- `requestId`
- `idempotencyKey`

sourceRecords:

- `id`
- `sourceType`
- `sourceRecordId`
- `evidenceRole`
- `safeSummary`
- `createdAt`

`systemSnapshot` はPhase 1-Bでは返さない。safe summaryであっても中身の検査が未実装のため、詳細APIからは除外する。

## 6. Serializer設計

### 6.1 Decimal handling

Prisma DecimalはJSON化しづらいため、scoreはstringまたはnullで返す。

```ts
score: record.score?.toString() ?? null
```

### 6.2 Date handling

DateはISO stringへ変換する。

```ts
createdAt: record.createdAt.toISOString()
```

### 6.3 Safe refs

`projectId` と `personId` は以下のshapeにする。

```json
{
  "projectRef": { "id": "..." },
  "personRef": { "id": "..." }
}
```

名称・summary・本文は返さない。

## 7. Review Queue設計

### 7.1 対象条件

review queueは以下を基本対象とする。

```ts
status in ["SUGGESTED", "NEEDS_REVIEW"]
```

queryでstatusが指定された場合も、この2つ以外は受け付けない。

### 7.2 queuePriority算出

queuePriorityは永続化しない。

算出ルール:

| 条件 | 加点 |
| --- | --- |
| `status = NEEDS_REVIEW` | +30 |
| `warningSeverity = CRITICAL` | +50 |
| `warningSeverity = HIGH` | +30 |
| `sourceEvidenceState = REQUIRED_MISSING` | +25 |
| `stalenessState = STALE` | +20 |
| `duplicateState = POSSIBLE_DUPLICATE` | +15 |
| `duplicateState = DUPLICATE_CONFIRMED` | +30 |
| review age 24h超 | +10 |
| review age 72h超 | +20 |

### 7.3 queueReasons

queueReasonsには、priority算出に使った理由codeを配列で返す。

例:

```json
["STATUS_NEEDS_REVIEW", "WARNING_HIGH", "STALE"]
```

Phase 1-BではDB paginationを優先するため、queuePriorityによる全件並び替えは行わない。APIは `queuePriority` と `queueReasons` を返し、UI側でページ内の強調表示に使う。queue全体のpriority sortが必要になった場合は、Phase 1-C以降で専用queryまたは永続化しないrank算出方式を再設計する。

## 8. Error設計

### 8.1 standard error

```json
{
  "message": "Invalid query parameter",
  "code": "INVALID_QUERY"
}
```

### 8.2 tenant error

tenantId未指定:

```json
{
  "message": "tenantId is required",
  "code": "TENANT_REQUIRED"
}
```

tenantId不正:

```json
{
  "message": "tenantId is invalid",
  "code": "TENANT_INVALID"
}
```

### 8.3 migration missing

Prisma error `P2021`、`P2022`、PostgreSQL `42P01`、`42703` 相当を検出した場合、503を返す。

```json
{
  "message": "Match suggestion schema is not ready",
  "code": "MATCH_SUGGESTION_SCHEMA_NOT_READY"
}
```

## 9. API route責務

route handlerは以下だけを行う。

1. `requireAnyRole(request, ["ADMIN", "MANAGER"])`
2. tenant contextの取得
3. query parser呼び出し
4. service関数呼び出し
5. errorをresponseへ変換

route handler内にPII joinやbusiness logicを書かない。

## 10. テスト容易性

`match-suggestion-read-api.ts` は以下をexportする。

- `parseTenantContext`
- `parseSuggestionListQuery`
- `buildSuggestionWhere`
- `buildSuggestionOrderBy`
- `serializeSuggestionListItem`
- `serializeSuggestionDetail`
- `computeReviewQueuePriority`
- `isMatchSuggestionSchemaMissingError`
- `fetchSuggestionList`
- `fetchSuggestionDetail`
- `fetchReviewQueue`

unit testでは、Prisma clientのmock objectを渡してDB writeが呼ばれないことを確認できる。

## 11. Phase 1-Cへの接続

UIはこのresponse shapeに依存する。

Phase 1-Cで追加するUIは以下を想定する。

- `SavedSuggestionsPanel`
- `ReviewQueuePanel`
- `MatchSuggestionStatusBadge`
- `DownstreamReadinessBadge`

Phase 1-BでUI下地を入れる場合、APIの呼び出し処理はまだ薄くし、propsにfixtureを渡して表示確認できる状態に留める。
