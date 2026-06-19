# Entity Edit Contract 2026-06-20

作成日: 2026-06-20

## 目的

要員編集、会社編集、担当者編集のDB write APIを増やす前に、画面と既存read APIが同じfield contractを見る状態にする。今回のPRは契約整備だけを対象とし、DB write追加、migration、schema変更、deploy、実DB write smokeは行わない。

## DB Write承認境界

- `PATCH /api/persons` は未実装のままにする。
- 会社/担当者CRUD API は未実装のままにする。
- `PersonCreateDrawer` の保存は既存の `POST /api/persons` のままにする。
- `app/api/dashboard-data/route.ts` は既存のDB read APIとして扱い、新しいwrite経路を追加しない。
- schema/migration は変更しない。

## 要員フォーム契約

`components/PersonCreateDrawer.jsx` と `app/api/dashboard-data/route.ts` の `person.formValues` は、`lib/person-form-contract.ts` の保存対象fieldを共有する。

| field | 画面ラベル | 現時点の扱い |
|---|---|---|
| `name` | 要員名 | 保存対象。`POST /api/persons` で必須 |
| `initials` | イニシャル | 保存対象 |
| `ownerCompanyName` | 所属会社 | 保存対象。会社は既存POST内のfind/createのみ |
| `status` | 状態 | 保存対象 |
| `skills` | 使用技術 | 保存対象。`PersonSkill` へ分解 |
| `availableFrom` | 稼働開始日 | 保存対象 |
| `desiredUnitPrice` | 希望単価 | 保存対象 |
| `preferredLocation` | 希望勤務地 | 保存対象 |
| `remotePreference` | リモート可否 | 保存対象 |
| `age` | 年齢 | 保存対象 |
| `nationality` | 国籍 | 保存対象 |
| `careerSummary` | 経験職種 | 保存対象 |
| `summary` | 得意領域 | 保存対象 |
| `ownerContactName` | 担当者 | 保存対象。担当者は既存POST内のfind/createのみ |
| `ownerContactEmail` | 担当者メール | 保存対象 |
| `createdBy` | 作成者 | 保存対象。既存ユーザー解決のみ |
| `createdAt` | 作成日 | 保存対象 |

### 未保存/後続課題

| field | 画面で必要な意味 | 現時点の扱い |
|---|---|---|
| `processes` | 対応工程。要件定義、基本設計、製造、テストなど | 未保存。保存先未確定のため、今回のdrawer保存対象と `person.formValues` から外す。後続PRで保存先と検索/AI利用方針を決めてから復帰する |
| `skillSheetUrl` | スキルシート原本の確認先 | 未実装 |
| `salesLimitations` | 商流制限、提案NG条件 | 未実装 |
| `interviewStatus` | 面談状況 | 未実装 |
| `proposalBlockReason` | 提案NG理由 | 未実装 |

## 会社編集の後続契約

会社専用の編集/CRUD APIはまだ作らない。後続PRでは次のfieldを会社編集の入口契約にする。

| field | 画面ラベル | 備考 |
|---|---|---|
| `name` | 会社名 | 重複確認の主キー候補 |
| `normalizedName` | 正規化名 | 表記ゆれ検索用。画面で直接編集させるかは後続判断 |
| `tradeStatus` | 取引可否 | `UNKNOWN` / `OK` / `NG` / `SUSPENDED` / `NEEDS_REVIEW` |
| `mainEmailDomain` | メールドメイン | Gmail由来の会社候補推定に利用 |
| `websiteUrl` | Webサイト | 会社確認用 |
| `tdbScore` | 帝国データバンク点数 | 与信判断の補助 |
| `riskMemo` | リスクメモ | 取引注意、過去トラブル、確認事項 |
| `corporateNumber` | 法人番号 | 同名会社の取り違え防止 |
| `notes` | 備考 | 任意補足 |

## 担当者編集の後続契約

担当者専用の編集/CRUD APIもまだ作らない。後続PRでは次のfieldを担当者編集の入口契約にする。

| field | 画面ラベル | 備考 |
|---|---|---|
| `name` | 担当者名 | 会社内での識別名 |
| `companyId` | 所属会社 | 会社編集/検索と接続するID |
| `email` | メール | 提案、面談調整、返信追跡の中心 |
| `phone` | 電話 | 急ぎ確認用 |
| `department` | 部署 | 同一会社内の識別補助 |
| `title` | 役職 | 決裁者/営業担当/窓口の判断補助 |
| `contactPolicy` | 連絡方針 | メール優先、電話NG、CC必須など |
| `isActive` | 有効/無効 | 退職、担当変更への対応 |
| `notes` | 備考 | 任意補足 |

## 検査方針

`scripts/entity-edit-contract.test.ts` でDBなしの静的/純粋関数テストを行う。

- drawerの保存対象field名、初期値、dashboard `person.formValues` のfield名が一致すること。
- `processes` が未保存/後続課題として残り、保存対象fieldに混ざらないこと。
- `PersonCreateDrawer` が `initialValues` を受けられるが、保存挙動はPOST-onlyのままであること。
- `PATCH /api/persons` と会社/担当者CRUD APIが今回追加されていないこと。
