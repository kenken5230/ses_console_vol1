# SES Sales Console Theme Backlog v0.1

作成日: 2026-06-04  
親要件: `docs/themes/ses-sales-console/requirements/ses-sales-console-integrated-requirements-v0.1.md`  
BK: `docs/themes/ses-sales-console/BK/backups/2026-06-04-ses-console-theme-input-bk-v0.1.md`

## 1. 目的

SES営業統合consoleに必要な大テーマを、利用者価値、実装順、2周テスト、Owner確認の単位に分解する。

このBKは、単発の機能リストではなく、Notion移行、案件/要員DB、AIマッチング、提案、メール、履歴、統計、会社/商流、運用を一つのconsoleへ収束させるための作業順序を定義する。

## 2. 共通ルール

- 既存データ削除はしない。
- DB更新系はpreview/dry-runを先に作る。
- applyは明示指定、limit、confirm、監査ログ、失敗時停止を持つ。
- 大量処理はユーザーに何度も実行させず、内部chunkで安全に進める。
- 各タスクは2周テストを必須にする。
- Owner確認は、業務判断・本番/stagingの実送信・Notion export取得など、ユーザーしかできないものだけに絞る。
- secret、DB接続URL、token、password、connection stringの実値はログ・md・PR本文に出さない。

## 3. 優先度一覧

| BK ID | 優先度 | テーマ | 状態 | 関連テーマ |
|---|---|---|---|---|
| BK-CORE-001 | P0 | UI文言/入力標準化の土台 | 未着手 | T02, T03, T13, T14 |
| BK-CORE-002 | P0 | Notion移行mapping/dry-run | 未着手 | T01, T02, T03, T07, T10 |
| BK-CORE-003 | P0 | 案件/要員/会社の編集・標準化 | 一部着手 | T02, T03, T12, T13 |
| BK-SALES-001 | P0 | 提案リスト/営業進捗の正式化 | 一部着手 | T07, T09, T11 |
| BK-MAIL-001 | P1 | メールdraft/送信/履歴連携 | 一部着手 | T08, T09, T07 |
| BK-AI-001 | P1 | AIマッチング基盤 | 未着手 | T04, T05, T06 |
| BK-AI-002 | P1 | AI提案判断補助 | 未着手 | T04, T05, T07 |
| BK-SEARCH-001 | P1 | server-side高度検索/自然文検索 | 一部着手 | T06, T04 |
| BK-ANALYTICS-001 | P1 | 統計/グラフ read-only集計 | 未着手 | T10, T11 |
| BK-ANALYTICS-002 | P1 | KPI/売上見込み | 未着手 | T07, T10, T11 |
| BK-COMPANY-001 | P1 | 会社/取引先/商流管理画面 | 一部着手 | T12, T02, T07 |
| BK-GMAIL-001 | P0 | Gmail抽出品質とremediation運用継続 | 着手済み | T03, T09, T15 |
| BK-OPS-001 | P1 | 統合console運用/権限/監査 | 一部着手 | T14, T13 |

## 4. BK-CORE-001 UI文言/入力標準化の土台

### 課題

現行UIには案件/要員の作成drawer、検索toolbar、詳細paneがあるが、一部ファイルで日本語文言が文字化けしている。入力標準化やNotion移行前に、利用者が正しく読めるUIと項目定義が必要。

### 要件

- 案件/要員/会社/提案の項目を、必須、推奨、任意に分類する。
- UI文言、placeholder、validation errorを正常な日本語にする。
- 作成/編集/一覧/詳細で同じ項目名を使う。
- AI/検索/統計に使う項目は構造化フィールドへ入れる。

### タスク

- [ ] `components/ProjectCreateDrawer.jsx` の項目名と選択肢を正常化する。
- [ ] `components/PersonCreateDrawer.jsx` の項目名と選択肢を正常化する。
- [ ] `app/api/projects/route.ts` と `app/api/persons/route.ts` のvalidation messageを正常化する。
- [ ] 項目定義表をmd化する。
- [ ] 文字化け検出チェックを追加する。

### 2周テスト

1周目:

- 案件作成、要員作成、validation error、一覧表示、詳細表示を確認する。
- 文字化け検出で対象ファイルを確認する。

2周目:

