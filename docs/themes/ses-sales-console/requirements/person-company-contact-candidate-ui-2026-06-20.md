# 要員詳細 会社/担当者候補UI 2026-06-20

## 目的

`PersonDetailPane` に会社/担当者候補を表示のみで追加する。候補は元メール・送信元情報から推定した参考情報であり、DBには保存しない。

## スコープ

- `GET /api/dashboard-data` の要員詳細 `detail.groups` に `会社/担当者候補（表示のみ）` を追加する。
- 候補計算は `lib/company-contact-candidates.ts` の純粋関数 `findCompanyContactCandidates` を使う。
- 候補ソースは既存会社/担当者の read-only select から作る。
- 要員詳細だけを対象にする。案件詳細、作成Drawer、保存payloadは変更しない。

## UI要件

- 表示文言は `会社/担当者候補（表示のみ）`、`元メール・送信元情報から推定した候補です。DBには保存されません。`、`自動反映なし` を含める。
- 候補がない場合は `候補はありません。現在の保存値は変更されません。` を表示する。
- ボタン、チェックボックス、選択UI、自動反映、保存導線を追加しない。
- 候補内のメール/電話は `mailto:` / `tel:` リンクにしない。

## 非スコープ

- DB write route追加。
- `PATCH /api/persons` 追加。
- `app/api/companies/**` / `app/api/company-contacts/**` 新設。
- `app/api/projects/route.ts` のwrite変更。
- `ProjectCreateDrawer` / `PersonCreateDrawer` の保存payload変更。
- Prisma schema / migration変更。

## 検証

- `scripts/company-contact-candidate-ui.test.ts` で表示文言、操作UIなし、write/API/schema非変更を静的に検査する。
- 既存の `test:company-contact-candidates` と `test:company-contact-readonly` で純粋関数とread-only表示契約を継続検査する。
