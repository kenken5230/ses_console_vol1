# Feature Backlog and Task List v0.1

作成日: 2026-06-04

## 1. 目的

SES Consoleで今後やりたい機能を、ユーザー確認を最小化できる粒度でタスク化する。

要件定義書や設計書が既にあるものは参照し、足りないものはこのバックログ内で最小設計を作る。

すべての実装タスクは2周テストを前提にする。

## 2. 参照資料

- `docs/gmail/gmail-ingest-design-v0.1.md`
- `docs/gmail/gmail-ingest-implementation-status-v0.1.md`
- `docs/gmail/gmail-classification-analysis-v0.1.md`
- `docs/themes/gmail-remediation/design/gmail-person-remediation-supervised-ops-v0.1.md`
- `docs/release/network-migration-open-issues-v0.1.md`
- `docs/release/public-release-review-tasks-v0.1.md`
- `docs/shared/quality/two-pass-task-test-policy-v0.1.md`

## 3. 共通実行ルール

- Codexは、Ownerしか確認できないもの以外を先に確認する。
- DB更新を伴うapplyは、preview、上限、confirm、post-countを必須にする。
- 大量処理はCLI内部でchunk化する。
- ユーザーに何度も手動実行させない。
- 既存データ削除は原則禁止。
- secret / DB接続URL / connection stringをmdやPR本文に書かない。
- 実装PRではRound 1 / Round 2のテスト結果をPR本文に書く。

## 4. 優先バックログ

| ID | 優先度 | 機能 | 状態 | 設計 |
|---|---:|---|---|---|
| BK-GM-001 | P0 | Gmail person remediation supervised apply | PR #14で実装済み | `docs/themes/gmail-remediation/design/gmail-person-remediation-supervised-ops-v0.1.md` |
| BK-GM-002 | P0 | remediation後の画面表示・抽出品質確認 | 未着手 | 本書 |
| BK-GM-003 | P1 | Gmail分類/抽出の残candidate精査 | 未着手 | 既存Gmail docs + 本書 |
| BK-SYNC-001 | P1 | Gmail同期ジョブ運用ログ/通知強化 | 一部実装済み | 本書 |
| BK-OPS-001 | P1 | Neon容量監視と保存方針 | 未着手 | 本書 |
| BK-OPS-002 | P1 | 重大エラー通知 | 未着手 | 本書 |
| BK-AUTH-001 | P1 | ADMIN / MANAGER / SALES / VIEWER RBAC再検査 | 未着手 | 本書 |
| BK-DOC-001 | P1 | root README / docs index整備 | 未着手 | 本書 |
| BK-UI-001 | P2 | UI smoke testと画面確認省力化 | 未着手 | 本書 |
| BK-OPS-003 | P2 | 運用引き継ぎ手順 | 未着手 | 本書 |

## 5. BK-GM-001 Gmail Person Remediation Supervised Apply

### 要件

- Owner操作はpreview 1回、apply 1回を原則にする。
- CLI内部では50件以下で安全に処理する。
- apply後にpost-countを自動表示する。
- failedが出たら即停止する。

### タスク

- [x] `--scan-limit` と `--update-limit` を分離する。
- [x] `chunkSize <= 50` を維持する。
- [x] confirm必須にする。
- [x] chunk内candidate 0件で止まらない。
- [x] apply後post-countを出す。
- [ ] stagingでOwnerがpreviewを確認する。
- [ ] stagingでOwnerがapplyを1回実行する。
- [ ] apply後の画面表示を確認する。

### 2周テスト

Round 1:

- `npm.cmd run test:gmail-extraction-quality`
- `npm.cmd exec -- tsc --noEmit`
- `npm.cmd run build`
- `npm.cmd run gmail:extract:person-remediation -- --batch-preview --scan-limit=5000 --update-limit=2000 --chunk-size=50`
- confirmなしapplyのエラー確認

Round 2:

- Round 1と同じread-only確認を再実行する。
- updated=0、failed=0、DB更新なしを確認する。

Owner確認:

- confirmありapply。
- UIで `氏名未取得（GMAIL-xxxx）` 表示確認。

## 6. BK-GM-002 Remediation後の画面表示・抽出品質確認

### 要件

- `persons.name = null` になったGmail由来personが一覧で読める表示になること。
- `nameConfidence`、`reviewReasons`、`roleHeadline` が古いextraction resultではなく最新監査/抽出結果から見えること。
- 件名全文nameが再発しないこと。

### 設計

- dashboard APIの表示ロジックを確認する。
- `sourceMail.extractionResults` の最新順取得を維持する。
- remediation監査レコードがUIに悪影響を与えないか確認する。
- read-onlyの検査CLIまたはSQLを追加する場合は、件数と短縮ID中心にする。

### タスク

- [ ] Gmail由来personの `name is null` 件数をread-onlyで確認する。
- [ ] 件名っぽい `persons.name` 残件をread-onlyで確認する。
- [ ] `dashboard-data` の最新extraction result選択を再確認する。
- [ ] UI表示に必要な `displayName` fallbackを確認する。
- [ ] 画面上の要員一覧で、件名全文が消えているかOwner確認項目にする。

### 2周テスト

Round 1:

- `npm.cmd run gmail:extract:person-remediation -- --scan-limit=5000 --count-only`
- `npm.cmd run gmail:extract:person-remediation -- --limit=10`
- `npm.cmd exec -- tsc --noEmit`
- `npm.cmd run build`

Round 2:

- 同じcount-onlyとpreviewを再実行する。
- 画面APIに変更があればbuildを再実行する。

Owner確認:

- staging UIで要員一覧と詳細表示を見る。

## 7. BK-GM-003 Gmail分類/抽出の残candidate精査

### 要件

- 未分類や誤分類を減らす。
- 要員紹介を案件へ倒さない。
- 案件募集を要員へ倒さない。
- 全件抽出は段階的に進める。

### 設計

- 先にread-only auditで現状分布を取る。
- 誤分類しやすい表現をmdへ記録する。
- ルール変更後はauditでbefore/after件数を比較する。
- DB更新を伴う分類反映はsummary-onlyまたはlimit付きから始める。
- 抽出はpreview、少量apply、duplicates、mismatchesを必ず挟む。

### タスク

- [ ] 現在の分類件数を `gmail:stats` で取得する。
- [ ] `gmail:classify:audit` で未分類/誤分類候補を抽出する。
- [ ] 判断が必要な件名だけOwner確認リストにする。
- [ ] ルール変更案をmdに残す。
- [ ] ルール変更PRを作る。
- [ ] `gmail:extract:preview -- --limit=100` を2周確認する。
- [ ] 少量抽出後にduplicates/mismatchesを確認する。

### 2周テスト

Round 1:

- `npm.cmd run gmail:stats`
- `npm.cmd run gmail:classify:audit -- --limit=100`
- `npm.cmd run gmail:extract:preview -- --limit=100`
- `npm.cmd exec -- tsc --noEmit`

Round 2:

- auditとpreviewを再実行する。
- ルール変更後のbefore/after差分をmdに残す。

Owner確認:

- 業務判断が必要な曖昧件名。
- 全件抽出に進む最終判断。

## 8. BK-SYNC-001 Gmail同期ジョブ運用ログ/通知強化

### 要件

- 同期が成功/失敗したか管理画面またはログで追えること。
- 画面を勝手にリロードしないこと。
- failed件数、分類件数、抽出件数を確認できること。
- 二重実行を防ぐこと。

### 設計

- 既存 `mail_sync_runs` / `job_locks` を運用の中心にする。
- 管理APIはsummary中心のレスポンスにする。
- secretはブラウザへ渡さない。
- Cloudflare WorkerはVercel APIを呼ぶだけにする。
- ユーザー操作では「新着あり」「更新する」導線にする。

### タスク

- [ ] 最新sync run取得APIの出力を確認する。
- [ ] sync run一覧の表示項目を整理する。
- [ ] failed時の表示/通知方針を設計する。
- [ ] Cloudflare Cronからの呼び出しrunbookを作る。
- [ ] 同時実行時のlock挙動をstagingで確認する。

### 2周テスト

Round 1:

- sync APIのrole/secret確認。
- lockあり時の挙動確認。
- `tsc --noEmit`、build。

Round 2:

- 同じAPIを再実行し、二重実行にならないことを確認。
- sync run logが壊れていないことを確認。

Owner確認:

- Cloudflare / Vercelの管理画面env登録。
- 実staging cron実行。

## 9. BK-OPS-001 Neon容量監視と保存方針

### 要件

- Gmail本文保存によるNeon Free容量超過を早期に検知する。
- bodyText/bodyHtmlのサイズ傾向を把握する。
- 削除ではなく保存方針の見直しで対応する。

### 設計

- read-onlyの容量集計CLIを作る。
- mail_notifications件数、bodyText/bodyHtml byte合計、平均、p95、最大を出す。
- 件名/本文全文は出さない。
- 閾値を超えたら運用TODOを出す。

### タスク

- [ ] `gmail:storage:audit` CLI設計を作る。
- [ ] read-only集計を実装する。
- [ ] secret/本文全文が出ないことを確認する。
- [ ] READMEまたはrunbookに月次確認手順を追加する。

### 2周テスト

Round 1:

- storage auditを実行。
- `tsc --noEmit`、build。

Round 2:

- storage auditを再実行し、DB更新なしを確認。
- 出力に本文全文やsecretがないことを再確認。

Owner確認:

- Neon plan変更判断。
- 本文保存方針の業務判断。

## 10. BK-OPS-002 重大エラー通知

### 要件

- Gmail sync / classify / extract / remediationで重大エラーが出たらADMINが気づける。
- 通知失敗が本処理を壊さない。
- secretやconnection stringを通知しない。

### 設計

- 初期はADMIN向け画面通知または `mail_sync_runs` のfailed statusを優先する。
- メール送信はSMTP設定確認後に有効化する。
- 通知本文はsummary、runId、failed count、短縮errorに限定する。
- raw errorはredactして保存/表示する。

### タスク

- [ ] 通知対象イベントを定義する。
- [ ] 通知先設定を定義する。
- [ ] redaction共通関数を確認する。
- [ ] failed sync runのUI表示を設計する。
- [ ] SMTP実送信はOwner確認に残す。

### 2周テスト

Round 1:

- failed状態の表示テスト。
- secret redactionテスト。
- `tsc --noEmit`、build。

Round 2:

- 同じfailed表示を再確認。
- 通知重複がないことを確認。

Owner確認:

- SMTP env登録。
- 実メール到達確認。

## 11. BK-AUTH-001 RBAC再検査

### 要件

- ADMIN / MANAGER / SALES / VIEWER の権限差を壊さない。
- Gmail同期/分類/抽出はADMIN/MANAGERに限定する。
- SALESは案件/要員の作成・編集、未分類からの移動は可能にする。
- VIEWERは閲覧中心にする。

### 設計

- API routeごとに許可role表を作る。
- UI表示だけでなくAPI側で拒否する。
- 未ログイン、VIEWER、SALES、MANAGER、ADMINを分けて確認する。

### タスク

- [ ] API route一覧を作る。
- [ ] role matrixをmd化する。
- [ ] 不足テストを洗い出す。
- [ ] role別HTTP確認スクリプトを検討する。

### 2周テスト

Round 1:

- role matrix作成。
- 主要APIの未ログイン/権限不足確認。
- `tsc --noEmit`、build。

Round 2:

