# 既存データ項目の棚卸し

## 概要

現行DBは、案件、要員、会社、提案、配信履歴、Gmail抽出結果を中心に構成されている。市場分析MVPでは、主に次のモデルを読む。

- `Project`
- `ProjectCondition`
- `ProjectSkill`
- `ProjectTag`
- `ProjectCompanyRole`
- `Company`
- `Person`
- `PersonSkill`
- `Proposal`
- `ProposalStatusHistory`
- `DistributionLog`
- `ExtractionResult`

## 案件データ

| 調査項目 | 既存データ | 状態 | コメント |
|---|---|---|---|
| 使用技術 | `ProjectSkill.skillType = USED_TECHNOLOGY` | あり | Gmail抽出、案件作成フォーム、dashboard変換で利用されている |
| 必須スキル | `ProjectSkill.skillType = REQUIRED` | あり | 市場分析では重みを高くする |
| 尚良スキル | `ProjectSkill.skillType = PREFERRED` | あり | 必須より低い重みで集計する |
| その他スキル | `ProjectSkill.skillType = OTHER` | あり | 手入力の `skills` が入る |
| 必要経験年数 | `ProjectSkill.yearsRequired` | カラムあり | 入力・抽出での充足は弱い可能性あり |
| 単価 | `ProjectCondition.unitPriceMin`、`unitPriceMax`、`unitPriceText` | あり | 案件単価の基本値 |
| 上位金額 | `ProjectCondition.upperAmountMin`、`upperAmountMax` | あり | UIでは上位金額がある場合、表示単価に優先される |
| 作業場所 | `ProjectCondition.workLocationText` | あり | 自由記述 |
| 都道府県 | `ProjectCondition.prefecture` | あり | 地域集計の主キーにできる |
| 勤務形態 | `ProjectCondition.remoteType`、`workEnvironment` | 一部あり | `remoteType` は構造化済み。ただし手入力では `UNKNOWN` になりやすい |
| 契約形態 | `ProjectCondition.contractType` | あり | `SEMI_DELEGATION`、`DISPATCH`、`CONTRACT` など |
| 商流 | `ProjectCompanyRole`、`ProjectCondition.notes` | あり | 会社ロールは構造化、自由記述の商流メモは `notes` |
| 募集人数 | `ProjectCondition.recruitingCount` | あり | 需給ギャップで案件数より強い需要量として使える |
| 開始月 / 案件開始月 | `ProjectCondition.startMonth` | あり | 月次分析に使える |
| 注力案件 | `Project.isFocus`、`priorityLevel`、`ProjectTag` | あり | 注力案件比率・注力理由集計に使える |
| 精算時間幅 | `settlementTimeMin`、`settlementTimeMax` | あり | 契約条件の比較に使える |
| 外国籍可否 | `foreignNationalityPolicy` | あり | NG条件・データ品質チェックに使える |
| 年齢条件 | `ageCondition` | あり | 自由記述。50代/60代NGなどは正規化余地あり |
| 面談回数 | `interviewCount` | あり | 案件難易度の代理指標 |
| 上位会社 | `ProjectCompanyRole.role = UPPER_COMPANY` | あり | `Company` と紐づく |
| エンドユーザー | `ProjectCompanyRole.role = END_USER` | あり | 直請け判定に使える |
| 元請 | `ProjectCompanyRole.role = PRIME_CONTRACTOR` | あり | 商流深度に使える |
| 二次請け | `ProjectCompanyRole.role = SECONDARY_CONTRACTOR` | あり | 商流深度に使える |
| 三次請け | `ProjectCompanyRole.role = TERTIARY_CONTRACTOR` | あり | 商流深度に使える |
| 作業内容 | `Project.workDescription` | あり | 役割推定や自由記述特徴量に使える |
| 顧客業界 | なし | 不足 | `Company` に業界カラムなし |

## 要員データ

| 調査項目 | 既存データ | 状態 | コメント |
|---|---|---|---|
| スキル | `PersonSkill.skillName` | あり | スキル別供給数の主キー |
| 経験年数 | `PersonSkill.years` | カラムあり | 作成フォームでは明示入力なし。抽出・運用で埋める必要あり |
| スキルレベル | `PersonSkill.level` | カラムあり | AIマッチング特徴量に有効 |
| 希望単価 | `Person.desiredUnitPrice` | あり | 単価帯別供給数、案件単価との乖離に使える |
| 稼働開始日 | `Person.availableFrom` | あり | 案件開始月との差分に使える |
| 居住地 | なし | 不足 | 現状は希望勤務地と分離されていない |
| 希望勤務地 | `Person.preferredLocation` | あり | 自由記述。都道府県正規化が必要 |
| リモート可否 | `Person.remotePreference` | あり | 自由記述。`FULL_REMOTE` などへ正規化したい |
| 希望条件 | `summary`、`careerSummary`、`preferredLocation`、`remotePreference` | 一部あり | 明確な希望条件モデルはない |
| 所属会社 | `Person.ownerCompanyId`、`Company` | あり | BP/所属企業分析に使える |
| 個人事業主などの区分 | なし | 不足 | 所属区分カラムなし |
| 年齢 | `Person.age` | あり | 条件フィルタやマッチング特徴量に使える |
| 国籍 | `Person.nationality` | あり | 外国籍条件との照合に使える |
| ステータス | `Person.status` | あり | `AVAILABLE`、`PROPOSING`、`JOINED` など |
| 職務要約 / 役割 | `careerSummary`、抽出結果の `roleHeadline` | 一部あり | 構造化された役割カラムはない |