- 同じ入力で再作成/再編集し、項目名、保存値、表示値が一致することを確認する。
- 異常値、空値、長文で崩れないことを確認する。

Owner確認:

- 必須/推奨/任意項目の最終判断。

## 5. BK-CORE-002 Notion移行mapping/dry-run

### 課題

Notionを卒業するには、既存Notionデータを安全にconsole DBへ移す必要がある。現状repoにNotion import script/APIはない。

### 要件

- Notion exportの列を、projects/persons/companies/company_contacts/proposalsへmappingする。
- import previewでcreate/update/skip/needsReview/failedを出す。
- apply前に重複候補、欠損、曖昧な商流、提案status不明を一覧化する。
- applyはbatch/limit/confirm/監査ログ/失敗時停止を必須にする。

### タスク

- [ ] Notion export項目のサンプル仕様を受け取る。
- [ ] mapping定義mdを作る。
- [ ] import preview CLIを作る。
- [ ] duplicate detectionを作る。
- [ ] small fixtureでimport applyを検証する。
- [ ] staging初回apply runbookを作る。

### 2周テスト

1周目:

- fixture CSVでpreviewし、DB更新なしを確認する。
- missing/duplicate/needsReviewの分類を確認する。

2周目:

- 同じfixtureで再previewし、件数が再現することを確認する。
- small apply用fixtureでtransaction/rollback/監査ログを確認する。

Owner確認:

- Notion exportファイル取得。
- mappingの業務判断。
- staging初回apply承認。

## 6. BK-CORE-003 案件/要員/会社の編集・標準化

### 課題

DBモデルはあるが、編集UIや監査、会社/担当者の専用管理が不足している。Notion移行後に人が修正できる状態が必要。

### 要件

- 案件、要員、会社、担当者を作成/編集/アーカイブできる。
- アーカイブは削除ではなくstatus/flagで行う。
- 変更前後をaudit logまたはstatus historyに残す。
- source別に手入力/Gmail/Notion移行の識別ができる。

### タスク

- [ ] person PATCH APIを作る。
- [ ] company/contact APIを作る。
- [ ] project/person編集drawerを完成させる。
- [ ] archive/unarchiveを設計する。
- [ ] audit log方針をmd化する。

### 2周テスト

1周目:

- 案件/要員/会社/担当者の編集と詳細表示を確認する。
- アーカイブで一覧から消え、DB削除されないことを確認する。

2周目:

- 編集再実行、同時更新、validation error、audit logを確認する。

Owner確認:

- アーカイブ/削除禁止の運用確認。

## 7. BK-SALES-001 提案リスト/営業進捗の正式化

### 課題

`proposals` と `proposal_status_histories` はあるが、UIの提案開始は現状placeholderに近い。営業進捗の中心機能として正式化する。

### 要件

- project/person/company/contact/accountを選んでproposalを作成する。
- status変更と履歴を残す。
- 二重提案を警告する。
- 要員詳細、案件詳細、会社詳細から提案履歴へ移動できる。

### タスク

- [ ] proposal作成APIを作る。
- [ ] proposal status update APIを作る。
- [ ] 提案リスト画面を作る。
- [ ] 案件/要員詳細へproposal timelineを出す。
- [ ] duplicate proposal warningを作る。

### 2周テスト

1周目:

- proposal作成、status変更、history追加、一覧/詳細表示を確認する。

2周目:

- 同一person/project/targetCompanyで再作成し、警告またはskipになることを確認する。
- status変更履歴が壊れないことを確認する。

Owner確認:

- status名、営業プロセス、重複扱い。

## 8. BK-MAIL-001 メールdraft/送信/履歴連携

### 課題

SMTP送信基盤はあるが、営業メール作成・送信・proposal連携はない。送信は事故リスクがあるため、draft/preview/human approvalを必須にする。

### 要件

- 案件紹介、推薦、面談調整のメールdraftを作る。
- AI draftは送信前に人が編集/承認する。
- 送信後にdistributionLogとproposalへ紐づける。
- failed時はsecretを出さず、送信されていないことが分かる。

### タスク

- [ ] mail draft entityまたはproposal draft方針を決める。
- [ ] template mdを作る。
- [ ] draft生成APIを作る。
- [ ] send preview/mockを作る。
- [ ] 実送信APIをOwner承認付きで作る。
- [ ] distributionLog連携を実装する。