- 別roleで同じAPIを再確認。
- UI非表示とAPI拒否が一致することを確認。

Owner確認:

- 実ユーザーアカウントでのstagingログイン確認。

## 12. BK-DOC-001 root README / docs index整備

### 要件

- 初見でどのdocsを読めばよいか分かる。
- READMEにsecretや実connection stringを書かない。
- 文字化けしているdocsは、必要ならUTF-8で再作成する。

### 設計

- root `README.md` を追加する。
- `docs/README.md` をUTF-8で再整理する。
- docsの入口を `release`、`gmail`、`quality`、`BK` に分ける。

### タスク

- [ ] root READMEを作る。
- [ ] docs indexを更新する。
- [ ] 文字化けファイルの扱いを決める。
- [ ] secret実値がないことを確認する。

### 2周テスト

Round 1:

- docs内secret検索は、接続URL・token・password・secret実値を対象に実行する。
- markdownリンクの存在確認。

Round 2:

- READMEとdocs indexを再読込。
- secret検索を再実行。

Owner確認:

- 文言の好み。

## 13. BK-UI-001 UI smoke testと画面確認省力化

### 要件

- Ownerの画面確認を最小化する。
- Codexができる範囲でローカル/preview画面を確認する。
- 最後にOwnerが見るべき画面だけを短く残す。

### 設計

- 主要タブ、検索、フィルター、ページネーション、サイドペインをsmoke対象にする。
- PlaywrightまたはBrowser pluginでスクリーンショット確認する。
- データ依存で確認できない項目はAPI/mockで補助する。

### タスク

- [ ] smoke対象画面を一覧化する。
- [ ] local dev server起動手順を固定する。
- [ ] 主要viewportを決める。
- [ ] screenshot確認手順を作る。
- [ ] Owner確認が必要な業務判断だけ残す。

### 2周テスト

Round 1:

- desktop viewport確認。
- APIエラーなし確認。
- build。

Round 2:

- mobileまたは狭幅viewport確認。
- refresh後も表示が崩れないことを確認。

Owner確認:

- staging実データでの見え方。

## 14. BK-OPS-003 運用引き継ぎ手順

### 要件

- Cloudflare / Vercel / Neon / Gmail OAuthの管理者が変わっても復旧できる。
- token再発行、env更新、staging確認手順が分かる。
- secret実値は書かない。

### 設計

- 実値ではなく、設定名、配置場所、確認方法だけを書く。
- 退職/異動時のチェックリストを作る。
- stagingで先に確認してからproductionへ反映する。

### タスク

- [ ] 運用者一覧テンプレートを作る。
- [ ] env名一覧を作る。
- [ ] token再発行手順を作る。
- [ ] staging smoke check手順を作る。
- [ ] production公開前ゲートを作る。

### 2周テスト

Round 1:

- docs内secret検索。
- 手順の参照リンク確認。

Round 2:

- 別観点で手順を読み直し、Ownerしかできない項目を分離する。

Owner確認:

- 実管理者の追加。
- 外部サービス管理画面操作。

## 15. 次の実行順

1. BK-GM-001をstagingでOwner確認する。
2. BK-GM-002でremediation後のUI/データ品質確認を行う。
3. BK-DOC-001でdocs入口を整える。
4. BK-OPS-001で容量監視をread-only実装する。
5. BK-OPS-002で重大エラー通知の設計/実装へ進む。
6. BK-AUTH-001でRBACを再検査する。
7. BK-GM-003で分類/抽出の残candidateを減らす。
8. BK-UI-001で画面確認を自動化寄りにする。
9. BK-OPS-003で運用引き継ぎ手順を固める。

## 16. 完了条件

- 各タスクに要件、設計、タスク、2周テスト、Owner確認がある。
- Owner確認以外はCodexが確認する前提になっている。
- DB更新のある作業はpreview、limit、confirm、post-countを持つ。
- secretが出力されない。
- 既存データ削除をしない。
