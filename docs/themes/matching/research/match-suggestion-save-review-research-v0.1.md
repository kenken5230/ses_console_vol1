# マッチ候補保存/レビュー画面 要件定義前調査報告 v0.1

作成日: 2026-06-08

## 1. 目的

マッチ候補保存/レビュー画面の要件定義に入る前に、現行リポジトリと先行ブランチの設計・実装断片を確認し、どのような要件定義書にすると安全かを整理する。

今回の調査対象は、案件と要員の deterministic matching 結果を保存し、営業または管理者がレビューできる画面である。提案作成、メールドラフト生成、メール送信、AI API 呼び出しは対象外として扱う。

## 2. 調査対象

この報告はローカルリポジトリ内の調査に基づく。外部Web調査は行っていない。

確認した主なブランチ/資料:

| 区分 | 参照元 | 確認した内容 |
|---|---|---|
| 現行作業ベース | `codex/market-analysis-docs` | 現在の専用 worktree のベース。市場分析 docs はあるが、保存済みマッチ候補本体は未反映 |
| マッチングレビューUI | `codex/pr25-matching-review-ui` | `/matches` 画面、`GET /api/matches/dry-run`、read-only deterministic matching |
| 保存設計 | `codex/pr27-match-suggestion-design` | `match_suggestions` 保存、レビュー状態、PII redaction、段階的実装計画 |
| 保存スキーマ | `codex/pr28-match-suggestion-schema` | `MatchSuggestion`、`MatchSuggestionReviewEvent`、`MatchSuggestionSourceRecord` の候補スキーマ |
| 保存API | `codex/pr30-saved-match-suggestion-apis` | saved suggestions の read-only list/detail/review queue API |
| CSV/source tracking | `codex/pr22-csv-source-apply`, `codex/pr23-import-review-ui` | `ImportSource`、`ImportRun`、`SourceRecord`、`EntitySourceLink`、import review UI |
| 市場分析 | `docs/market-analysis/*` | マッチングやAI特徴量に接続可能な集計観点。ただし今回MVPの主機能ではない |

注意:

- 上記の一部は未マージの先行ブランチであり、現行ベースに存在する機能とは限らない。
- 要件定義では「すでに実装済み」と扱わず、「採用候補」「要確認」「後続フェーズ候補」として扱うのが安全。

## 3. 調査結果サマリ

マッチ候補保存/レビュー画面は、次の3層を分けると設計しやすい。

1. 候補生成層
   - 既存案件と既存要員を deterministic scoring で組み合わせる。
   - 先行実装では `GET /api/matches/dry-run` と `/matches` read-only UI が該当する。

2. 保存/監査層
   - 案件 x 要員の候補ペアを `match_suggestions` として保存する。
   - 保存時点の score、score band、reason/warning/review codes、互換性サマリ、短い preview を持つ。
   - raw text、会社名、個人名、メール、住所、スキルシート全文は保存しない。

3. 人間レビュー層
   - 保存済み候補を `SUGGESTED`、`NEEDS_REVIEW`、`APPROVED`、`REJECTED`、`ARCHIVED` の状態で管理する。
   - 承認済み候補だけを、後続の proposal draft flow に渡せる状態にする。
   - proposal 作成やメール送信はこの画面の範囲外に置く。

## 4. 現行/先行機能から見える前提

### 4.1 deterministic matching

先行ブランチでは、案件と要員を次の観点でスコア化している。

- 必須スキル一致
- 尚可スキル一致
- 利用技術一致
- 案件単価と要員希望単価
- 案件開始月と要員稼働開始日
- 勤務地/リモート互換性
- 役割テキスト互換性
- 欠損項目やレビュー必要シグナル

出力は短縮ID、score、score band、reason codes、warning/missing field codes、compatibility states、件数サマリに限定されている。これは保存/レビュー画面でも継承すべき方針。

### 4.2 `/matches` read-only UI

先行UIは、候補一覧と右側詳細ペインの構成になっている。

確認できた主なUI要素:

- サマリカード
- score band filter
- min score
- review flag
- rate/date/location compatibility filter
- skill overlap filter
- Project/Person UUID filter
- score sort / review-first sort
- redacted detail

保存/レビュー画面でも、この情報設計を再利用できる。ただし dry-run 候補と saved suggestions は役割が違うため、タブまたは明確なビュー分離が必要。

