# Company/Contact Candidates Read-Only Contract 2026-06-20

作成日: 2026-06-20

## 目的

#73 で案件詳細/要員詳細に会社・担当者情報を read-only 表示できるようになった。次の段階として、保存UIやDB更新へ進む前に、既存の会社/担当者データから「同じ会社っぽい」「同じ担当者っぽい」候補を計算する read-only contract を追加する。

このPRは候補を出すだけ。保存、DB更新、schema変更、migration、deployは行わない。

## 入力

候補計算は純粋関数として行う。入力は次のどちらにも合わせられる。

- #73 の `dashboard-data` に出てくる read-only company/contact safe shape 相当
- フォーム入力相当の会社名、メール、担当者名、担当者メール

関数はDB接続、fetch、Prisma importを持たない。既存データの取得や画面表示は別PRの責務とする。

## 出力

出力は候補リストで、各候補は `score` と `reasonCodes` を持つ。

主な reason code:

- `company_name_exact`: 会社名の正規化結果が一致
- `company_name_variant`: 会社名の表記ゆれ程度の一致
- `email_domain_match`: 入力メールドメインと会社/担当者メールドメインが一致
- `contact_email_match`: 担当者メールが一致
- `contact_name_exact`: 担当者名の正規化結果が一致
- `contact_name_variant`: 担当者名の表記ゆれ程度の一致

大量データで暴れないように、走査件数上限と返却件数上限を持つ。

## 公開しない項目

候補出力には次の内部項目を含めない。

- `notes`
- `contactPolicy`
- `corporateNumber`
- `bankruptcyRiskScore`
- `normalizedName`
- その他、保存や審査用の内部メモ/リスク情報

画面に出せる情報は #73 の read-only safe shape に寄せ、会社名、取引ステータス、メールドメイン、担当者名、担当者メール/電話などの必要最小限に限定する。

## DB Write Boundary

このPRで行わないこと:

- 会社/担当者の保存UI追加
- `PATCH /api/persons` 追加
- `app/api/companies/**` の新設
- `app/api/company-contacts/**` の新設
- `app/api/projects/route.ts` のwrite処理変更
- `PersonCreateDrawer` / `ProjectCreateDrawer` の保存payload変更
- `prisma/schema.prisma` 変更
- `prisma/migrations/**` 追加
- DB write、migration、deploy

## PR順序

1. 本PR: 純粋関数、契約テスト、docsのみを追加し、候補計算の read-only contract を固定する。
2. 次PR: 案件/要員の作成・詳細UIに候補表示UIを追加する。まだ保存はしない。
3. その後のPR: Owner承認後にDB write route、保存payload、監査/検証を設計して追加する。

この順序により、候補の判定理由と安全な出力境界を先に固定してから、UIとDB writeへ進める。
