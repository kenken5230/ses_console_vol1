# Gmail Person Remediation Supervised Ops Design v0.1

作成日: 2026-06-04

## 1. 目的

既存Gmail由来personの `name` にメール件名全文が入っている汚れを、安全にまとめて修正する。

ユーザー操作は最小限にする。CLI内部では小さい単位でscan、candidate抽出、apply、audit、post-countを実行し、失敗時は即停止する。

## 2. 方針

- ユーザーは原則、preview 1回、apply 1回だけ実行する。
- CLIは `scanLimit` 件までcandidateを探す。
- CLIは `updateLimit` 件まで更新する。
- DB更新は `chunkSize` 最大50件単位で進める。
- 1chunkにcandidateが0件でも停止しない。
- 1chunkのupdatedが0件でも停止しない。
- failedが1件でも出たら停止する。
- apply後に同じ条件でpost-countを自動実行し、残candidate数を出す。

## 3. コマンド

Preview:

```powershell
npm.cmd run gmail:extract:person-remediation -- --batch-preview --scan-limit=5000 --update-limit=2000 --chunk-size=50
```

Apply:

```powershell
npm.cmd run gmail:extract:person-remediation -- --batch-apply --scan-limit=5000 --update-limit=2000 --chunk-size=50 --confirm=APPLY_GMAIL_PERSON_REMEDIATION
```

Alias:

```powershell
npm.cmd run gmail:extract:person-remediation -- --supervised-preview --scan-limit=5000 --update-limit=2000 --chunk-size=50
npm.cmd run gmail:extract:person-remediation -- --supervised-apply --scan-limit=5000 --update-limit=2000 --chunk-size=50 --confirm=APPLY_GMAIL_PERSON_REMEDIATION
```

## 4. 更新対象

対象条件:

- `sourceMailId is not null`
- `sourceMail.sourceAccount.provider = GMAIL`
- `status != ARCHIVED`
- `name != null`
- `name` がsubject-likeまたはLOW confidence
- 実行時candidateのcurrentNameとDB上のcurrent `name` が一致

対象外:

- ARCHIVED person
- Gmail以外のsource mail由来person
- sourceMailがないperson
- nameがnullのperson
- 実名っぽいname
- initialsのみと判断できるname
- 実行中に別処理がnameを更新したperson

## 5. 更新内容

更新する:

- `persons.name = null`
- `extraction_results` に `reviewStatus = NEEDS_REVIEW` の監査レコード追加

更新しない:

- `persons.initials`
- `persons.summary`
- `persons.careerSummary`
- `persons.skills`
- `persons.desiredUnitPrice`
- `persons.age`
- `persons.availableFrom`
- `persons.ownerCompany`
- `mail_entity_links`
- `proposals`
- person削除

## 6. 出力

Preview summary:

- `mode`
- `scanLimit`
- `updateLimit`
- `chunkSize`
- `scannedTotal`
- `candidatesTotal`
- `wouldUpdateTotal`
- `skippedTotal`
- `failedTotal`
- `chunks`
- `stoppedReason`
- sample rows最大50件

Apply summary:

- `mode`
- `scanLimit`
- `updateLimit`
- `chunkSize`
- `beforeScanned`
- `beforeCandidates`
- `updatedTotal`
- `skippedTotal`
- `failedTotal`
- `afterScanned`
- `afterCandidates`
- `reducedCandidates`
- `chunks`
- `stoppedReason`
- sample rows最大20件
- failed rowsがある場合のみ詳細

## 7. 停止条件

停止する:

- `failedTotal > 0`
- `updatedTotal >= updateLimit`
- `scannedTotal >= scanLimit`
- 次ページがない
- scanLimit内にcandidateがない

停止しない:

- 1chunk内のcandidateが0
- 1chunk内のupdatedが0
- 最新側50件がcleanだっただけ

## 8. 誤実行防止

Apply必須引数:

- `--batch-apply` または `--supervised-apply`
- `--scan-limit`
- `--update-limit`
- `--chunk-size`
- `--confirm=APPLY_GMAIL_PERSON_REMEDIATION`

上限:

- `scanLimit <= 5000`
- `updateLimit <= 2000`
- `chunkSize <= 50`

confirmなしapplyはDB更新前にエラー終了する。

## 9. Codex実施範囲

Codexが実行してよい:

- read-only preview
- count-only
- unit/quality test
- TypeScript check
- build
- confirmなしapplyのエラー確認

Codexが実行しない:

- confirmありapply
- DB削除
- 既存データの直接更新
- migration reset
- production DB向け操作

## 10. 2周テスト

1周目:

- `npm.cmd run test:gmail-extraction-quality`
- `npm.cmd exec -- tsc --noEmit`
- `npm.cmd run build`
- `npm.cmd run gmail:extract:person-remediation -- --scan-limit=1000 --count-only`
- `npm.cmd run gmail:extract:person-remediation -- --limit=10`
- `npm.cmd run gmail:extract:person-remediation -- --batch-preview --scan-limit=5000 --update-limit=2000 --chunk-size=50`
- confirmなしapplyがエラー終了すること

2周目:

- 1周目と同じコマンドを再実行する。
- count-only / previewがDB更新なしで同じ傾向になることを確認する。
- applyガードが維持されていることを確認する。
- build cache起因の失敗がある場合は `.next` のみ削除し、同じbuildを再実行して成功することを確認する。

## 11. Owner確認が必要な項目

- stagingでpreview結果のcandidate傾向を見ること。
- stagingでconfirmありapplyを実行すること。
- apply後の画面表示で、件名全文nameが `氏名未取得（GMAIL-xxxx）` 表示になっていること。

Ownerに頼らずCodexが確認する項目:

- コマンドの安全条件
- read-only出力
- TypeScript/build
- PR差分
- secretやDB接続URLが出ていないこと
