# 市場分析機能 実装計画案

## 前提

今回は実装しない。ここでは、実装する場合の候補パス、API、画面、集計ロジック、型定義、テスト方針だけを整理する。

現行リポジトリは `src/` を使っておらず、Next.js App Router を `app/` 直下で使っている。そのため、市場分析機能は `app/market-analysis/` に置くのが自然。

## 推奨フォルダ構成

```text
docs/themes/market-analysis/
  research.md
  data-inventory.md
  analysis-axes.md
  mvp-proposal.md
  implementation-plan.md

app/market-analysis/
  page.jsx

app/api/market-analysis/
  route.ts

components/market-analysis/
  MarketSummaryCards.jsx
  MarketRankingTable.jsx
  MarketCellTable.jsx
  MarketQualityAlerts.jsx
  MarketFilterBar.jsx

lib/market-analysis/
  constants.ts
  normalize.ts
  aggregate.ts
  scoring.ts
  types.ts

tests/market-analysis/
  normalize.test.ts
  aggregate.test.ts
  scoring.test.ts
```

既存構成に合わせて `app/`、`components/`、`lib/`、`tests/` を使う。`/matches`、CSVインポート、案件作成、メール生成・送信のファイルは触らない。

## API案

### `GET /api/market-analysis`

読み取り専用。DB writeなし。

Query:

| パラメータ | 例 | 内容 |
|---|---|---|
| `from` | `2026-06-01` | 対象作成日または開始月の下限 |
| `to` | `2026-08-31` | 対象作成日または開始月の上限 |
| `skill` | `Java` | スキル絞り込み |
| `region` | `東京` | 地域絞り込み |
| `priceBand` | `70-80` | 単価帯絞り込み |
| `workStyle` | `HYBRID` | 勤務形態 |
| `contractType` | `SEMI_DELEGATION` | 契約形態 |
| `focusOnly` | `true` | 注力案件のみ |

Response:

```ts
type MarketAnalysisResponse = {
  summary: MarketSummary;
  skillRankings: SkillMarketMetric[];
  priceBandRankings: PriceBandMetric[];
  regionRankings: RegionMarketMetric[];
  marketCellRankings: MarketCellMetric[];
  focusInsights: FocusInsight[];
  qualityAlerts: QualityAlert[];
  generatedAt: string;
};
```

## 画面案

### `app/market-analysis/page.jsx`

画面構成:

1. ヘッダー
   - 既存 `Header` を再利用するか、市場分析専用の最小ヘッダーを置く
2. フィルターバー
   - 期間
   - スキル
   - 単価帯
   - 地域
   - 勤務形態
   - 契約形態
   - 注力案件のみ
3. サマリーカード
   - 案件数
   - 要員数
   - 注力案件数
   - 需給ギャップ上位数
   - データ不足数
4. ランキング
   - スキル別
   - 単価帯別
   - 地域/勤務形態別
   - 市場セル別
5. データ品質
   - 欠損項目ランキング
   - 要確認抽出ランキング

## 集計ロジック案

### 1. DBから取得

対象:

- `project.findMany`
  - `status != ARCHIVED`
  - `condition`
  - `skills`
  - `tags`
  - `companyRoles.company`
  - `sourceMail.extractionResults`
- `person.findMany`
  - `status != ARCHIVED`
  - `skills`
  - `ownerCompany`
  - `sourceMail.extractionResults`

### 2. 正規化

`lib/market-analysis/normalize.ts`

```ts
type NormalizedSkill = {
  raw: string;
  normalized: string;
  cluster: string;
};
```

初期辞書:

```ts
const skillAliases = {
  Java: ["Java", "JAVA"],
  JavaScript: ["JavaScript", "JS"],
  TypeScript: ["TypeScript", "TS"],
  AWS: ["AWS", "Amazon Web Services"],
  React: ["React", "React.js"],
};
```

地域正規化:

- 案件: `prefecture` 優先
- 要員: `preferredLocation` から都道府県・主要都市を簡易抽出
- 不明: `unknown`

勤務形態正規化:

- 案件: `remoteType` 優先
- 要員: `remotePreference` から `FULL_REMOTE`、`REMOTE`、`HYBRID`、`ONSITE`、`UNKNOWN` を推定

### 3. 単価帯化

`lib/market-analysis/constants.ts`

```ts
type PriceBandKey = "under_50" | "50_60" | "60_70" | "70_80" | "80_over" | "unknown";
```

案件単価:

```ts
projectPrice =
  condition.upperAmountMax ??
  condition.upperAmountMin ??
  condition.unitPriceMax ??
  condition.unitPriceMin ??
  null;
```

要員単価:

```ts
personPrice = person.desiredUnitPrice ?? null;
```

### 4. 市場セル作成

MVPセル:

```ts
type MarketCellKey = {
  skill: string;
  priceBand: PriceBandKey;
  region: string;
  workStyle: WorkStyleKey;
  startMonth: string;
  contractType: ContractTypeKey;
};
```

後続で追加するキー:

```ts
type ExtendedMarketCellKey = MarketCellKey & {
  role: string;
  experienceBand: ExperienceBandKey;
};
```

### 5. 需給ギャップ

需要:

```ts
demand =
  sum(project.recruitingCount ?? 1) by cell
```