### 4.3 source tracking / CSV import

CSV/import 側は `ImportSource`、`ImportRun`、`SourceRecord`、`EntitySourceLink` により、出所と監査を扱う設計になっている。

マッチ候補保存では、これを直接置き換えるのではなく、必要な場合だけ `MatchSuggestionSourceRecord` で候補ペアと source record を結ぶのがよい。

役割分担:

| 領域 | 主責務 |
|---|---|
| `SourceRecord` | CSV/Gmail/Notion/manual/API などの入力元1件の出所・レビュー |
| `EntitySourceLink` | 入力元1件が Project/Person のどちらに関係するか |
| `MatchSuggestion` | Project x Person の候補ペアと人間レビュー状態 |
| `MatchSuggestionSourceRecord` | 候補ペアの根拠になった source evidence |

### 4.4 market analysis との関係

市場分析は「営業がどの市場セルを攻めるか」を判断するための集計であり、マッチ候補保存/レビューとは主責務が違う。

ただし、次の情報は将来の候補優先度に使える。

- 需要/供給ギャップ
- 注力案件
- 単価帯
- 地域/リモート傾向
- データ品質アラート

MVPでは market analysis を保存/レビュー画面に混ぜず、後続で「候補の優先度補助」として接続するのがよい。

## 5. 採用したい要件方針

### 5.1 MVPの目的

営業または管理者が、deterministic matching で出た案件 x 要員候補を保存し、人間レビューにより「次に提案検討してよい候補」を選別できるようにする。

MVPのゴール:

- 候補をDBに保存できる
- 保存済み候補を一覧/詳細で確認できる
- レビューキューで優先確認できる
- 承認/却下/アーカイブの判断履歴が残る
- 重複保存や過去の却下候補の再発を抑制できる
- PIIやraw payloadを画面/API/docs/test outputに出さない

### 5.2 明確な非ゴール

MVPでは次を行わない。

- Proposal 作成
- DistributionLog 作成
- メールドラフト生成
- メール送信
- AI API 呼び出し
- 外部API連携
- CSV実データのGitコミット
- raw Project/Person text の保存
- 会社名、個人名、メールアドレス、住所、スキルシート全文の保存または表示

### 5.3 権限

初期MVPは `ADMIN` と `MANAGER` に限定するのが安全。

| 操作 | 初期推奨 |
|---|---|
| dry-run 閲覧 | ADMIN / MANAGER |
| saved suggestions 閲覧 | ADMIN / MANAGER |
| review queue 閲覧 | ADMIN / MANAGER |
| 候補保存 | ADMIN / MANAGER + confirmation |
| 承認/却下/アーカイブ | ADMIN / MANAGER |
| SALES利用 | 後続検討 |

## 6. 推奨ワークフロー

```text
既存 Project / Person
  -> dry-run matching
  -> 候補一覧で確認
  -> 選択候補を保存
  -> saved suggestions
  -> review queue
  -> approve / reject / archive
  -> approved only
  -> future proposal draft flow
```

重要な境界:

- dry-run は永久に read-only。
- 保存は明示操作と確認文字列を必須にする。
- 承認しても proposal は作らない。
- proposal draft は別要件・別PRで扱う。

## 7. 推奨データモデル

要件定義書では、最低限次の3テーブルを定義対象にするのがよい。

### 7.1 `match_suggestions`

保存するもの:

- `projectId`
- `personId`
- `status`
- `score`
- `scoreBand`
- `scoringVersion`
- `sourceSnapshotHash`
- `suggestionKey`
- `attentionState`
- `warningCount`
- `reviewReasonCount`
- `reasonCodes`
- `warningCodes`
- `reviewFlags`
- `compatibilitySummary`
- `skillOverlapSummary`
- `redactedPreview`
- `createdByUserId`
- `reviewedByUserId`
- `reviewedAt`
- `archivedAt`
- timestamps

保存しないもの:

- raw Project text
- raw Person text
- company name
- person name
- email address
- address
- full skill sheet text
- message subject/body
- local file path
- secrets

### 7.2 `match_suggestion_review_events`

レビュー履歴として、状態変更を追跡する。

- `CREATED`
- `SAVED`
- `REVIEW_REQUESTED`
- `APPROVED`
- `REJECTED`
- `ARCHIVED`
- `REOPENED`

却下時は safe reason code を必須にするのがよい。

候補 reason codes:

- `WRONG_ROLE`
- `SKILL_GAP`
- `RATE_MISMATCH`
- `DATE_MISMATCH`
- `LOCATION_MISMATCH`
- `DUPLICATE`
- `STALE_PROJECT`
- `STALE_PERSON`
- `OTHER`

### 7.3 `match_suggestion_source_records`

SourceRecord との接続はMVP必須ではないが、CSV/import連携を見据えるなら schema だけ先に用意してもよい。

役割:

- `PROJECT_EVIDENCE`
- `PERSON_EVIDENCE`
- `MATCH_EVIDENCE`

ただし、初期保存APIで無理に source evidence を必須にしない。既存 Project/Person だけでも候補保存できることを優先する。

## 8. 推奨ステータス設計

| status | 意味 | 主な遷移 |
|---|---|---|
| `SUGGESTED` | 保存済み、まだ明示レビュー前 | `NEEDS_REVIEW`, `APPROVED`, `REJECTED`, `ARCHIVED` |
| `NEEDS_REVIEW` | warning/review reason があり確認優先 | `APPROVED`, `REJECTED`, `ARCHIVED` |
| `APPROVED` | 後続の提案検討に進めてよい | 将来 `CONVERTED` 候補 |
| `REJECTED` | 不適合として却下 | 明示的な `REOPENED` のみ |
| `ARCHIVED` | アクティブ一覧から非表示 | 明示的な `REOPENED` のみ |

将来候補:

- `CONVERTED`: approved suggestion から Proposal が作成された状態。ただしMVP外。

## 9. 推奨API要件

### 9.1 read-only

| API | 目的 |
|---|---|
| `GET /api/matches/dry-run` | deterministic matching の候補確認。DB書き込みなし |
| `GET /api/matches/suggestions` | 保存済み候補一覧 |
| `GET /api/matches/suggestions/:id` | 保存済み候補詳細 |
| `GET /api/matches/suggestions/review-queue` | レビュー優先キュー |

read-only API は mutation 風パラメータを拒否する。

拒否例:

- `save`
- `apply`
- `createProposal`
- `draftEmail`
- `sendEmail`
- `write`

### 9.2 mutation

| API | 目的 | 安全条件 |
|---|---|---|
| `POST /api/matches/suggestions` | 選択候補を保存 | confirmation、limit、server-side recompute |
| `PATCH /api/matches/suggestions/:id/review` | approve/reject/reopen | transition validation、reason code、event append |
| `PATCH /api/matches/suggestions/:id/archive` | archive | event append、physical deleteなし |

保存APIの重要要件:

- client の score を信用しない。
- server-side で候補を再計算または検証する。
- `limit` を必須にし、最大件数を制限する。
- `SAVE_MATCH_SUGGESTIONS` のような確認文字列を必須にする。
- 作成/skip/reopen の aggregate count のみ返す。

## 10. 推奨画面要件

画面は `/matches` に集約し、タブで分けるのがよい。

| タブ | 目的 |
|---|---|
| Dry-run candidates | 未保存候補の確認。read-only |
| Saved suggestions | 保存済み候補一覧 |
| Review queue | `NEEDS_REVIEW` / `SUGGESTED` / warningありを優先 |
| Archived / rejected | 監査・再発防止 |

### 10.1 一覧で必要な項目

- suggestion short id
- project short id
- person short id
- status
- score
- score band
- attention state
- warning count
- review reason count
- source evidence count
- reviewer
- created / updated / reviewed / archived timestamps

### 10.2 詳細で必要な項目

- score breakdown
- reason codes
- warning codes
- review flags
- compatibility summary
- skill overlap summary
- review events
- source evidence summary
- redacted preview

### 10.3 操作

MVPで必要:

- dry-run 候補を選択
- 選択候補を保存
- saved suggestion を詳細確認
- approve
- reject with reason
- archive
- reopen

MVP外:

- create proposal
- draft email
- send email
- AI re-score

## 11. 重複/冪等性

要件定義で必ず決めるべき。

推奨:

```text
suggestionKey = sha256(projectId + personId + scoringVersion + sourceSnapshotHash)
```

または、reason/warning codes まで含める場合は正規化順序を固定する。

方針:

- 同じ `suggestionKey` が active なら create skip。
- `REJECTED` は自動再作成しない。
- `ARCHIVED` は自動再作成せず、明示 reopen。
- scoring version が変わる場合は新候補を作れるが、過去履歴をUIで参照できるようにする。

## 12. セキュリティ/PII/監査

この機能は営業データを扱うため、要件定義書では通常機能より先に安全境界を固定するべき。

必須方針:

- API response は short id と safe codes/counts 中心。
- docs/test output に実名・メール・本文・ローカルパスを出さない。
- `redactedPreview` は小さく、safe key のみ。
- note を許可する場合も `noteRedacted` として扱い、実名やメールを保存しない。
- physical delete ではなく archive。
- 状態変更は review event に残す。

## 13. 要件定義書の推奨構成

次に作る要件定義書は、次の章立てがよい。

1. 背景と目的
2. 対象ユーザー/権限
3. 業務フロー
4. MVPスコープ
5. 非ゴール/STOP条件
6. 機能要件
7. 画面要件
8. API要件
9. データモデル要件
10. ステータス/レビューイベント要件
11. 重複/冪等性要件
12. PII/redaction/監査要件
13. CSV/source tracking 連携方針
14. market analysis 連携方針
15. テスト/検証要件
16. 段階的リリース計画
17. 未決事項

特に、`非ゴール/STOP条件`、`PII/redaction/監査要件`、`重複/冪等性要件` は早めに明文化するべき。

## 14. 推奨実装フェーズ

| Phase | 内容 | DB write |
|---|---|---|
| 0 | 要件定義/設計確定 | なし |
| 1 | schema/migration 追加 | migration fileのみ |
| 2 | saved suggestions read-only API | なし |
| 3 | saved suggestions read-only UI | なし |
| 4 | supervised save API/UI | `match_suggestions` / review events のみ |
| 5 | review update API/UI | status / review events のみ |
| 6 | proposal draft design | なし |
| 7 | proposal draft implementation | 別要件、別承認 |

初回から proposal/email へ進めないことが重要。

## 15. テスト/検証観点

要件定義書に入れるべきテスト観点:

- dry-run API が read-only であること
- mutation-like query を拒否すること
- 保存APIが confirmation なしで失敗すること
- 保存APIが上限件数を超えて失敗すること
- 同一 `suggestionKey` を重複作成しないこと
- rejected/archived の再作成ポリシーを満たすこと
- review transition が不正遷移を拒否すること
- reject には reason code が必須であること
- API output に実名、メール、本文、ローカルパス、secret が混ざらないこと
- Proposal / DistributionLog / mail へ書き込まないこと
- source evidence がなくても保存できること
- migration 未適用時に read-only API が安全に 503 を返すこと

## 16. 未決事項

要件定義前に確認したい論点:

1. 初期の利用者は `ADMIN` / `MANAGER` のみでよいか。
2. `SALES` は閲覧だけ許可するか、初期は完全に対象外にするか。
3. `scoreBand` はDB enumではなく string のままでよいか。
4. rejected suggestion は scoring version が変わったら再候補化してよいか。
5. レビュー時の自由記述 note を許可するか、safe reason code のみにするか。
6. `MatchSuggestionSourceRecord` を最初の migration に含めるか、後続にするか。
7. 保存時に dry-run 表示中の選択候補を使うか、server-side で再計算した上位N件を保存するか。
8. 承認済み候補から proposal draft へ進むための必須情報をどのフェーズで定義するか。
9. market analysis の優先度スコアをMVPに入れず、後続接続でよいか。
10. 先行ブランチ `pr25`、`pr27`、`pr28`、`pr30` のどれを統合元として扱うか。

## 17. 調査結論

マッチ候補保存/レビュー画面の要件定義書は、単なる画面仕様ではなく、次の3点を最初に固定する文書にするのがよい。

1. **人間レビュー境界**
   - deterministic score は候補作成まで。
   - Proposal やメールは人間承認後の別フロー。

2. **保存する情報の最小化**
   - Project/Person の実データを複製せず、score、codes、counts、short preview を保存する。
   - raw text とPIIは保存しない。

3. **監査と再発防止**
   - status と review events を残す。
   - rejected/archived の再作成を制御する。
   - source tracking とは必要に応じて evidence として接続する。

この方針なら、既存の dry-run matching、CSV/source tracking、market analysis と干渉しにくく、後続の proposal/email flow にも安全に接続できる。
