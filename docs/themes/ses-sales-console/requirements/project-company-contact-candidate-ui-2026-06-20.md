# 案件詳細 会社/担当者候補（表示のみ）

## 目的

案件詳細に、既存の会社/担当者マスタから推定した `会社/担当者候補（表示のみ）` を表示する。候補は確認材料として扱い、DBには保存されません。自動反映なし。

## スコープ

- `app/api/dashboard-data/route.ts` の project detail に候補 item を追加する。
- 候補計算は `lib/company-contact-candidates.ts` の `findCompanyContactCandidates` を使う。
- `components/ProjectDetailPane.jsx` は候補を表示するだけにする。
- 2026-06-20 追記: 候補表示そのものは引き続き read-only。別枠の確認パネルだけが、既存 `PATCH /api/projects/[id]/company-contact-role` を使って既存 Company/CompanyContact をリンクする。
- 既存のPerson側候補表示とread-only会社/担当者表示は維持する。
- CSSは候補表示では既存の `.readonly-candidate-*` を再利用する。リンク確認パネルは既存の owner link panel 系クラスを流用する。

## 非スコープ

- DB write route追加なし。
- `PATCH /api/persons` 追加なし。
- `app/api/companies/**` / `app/api/company-contacts/**` / `app/api/company-contact-candidates/**` 新設なし。
- `app/api/projects/route.ts` 変更なし。
- `ProjectCreateDrawer` / `PersonCreateDrawer` 変更なし。
- 候補表示部分からの保存payload変更なし。
- 新規Company/Contact作成API追加なし。
- Prisma schema / migration変更なし。
- deploy操作なし。

## UI要件

- 見出しに `会社/担当者候補（表示のみ）` を表示する。
- noticeに `DBには保存されません` と `自動反映なし` を表示する。
- 候補なしでもread-only noticeと `候補なし` を表示する。
- ボタン、選択、チェック、保存、反映、`mailto:`、`tel:` リンクは置かない。
- このリンク禁止は候補UI部分に限定し、既存read-only通常行の連絡先表示や mailto/tel 方針とは別に扱う。
- 会社名、担当者名、メール、電話、部署/役職、score、reason code由来ラベルだけを表示する。
- 既存会社・担当者リンク導線は候補がある場合だけ別枠で表示する。
- 最初のクリックは確認パネルを開くだけにする。
- 最終実行はロール、理由コード、確認チェックボックスを必須にする。
- 成功時だけ dashboard reload/reselect を行い、成功前のローカル状態更新はしない。

## テスト

- `scripts/project-company-contact-candidate-ui.test.ts`
  - Project detail が共有候補helperを使うこと。
  - 候補UIに操作要素、write fetch、`mailto:`、`tel:` がないこと。
  - 保存payload変更なし、API write追加なし、`PATCH /api/persons` なしであること。
  - 禁止ファイルを触っていないこと。
- 既存の `person-company-contact-candidate-ui` と `company-contact-write-contract` もProject拡張を許容しつつ、read-only契約を維持する。
