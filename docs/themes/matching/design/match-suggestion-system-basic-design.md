# マッチ候補保存/レビュー画面 基本設計書

## 1. 目的

本書は、SES営業管理コンソールにおける「マッチ候補保存/レビュー画面」の全体基本設計を定義する。

対象はPhase 1-AからPhase 1-EまでのMVP実装全体である。Phase 1-Aはすでに実装済みだが、後続の設計・レビュー・テストと整合させるため、本書ではPhase 1-Aも含めて基本設計を明文化する。

## 2. システム上の位置づけ

本機能は、matching engineが算出したProject x Person候補を保存し、人間が確認し、判断履歴を残すためのレビュー境界である。

本機能は以下ではない。

- Proposal draft自動作成機能
- メールドラフト自動作成機能
- メール自動送信機能
- AIによる自動承認機能
- DistributionLog自動作成機能

matching結果を営業アクションへ進める前に、保存、可視化、レビュー、監査、PII安全性、tenant境界を担保する。

## 3. 全体スコープ

### 3.1 MVPで扱う範囲

- 保存済みマッチ候補の永続化
- 保存済み候補のread-only API
- 保存済み候補一覧UI
- Review Queue UI
- supervised save
- approve / reject / archive / reopen
- review eventのappend-only記録
- tenant境界
- PII-safe response / UI
- filter / sort / pagination
- API/コンポーネント/結合テストの下地

### 3.2 MVPで扱わない範囲

- proposal draft
- email draft
- email send
- DistributionLog書き込み
- AI API呼び出し
- raw source evidence表示
- PII detail join
- assignee / SLA
- audit export
- bulk approve / reject
- market analysis score統合

## 4. フェーズ分割

| Phase | 内容 | DB write |
| --- | --- | --- |
| Phase 1-A | schema / migration / 型定義 / schema単体テスト | migrationのみ |
| Phase 1-B | saved suggestions read-only API | なし |
| Phase 1-C | saved suggestions / review queue UI | なし |
| Phase 1-D | supervised save API/UI | suggestion / review eventのみ |
| Phase 1-E | approve / reject / archive / reopen | status / review eventのみ |

## 5. Phase 1-A 基本設計

### 5.1 目的

保存済み候補、レビューイベント、source evidence bridgeを永続化するschemaを追加する。

### 5.2 対象

- `MatchSuggestion`
- `MatchSuggestionReviewEvent`
- `MatchSuggestionSourceRecord`
- Primary Status enum
- Review Event Type enum
- 直交フラグ enum
- version fields
- tenant分離キー
- unique index
- relation
- lockVersion

### 5.3 基本方針

- `tenantId` は必須。
- `organizationId` は任意。
- `MatchSuggestion` にはPII/raw dataを保存しない。
- `ReviewEvent` はappend-only前提。
- `APPROVED` と下流進行可否は分離する。
- `promotionEligible` は保存済み候補の状態として保持するが、Phase 1-Aでは算出APIを作らない。
- `queuePriority` は永続化しない。

## 6. Phase 1-B 基本設計

### 6.1 目的

保存済み候補を安全に閲覧するread-only APIを実装する。

### 6.2 対象API

- `GET /api/matches/suggestions`
- `GET /api/matches/suggestions/:id`
- `GET /api/matches/suggestions/review-queue`

### 6.3 基本方針

- DB writeを行わない。
- tenantIdを必須にする。
- Project / Person / Company / MailNotificationへPII joinしない。
- paginationを必須にする。
- filter / sortを定義済み値に制限する。
- migration未適用時は503を返す。
- responseはsafe serializerを必ず通す。

## 7. Phase 1-C 基本設計

### 7.1 目的

Phase 1-B APIを利用して、保存済み候補一覧とReview QueueをUIとして閲覧できる状態にする。

### 7.2 対象画面/コンポーネント

- Saved Suggestions view
- Review Queue view
- Candidate detail pane
- Status badge
- Downstream readiness badge
- Warning / stale / duplicate / evidence indicators
- Filter bar
- Pagination controls

### 7.3 基本方針

- UIはread-only。
- mutation buttonは表示してもdisabledまたは未実装状態にする。
- PIIを表示しない。
- Project / PersonはID参照またはsafe labelのみ表示する。
- `APPROVED` と downstream readinessを別表示する。
- queuePriorityは表示上の注意喚起に使う。

