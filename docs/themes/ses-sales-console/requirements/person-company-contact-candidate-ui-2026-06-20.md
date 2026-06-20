# 要員詳細 会社/担当者候補（表示のみ）

## 目的

要員詳細に、既存の会社/担当者マスタから推定した候補を表示する。候補は確認補助だけに使い、保存・反映・編集なしとする。

## スコープ

- `app/api/dashboard-data/route.ts` の person detail に候補 item を追加する。
- 候補計算は #74 の `lib/company-contact-candidates.ts` にある純粋関数 `findCompanyContactCandidates` を使う。
- `components/PersonDetailPane.jsx` の候補リスト本体は候補を表示するだけにする。
- 既存会社・既存担当者への guarded link UI は、候補リストとは別 panel として `person-owner-link-ui-2026-06-20.md` に従う。
- 表示文言は `会社/担当者候補（表示のみ）`, `DBには保存されません`, `自動反映なし` を必ず含める。

## 非スコープ

- 候補リスト本体では保存・反映・編集なし。
- Person owner existing link API 以外の DB write route 追加なし。
- Project/generic DB write route 追加なし。
- `PATCH /api/persons` なし。
- `app/api/companies/**` / `app/api/company-contacts/**` 新設なし。
- `app/api/projects/route.ts` 変更なし。
- `ProjectDetailPane` 変更なし。
- `PersonCreateDrawer` / `ProjectCreateDrawer` 変更なし。
- Prisma schema / migration 変更なし。
- deploy なし。

## UI 要件

- 候補は company/contact の safe shape と score/reason codes のみを表示する。
- 候補リスト本体には、ボタン、選択、チェック、保存、反映、mailto/tel リンクは置かない。
- このリンク禁止は候補UI部分に限定し、既存read-only通常行の連絡先表示や mailto/tel 方針とは別に扱う。
- 既存リンク UI は候補リスト外の確認 panel でのみ表示し、最初のクリックで PATCH しない。
- 候補がない場合も read-only notice を表示し、DB未保存と自動反映なしを明示する。

## テスト

- `scripts/person-company-contact-candidate-ui.test.ts`
  - 候補 UI が操作要素、mailto/tel、write fetch を持たないこと。
  - `dashboard-data` が候補を person detail にだけ追加していること。
  - 保存 payload / API write / `PATCH /api/persons` を増やしていないこと。
  - 禁止ファイルを触っていないこと。