供給:

```ts
supply =
  count(person where status in AVAILABLE, PROPOSING) by normalized skill, price band, region, work style, available month
```

ギャップ:

```ts
gap = demand - supply
gapRate = demand > 0 ? gap / demand : 0
```

### 6. 中央値

案件単価中央値:

```ts
median(projectPrice values in cell)
```

要員希望単価中央値:

```ts
median(personPrice values in cell)
```

### 7. 営業優先度スコア

`lib/market-analysis/scoring.ts`

```ts
score =
  demandScore
  + gapScore
  + priceScore
  + focusScore
  + timingScore
  - qualityPenalty;
```

初期ルール:

| 要素 | 計算例 |
|---|---|
| demandScore | `min(demand, 10) * 2` |
| gapScore | `max(gap, 0) * 3` |
| priceScore | `medianProjectPrice >= 80 ? 10 : medianProjectPrice >= 70 ? 6 : 0` |
| focusScore | `focusProjectCount * 2` |
| timingScore | 今月・来月開始なら加点 |
| qualityPenalty | 欠損率、要確認率に応じて減点 |

### 8. データ品質

QualityAlert:

```ts
type QualityAlert = {
  scope: "project" | "person" | "extraction";
  code:
    | "missing_skill"
    | "missing_price"
    | "missing_region"
    | "missing_start_month"
    | "unknown_work_style"
    | "needs_review"
    | "review_reason";
  count: number;
  examples: Array<{ id: string; title: string }>;
};
```

## 型定義案

```ts
type WorkStyleKey = "ONSITE" | "HYBRID" | "REMOTE" | "FULL_REMOTE" | "UNKNOWN";
type ContractTypeKey = "SEMI_DELEGATION" | "DISPATCH" | "CONTRACT" | "OTHER" | "UNKNOWN";
type ExperienceBandKey = "under_1" | "1_3" | "3_5" | "5_over" | "unknown";

type MarketSummary = {
  projectCount: number;
  personCount: number;
  focusProjectCount: number;
  missingSkillCount: number;
  missingPriceCount: number;
  missingRegionCount: number;
  needsReviewCount: number;
};

type MarketMetricBase = {
  projectCount: number;
  recruitingCount: number;
  personCount: number;
  demandSupplyGap: number;
  projectMedianPrice: number | null;
  personMedianPrice: number | null;
  focusProjectCount: number;
  qualityIssueCount: number;
  salesPriorityScore: number;
};

type SkillMarketMetric = MarketMetricBase & {
  skill: string;
  requiredProjectCount: number;
  preferredProjectCount: number;
};

type PriceBandMetric = MarketMetricBase & {
  priceBand: PriceBandKey;
};

type RegionMarketMetric = MarketMetricBase & {
  region: string;
  workStyle: WorkStyleKey;
};

type MarketCellMetric = MarketMetricBase & {
  cell: MarketCellKey;
  reasons: string[];
};
```

## テスト方針

### ユニットテスト

`tests/market-analysis/normalize.test.ts`

- `Java` と `JAVA` が同じキーになる
- `JavaScript` と `JS` が同じキーになる
- `AWS` と `Amazon Web Services` が同じキーになる
- `東京`, `東京都`, `渋谷` を同一地域グループへ寄せる
- `フルリモート`, `完全リモート` を `FULL_REMOTE` に寄せる

`tests/market-analysis/aggregate.test.ts`

- スキル別案件数・要員数が正しく出る
- 必須スキルと尚良スキルの重みが変わる
- 単価帯が正しく分類される
- 欠損単価が `unknown` に入る
- 募集人数が需要量に反映される

`tests/market-analysis/scoring.test.ts`

- 需要が多く供給が少ないセルが高スコアになる
- 高単価セルが加点される
- データ不足があるセルが減点される
- 注力案件が含まれるセルが加点される

### 結合テスト

既存のテストランナーが `tsx` スクリプト中心なので、実装時は次のどちらかを選ぶ。

1. `tsx tests/market-analysis/*.test.ts` を npm script に追加する
2. 既存方針に合わせて `scripts/market-analysis.test.ts` を作り、fixtureを `tests/market-analysis/fixtures/` に置く

ユーザー要望ではテストフォルダを分ける方針なので、`tests/market-analysis/` を推奨する。

## API・DB変更方針

### MVP

- DB変更なし
- migrationなし
- 既存API変更なし
- 新規APIのみ `GET /api/market-analysis`
- 既存 `/api/dashboard-data` は変更しない
- 既存 `/matches`、CSVインポート、案件作成、メール生成・送信は変更しない

### 後続で検討するDB拡張

MVP後に必要になりそうな追加モデル:

```text
skill_dictionary
skill_aliases
market_analysis_snapshots
match_suggestions
match_suggestion_reasons
proposal_outcomes
contracts
assignments
customer_profiles
```

ただし、今回のPRでは作成しない。

## 既存機能への影響

MVP実装時も、既存機能への影響を避けるため次を守る。

- `/matches` 画面を触らない
- CSVインポートを触らない
- AIマッチング候補生成を触らない
- 案件作成・編集を触らない
- メール生成・送信を触らない
- DB writeをしない読み取り専用APIとして作る
- 集計ロジックは `lib/market-analysis/` に閉じる

