# SES市場分析機能 調査まとめ

## 目的

SES管理画面にある案件・要員・営業履歴系データを使い、営業が「どの案件・どのスキル・どの地域を注力すべきか」を判断できる市場分析機能を設計する。

今回の作業は調査・設計のみ。実装、DB変更、migration作成、DB write、外部API呼び出し、AI API呼び出しは行わない。

## 調査対象

- `prisma/schema.prisma`
- `app/api/dashboard-data/route.ts`
- `app/api/projects/route.ts`
- `app/api/persons/route.ts`
- `app/page.jsx`
- `components/ProjectCreateDrawer.jsx`
- `components/PersonCreateDrawer.jsx`
- `scripts/gmail-extraction.ts`
- `lib/gmail-extract-entities.ts`
- `prisma/seed.ts`
- `docs/db-design-v0.1.md`
- `C:\Users\ke919\Downloads\deep-research-report.md`

同名のPDF/DOCXも確認対象として存在を確認したが、今回の設計資料は読み取り可能だったMarkdown版の内容とリポジトリ調査結果を優先した。

## 結論

現行DBだけで、次の市場分析MVPは実現可能。

- スキル別の案件数・要員数・需給ギャップ
- 単価帯別の案件数・要員数・中央値
- 地域・勤務形態別の案件数・要員数・単価
- 開始月別の案件数・要員数
- 契約形態別の案件数・単価
- 注力案件・高単価・リモートなどの営業注力候補
- データ不足アラート

一方で、成約率、失注理由、面談結果、継続月数、粗利、顧客業界、顧客別受注履歴を使う分析は、現行DBだけでは不十分。`Proposal` と `DistributionLog` に提案・配信の土台はあるが、受注・失注・契約・粗利・継続の履歴としては不足している。

## 既存データで強いところ

- 案件のスキルは `ProjectSkill` に分離され、`REQUIRED` / `PREFERRED` / `USED_TECHNOLOGY` を区別できる。
- 案件の単価、募集人数、開始月、精算幅、地域、勤務形態、契約形態、外国籍可否、年齢条件、面談回数は `ProjectCondition` にまとまっている。
- 商流は `ProjectCompanyRole` で、上位会社、エンド、元請、二次請け、三次請けを構造化できる。
- 要員は `Person` と `PersonSkill` で、スキル、希望単価、稼働開始日、希望勤務地、リモート希望、所属会社を持てる。
- 提案・営業履歴の基礎として `Proposal`、`ProposalStatusHistory`、`DistributionLog` がある。
- Gmail抽出結果は `ExtractionResult.normalizedResult` に `needsReview`、`reviewReasons`、分類スコア、warning相当の情報を保存できる。

## 既存データで弱いところ

- 市場セルの「役割」は案件タイトル・作業内容・要員の職務要約から推定する必要があり、構造化カラムはない。
- 経験年数は `ProjectSkill.yearsRequired` と `PersonSkill.years` があるが、作成フォームや抽出で安定して埋まる保証がまだ薄い。
- 要員の勤務地は `preferredLocation` の自由記述で、都道府県・都市・勤務形態に分解されていない。
- 案件の `remoteType` はDBにあるが、手入力フォームでは `workEnvironment` テキスト中心で、`remoteType` が `UNKNOWN` になりやすい。
- AIマッチング結果の専用永続化は未確認。`score`、`reason`、`warning`、`attention`、`reviewReason` を案件・要員ペア単位で保存するモデルは現行メインツリーにはない。
- 成約結果、面談結果、失注理由、継続月数、粗利、契約単価、仕入単価、顧客業界は不足している。

## 市場セル設計

市場セルは次を最小単位として考える。

```text
スキル x 役割 x 経験年数帯 x 単価帯 x 地域 x 勤務形態 x 開始月 x 契約形態
```

現行DBでの実現性は次の通り。

