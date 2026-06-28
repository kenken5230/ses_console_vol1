# Match Suggestion Review Update: 修正点洗い出し v0.1

作成日: 2026-06-12

## 目的

Claude Code 側の調査結果と既存設計 `match-suggestion-review-update-design.md` をもとに、次PRで実装・検証すべき修正点を整理する。

このメモは実装指示の入口であり、UI追加・本番DB操作・migration実行・外部API呼び出しは対象外。

## 次PRの範囲

- guarded saved `MatchSuggestion` review update API を追加する。
- backend API と mocked DB test のみ追加する。
- UI の approve/reject/archive control は追加しない。
- migration file は作成しない。
- migration apply、`prisma db push`、`prisma migrate reset` は実行しない。
- production DB、real CSV、Notion mapping、Proposal、email draft、email send、external API、AI API には触れない。

推奨 endpoint:

```text
PATCH /api/matches/suggestions/[id]/review
```

repo convention が POST-only mutation を強く要求する場合のみ、代替として `POST /api/matches/suggestions/[id]/review` を検討する。

## 必須修正点

### 1. server guard を最初に判定する

guard は disabled by default にする。DB mutation のための body parse や write 処理より前に、必ず server 側で判定する。

必要条件:

- `MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED=true`
- `MATCH_SUGGESTION_REVIEW_WRITE_TARGET=staging`
- authenticated user role が `ADMIN` または `MANAGER`
- `confirmReviewAction: true`

guard fail 時:

- safe disabled response を返す。
- DB mutation を組み立てない。
- Prisma/DB metadata、connection detail、raw payload、full UUID を出さない。

### 2. request body を狭く保つ

受け付ける top-level field は以下に限定する。

- `action`
- `toStatus`
- `confirmReviewAction`
- `reasonCodes`
- optional `expectedStatus`
- optional `expectedUpdatedAt`
- optional `suggestionId`
- optional `noteRedacted` は omitted または `null` のみ

拒否する入力:

- raw Project text
- raw Person text
- company name / person name
- email address
- CSV raw value
- email body
- source raw payload
- normalized payload
- local path
- secret / connection string
- free-form note / full note

### 3. transition matrix を実装する

| From | KEEP_SUGGESTED | REQUEST_REVIEW | APPROVE | REJECT | ARCHIVE | RESTORE |
| --- | --- | --- | --- | --- | --- | --- |
| `SUGGESTED` | no-op | `NEEDS_REVIEW` | `APPROVED` | `REJECTED` | `ARCHIVED` | invalid |
| `NEEDS_REVIEW` | `SUGGESTED` | no-op | `APPROVED` | `REJECTED` | `ARCHIVED` | invalid |
| `APPROVED` | invalid | `NEEDS_REVIEW` | no-op | invalid | `ARCHIVED` | invalid |
| `REJECTED` | invalid | `NEEDS_REVIEW` | invalid | no-op | `ARCHIVED` | invalid |
| `ARCHIVED` | invalid | invalid | invalid | invalid | no-op | `NEEDS_REVIEW` |

初期実装の保守判断:

- `SALES` は許可しない。
- `APPROVED -> REJECTED` は invalid。
- `REJECTED -> APPROVED` は invalid。
- `RESTORE` は `ARCHIVED -> NEEDS_REVIEW` に戻す。
- reviewer input は reason code のみ。free-form note は扱わない。

### 4. DB write boundary を限定する

state-changing transition のみ、1 transaction で以下を行う。

- `MatchSuggestion.status` を更新する。
- `MatchSuggestionReviewEvent` を exactly one 作成する。

event に残す値:

- previous status
- next status
- mapped review action
- actor user id
- safe reason codes
- `noteRedacted: null`

書いてはいけない対象:

- `Project`
- `Person`
- `Proposal`
- `DistributionLog`
- import/source records
- draft/message/email state

no-op transition:

- `skippedNoop: true` を返す。
- review event を作らない。
- status を更新しない。

### 5. response を安全にする

以下の response shape を compact かつ safe に揃える。

- success
- skipped/no-op
- disabled guard
- migrationRequired
- validation error
- conflict/stale update
- not found
- generic error

漏らしてはいけないもの:

- Prisma internals
- DB metadata
- connection details
- full UUID in user-facing message
- raw payload / raw notes

## テスト観点

- allowed transition matrix
- invalid transition matrix
- no-op が event を作らないこと
- guard missing が write 前に reject されること
- non-staging target が write 前に reject されること
- `confirmReviewAction: true` required
- `ADMIN` / `MANAGER` allowed
- `SALES` / `VIEWER` / unauthenticated / inactive rejected
- invalid UUID rejected
- body `suggestionId` と route id mismatch rejected
- action / `toStatus` mismatch rejected
- `REJECT` / `ARCHIVE` / `RESTORE` reason code required
- raw/PII top-level fields rejected
- free-form note rejected
- success response safe
- disabled / migrationRequired / validation / conflict / generic response safe
- state-changing update で `MatchSuggestionReviewEvent` exactly one
- `Project` / `Person` / `Proposal` / `DistributionLog` / import/source / email/draft write がないこと

## 実装前確認

- `docs/themes/matching/match-suggestion-review-update-design.md` と差分がないか確認する。
- current main に schema foundation が入っていることを確認する。
- API実装前に、既存の saved suggestion API helper と safe response helper を優先して使う。
- DB は mocked test のみ。実DB接続が必要な検証を混ぜない。

## 完了報告テンプレート

- API endpoint:
- guard env names:
- default enabled state:
- role restrictions:
- request body safety:
- transition matrix:
- no-op behavior:
- review event behavior:
- DB transaction:
- DB writes executed:
- migrations created/applied:
- Proposal/email/external/AI usage:
- tests added:
- verification commands:
- remaining issues:
