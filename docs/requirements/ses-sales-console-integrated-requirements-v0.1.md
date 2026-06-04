# SES Sales Console Integrated Requirements v0.1

作成日: 2026-06-04  
目的: Notion卒業、SES営業データ統合、AIマッチング、提案、メール、進捗、統計を一つのconsoleへ集約するための統合要件定義。  
前提: 既存DB・Gmail抽出・remediation・docsを活用し、足りない機能をテーマ別に整理する。  
BK: `docs/BK/backups/2026-06-04-ses-console-theme-input-bk-v0.1.md`

## 1. ゴール

SES営業担当が、案件、要員、会社、担当者、商流、提案状況、メール履歴、統計をNotionやスプレッドシートへ分散させず、SES Console上で確認・判断・実行できる状態にする。

最終的な利用者視点:

- Notionの営業データをconsoleへ移し、consoleを正式DBにする。
- Gmailや手入力から入ってくる案件・要員情報を構造化する。
- AIが案件と要員のマッチ度、提案可否、懸念点を整理する。
- 営業は提案リスト、メール、返信、面談、成約まで追える。
- 管理者はKPI、売上見込み、担当者別状況、データ品質を見られる。
- ユーザーが何度も確認・手動操作しなくても、Codex/CLI/システム側で安全に細かく処理する。

## 2. ステータス凡例

| ステータス | 意味 |
|---|---|
| 着手済み | DB/API/UI/CLIのいずれかが業務利用できる水準で存在する |
| 一部着手 | 土台はあるが、利用者の期待する業務完結には足りない |
| 未着手 | repo内に明確な実装が見当たらない |
| 要整理 | 実装やdocsはあるが、仕様・文字化け・運用ルールの整理が必要 |

## 3. テーマ別の着手状況

| ID | テーマ | 現状 | できていること | できていないこと |
|---|---|---|---|---|
| T01 | Notionデータ移行 | 未着手 | 移行先になり得るDBモデルはある | Notion export/import、項目マッピング、dry-run、差分移行、重複検出 |
| T02 | 案件構造化DB | 一部着手 | `projects`、`project_conditions`、`project_skills`、`project_company_roles`、案件作成API/UI | Notion全項目の網羅確認、編集UIの完成、入力標準、インポート検証 |
| T03 | 要員DB | 一部着手 | `persons`、`person_skills`、要員作成API/UI、Gmail要員抽出、remediation | スキルシート管理、商流制限/稼働条件の詳細化、編集UI、提案履歴連携の画面 |
| T04 | AI案件要員マッチング | 未着手 | スキル・条件・抽出結果の土台はある | match score、理由、懸念点、AI実行履歴、マッチングUI/API |
| T05 | AI提案判断補助 | 未着手 | 提案DBと案件/要員条件はある | 提案可否判定、NG条件説明、営業向け確認リスト、human approval |
| T06 | 高度検索/AI検索 | 一部着手 | クライアント側キーワード/条件フィルタ、`search_histories` | サーバー検索、全文検索、自然文検索、保存検索、横断検索精度 |
| T07 | 提案リスト/営業進捗 | 一部着手 | `proposals`、`proposal_status_histories`、seed、提案開始ボタンのUI入口 | 提案作成API、リスト画面、ステータス更新、二重提案防止UI |
| T08 | console内メール送信 | 一部着手 | `lib/mailer.ts` とSMTP安全ログ、`distribution_logs` DB | 案件紹介/推薦/面談調整メールの生成、draft、送信、承認、履歴連携 |
| T09 | メール・提案履歴紐づけ | 一部着手 | `mail_notifications`、`mail_entity_links`、`distribution_logs`、Gmail source link | 返信追跡、提案履歴画面、二重送信警告、案件/要員timeline |
| T10 | Notion統計/グラフ再現 | 未着手 | 集計元DBはある | 分析API、chart UI、担当者別/月別/スキル別/単価帯別集計 |
| T11 | KPI/売上見込み | 未着手 | 提案status日付、案件単価、要員希望単価の土台はある | 売上見込みロジック、forecast、担当者KPI、管理画面 |
| T12 | 会社/取引先/商流管理 | 一部着手 | `companies`、`company_contacts`、`project_company_roles`、tradeStatus | 専用画面、取引可否レビュー、信用情報運用、商流深度警告 |
| T13 | 入力・更新標準化 | 要整理 | 案件/要員作成フォーム、API validationの一部 | UI文言文字化け、項目定義、必須/推奨/任意、編集/監査、2周テスト |
| T14 | SES営業統合console | 一部着手 | main画面に案件/要員/未分類メール、認証、Gmail同期入口 | 営業todo、提案、メール、統計、取引先、運用監視の統合導線 |
| T15 | Gmail取り込み/抽出/品質改善 | 着手済み | Gmail sync/classify/extract、未分類メール移動、remediation、quality test | AI抽出化、残candidate精査、分類精度の継続改善 |

