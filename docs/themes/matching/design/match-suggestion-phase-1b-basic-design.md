# マッチ候補保存/レビュー画面 Phase 1-B 基本設計書

## 1. 目的

Phase 1-Bでは、Phase 1-Aで追加した `MatchSuggestion` 系schemaを前提に、保存済みマッチ候補を安全に閲覧するread-only APIを実装する。

本フェーズの目的は、候補保存やレビュー判断をまだ実行せず、保存済み候補の一覧、詳細、レビューキューをPII-safeに返すためのAPI境界を作ることである。

## 2. 対象範囲

### 2.1 実装対象

- `GET /api/matches/suggestions`
- `GET /api/matches/suggestions/:id`
- `GET /api/matches/suggestions/review-queue`
- API用safe serializer / mapper
- filter / pagination / sort
- tenant境界チェック
- PII-safe response
- migration未適用時の安全な503
- API helperの単体テスト

### 2.2 余力対象

- Saved suggestions / Review queue UI下地
- UIコンポーネントテストに向けたprops型とfixtureの整理

### 2.3 対象外

- 候補保存API
- approve / reject / archive / reopen API
- Proposal draft作成
- email draft作成
- email送信
- DistributionLog作成
- AI API呼び出し
- seed/import実行
- PII detail join
- raw source evidence表示
- production DB操作

## 3. 設計原則

### 3.1 read-only境界

Phase 1-BのAPIはDBを書き込まない。Prismaでは `findMany`、`findUnique`、`count` などのread操作だけを使用する。

review eventの作成、last viewedの更新、queue priority永続化なども行わない。

### 3.2 PII-safe response

APIレスポンスには以下を含めない。

- 会社名
- 個人名
- メールアドレス
- 電話番号
- 住所
- メール件名
- メール本文
- スキルシート全文
- raw CSV row
- raw Notion payload
- local path
- token / password / API key / connection string / secret

Phase 1-Bでは `Project`、`Person`、`Company`、`CompanyContact`、`MailNotification` へjoinしない。レスポンスは `projectId`、`personId` などの内部参照IDと、`MatchSuggestion` 自身に保存されたsafe metadataだけで構成する。

### 3.3 tenant境界

すべてのread APIは `tenantId` を必須とする。

Phase 1-B時点では既存auth sessionにtenant情報が存在しないため、API利用者は以下のいずれかでtenantを指定する。

- query parameter: `tenantId`
- request header: `x-tenant-id`

両方が指定された場合はquery parameterを優先する。tenantIdが未指定または空文字の場合はDBへアクセスせず、400を返す。

すべてのPrisma queryは `where.tenantId = tenantId` を含める。

### 3.4 migration未適用時の503

Phase 1-B APIは、新テーブルがDBへ未適用の環境で呼ばれる可能性がある。

`match_suggestions`、`match_suggestion_review_events`、`match_suggestion_source_records` が存在しない場合、APIは500ではなく503を返す。レスポンスにはPIIを含めず、以下のような安全なmessage/codeにする。

```json
{
  "message": "Match suggestion schema is not ready",
  "code": "MATCH_SUGGESTION_SCHEMA_NOT_READY"
}
```

## 4. API一覧

### 4.1 `GET /api/matches/suggestions`

保存済み候補の一覧を返す。

用途:

- 保存済み候補一覧画面
- status別フィルタ
- stale / duplicate / warningの絞り込み
- ページングされた一覧表示

### 4.2 `GET /api/matches/suggestions/:id`

保存済み候補の詳細を返す。

用途:

- 詳細ペイン
- safe summary確認
- review event履歴確認
- source evidence safe summary確認

### 4.3 `GET /api/matches/suggestions/review-queue`

レビュー対象候補のqueueを返す。

対象status:

- `SUGGESTED`
- `NEEDS_REVIEW`

queue priorityはDBに保存せず、APIレスポンス時に算出する。

## 5. Response設計

### 5.1 一覧response

```json
{
  "items": [],
  "pageInfo": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "filters": {},
  "sort": {
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

### 5.2 一覧item

```json
{
  "id": "uuid",
  "tenantId": "tenant",
  "organizationId": null,
  "projectRef": { "id": "uuid" },
  "personRef": { "id": "uuid" },
  "status": "SUGGESTED",
  "score": "0.8123",
  "scoreBand": "HIGH",
  "systemReasonCodes": ["SKILL_MATCH"],
  "systemWarningCodes": [],
  "warningSeverity": "NONE",
  "stalenessState": "FRESH",
  "duplicateState": "NONE",
  "sourceEvidenceState": "OPTIONAL_PRESENT",
  "attentionState": "NORMAL",
  "promotionBlockers": [],
  "promotionEligible": false,
  "downstreamReadiness": "NEEDS_CHECK",
  "createdAt": "2026-06-09T00:00:00.000Z",
  "updatedAt": "2026-06-09T00:00:00.000Z",
  "lastReviewedAt": null,
  "lockVersion": 0
}
```

`projectRef` / `personRef` はIDのみを返す。名称や本文は返さない。

### 5.3 詳細response

詳細responseは一覧itemに加えて以下を含める。

- `reviewEvents`
- `sourceRecords`
- `versions`

reviewEventsにはactorの名前やメールをjoinしない。`actorUserId` のみ返す。

sourceRecordsには `safeSummary` を返すが、raw payloadは返さない。

### 5.4 review queue item

review queue itemは一覧itemに加えて以下を含める。

- `queuePriority`
- `queueReasons`
- `reviewAgeHours`

`queuePriority` はAPI内の算出値で、DBには保存しない。

## 6. Filter設計

優先filter:

- `status`
- `warningSeverity`
- `stalenessState`
- `duplicateState`
- `sourceEvidenceState`
- `createdAtFrom`
- `createdAtTo`
- `lastReviewedAtFrom`
- `lastReviewedAtTo`

filter値はenumとして定義済みの値のみ受け付ける。不正値は400を返す。

## 7. Sort設計

優先sort:

- `createdAt`
- `updatedAt`
- `score`
- `lastReviewedAt`

sort order:

- `asc`
- `desc`

未指定時は `createdAt desc` とする。

review queueでは `queuePriority` を永続sort keyにしない。DBから取得した後、API内で算出して並べ替える。

## 8. Pagination設計

paginationは必須とする。

query parameter:

- `page`
- `pageSize`

default:

- `page = 1`
- `pageSize = 20`

limit:

- `pageSize` 最大100
- `page` 最小1

## 9. 認証/認可

Phase 1-Bのread-only APIは、以下のロールに許可する。

- ADMIN
- MANAGER

SALES / VIEWERはMVPでは対象外とする。将来、閲覧専用roleを追加する場合は別PRで権限要件を再定義する。

## 10. UI下地方針

Phase 1-Cに向けて、可能であれば以下を追加する。

- Saved suggestions用の表示コンポーネント
- Review queue用の表示コンポーネント
- API response shapeに合わせたprops型
- PIIを表示しないfixture

ただし、既存画面への本格組み込みはPhase 1-C以降とする。

## 11. Phase 1-B完了条件

- 3つのGET APIが実装されている。
- tenantIdなしでDBへアクセスしない。
- responseにPII/raw dataが含まれない。
- migration未適用時に503を返せる。
- paginationが必須である。
- filter/sortが定義済み値で制御されている。
- API helperのテストが存在する。
- Proposal/email/AI/DistributionLogに触れていない。
