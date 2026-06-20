# Person owner company/contact link API contract

## Purpose

Person の既存会社/担当者紐づけを DB 保存APIへ進める前に、最小 write API contract を固定する。現在は `PATCH /api/persons/[id]/owner-company-contact` と guarded UI flow が実装済み。migration、schema変更、generic Company/CompanyContact write route、Project link UI、deploy は行わない。

## Endpoint

- Method/path: `PATCH /api/persons/[id]/owner-company-contact`
- Intent: `LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT`
- Scope: Person の `ownerCompanyId` と `ownerContactId` を、既存 `Company` / 既存 `CompanyContact` にだけ紐づける。
- Non-goal: `PATCH /api/persons` は作らない。`app/api/companies/**` / `app/api/company-contacts/**` も新設しない。

## Authorization

- Allowed roles: `ADMIN` / `MANAGER` のみ。
- Forbidden roles: `SALES` は不可。候補確認または申請導線は別PRで検討する。
- Auth failure: 未認証は `401`、権限不足は `403`。

## Feature Guard

DB write は次の feature guard を両方満たす場合だけ有効化できる。

- `COMPANY_CONTACT_LINK_WRITE_ENABLED=true`
- `COMPANY_CONTACT_LINK_WRITE_TARGET=staging`

`COMPANY_CONTACT_LINK_WRITE_TARGET=production` は別承認とする。本番 write、実DB write smoke、rollback route は別PRで扱う。

## Request Body

```json
{
  "intent": "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT",
  "companyId": "company-uuid",
  "contactId": "contact-uuid",
  "confirmCompanyContactLink": true,
  "expectedOwnerCompanyId": null,
  "expectedOwnerContactId": null,
  "expectedUpdatedAt": "2026-06-20T00:00:00.000Z"
}
```

- `companyId`: 既存 `Company.id`。新規会社作成はしない。
- `contactId`: 既存 `CompanyContact.id`。新規担当者作成はしない。
- `confirmCompanyContactLink`: `true` 必須。UI表示を見ただけでは同意と扱わない。
- `expectedOwnerCompanyId`: 呼び出し元が読んだ Person の現在値。既存値ありなら原則 `409`。
- `expectedOwnerContactId`: 呼び出し元が読んだ Person の現在値。既存値ありなら原則 `409`。
- `expectedUpdatedAt`: stale write 防止用。DBの `updatedAt` と一致しない場合は `409`。

raw本文、メール本文、free note、候補生成元の全文、手入力メモは受け取らない。

## Validation Rules

- `intent` は `LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT` のみ許可する。
- `companyId` と `contactId` は既存レコードであること。
- `contact.companyId` と `companyId` の整合確認は必須。異なる場合は `409`。
- `company.tradeStatus` が `NG`、`SUSPENDED`、または `NEEDS_REVIEW` の場合は自動紐づけ禁止とし、人間確認必須。
- `CompanyContact.isActive=false` の場合は自動紐づけ禁止とし、人間確認必須。
- Person に `ownerCompanyId` または `ownerContactId` の既存値ありの場合、既存値上書きは禁止し、`409` または `manual-review` を返す。
- `expectedOwnerCompanyId` / `expectedOwnerContactId` / `expectedUpdatedAt` が現在DB値と一致しない場合は `409`。
- 新規会社作成、新規担当者作成、既存値上書き、暗黙保存、自動反映は禁止する。

## Read Constraints

候補計算用のDB readは、write API実装前から `take` などの明示的な上限と安定した `orderBy` を必須とする。会社/担当者マスタを無制限に全件読みして候補計算しない。

## Manual Review / Conflict Conditions

次の条件は自動保存せず、`409 Conflict` または `manual-review` response とする。