### 2周テスト

1周目:

- draft生成、編集、mock send、distributionLog作成なし/ありを分けて確認する。

2周目:

- 失敗時redaction、二重送信警告、proposal連携を確認する。

Owner確認:

- 実送信。
- メールテンプレート文面。

## 9. BK-AI-001 AIマッチング基盤

### 課題

案件/要員の条件はDB化されつつあるが、match scoreやAI理由を保存/表示する機能はない。

### 要件

- project x personのmatch scoreを算出する。
- reasons、risks、missingSkills、確認質問を出す。
- model/prompt version、input snapshot、confidence、reviewStatusを保存する。
- 最初はread-only previewから始める。

### タスク

- [ ] AI matching design mdを作る。
- [ ] fixed fixtureを作る。
- [ ] deterministic pre-scoreを作る。
- [ ] AI reason generatorを追加する。
- [ ] match result保存モデル/APIを設計する。
- [ ] matching UIを作る。

### 2周テスト

1周目:

- fixtureでscore/reason/riskを確認する。

2周目:

- 同一fixtureで再実行し、差分が許容範囲か確認する。
- DB保存なしpreviewと保存ありapplyを分ける。

Owner確認:

- score閾値、NG条件、AI理由の営業妥当性。

## 10. BK-AI-002 AI提案判断補助

### 課題

マッチしていても、商流、単価、年齢、外国籍、開始月などで提案不可になる。AIに営業判断の下準備をさせる。

### 要件

- proposal candidateに対して、提案可/要確認/見送り推奨を出す。
- NG理由と確認質問を明示する。
- 人間承認なしに提案作成やメール送信をしない。

### タスク

- [ ] 提案判断ルールmdを作る。
- [ ] rules + AI hybrid evaluatorを作る。
- [ ] proposal draftへ判定結果を紐づける。
- [ ] UIに確認チェックリストを出す。

### 2周テスト

1周目:

- 提案可、要確認、見送り推奨fixtureで判定する。

2周目:

- proposal作成/メールdraftと連携しても自動送信されないことを確認する。

Owner確認:

- 見送り条件、商流/年齢/外国籍の扱い。

## 11. BK-SEARCH-001 server-side高度検索/自然文検索

### 課題

現状は主にclient-sideの検索/フィルタ。データ量増加、Notion移行、AI検索を考えるとserver-side化が必要。

### 要件

- 案件/要員/会社/提案/メールを横断検索できる。
- 条件検索と自然文検索を両方扱う。
- search historyを保存/再実行できる。
- ページングと索引を前提にする。

### タスク

- [ ] search API設計を作る。
- [ ] 条件検索server-side化。
- [ ] 保存検索/履歴適用を実装する。
- [ ] 自然文query parserを作る。
- [ ] 将来の全文検索/index migration候補をmd化する。

### 2周テスト

1周目:

- 条件検索、横断検索、保存検索をfixtureで確認する。

2周目:

- 同条件再検索、ページング、sort、権限差を確認する。

Owner確認:

- よく使う自然文検索例。

## 12. BK-ANALYTICS-001 統計/グラフ read-only集計

### 課題

Notionで見ていた統計をconsole内で見る必要がある。まずはDB更新なしの集計APIから始める。

### 要件

- 案件数、注力案件数、提案数、面談数、成約数を集計する。
- 担当者別、月別、単価帯別、スキル別、ステータス別に出す。
- 最初は表とsummaryでよい。chartは後続。

### タスク

- [ ] analytics metric定義mdを作る。
- [ ] read-only集計APIを作る。
- [ ] dashboard summary UIを作る。
- [ ] chart UIを追加する。

### 2周テスト

1周目:

- seed/fixtureで集計値を確認する。

2周目:

- 同じDB状態で再集計し、値が変わらないことを確認する。

Owner確認:

- Notionで見ていたグラフの優先順位。

## 13. BK-ANALYTICS-002 KPI/売上見込み

### 課題

営業管理・経営判断に使うには、現在数だけでなく、今月/来月の売上見込みや担当者別KPIが必要。

### 要件

- 提案数、返信数、面談数、成約数、見送り数を担当者/期間別に出す。
- 確定売上と見込み売上を分ける。
- 単価、開始月、確度、提案statusからforecastを出す。

