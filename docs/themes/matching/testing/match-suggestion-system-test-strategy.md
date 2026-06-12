# マッチ候補保存/レビュー画面 テスト戦略書

## 1. 目的

本書は、マッチ候補保存/レビュー画面のPhase 1-AからPhase 1-Eまでを対象に、単体テスト、APIテスト、結合テスト、コンポーネントテスト、回帰テストの戦略を定義する。

Phase 1-Aは実装済みだが、後続の品質保証と整合させるため、本書に含める。

## 2. テスト方針

本機能で最重要の品質特性は以下である。

- tenant境界を越えない。
- PII/raw dataを保存・表示・返却しない。
- read-only APIがDBを書き込まない。
- mutation APIが状態遷移表に従う。
- review eventがappend-onlyで残る。
- `APPROVED` と downstream readinessが混同されない。
- Proposal/email/AIへ勝手に接続しない。

## 3. Phase別テスト範囲

| Phase | 主なテスト |
| --- | --- |
| 1-A | schema constants、transition、PII禁止field、downstream readiness単体テスト、Prisma validate |
| 1-B | query parser、serializer、tenant境界、read-only API、migration missing 503 |
| 1-C | component test、表示状態、PII非表示、filter/pagination UI |
| 1-D | save API、idempotency、duplicate、source bridge、新規保存時のSAVED event |
| 1-E | status transition、reason必須、lockVersion競合、review event append |

## 4. Unit Test

### 4.1 Phase 1-A

対象:

- `MATCH_SUGGESTION_STATUSES`
- `MATCH_SUGGESTION_REVIEW_EVENT_TYPES`
- `MATCH_SUGGESTION_TRANSITIONS`
- `deriveMatchDownstreamReadiness`
- `MATCH_SUGGESTION_FORBIDDEN_PII_FIELDS`

観点:

- `APPROVED` だけでは `READY` にならない。
- tenant boundary failureは `BLOCKED` になる。
- reject/reopenのみreason必須。
- Proposal/email/AI/seed/importは禁止capabilityとして明示されている。

### 4.2 Phase 1-B

対象:

- tenant parser
- list query parser
- where builder
- orderBy builder
- serializer
- queue priority calculator
- migration missing error detector

観点:

- tenantId必須。
- enum不正値はparse error。
- pagination必須。
- serializerにPII forbidden keyがない。
- review queue対象statusが限定される。

### 4.3 Phase 1-D/E

対象:

- save input validator
- idempotency handler
- duplicate detector
- transition validator
- reason validator
- lockVersion validator

観点:

- `tenantId + suggestionPairKey` 重複。
- stale/duplicate/source missingの扱い。
- `OTHER` reason禁止。
- illegal transition禁止。
- event append漏れなし。

## 5. API Test

### 5.1 Read-only API

対象:

- `GET /api/matches/suggestions`
- `GET /api/matches/suggestions/:id`
- `GET /api/matches/suggestions/review-queue`

必須ケース:

- ADMIN/MANAGERで200。
- tenantIdなしで400。
- 他tenantのrecordが返らない。
- 不正filterで400。
- 不正sortで400。
- pagination metadataが正しい。
- migration missingで503。
- responseにPII forbidden keyがない。

### 5.2 Save API

対象:

- `POST /api/matches/suggestions`

必須ケース:

- 正常保存で201または200。
- 新規保存時に `SAVED` eventが作られる。
- idempotency再送で重複作成・event二重作成が起きない。
- duplicate pairでは既存候補を返し、新規suggestion/review eventを作らない。
- PII/raw fieldをpayloadに含めても保存しない、または422。
- source bridgeがsafe summaryのみ保持する。

### 5.3 Review Mutation API

対象:

- decision
- archive
- reopen

必須ケース:

- approve成功。
- reject reasonなしで422。
- reopen reasonなしで422。
- illegal transitionで422。
- lockVersion不一致で412。
- status更新とevent appendがtransactionで行われる。
- `APPROVED` になってもproposal/emailは作られない。

## 6. 結合テスト設計

### 6.1 目的

結合テストでは、API、Prisma、DB schema、tenant境界、review eventの整合性を確認する。

### 6.2 fixture

最小fixture:

