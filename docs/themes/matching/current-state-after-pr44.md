# MatchSuggestion Current State After PR #44

作成日: 2026-06-14

## 目的

この文書は、PR #44 `Add match suggestion save/review phase 1` のmerge後に、現在の `main` に入っているMatchSuggestion関連の実装・設計・未実装事項を整理するためのものです。

#44は当初、大きな統合PRとして schema / migration / API / UI / docs をまとめていましたが、最終的にはmain側の既存実装を正とし、実装差分ではなく `docs/themes/matching/` 配下の設計docsとしてmergeされています。

今後は、#44を再度大きな統合PRとして扱わず、必要な内容だけを小PRへ分割して進めます。

## 現在mainに入っている主な内容

| 領域 | 現在の状態 | 備考 |
|---|---|---|
| deterministic dry-run matching | 実装済み | `/matches` と `GET /api/matches/dry-run` のread-onlyレビュー境界 |
| MatchSuggestion schema foundation | 実装済み | `MatchSuggestion`, `MatchSuggestionReviewEvent`, `MatchSuggestionSourceRecord` 系の永続化基盤 |
| saved suggestion read-only APIs | 実装済み | `GET /api/matches/suggestions`, `[id]`, `review-queue` |
| saved suggestion read-only UI | 実装済み | `/matches` 内で保存済み候補とレビューキューを安全表示 |
| supervised save API/UI | 実装済み | disabled-by-default / staging guard / explicit confirmation 前提 |
| guarded review update API | 実装済み | #45。`PATCH /api/matches/suggestions/[id]/review` |
| guarded review controls | 実装済み | #47。`NEXT_PUBLIC_MATCH_SUGGESTION_REVIEW_UI_ENABLED=true` の時だけ表示 |
| Proposal traceability prerequisites docs | 実装済み | #49。Proposal draft化前の前提整理 |
| Proposal creation | 未実装 | 別PRでowner承認後に進める |
| email draft / send | 未実装 | 別PRでowner承認後に進める |
| DistributionLog write | 未実装 | 別PRでowner承認後に進める |

## #44から再利用すべき内容

#44で追加されたdocs群は、今後の小PR分割の材料として使えます。

| 再利用候補 | 使い道 |
|---|---|
| requirements docs | 小PRごとの要件整理、STOP条件、非ゴールの明文化 |
| basic/detail design docs | schema/API/UIの境界整理、レビュー導線の全体像確認 |
| test strategy docs | tenant境界、PII非表示、read-only/write guardの検証観点 |
| tenant boundaryの考え方 | 将来のtenant境界hardening PRの設計材料 |
| idempotency / duplicate controlの考え方 | save API hardening PRの設計材料 |
| source evidence / safe summaryの考え方 | source recordや監査性を強める後続PRの材料 |

## #44から捨てる、またはそのまま使わない内容

#44の初期branchに含まれていた実装差分は、現在mainの実装と前提が違うため、そのまま復活させません。

| 対象 | 判断 | 理由 |
|---|---|---|
| 旧schema/migration差分 | そのまま使わない | mainには既にMatchSuggestion基盤があり、重複migrationや不整合のリスクがある |
| `decision` / `archive` / `reopen` 個別API案 | そのまま使わない | #45の単一guarded review update APIを正とする |
| 旧 `/matches` UI差分 | そのまま使わない | #47のdisabled-by-default UIを正とする |
| `app/globals.css` 変更 | 使わない | console scaleや他UIと混ざるため、MatchSuggestion PRでは触らない |
| `package.json` の検証script変更 | 使わない | 全体検証範囲を狭める恐れがある |
| Proposal / email / DistributionLog への接続 | 今は使わない | 下流作成は別設計・別承認が必要 |

## 今後の基本方針