| 要素 | 現行DBでの状態 | MVPでの扱い |
|---|---|---|
| スキル | `ProjectSkill.skillName`、`PersonSkill.skillName` がある | 表記ゆれ正規化を入れて集計 |
| 役割 | 構造化なし。タイトル、作業内容、職務要約から推定 | 初期は `unknown` または簡易推定 |
| 経験年数帯 | `yearsRequired`、`years` はあるが入力密度が不明 | 欠損を許容し、ある場合のみ帯化 |
| 単価帯 | 案件単価、上位金額、希望単価がある | 〜50、50〜60、60〜70、70〜80、80〜で帯化 |
| 地域 | 案件は `prefecture`、要員は自由記述 | 案件は都道府県、要員は簡易正規化 |
| 勤務形態 | 案件は `remoteType`、要員は自由記述 | `remoteType` 優先、自由記述は補助 |
| 開始月 | 案件は `startMonth`、要員は `availableFrom` | 月単位に丸める |
| 契約形態 | 案件は `contractType` | 案件側集計に使う。要員側は共通セルでは `unknown` |

したがってMVPでは、フル市場セルではなく次の縮約セルを推奨する。

```text
正規化スキル x 単価帯 x 地域 x 勤務形態 x 開始月 x 契約形態
```

役割・経験年数帯はデータ密度が上がり次第、セルキーに追加する。

## ChatGPT側調査と重なる高優先観点

ChatGPT側の重要候補と、Codex側のリポジトリ調査で高優先になったものはかなり重なる。

| 重要候補 | Codex側評価 | 理由 |
|---|---|---|
| スキル別需給ギャップ | 高 | `ProjectSkill` と `PersonSkill` があり、すぐ集計できる |
| 単価帯別の案件数・要員数・中央値 | 高 | `ProjectCondition` と `Person.desiredUnitPrice` が使える |
| 地域別の案件数・要員数・単価 | 高 | 案件側は強い。要員側は自由記述正規化が必要 |
| 営業優先度スコア | 高 | 既存データだけでルールベーススコアを作れる |
| 市場セル別ランキング | 高 | 縮約セルならMVP可能 |
| データ品質チェック | 高 | 欠損、`needsReview`、`reviewReasons` が使える |
| AIマッチング用の特徴量整備 | 高 | 現行スキーマに接続しやすいが、特徴量保存は別設計が必要 |
| 成約・失注・面談結果の履歴化 | 中から高 | 現行 `Proposal` に土台はあるが不足項目が多い |
| 単価妥当性の判定 | 高 | 既存単価分布からp25/p50/p75比較が可能 |
| 継続しやすい案件条件の分析 | 後続 | 契約・継続・終了理由が不足 |

## MVPの推奨

最初のMVPは、DB変更なし、読み取り専用API、集計ロジックのみで進める。

1. 市場分析トップ画面
2. スキル別ランキング
3. 単価帯別ランキング
4. 地域・勤務形態別ランキング
5. 需給ギャップランキング
6. 営業注力候補一覧
7. データ不足アラート
8. 注力案件との関連分析

営業優先度スコアは、最初はルールベースでよい。

```text
営業優先度スコア =
  需給ギャップ
  + 高単価中央値
  + 募集人数
  + 注力案件比率
  + 開始月の近さ
  + データ品質ペナルティ
```

成約率、粗利、継続月数、顧客別LTVを使ったスコアは、履歴項目を追加してから行う。

## 推奨実装場所

このリポジトリは `src/` がなく、Next.js App Router を `app/` 直下で使っている。したがって実装する場合は、既存構成に合わせて次を推奨する。

- 画面: `app/market-analysis/page.jsx`
- API: `app/api/market-analysis/route.ts`
- 集計ロジック: `lib/market-analysis/`
- UI部品: `components/market-analysis/`
- テスト: `tests/market-analysis/`

既存の `/matches`、CSVインポート、案件作成、メール生成・送信には触らない。現在のメインツリーでは `/matches` ページ自体は未確認だが、将来または別作業ツリーに存在する場合も本機能は独立ルートに置く。

## 今回の変更範囲

- DB変更なし
- migrationなし
- API変更なし
- 既存UI挙動変更なし
- 実CSVコミットなし
- 外部API呼び出しなし
- AI API呼び出しなし

