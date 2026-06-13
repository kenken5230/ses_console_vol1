# マッチ候補保存/レビュー画面 Phase 1-B テスト設計書

## 1. 目的

Phase 1-Bのテスト目的は、read-only APIが安全に保存済み候補を返し、tenant境界とPII-safe制約を破らないことを確認することである。

本フェーズではmutationは存在しないため、DB writeが起きないことも重要な検証観点とする。

## 2. テスト種別

| 種別 | Phase 1-Bでの扱い |
| --- | --- |
| Unit test | 実施する。query parser、serializer、queue priority、error判定を検証する。 |
| API handler test | 可能な範囲で実施する。route handlerは薄くし、主にservice helperを検証する。 |
| Integration test | 設計を作成する。実DB適用はPhase 1-Bでは必須にしない。 |
| Component test | UI下地を追加する場合にprops/fixtureのテスト観点を定義する。 |
| E2E test | Phase 1-C以降。 |

## 3. Unit Test観点

### 3.1 tenant

- `tenantId` query parameterから取得できる。
- `x-tenant-id` headerから取得できる。
- query parameterがheaderより優先される。
- tenantId未指定で `TENANT_REQUIRED` になる。
- 不正文字を含むtenantIdで `TENANT_INVALID` になる。

### 3.2 pagination

- 未指定時に `page=1`, `pageSize=20` になる。
- `pageSize=100` を許可する。
- `pageSize=101` は100へ丸める。
- `page=0` は400相当のparse errorになる。
- `pageSize=0` は400相当のparse errorになる。

### 3.3 filter

- status filterをwhereに反映する。
- warningSeverity filterをwhereに反映する。
- stalenessState filterをwhereに反映する。
- duplicateState filterをwhereに反映する。
- sourceEvidenceState filterをwhereに反映する。
- createdAtFrom / createdAtToをwhereに反映する。
- lastReviewedAtFrom / lastReviewedAtToをwhereに反映する。
- enum不正値でparse errorになる。

### 3.4 sort

- 未指定時に `createdAt desc` になる。
- `updatedAt asc` を許可する。
- `score desc` を許可する。
- `lastReviewedAt desc` を許可する。
- 不正sort keyでparse errorになる。

### 3.5 serializer

- scoreをstringに変換する。
- DateをISO stringに変換する。
- `projectRef.id` と `personRef.id` のみ返す。
- company/person/email/phone/body/raw/localPath/secret風のfieldを返さない。
- detail serializerでreviewEventsとsourceRecordsをsafe fieldだけ返す。

### 3.6 review queue

- `SUGGESTED` と `NEEDS_REVIEW` のみを対象にする。
- `NEEDS_REVIEW` にpriority加点される。
- critical warningに高priorityが付く。
- stale/duplicate/source missingでqueueReasonsが返る。
- queuePriorityはrecordに保存されず、response上で算出される。

### 3.7 migration missing

- Prisma `P2021` を503対象と判定する。
- Prisma `P2022` を503対象と判定する。
- PostgreSQL `42P01` を503対象と判定する。
- unrelated errorは503対象にしない。

## 4. API Test観点

### 4.1 `GET /api/matches/suggestions`

正常系:

- ADMIN / MANAGERがtenantId付きで一覧取得できる。
- pagination metadataが返る。
- filter結果がwhereに反映される。
- sort結果がorderByに反映される。
- responseにPII fieldが含まれない。

異常系:

- tenantIdなしで400。
- 不正filterで400。
- 不正sortで400。
- migration未適用相当で503。
- 認証なしで401。
- 権限不足で403。

### 4.2 `GET /api/matches/suggestions/:id`

正常系:

- tenantId + idで詳細取得できる。
- review eventsがsafeに返る。
- source recordsがsafeに返る。

異常系:

- tenant内に存在しないidは404。
- 他tenantのidは404として扱う。
- migration未適用相当で503。

### 4.3 `GET /api/matches/suggestions/review-queue`

正常系:

- `SUGGESTED` / `NEEDS_REVIEW` のみ返る。
- queuePriority / queueReasons / reviewAgeHoursが返る。
- queuePriority順で返る。

異常系:

- `APPROVED` などqueue対象外status filterは400。
- tenantIdなしで400。
- migration未適用相当で503。

## 5. Integration Test設計

Phase 1-Bでは実DBを使う結合テストは必須にしない。ただし、将来以下を追加する。

### 5.1 DB fixture

- tenant Aの候補2件
- tenant Bの候補1件
- tenant Aのreview event
- tenant Aのsource record

### 5.2 検証

- tenant AのAPIでtenant Bの候補が返らない。
- detailで他tenantのidを指定しても404になる。
- response JSONにPII prohibited keysが存在しない。
- migration適用後に3 APIが200を返す。

## 6. Component Test設計

UI下地を追加する場合、以下をテストする。

### 6.1 Saved suggestions component

- itemsが空の場合の表示。
- status badgeが表示される。
- downstream readinessがstatusと別表示される。
- project/personはID参照として表示され、名称欄は存在しない。
- PII forbidden fixtureを渡しても表示されない。

### 6.2 Review queue component

- queuePriority順に表示される。
- queueReasonsが表示される。
- `NEEDS_REVIEW` が強調される。
- PII fieldをpropsに持たない。

## 7. 検証コマンド

Phase 1-B完了時に以下を実行する。

```text
prisma validate
npm.cmd run test
npm.cmd run typecheck -- --incremental false
```

lintは現状repoにESLint設定/依存がないため未実行可とする。ただし完了報告に理由を残す。

## 8. 合格基準

- Unit testが通る。
- typecheckが通る。
- Prisma schemaがvalidである。
- read-only APIがDB write関数を呼ばない設計である。
- PII-safe serializerのテストがある。
- tenant境界のテストがある。
- migration missing 503のテストがある。
- Proposal/email/AI/DistributionLogに触っていない。
