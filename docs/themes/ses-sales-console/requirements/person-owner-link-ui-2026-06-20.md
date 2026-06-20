# Person owner existing link UI

## 目的

Person detail に表示済みの会社・担当者候補から、管理者が安全に既存 `Company` / 既存 `CompanyContact` へリンクできる導線を追加する。対象 API は実装済みの `PATCH /api/persons/[id]/owner-company-contact` のみであり、新規会社作成、新規担当者作成、Project/generic company/contact write route は対象外とする。

## Dashboard payload

`GET /api/dashboard-data` は Person detail UI 用に次の最小情報を返す。

- root: `personOwnerLinkWriteAllowed`。`ADMIN` / `MANAGER` のみ `true`。`SALES` は不可。
- person: `ownerLinkUpdatedAt`。PATCH の `expectedUpdatedAt` に使う ISO timestamp。
- person: `ownerCompanyId` / `ownerContactId`。既存リンク上書き防止に使う。
- person: `ownerLinkReviewStatus` / `needsReview` / `reviewReasons` / `nameConfidence`。危険な抽出状態の gating に使う。
- candidate: 既存候補の `company.id` / `company.tradeStatus` / `contact.id` / `contact.companyId` / `contact.isActive`。候補が既存会社・既存担当者で同じ会社に属することを UI でも確認する。

`bodyText`、自由メモ、raw extraction text、notes は link payload に入れない。

## UI flow

候補リスト自体は従来どおり表示専用のまま維持する。その下に別パネルとして「既存会社・既存担当者へのリンク」を表示する。

1. 最初のクリックは確認 UI を開くだけで、PATCH は実行しない。
2. 確認 UI には「既存会社・既存担当者にリンクするだけ」「新規作成しない」「既存リンクを上書きしない」「元メール本文や自由メモは送らない」を表示する。
3. チェックボックス「上記の会社・担当者が正しいことを確認しました」を必須にする。
4. 確定ボタンだけが `PATCH /api/persons/[id]/owner-company-contact` を呼ぶ。
5. 成功後は optimistic local write を行わず、dashboard reload 後に同じ Person を reselect する。
6. `409`、`manual-review`、`disabled`、`403` は notice に出し、ローカルの owner 状態は書き換えない。

## UI gating

`lib/person-owner-link-ui.ts` の純粋関数で判定する。`canEditEntities` は `SALES` を含むため使い回さない。

- `ADMIN` / `MANAGER` かつ `personOwnerLinkWriteAllowed=true` のみ表示。
- Person の DB UUID がある。
- `ownerCompanyId` / `ownerContactId` が未設定。
- candidate に既存 `company.id` / `contact.id` がある。
- `contact.isActive=true`。
- `contact.companyId === company.id`。
- `company.tradeStatus` が `NG` / `NEEDS_REVIEW` / `SUSPENDED` ではない。
- `needsReview`、危険な `reviewStatus`、`reviewReasons`、低 confidence、低 candidate score は disabled 理由を表示する。

## Request payload

UI が送る payload は既存 API contract の許可フィールドだけにする。

```json
{
  "intent": "LINK_EXISTING_PERSON_OWNER_COMPANY_CONTACT",
  "companyId": "company-uuid",
  "contactId": "contact-uuid",
  "confirmCompanyContactLink": true,
  "expectedOwnerCompanyId": null,
  "expectedOwnerContactId": null,
  "expectedUpdatedAt": "2026-06-20T01:02:03.000Z"
}
```

## 未実装・禁止

- Project company/contact link UI。
- generic Company / CompanyContact write route。
- `PATCH /api/persons`。
- schema change / migration。
- production/staging DB 操作、実DB write smoke、deploy。