## 4. 共通設計原則

- 既存データは削除しない。不要化はARCHIVEDや履歴で扱う。
- DB更新系は必ずpreview/dry-runを用意する。
- 大量処理はユーザー操作を減らし、内部では小さなchunkで安全に進める。
- apply系は明示引数、上限、confirm、監査ログ、失敗時停止を持つ。
- ユーザーだけが判断できる業務確認以外は、Codex/CLI/API/テスト側で確認する。
- 各テーマの実装PRには、2周テストを含める。
- secret、DB接続URL、token、password、connection stringの実値はログ・md・PR本文に出さない。

## 5. 統合データ要件

### 5.1 中核エンティティ

- 案件: title、summary、workDescription、businessDescription、status、priority、focus、sourceMail、owner。
- 案件条件: 単価、開始月、勤務地、リモート、契約形態、精算幅、募集人数、稼働日数、年齢条件、外国籍可否、面談回数。
- 案件スキル: 必須、尚良、使用技術、その他、経験年数。
- 要員: name、initials、summary、careerSummary、希望単価、稼働開始、希望勤務地、リモート、年齢、国籍、status、sourceMail。
- 要員スキル: skillName、years、level、notes。
- 会社: name、alias、domain、tradeStatus、信用/リスクメモ。
- 担当者: name、email、phone、department、position、contactPolicy。
- 商流: projectCompanyRoleで上位会社、エンド、元請、二次請け、三次請け、提案先を表す。
- 提案: person、project、targetCompany、targetContact、salesMailAccount、status、status timestamps、notes。
- メール履歴: mailNotification、mailEntityLink、distributionLog、external thread/message id。
- 抽出/AI結果: extractionResultにraw/normalized/confidence/reviewStatus/model/prompt versionを残す。

### 5.2 追加検討が必要なデータ

- Notion移行元ID、移行batch ID、移行時のraw row snapshot。
- AI match result: projectId、personId、score、matchedReasons、risks、missingSkills、constraints、model、createdAt。
- Proposal draft: 件名、本文、生成理由、送信前review status。
- Reply tracking: 返信message/threadとproposal/distributionLogの紐づけ。
- KPI snapshot: 集計時点、担当者、期間、案件数、提案数、面談数、成約見込み。
- Skill taxonomy: 表記揺れ、同義語、カテゴリ、経験年数換算。

## 6. テーマ別要件

### T01 Notionデータ移行

利用者価値:

- Notionを卒業し、consoleを正式な営業DBにできる。
- 過去データを失わず、移行前後の差分と重複を確認できる。

機能要件:

- Notion export CSV/Markdownをread-onlyで解析する。
- 案件、要員、会社、担当者、商流、提案、統計の項目マッピング表を作る。
- import previewで作成/更新/skip/要確認/失敗件数を出す。
- applyはbatch、confirm、limit必須にする。
- 既存DBとの重複判定は、Notion ID、名称、メール、会社、案件タイトル、source mailを組み合わせる。
- 移行後も移行元IDとraw snapshotを監査用に残す。

2周テスト:

- 1周目: サンプルexportでmapping preview、secret混入なし、DB更新なし。
- 2周目: 同じサンプルで再previewし、件数と候補が再現することを確認。

Owner確認:

- Notion exportの取得。
- マッピングで業務判断が必要な列の確認。
- 初回apply対象の承認。

### T02 案件データ構造化

利用者価値:

- 案件検索、AIマッチング、KPI集計に使えるきれいな案件DBを作れる。

機能要件:

- 案件作成/編集フォームで必須/推奨/任意項目を明示する。
- 単価、開始月、勤務地、契約形態、商流、上位会社、担当者、募集人数、面談回数、外国籍可否、年齢条件を構造化する。
- 必須スキル、尚良スキル、使用技術を分ける。
- 元メール、Notion移行元、手入力のsourceを保持する。
- 文字化けしたUI文言は修正し、ユーザーが迷わない表示にする。

2周テスト:

- 1周目: 作成、編集、一覧、詳細、検索、API validation。
- 2周目: 同じ操作を再実行し、重複や意図しない上書きがないことを確認。

Owner確認:

- 案件項目の必須/推奨/任意の業務判断。

### T03 要員データ管理

利用者価値:

- 要員情報を案件マッチングと提案活動に使える形で保持できる。

機能要件:

- スキル、経験年数、希望単価、希望勤務地、稼働開始日、稼働条件、商流制限、外国籍、年齢、面談状況を保持する。
- nameが不明なGmail由来要員はplaceholder表示し、DBのnameへ件名全文を入れない。
- 要員詳細に提案履歴、メール履歴、スキル、元メールを表示する。
- 要員編集API/UIと監査ログを用意する。

2周テスト:

- 1周目: 作成、編集、remediation preview、検索、詳細表示。
- 2周目: 同じ条件で再確認し、件名nameが復活しないことを確認。

Owner確認:

- 実名/initials/匿名表示の運用判断。
- スキルシート原本の扱い。

### T04 AI案件要員マッチング

利用者価値:

- 営業が大量の案件/要員を手で突き合わせず、優先順位を見られる。

機能要件:

- project x personでmatch scoreを出す。
- 必須スキル、尚良スキル、単価、勤務地、開始月、稼働条件、商流、年齢、外国籍を評価する。
- scoreだけでなく、合っている点、懸念点、不足スキル、確認質問を表示する。
- AI結果は保存し、model/prompt version/confidence/reviewStatusを残す。
- 最終判断は人間が行う。

2周テスト:

- 1周目: 固定fixtureでscoreと理由が期待範囲になることを確認。
- 2周目: 同じfixtureで再実行し、再現性と差分理由を確認。

Owner確認:

- score閾値、NG条件、営業判断ルール。

### T05 AI提案判断補助

利用者価値:

- 「この案件はこの人に出せるか」をAIが整理し、見落としを減らす。

機能要件:

- 提案可、要確認、見送り推奨の判定を出す。
- 単価、スキル、勤務地、開始月、商流、年齢、外国籍のNG理由を明示する。
- AIの判断はproposal draftに紐づけ、人間承認前は送信しない。
- 判断根拠と確認すべき質問を表示する。

2周テスト:

- 1周目: NG fixture、要確認fixture、提案可fixtureで判定。
- 2周目: 提案作成前後でAI判定が履歴に残り、勝手に送信しないことを確認。

Owner確認:

- 自社の提案NGルール。
- AI判定の文言トーン。

### T06 高度検索/AI検索

利用者価値:

- 条件検索と自然文検索で、目的の案件/要員をすばやく探せる。

機能要件:

- キーワード、スキル、単価、開始月、勤務地、契約形態、商流、注力案件で絞り込める。
- 「JavaでSpring経験あり、4月開始、リモート希望の人に合う案件」のような自然文検索を受け付ける。
- server-side検索、保存検索、検索履歴、result countを持つ。
- 低速化を避けるため、全文検索/索引/ページングを設計する。

2周テスト:

- 1周目: 固定データで条件検索、横断検索、自然文検索。
- 2周目: 同条件の再検索と保存検索の再適用。

Owner確認:

- よく使う検索文と営業上の絞り込み優先度。

### T07 提案リスト/営業進捗管理

利用者価値:

- マッチング後の営業活動をconsoleで追える。

機能要件:

- 要員ごと、案件ごとに提案リストへ追加できる。
- statusは提案済み、返信待ち、面談調整中、面談済み、オファー、成約、見送り、辞退を扱う。
- proposal status historyを残す。
- 同じ案件/要員/提案先への二重提案を警告する。
- 担当者、target company、target contact、sales mail accountを選べる。

2周テスト:

- 1周目: proposal作成、status変更、history追加、重複警告。
- 2周目: 別ユーザー/別対象で再確認し、既存履歴が壊れないことを確認。

Owner確認:

- status名と営業プロセスの最終確定。

### T08 console内メール作成・送信

利用者価値:

- 案件紹介、推薦、面談調整メールをconsole内で作成し、履歴へ残せる。

機能要件:

- AIでメールdraftを生成する。
- 送信前に人間が編集・承認する。
- 送信先、CC、件名、本文、添付、送信元accountを確認する。
- 送信後はdistributionLogとproposalへ紐づける。
- SMTP/Gmail APIのエラーはsecretを出さずに安全に表示する。

2周テスト:

- 1周目: draft生成、編集、dry-run/send mock、distributionLog作成。
- 2周目: 送信済み重複警告、失敗時ログ、secret redaction。

Owner確認:

- 実送信。
- メール文面のトーンとテンプレート。

### T09 メール・提案履歴紐づけ

利用者価値:

- 誰に何を送り、どう返ってきたかを案件/要員/会社単位で追える。

機能要件:

- distributionLog、mailNotification、mailEntityLinkをtimelineとして表示する。
- 返信メールをthread/message idでproposalへ紐づける。
- 同じ案件の二重送信、過去見送り、返信待ちを警告する。
- Gmail由来とconsole送信由来を同じ履歴上で見せる。

2周テスト:

- 1周目: source mail、sent mail、reply mailの紐づけ。
- 2周目: 同一threadの追加返信と誤紐づけ防止。

Owner確認:

- 返信分類が営業判断と合っているか。

### T10 統計/グラフ

利用者価値:

- Notionで見ていた営業状況をconsole内で確認できる。

機能要件:

- 案件数、注力案件数、提案数、面談数、成約数を集計する。
- 担当者別、月別、単価帯別、スキル別、ステータス別に見る。
- DBの生データから再計算できるよう、集計定義をdocs化する。
- 最初はread-only集計APIと表から始め、後でchartを追加する。

2周テスト:

- 1周目: fixture/seedで集計値を確認。
- 2周目: DB read-onlyで再集計し、同じ結果になることを確認。

Owner確認:

- Notionで見ていたグラフの優先順位。

### T11 KPI/売上見込み

利用者価値:

- 今月/来月の営業見込みと担当者別活動量を把握できる。

機能要件:

- 提案数、返信数、面談数、成約数、見送り数を期間別に出す。
- 案件単価、要員希望単価、確度、開始月から売上見込みを計算する。
- forecastは確定値と見込み値を分ける。
- 担当者別に活動量と成果を見える化する。

2周テスト:

- 1周目: seed/fixtureでKPI計算。
- 2周目: status変更後にKPI差分が期待通り変わることを確認。

Owner確認:

- 売上見込み式、粗利/手数料の扱い、確度ランク。

### T12 会社・取引先・商流管理

利用者価値:

- どの会社から来た案件か、取引してよいか、商流が深すぎないかを判断できる。

機能要件:

- 会社一覧、会社詳細、担当者一覧、取引可否、メモを管理する。
- 商流を案件ごとに上位、エンド、元請、二次、三次、提案先として表示する。
- NG/要確認の会社が関係する案件や提案では警告する。
- domain、alias、担当者emailから会社候補を推定する。

2周テスト:

- 1周目: 会社作成、alias、contact、project role表示。
- 2周目: NG会社を含む案件/提案の警告確認。

Owner確認:

- 取引可否、信用情報、商流深度のルール。

### T13 入力標準化

利用者価値:

- 人によって入力がバラバラにならず、AI/検索/統計に使えるデータが貯まる。

機能要件:

- 案件/要員/会社/提案の項目定義を必須、推奨、任意に分ける。
- UI文言を正常な日本語へ戻す。
- 入力補助、placeholder、select、validation errorを整える。
- 作成/編集/アーカイブは監査可能にする。
- Gmail/Notion/手入力のsource別に品質チェックを用意する。

2周テスト:

- 1周目: フォーム入力、validation、表示、保存。
- 2周目: 編集、再保存、空値、異常値、文字化けなし。

Owner確認:

- 必須項目と現場入力負荷のバランス。

### T14 SES営業統合console

利用者価値:

- 営業がconsoleを見れば次に何をすべきか分かる。

機能要件:

- 案件、要員、会社、提案、メール、統計を左/上位ナビから移動できる。
- 今日見るべきもの、要確認、返信待ち、面談調整中、期限超過を表示する。
- Gmail sync、Notion import、AI match、proposal workflow、KPIを統合する。
- RBACに応じて閲覧/編集/送信/管理操作を制御する。

2周テスト:

- 1周目: 主要画面のsmoke、権限別表示、read-only操作。
- 2周目: workflow横断、画面遷移、API権限、回帰確認。

Owner確認:

- 最終的な営業導線と優先表示。

### T15 Gmail取り込み/抽出/品質改善

利用者価値:

- Gmailを入口に、案件/要員候補を安全にconsoleへ取り込める。

機能要件:

- Gmail sync、classify、extract、unlinked extraction、remediationを維持する。
- 件名name汚れを防ぎ、既存汚れも安全に補修する。
- reviewReasons、confidence、extractionResultsをUIへ出す。
- 分類精度・抽出精度の品質テストを継続する。

2周テスト:

- 1周目: sync/classify/extract preview、quality test、count-only。
- 2周目: 同じread-only検証で再現性確認、applyはOwner承認のみ。

Owner確認:

- stagingでのapplyと、要員一覧の表示確認。

## 7. 統合優先順位

1. データ品質とUI文言を整える。
2. Notion移行のmapping/dry-runを作る。
3. 案件/要員/会社の編集と標準化を完成させる。
4. 提案リストと営業進捗を実運用できる形にする。
5. メールdraft/送信/履歴をproposalへつなげる。
6. AIマッチングと提案判断を追加する。
7. 統計/KPI/売上見込みを追加する。
8. 会社/商流/信用情報を営業判断に組み込む。

## 8. 完了条件

- 各テーマの着手状況がmd上で確認できる。
- 各テーマに利用者価値、機能要件、2周テスト、Owner確認がある。
- 重複する要求は共通データ/共通workflowへ寄せている。
- 既存データ更新・削除を伴わない。
- secret、DB接続URL、token、password、connection stringの実値を含まない。

