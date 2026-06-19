# 要員詳細 会社/担当者候補（表示のみ）

## 目的

要員詳細に、既存の会社/担当者マスタから推定した候補を表示する。候補は確認補助だけに使い、保存・反映・編集なしとする。

## スコープ

- `app/api/dashboard-data/route.ts` の person detail に候補 item を追加する。
- 候補計算は #74 の `lib/company-contact-candidates.ts` にある純粋関数 `findCompanyContactCandidates` を使う。
- `components/PersonDetailPane.jsx` は候補を表示するだけにする。
- 表示文言は `会社/担当者候補（表示のみ）`, `DBには保存されません`, `自動反映なし` を必ず含める。

## 非スコープ

- 保存・反映・編集なし。
- DB write route 追加なし。
- `PATCH /api/persons` なし。
- `app/api/companies/**` / `app/api/company-contacts/**` 新設なし。
- `app/api/projects/route.ts` 変更なし。
- `ProjectDetailPane` 変更なし。
- `PersonCreateDrawer` / `ProjectCreateDrawer` 変更なし。
- Prisma schema / migration 変更なし。
- deploy なし。

## UI 要件

- 候補は company/contact の safe shape と score/reason codes のみを表示する。
- ボタン、選択、チェック、保存、反映、mailto/tel リンクは置かない。
- 候補がない場合も read-only notice を表示し、DB未保存と自動反映なしを明示する。

## テスト

- `scripts/person-company-contact-candidate-ui.test.ts`
  - 候補 UI が操作要素、mailto/tel、write fetch を持たないこと。
  - `dashboard-data` が候補を person detail にだけ追加していること。
  - 保存 payload / API write / `PATCH /api/persons` を増やしていないこと。
  - 禁止ファイルを触っていないこと。
