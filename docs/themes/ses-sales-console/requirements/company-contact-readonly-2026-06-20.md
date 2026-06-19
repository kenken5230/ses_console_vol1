# Company/Contact Read-Only Contract 2026-06-20

作成日: 2026-06-20

## 目的

会社/担当者のCRUD APIを増やす前に、既存の `GET /api/dashboard-data` で読めている会社/担当者情報をread-only contractとして整える。案件詳細と要員詳細では、会社ロール、所属会社、担当者、必要最小の連絡先を確認できるようにする。

## Read-Only Contract

### Project

`project.companyRoles` は `ProjectCompanyRole` をsafe shapeに変換して返す。

| field | 内容 |
|---|---|
| `id` | role id。内部参照用 |
| `role` | `UPPER_COMPANY` / `END_USER` などのrole key |
| `roleOrder` | 表示順 |
| `isPrimary` | 主担当/主ロール判定 |
| `company` | `id`, `name`, `tradeStatus`, `mainEmailDomain`, `tdbScore` のみ |
| `contact` | `id`, `name`, `email`, `phone`, `department`, `position`, `isActive` のみ |

### Person

`person.ownerCompany` と `person.ownerContact` はsafe shapeに変換して返す。既存互換の `company` / `contact` 文字列は残す。

| field | 内容 |
|---|---|
| `ownerCompany` | `id`, `name`, `tradeStatus`, `mainEmailDomain`, `tdbScore` のみ |
| `ownerContact` | `id`, `name`, `email`, `phone`, `department`, `position`, `isActive` のみ |

## PII / Long Text Boundary

レスポンスに出す連絡先は、業務画面で必要な担当者 `email` / `phone` までとする。会社/担当者の `notes`, `contactPolicy`, `corporateNumber`, `websiteUrl`, `bankruptcyRiskScore` はdashboard contractに含めない。Prisma queryも `true` includeではなくsafe selectに絞る。

## DB Write Boundary

- 新規の会社CRUD APIは作らない。
- 新規の担当者CRUD APIは作らない。
- `PATCH /api/persons` は作らない。
- `GET /api/dashboard-data` はread-onlyのままにする。
- schema/migration/deploy/DB write smokeは行わない。

## UI Boundary

案件詳細と要員詳細は `detail.groups` のread-only itemとして会社/担当者を表示する。編集ボタンや未実装のenabled操作は追加しない。

## Tests

`scripts/company-contact-readonly.test.ts` で次を検査する。

- mapper fixtureがsafe shapeだけを返すこと。
- dashboard routeがread-only mapperを使うこと。
- dashboard routeがfull company/contact includeを使わないこと。
- dashboard routeにwrite handler/callがないこと。
- 会社/担当者CRUD routeと `PATCH /api/persons` が追加されていないこと。

## 次PR候補

- 会社/担当者検索UIと重複候補提示。
- 会社/担当者CRUD APIのwrite contract設計。
- 担当者の無効化、連絡ポリシー、監査ログの要件定義。
- 案件/要員編集フォームから既存会社/担当者を選択する導線。