### タスク

- [ ] KPI定義mdを作る。
- [ ] forecast計算式をfixture化する。
- [ ] KPI read-only APIを作る。
- [ ] KPI dashboardを作る。

### 2周テスト

1周目:

- fixed fixtureでKPI計算を確認する。

2周目:

- status変更後にKPI差分が期待通り変わることを確認する。

Owner確認:

- 売上見込み式、確度、粗利/手数料の扱い。

## 14. BK-COMPANY-001 会社/取引先/商流管理画面

### 課題

DBには会社/担当者/商流があるが、専用画面と営業判断への警告が不足している。

### 要件

- 会社一覧、会社詳細、担当者、取引可否、商流履歴を見る。
- 案件/提案でNG会社や深い商流を警告する。
- domain/alias/emailから会社候補を推定する。

### タスク

- [ ] company list/detail UIを作る。
- [ ] company/contact CRUD APIを作る。
- [ ] project company rolesを見やすく表示する。
- [ ] tradeStatus warningを案件/提案に出す。

### 2周テスト

1周目:

- company/contact作成、編集、案件商流表示を確認する。

2周目:

- NG会社、alias、domain推定、商流深度警告を確認する。

Owner確認:

- 取引可否と信用情報の運用。

## 15. BK-GMAIL-001 Gmail抽出品質とremediation運用継続

### 課題

Gmail抽出は着手済みで、既存Gmail要員name汚れの安全remediationも進んだ。今後もNotion移行/AIマッチングの前にデータ品質を保つ必要がある。

### 要件

- count-only、preview、batch apply、post-countを維持する。
- source provider GMAILを厳密に条件化する。
- extractionResults、reviewReasons、confidenceをUIへ出す。
- applyはOwner承認のみ。

### タスク

- [ ] PR #14 merge後のstaging結果をBKへ反映する。
- [ ] Gmail classification/extractionの残candidateを減らす。
- [ ] remediation後のUI表示を確認する。
- [ ] quality test fixtureを増やす。

### 2周テスト

1周目:

- count-only、limit preview、batch preview、quality test。

2周目:

- 同じread-only検証を再実行し、DB更新なしで再現性を確認する。

Owner確認:

- staging apply。
- 要員一覧の表示確認。

## 16. BK-OPS-001 統合console運用/権限/監査

### 課題

Notion卒業後はconsoleが正式DBになるため、権限、監査、運用、障害検知が重要になる。

### 要件

- ADMIN/MANAGER/SALES/VIEWERの操作範囲を明確化する。
- apply、送信、import、status変更は監査可能にする。
- 重大エラー、Gmail sync失敗、メール送信失敗を通知する。
- staging/productionで危険操作を分ける。

### タスク

- [ ] RBAC matrixをmd化する。
- [ ] critical action audit policyを作る。
- [ ] error notification設計を作る。
- [ ] operation runbookを作る。

### 2周テスト

1周目:

- 権限別API/UI操作を確認する。

2周目:

- 危険操作のguard、audit、通知、secret redactionを確認する。

Owner確認:

- production運用ルール。
- 通知先。

## 17. 実行順の推奨

1. BK-GMAIL-001でデータ品質を安定させる。
2. BK-CORE-001でUI文言と入力標準化を直す。
3. BK-CORE-002でNotion移行のdry-runを作る。
4. BK-CORE-003で編集・標準化を完成させる。
5. BK-SALES-001で提案リストを正式化する。
6. BK-MAIL-001でメールdraft/送信/履歴連携を作る。
7. BK-SEARCH-001で検索をserver-side化する。
8. BK-AI-001/BK-AI-002でマッチングと提案判断を作る。
9. BK-ANALYTICS-001/BK-ANALYTICS-002で統計/KPIを作る。
10. BK-COMPANY-001とBK-OPS-001を継続強化する。

## 18. 完了条件

- 全テーマがBK IDへ紐づいている。
- 既存着手状況と不足が分かる。
- 各BKに要件、タスク、2周テスト、Owner確認がある。
- Owner確認以外はCodex/CLI/API/テスト側で確認する設計になっている。
- 既存データ削除、schema migration、DB更新を含まないdocs-only変更である。