## 8. Phase 1-D 基本設計

### 8.1 目的

dry-run候補から、人間が選択した候補だけを保存できるsupervised save API/UIを実装する。

### 8.2 対象

- `POST /api/matches/suggestions`
- dry-run resultからの選択保存
- idempotency
- duplicate制御
- 新規保存時の `SAVED` review event作成
- duplicate応答時のidempotency record作成

### 8.3 基本方針

- 保存対象はユーザーが選択した候補のみ。
- bulk save / bulk approve / bulk rejectはPhase 1では扱わない。
- `Idempotency-Key` を必須にする。
- `tenantId + suggestionPairKey` で業務重複を制御する。
- `tenantId + Idempotency-Key` とrequest fingerprintで冪等性を制御する。
- 保存時にPII/raw textを複製しない。
- 新規保存成功時は必ず `SAVED` eventをappendする。
- duplicate応答時は既存候補を返し、review eventはappendしない。

## 9. Phase 1-E 基本設計

### 9.1 目的

保存済み候補に対して、approve / reject / archive / reopenのレビュー判断を行えるようにする。

### 9.2 対象API

- `PATCH /api/matches/suggestions/:id/decision`
- `PATCH /api/matches/suggestions/:id/archive`
- `POST /api/matches/suggestions/:id/reopen`

### 9.3 基本方針

- `If-Match` または `lockVersion` による競合制御を必須にする。
- 状態遷移表にない遷移を禁止する。
- reject / reopenではreason codeを必須にする。
- `OTHER` reasonはMVPでは禁止。
- review eventはappend-onlyで追加する。
- `APPROVED` は下流工程への進行許可を意味しない。
- `promotionEligible` / `downstreamReadiness` はstatusと別に扱う。

## 10. 共通アーキテクチャ

### 10.1 レイヤ構成

| レイヤ | 役割 |
| --- | --- |
| Route Handler | 認証、tenant取得、HTTP response変換。 |
| Service / Use Case | query組み立て、状態遷移、業務制御。 |
| Serializer / Mapper | Prisma recordをPII-safe responseへ変換。 |
| Schema / Constants | enum、reason、transition、禁止field定義。 |
| Prisma Schema | DB model、relation、index、migration。 |
| UI Components | API responseを表示する。PII joinしない。 |

### 10.2 依存方向

UI -> API -> Service -> Prisma

Serializerとschema constantsはAPIとUIの両方から参照可能にする。ただしUIはPrisma型に直接依存しない。

## 11. データ境界

### 11.1 tenant

すべてのrecordは `tenantId` を持つ。API queryは必ずtenantIdで絞り込む。

### 11.2 organization

`organizationId` は任意。既存の組織モデルが未確定のため、Phase 1では補助的なfilter keyとして保持する。

### 11.3 PII

PIIは `MatchSuggestion` 系テーブルに保存しない。Phase 1ではPII detail joinも行わない。

## 12. 監査方針

監査対象:

- save
- approve
- reject
- archive
- reopen
- PII detail view

Phase 1-B/Cはread-onlyのため、新たなreview eventを書かない。PII detail viewも実装しない。

Phase 1-D/Eでreview eventを書き込む。

## 13. エラー方針

共通エラー:

- 400: query不正、tenantId不足、不正filter
- 401: 未認証
- 403: 権限不足
- 404: tenant境界内に対象なし
- 409: 重複、状態競合
- 412: lockVersion不一致
- 422: reason不足、状態遷移不可
- 503: migration未適用、schema未準備

エラーresponseにもPIIを含めない。

## 14. テスト方針

全Phaseで以下を積み上げる。

- schema単体テスト
- API helper unit test
- route/service test
- component test
- integration test
- regression test

特にtenant境界とPII-safeは各Phaseの必須テスト観点とする。

## 15. 完了条件

Phase 1全体の完了条件:

- 保存済み候補を安全に永続化できる。
- 保存済み候補をPII-safeに閲覧できる。
- Review Queueを閲覧できる。
- ユーザー選択による保存ができる。
- approve / reject / archive / reopenができる。
- review eventがappend-onlyで残る。
- tenant境界を越えない。
- Proposal/email/AIへ自動接続しない。
- API/コンポーネント/結合テストの最低ラインが整備されている。