1. #44を統合PRとして扱わない。
2. 既にmainに入っている #45 / #47 / #49 の設計を正とする。
3. Review mutationは `PATCH /api/matches/suggestions/[id]/review` に集約する。
4. UI操作はdisabled-by-defaultを維持する。
5. raw text, source payload, 会社名, メール, 個人名, 生CSVを表示・送信しない。
6. Proposal / email / DistributionLog には、別PRで明示承認されるまで接続しない。
7. migrationやschema変更は単独PRで扱い、API/UI変更と混ぜない。

## 小PR分割順

### 1. schema/migration foundation gap PR

目的:

- 現在mainのMatchSuggestion schemaと、#44 docsで想定していた項目の差分を確認する。
- 足りない項目が本当に必要かを決める。
- 必要な場合だけ、単独migration PRにする。

扱う候補:

- tenant boundary
- idempotency / duplicate制御に必要なkey
- source evidenceの不足
- status / review event / lock系の不足

禁止:

- API変更
- UI変更
- Proposal作成
- email / DistributionLog接続

### 2. read-only API gap PR

目的:

- 現在のsaved suggestion read-only APIに足りないfilter, sort, pagination, safe response項目があるかを補う。

前提:

- DB writeなし。
- schema変更が必要なら先に `schema/migration foundation gap PR` で完了していること。

確認観点:

- migration未適用時のsafe response
- PII/raw payload非返却
- review queueの優先度表示に必要なsafe metadata

### 3. save API hardening PR

目的:

- 現在のsupervised save APIを、必要に応じてidempotency、duplicate制御、source evidence検証の観点で強化する。

維持すること:

- disabled-by-default
- staging guard
- explicit confirmation
- safe code / safe summaryのみ保存

禁止:

- bulk save
- Proposal作成
- email draft / send
- raw source保存

### 4. read-only UI refinement PR

目的:

- `/matches` のsaved suggestion / review queue表示を、read-onlyの範囲で見やすくする。

扱う候補:

- empty / loading / error表示
- safe badges
- review reason / warning summary
- detail panelの読みやすさ

禁止:

- write操作追加
- raw text / PII表示
- `app/globals.css` 変更

### 5. guarded write UI refinement PR

目的:

- #47で入ったguarded review controlsの不足分だけを小さく補う。

維持すること:

- `NEXT_PUBLIC_MATCH_SUGGESTION_REVIEW_UI_ENABLED=true` の時だけ表示
- server-side guardが正
- confirmation必須
- safe reason code必須
- free-form noteなし

禁止:

- #45以外のreview write endpoint追加
- production/staging DB接続を前提にしたUI
- bulk approve/reject/archive

### 6. tenant boundary hardening PR

目的:

- Project / Person / MatchSuggestion のtenant境界を、現在のauth/session/DB設計に合わせて強化する。

推奨順:

1. docsでtenant境界の現状と未決事項を整理。
2. 必要ならschema/migration単独PR。
3. read APIのtenant enforcement PR。
4. write APIのtenant enforcement PR。
5. UIのtenant表示やerror改善PR。

禁止:

- tenant migrationとAPI/UIを一度に混ぜること。

## 次に着手する最小PR

このdocs整理PRの次は、`schema/migration foundation gap PR` を推奨します。

ただし、いきなりmigrationを作るのではなく、まず以下を1本の小PRで確認するのが安全です。

- 現在mainの `prisma/schema.prisma` のMatchSuggestion系モデル棚卸し
- #44 docsが想定していた項目との差分表
- 追加が必要な項目、不要な項目、未決事項
- migrationを作る場合の安全条件

この確認が終わるまで、Proposal作成、email draft/send、DistributionLog write、tenant migration、review APIの新規追加は行いません。

## 検証方針

docs-only PRでは、以下を確認します。

- 差分が `docs/themes/matching/` 配下だけであること
- secret, credential, connection stringを含まないこと
- DB write, migration, API, UI変更が含まれないこと
- #45 / #47 / #49 と矛盾しないこと

コード変更を含む後続PRでは、`docs/shared/quality/two-pass-task-test-policy-v0.1.md` に従い、対象テストを2周確認します。