- tenant A
- tenant B
- ADMIN user
- MANAGER user
- Project A
- Person A
- Project B
- Person B
- MatchSuggestion A1
- MatchSuggestion A2
- MatchSuggestion B1
- ReviewEvent A1
- SourceRecord A1

### 6.3 read-only結合テスト

ケース:

1. tenant Aの一覧でA1/A2のみ返る。
2. tenant BのB1は返らない。
3. tenant AでB1 detailを指定すると404。
4. review queueはSUGGESTED/NEEDS_REVIEWのみ返る。
5. responseにPII forbidden keyがない。
6. filter/sort/paginationがDB query結果と一致する。

### 6.4 save結合テスト

ケース:

1. tenant Aで候補保存。
2. `MatchSuggestion` が作成される。
3. `SAVED` eventが作成される。
4. source bridgeが作成される。
5. idempotency recordが作成される。
6. 同一Idempotency-Key再送で二重作成・event二重作成されない。
7. duplicate saveでは既存候補を返し、review eventを作らない。
8. tenant Bには見えない。

### 6.5 review結合テスト

ケース:

1. SUGGESTED -> APPROVED。
2. NEEDS_REVIEW -> REJECTED。
3. REJECTED -> NEEDS_REVIEW。
4. ARCHIVED -> NEEDS_REVIEW。
5. illegal transition失敗。
6. lockVersion不一致失敗。
7. review eventがappend-onlyで増える。

## 7. コンポーネントテスト設計

### 7.1 対象

- SavedSuggestionsPanel
- ReviewQueuePanel
- MatchSuggestionDetailPane
- StatusBadge
- DownstreamReadinessBadge
- FilterBar
- Pagination

### 7.2 SavedSuggestionsPanel

ケース:

- 空一覧を表示できる。
- itemsを表示できる。
- status badgeが表示される。
- downstream readinessがstatusと別表示される。
- warning/stale/duplicate/source evidenceが表示される。
- PII forbidden fieldsをpropsに持たない。
- pagination controlが表示される。

### 7.3 ReviewQueuePanel

ケース:

- queuePriorityを表示できる。
- queueReasonsを表示できる。
- NEEDS_REVIEWが視覚的に区別される。
- SUGGESTED/NEEDS_REVIEW以外のfixtureを渡しても表示対象外にできる。

### 7.4 DetailPane

ケース:

- review eventsを表示できる。
- source records safe summaryを表示できる。
- project/personはID参照だけ表示する。
- PII detail sectionが存在しない。

### 7.5 Component fixture

fixtureは以下を含む。

- clean approved but not ready
- ready approved
- needs review with warning
- stale suggestion
- duplicate suggestion
- required source missing

fixtureは会社名・個人名・email・phone・bodyを含めない。

## 8. 回帰テスト

必須回帰:

- dry-run候補が勝手にsaved suggestionにならない。
- saved suggestionがproposal/emailへ自動連携されない。
- approveしてもemail/draft/distribution logが作られない。
- API errorにPIIが入らない。
- tenantIdなしでDBへアクセスしない。
- `APPROVED` と `promotionEligible` が混同されない。

## 9. 手動確認観点

### 9.1 API

- tenantId付きURLで一覧取得。
- filterを複数指定。
- page/pageSizeを変更。
- detailを表示。
- review queueを表示。
- migration未適用環境で503。

### 9.2 UI

- 空状態。
- loading状態。
- error状態。
- pagination。
- filter変更。
- detail選択。
- PIIが見えていないこと。

## 10. 検証コマンド

共通:

```text
prisma validate
npm.cmd run test
npm.cmd run typecheck -- --incremental false
```

lint:

現状repoにESLint設定/依存がないため、lintは未実行可。ただし導入する場合は別PRでESLint設定を追加し、既存コード全体への影響を確認する。

## 11. テスト追加順序

1. Phase 1-A unit test
2. Phase 1-B API helper unit test
3. Phase 1-B route/service test
4. Phase 1-C component fixture
5. Phase 1-C component test
6. Phase 1-D save integration test
7. Phase 1-E transition integration test

## 12. 合格基準

Phase 1全体で以下を満たす。

- Prisma validateが通る。
- typecheckが通る。
- unit/API/component/integration testが通る。
- tenant境界テストが存在する。
- PII-safeテストが存在する。
- mutationのevent appendテストが存在する。
- Proposal/email/AI非接続の回帰テストが存在する。