- 低confidence の候補。
- Gmail、Yahoo、Outlook、iCloud など汎用ドメイン由来の候補。
- Person に既存値あり。
- `contact.companyId` と `companyId` が不一致。
- 会社名一致とメールドメイン一致が別会社を指す。
- 担当者メールは一致するが担当者名または会社が一致しない。
- `tradeStatus` が `NG`、`SUSPENDED`、または `NEEDS_REVIEW` の会社。
- `CompanyContact.isActive=false` の担当者。
- reason codes が不足し、人間が根拠を確認できない候補。

Example manual-review response:

```json
{
  "status": "manual-review",
  "reasonCode": "EXISTING_OWNER_LINK_PRESENT",
  "message": "Person already has ownerCompanyId or ownerContactId."
}
```

## Success Response Draft

```json
{
  "personId": "person-uuid",
  "ownerCompanyId": "company-uuid",
  "ownerContactId": "contact-uuid",
  "intent": "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT"
}
```

## Future API Implementation Required Case Table

API 実装済みの現在も、少なくとも次のケースを contract test に含め続ける。

| Case | Input / State | Expected |
| --- | --- | --- |
| authorized happy path | `ADMIN` または `MANAGER`、feature guard staging、既存 `Company` が `OK`、既存 `CompanyContact.isActive=true`、`confirmCompanyContactLink=true` | `ownerCompanyId` / `ownerContactId` を同一transactionで更新 |
| unauthenticated | 未認証 | `401` |
| forbidden role | `SALES` | `403` |
| feature guard disabled | `COMPANY_CONTACT_LINK_WRITE_ENABLED` が `true` 以外 | write不可 |
| production target | `COMPANY_CONTACT_LINK_WRITE_TARGET=production` | 別承認なしではwrite不可 |
| invalid intent | `LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT` 以外 | `400` |
| missing company/contact | `companyId` または `contactId` が存在しない | `404` または `409` |
| mismatched contact company | `contact.companyId` と `companyId` が不一致 | `409` |
| existing owner link | Person に既存 `ownerCompanyId` または `ownerContactId` あり | `409` または `manual-review` |
| stale expected value | `expectedOwnerCompanyId` / `expectedOwnerContactId` / `expectedUpdatedAt` がDB現在値と不一致 | `409` |
| trade NG | `company.tradeStatus=NG` | `409` または `manual-review` |
| trade suspended | `company.tradeStatus=SUSPENDED` | `409` または `manual-review` |
| trade needs review | `company.tradeStatus=NEEDS_REVIEW` | `409` または `manual-review` |
| inactive contact | `CompanyContact.isActive=false` | `409` または `manual-review` |
| raw text rejected | raw本文、メール本文、free note、候補生成元全文、手入力メモを含む | `400` |

## AuditLog Draft

DB write は同一 transaction 内で `AuditLog` に beforeData / afterData を残す。現在の実装では metadata は `afterData.metadata` に入る。

```json
{
  "action": "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT",
  "entityType": "Person",
  "entityId": "person-uuid",
  "beforeData": {
    "ownerCompanyId": null,
    "ownerContactId": null,
    "updatedAt": "2026-06-20T00:00:00.000Z"
  },
  "afterData": {
    "ownerCompanyId": "company-uuid",
    "ownerContactId": "contact-uuid",
    "updatedAt": "2026-06-20T00:00:01.000Z",
    "metadata": {
      "intent": "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT",
      "companyId": "company-uuid",
      "contactId": "contact-uuid",
      "confirmed": true,
      "featureGuard": {
        "COMPANY_CONTACT_LINK_WRITE_ENABLED": "true",
        "COMPANY_CONTACT_LINK_WRITE_TARGET": "staging"
      }
    }
  }
}
```

## Out Of Scope

- `PATCH /api/persons` 追加。
- `app/api/companies/**` / `app/api/company-contacts/**` 新設。
- Prisma schema / migration 変更。
- Project owner/company/contact link UI。
- generic Company/CompanyContact write UI。
- rollback route 実装。
- 実DB write smoke。
- production write。
- deploy。