## マッチング・営業履歴関連

| 調査項目 | 既存データ | 状態 | コメント |
|---|---|---|---|
| 提案履歴 | `Proposal` | あり | 要員、案件、提案先会社、営業アカウント、ステータスを持つ |
| 提案日 | `Proposal.proposedAt` | あり | 営業履歴の起点 |
| エントリー日 | `enteredAt` | あり | 進捗分析に使える |
| 面談調整日 | `interviewScheduledAt` | あり | 面談到達の代理指標 |
| 面談実施日 | `interviewedAt` | あり | 面談到達の代理指標 |
| オファー日 | `offeredAt` | あり | 成約手前の代理指標 |
| 参画日 | `joinedAt` | あり | 成約相当として扱えるが契約詳細は不足 |
| 見送り日 | `rejectedAt` | あり | 失注相当だが理由は不足 |
| 辞退日 | `withdrawnAt` | あり | 失注相当だが理由は不足 |
| ステータス履歴 | `ProposalStatusHistory` | あり | 変更理由・メモはある |
| 配信履歴 | `DistributionLog` | あり | 誰が誰に何を送ったか、メールID、送信日時、配信状態 |
| マッチングスコア | なし | 不足 | 案件・要員ペア単位のスコア保存モデルなし |
| マッチング理由 | なし | 不足 | `reason` 保存先なし |
| warning | 抽出/分類にはあり | 部分的 | AIマッチングのwarningではない |
| attention | UI表示用 `ProjectTag` / `attention` 変換 | 部分的 | DB上は主にタグ |
| reviewReason | `ExtractionResult.normalizedResult.reviewReasons` | 部分的 | Gmail抽出品質の理由であり、マッチングレビュー理由ではない |
| matching履歴 | なし | 不足 | `Proposal` は営業提案履歴。AIマッチング候補生成履歴とは別 |

## 抽出・データ品質関連

| 調査項目 | 既存データ | 状態 | コメント |
|---|---|---|---|
| 抽出信頼度 | `ExtractionResult.confidence` | あり | Gmail抽出品質に使える |
| 正規化抽出結果 | `ExtractionResult.normalizedResult` | あり | `missingFields`、`reviewReasons`、分類スコアを保持可能 |
| 要確認 | `ExtractionResult.reviewStatus`、`MailNotification.needsReview` | あり | データ品質アラートに使える |
| 分類スコア | `ClassificationScoreSummary` | あり | `projectScore`、`personScore`、`conflictMargin` |
| warning | `ClassificationScoreSummary.warnings` | あり | Gmail分類・抽出品質として使える |

## 足りない項目

市場分析・AIマッチングの精度を上げるには、以下が不足している。

| 項目 | 必要理由 | 推奨フェーズ |
|---|---|---|
| 成約結果の明確な outcome | 成約率・教師データに必要 | フェーズ2 |
| 面談結果 | 面談到達率、面談通過率に必要 | フェーズ2 |
| 失注理由 | 改善施策、負例学習に必要 | フェーズ2 |
| 継続月数 | LTV、継続しやすい案件条件に必要 | フェーズ3 |
| 粗利 | 営業優先度の利益面に必要 | フェーズ3 |
| 契約単価 / 仕入単価 | 単価妥当性と粗利に必要 | フェーズ3 |
| 提案者 | `ownerUserId` / `senderUserId` はあるが、業務上の提案者定義を固める必要あり | フェーズ2 |
| 顧客業界 | 業界別勝ち筋に必要 | フェーズ2 |
| 顧客別受注履歴 | 顧客ポートフォリオ分析に必要 | フェーズ3 |
| 要員所属区分 | BP/個人事業主/社員などの分析に必要 | フェーズ2 |
| 役割 | 市場セルとAI特徴量に必要 | フェーズ2 |
| 経験年数の入力密度 | 市場セルとスキル妥当性に必要 | フェーズ2 |
| スキル辞書 | 表記ゆれ解消、AI特徴量に必要 | フェーズ1.5 |

## 既存データだけで可能な分析

- スキル別案件数、要員数、需給ギャップ
- スキル別単価中央値
- 必須スキルと尚良スキルの需要差
- 単価帯別案件数、要員数、中央値
- 案件単価と要員希望単価の乖離
- 地域別案件数、要員数、単価
- 勤務形態別案件数、単価
- 開始月別案件数、要員稼働可能数
- 契約形態別案件数、単価
- 商流ロール別案件数
- 注力案件のスキル・地域・単価分布
- データ不足アラート
- 抽出要確認件数、reviewReasons件数

## 既存データだけでは難しい分析

- 真の成約率
- 失注理由別の改善分析
- 面談通過率
- 粗利ランキング
- 継続しやすい案件条件
- 顧客業界別の受注傾向
- AIマッチングの教師あり学習
- 価格改定施策の効果測定

