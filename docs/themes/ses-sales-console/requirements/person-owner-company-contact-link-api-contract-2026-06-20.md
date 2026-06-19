# Person owner company/contact link API contract

## Purpose

Person の既存会社/担当者紐づけを DB 保存APIへ進める前に、最小 write API contract を固定する。このPRでは API route 本体、DB write route、migration、schema変更、UI保存ボタン、deploy は行わない。

## Endpoint Draft

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
- Person に `ownerCompanyId` または `ownerContactId` の既存値ありの場合、既存値上書きは禁止し、`409` または `manual-review` を返す。
- `expectedOwnerCompanyId` / `expectedOwnerContactId` / `expectedUpdatedAt` が現在DB値と一致しない場合は `409`。
- 新規会社作成、新規担当者作成、既存値上書き、暗黙保存、自動反映は禁止する。

## Manual Review / Conflict Conditions

次の条件は自動保存せず、`409 Conflict` または `manual-review` response とする。

- 低confidence の候補。
- Gmail、Yahoo、Outlook、iCloud など汎用ドメイン由来の候補。
- Person に既存値あり。
- `contact.companyId` と `companyId` が不一致。
- 会社名一致とメールドメイン一致が別会社を指す。
- 担当者メールは一致するが担当者名または会社が一致しない。
- `tradeStatus` が `NG` または `NEEDS_REVIEW` の会社。
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

## AuditLog Draft

DB write 実装時は、同一 transaction 内で `AuditLog` に beforeData / afterData を残す。

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
    "updatedAt": "2026-06-20T00:00:01.000Z"
  },
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
```

## Out Of Scope

- API route 本体作成。
- DB write route 追加。
- `PATCH /api/persons` 追加。
- `app/api/companies/**` / `app/api/company-contacts/**` 新設。
- Prisma schema / migration 変更。
- UI保存ボタン追加。
- rollback route 実装。
- 実DB write smoke。
- production write。
- deploy。

