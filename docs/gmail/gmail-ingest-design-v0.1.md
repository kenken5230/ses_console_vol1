# Gmail取り込み設計書 v0.1

## 1. 目的

SES Consoleで、Googleグループ `ses@skv.co.jp` に配信された受信メールを Gmail API から取得し、`mail_notifications` に原本として保存する。
`ses@skv.co.jp` はログイン可能な実体Gmailアカウントではないため、OAuth認証対象にはしない。
Gmail APIで読むメールボックスは、実体アカウント `sho.sato@skv.co.jp` のGmailであり、`userId = "me"` と Gmail検索クエリでグループ配信メールを抽出する。
その後、まずはルール分類で「案件紹介」「要員紹介」「不要メール」「要確認」などに分類し、案件メールは `projects` / `project_conditions` / `project_company_roles` / `project_skills`、要員メールは `persons` / `person_skills` / `companies` に仮抽出する。

最初から完璧な抽出やAI分類は目指さない。最優先は「保存・分類・確認・修正できる流れ」を作ること。

## 2. 技術前提

- Next.js / React
- PostgreSQL
- Prisma v7
- Prisma PostgreSQL adapter構成
- DB名: `ses_console_dev`
- Gmail OAuth認証ユーザー: `sho.sato@skv.co.jp`
- Gmail API userId: `me`
- Gmail抽出対象: `to:ses@skv.co.jp`
- `ses@skv.co.jp` はGoogleグループであり、OAuth認証対象にもGmail APIの直接読み取り対象にもしない
- Google Workspace管理者権限、管理者API、Directory APIは前提にしない
- 初期同期方式: 最新50件程度の手動同期
- 初期Gmail API: `users.messages.list` / `users.messages.get`
- 初期権限: Gmail読み取り専用
- 初期対象外: Gmail push通知、Pub/Sub、Gmailラベル操作、既読化、メール送信、添付保存、AI分類、本番データ自動投入、物理削除

## 2.1 確定したGmail取得前提

`ses@skv.co.jp` はGoogleグループである。Gmail APIはGoogleグループのメールボックスを直接読むのではなく、`sho.sato@skv.co.jp` のGmailに配信済みのメールを読む。

確定事項:

- OAuth認証する実体アカウント: `sho.sato@skv.co.jp`
- Gmail APIの `userId`: `me`
- 初期実装クエリ: `to:ses@skv.co.jp`
- `deliveredto:ses@skv.co.jp` は `sho.sato@skv.co.jp` のGmail実測でヒットしなかったため、初期クエリとして使わない
- `list:ses.skv.co.jp` 相当はヘッダー確認後に検討
- subject / from条件は必要になったら追加

設計上やらないこと:

- `ses@skv.co.jp` をOAuth認証対象にしない
- Googleグループ自体をGmail APIで直接読まない
- Google Workspace管理者権限を前提にしない
- Admin SDK / Directory APIを使わない
- サービスアカウントのドメインワイドデリゲーションを前提にしない

## 3. 現在のschema.prisma確認

### 3.1 mail_notifications

既存の `MailNotification` は、Gmail取り込みの原本保存にかなり適している。

| 用途 | 既存カラム | 判定 |
|---|---|---|
| 取り込み元アカウント | `sourceAccountId` | 実装可能 |
| Gmail message.id | `externalMessageId` | 実装可能 |
| Gmail threadId | `externalThreadId` | 実装可能 |
| In-Reply-To | `inReplyTo` | 実装可能 |
| References | `referencesHeader` | 実装可能 |
| Message-IDヘッダー | `sourceRawHeaders` に保存 | 専用カラムなし。初期はmigration不要 |
| messageDate | `messageDate` | 実装可能 |
| receivedAt | `receivedAt` | 実装可能 |
| from | `fromEmail`, `fromName` | 実装可能 |
| to/cc/bcc | `toEmails`, `ccEmails`, `bccEmails` | 実装可能 |
| subject | `subject` | 実装可能 |
| body text/html | `bodyText`, `bodyHtml` | 実装可能 |
| 正規化本文 | `normalizedBody` | 実装可能 |
| 本文ハッシュ | `bodyHash` | 実装可能 |
| 分類 | `category` | 実装可能 |
| 分類信頼度 | `categoryConfidence` | 実装可能 |
| 返信判定 | `isReply` | 実装可能 |
| 除外判定 | `isExcluded` | 実装可能 |
| 除外理由 | `excludeReason` | 実装可能 |
| 要確認 | `needsReview` | 実装可能 |
| 分類元 | `classifiedBy` | 実装可能 |
| 分類バージョン | `classificationVersion` | 実装可能 |
| 生ヘッダー/補助情報 | `sourceRawHeaders` | 実装可能 |

重複防止は `@@unique([sourceAccountId, externalMessageId])` があるため、同一アカウント内のGmail message.id重複を防げる。

不足している主な項目:

| 不足項目 | 初期対応 | migration必要性 |
|---|---|---|
| Gmail snippet | `sourceRawHeaders.snippet` に保存 | 初期は不要 |
| Gmail historyId | `sourceRawHeaders.historyId` に保存 | 初期は不要。差分同期を本格化するなら追加推奨 |
| Gmail internalDate | `sourceRawHeaders.internalDate` または `messageDate` 補完 | 初期は不要 |
| Gmail labelIds | `sourceRawHeaders.labelIds` に保存 | 初期は不要 |
| RFC Message-ID専用カラム | `sourceRawHeaders.messageId` に保存 | 初期は不要 |

### 3.2 projects / persons のsourceMailId

既存schemaに以下がある。

- `projects.sourceMailId`
- `persons.sourceMailId`
- `proposals.sourceMailId`

したがって、1メールから1案件または1要員を作る初期実装ではmigration不要。

ただし、1メールから複数案件/複数要員が抽出される可能性がある。これには既存の `MailEntityLink` が使える。

- `MailEntityLink.mailNotificationId`
- `MailEntityLink.entityType`
- `MailEntityLink.entityId`
- `MailEntityLink.linkType`

初期方針:

- 代表元メールは `projects.sourceMailId` / `persons.sourceMailId` に保存する
- 複数作成時や補助リンクは `mail_entity_links` に `linkType = EXTRACTED` で保存する

### 3.3 needsReview / classification / isExcluded

既存schemaで実装可能。

- `mail_notifications.needsReview`
- `mail_notifications.category`
- `mail_notifications.categoryConfidence`
- `mail_notifications.classifiedBy`
- `mail_notifications.classificationVersion`
- `mail_notifications.isExcluded`
- `mail_notifications.excludeReason`

案件・要員側には `needsReview` 専用カラムはない。初期は以下で代替する。

- 抽出結果の確認状態: `extraction_results.reviewStatus`
- 画面表示用の要確認判定: `sourceMail.needsReview` または `extraction_results.reviewStatus = PENDING`

案件・要員テーブル自体に `needsReview` を直接持たせたい場合はmigration案として後述する。

## 4. Gmailメール保存設計

### 4.1 Gmail API項目の保存先

| Gmail API / Header | 保存先 |
|---|---|
| `message.id` | `mail_notifications.externalMessageId` |
| `message.threadId` | `mail_notifications.externalThreadId` |
| `payload.headers.Message-ID` | `mail_notifications.sourceRawHeaders.messageId` |
| `payload.headers.In-Reply-To` | `mail_notifications.inReplyTo` |
| `payload.headers.References` | `mail_notifications.referencesHeader` |
| `payload.headers.Subject` | `mail_notifications.subject` |
| `payload.headers.From` | `fromEmail`, `fromName` |
| `payload.headers.To` | `toEmails` |
| `payload.headers.Cc` | `ccEmails` |
| `payload.headers.Bcc` | `bccEmails` |
| `payload.headers.Date` | `messageDate` |
| `internalDate` | `sourceRawHeaders.internalDate`、必要に応じて `messageDate` 補完 |
| `snippet` | `sourceRawHeaders.snippet` |
| `labelIds` | `sourceRawHeaders.labelIds` |
| text/plain本文 | `bodyText` |
| text/html本文 | `bodyHtml` |
| 正規化本文 | `normalizedBody` |
| 本文ハッシュ | `bodyHash` |

`externalMessageId` はGmail APIの `message.id` とする。RFC Message-IDはメールヘッダー値であり、Gmail内の一意IDではないため、初期は `sourceRawHeaders.messageId` に保存する。

### 4.2 重複登録防止

既存制約 `@@unique([sourceAccountId, externalMessageId])` を使う。

同期時は以下のどちらかにする。

- `upsert`: 既存メールの分類情報などを更新できる
- `findUnique` 相当で存在確認後 `skip`: 初期検証では安全

初期推奨は `upsert`。本文やヘッダーの取り直し、分類ロジック更新に対応しやすい。

### 4.3 返信メール判定

以下のいずれかに該当する場合、`isReply = true` とする。

- `In-Reply-To` が存在する
- `References` が存在する
- 件名が `Re:` / `RE:` / `返信:` で始まる
- Gmail threadIdが既存メールの `externalThreadId` と一致し、かつ同一thread内で2件目以降

返信メールは削除しない。初期は `category = NORMAL_CONTACT` または `OTHER`、`isExcluded = true`、`excludeReason = "返信メール"` を基本とする。

### 4.4 添付ファイル

初期実装では添付ファイル保存は扱わない。

ただしGmail metadataから添付の有無やファイル名を判定できる場合は、初期は `sourceRawHeaders.attachmentsSummary` に保存する程度に留める。

将来実装する場合は既存 `mail_attachments` を利用できる。

## 5. 同期方式

### 5.1 初期方式

最初は手動同期APIを作る。

例:

- `POST /api/gmail/sync`
- body: `{ "maxResults": 50 }`
- OAuth認証ユーザー: `sho.sato@skv.co.jp`
- Gmail API userId: `me`
- 抽出条件: `to:ses@skv.co.jp`

処理:

1. `mail_accounts` から `email = "sho.sato@skv.co.jp"` を取得、または初期同期用アカウントとして存在しなければ作成する
2. Gmail API `users.messages.list` を `userId = "me"`、`q = GMAIL_QUERY` で呼び、最新50件を取得する
3. 各 `message.id` で `users.messages.get` を呼ぶ
4. MIME構造から本文・ヘッダーを抽出
5. `mail_notifications` にupsert
6. ルール分類
7. 案件/要員の仮抽出
8. 抽出結果を `extraction_results` に保存
9. 確信度が最低限を超える場合のみ `projects` / `persons` を仮作成
10. 確信度が低いものは `needsReview = true`

### 5.2 初期クエリ

Gmail listの初期query:

- 初期実装: `to:ses@skv.co.jp`
- 使用しない: `deliveredto:ses@skv.co.jp`
- ヘッダー確認後の候補: `list:ses.skv.co.jp` 相当
- 必要になった場合のみ subject / from条件を追加

最初は取り込み範囲を明示し、想定外の大量取り込みを避ける。
`sho.sato@skv.co.jp` のGmail実測では `deliveredto:ses@skv.co.jp` はヒットせず、`to:ses@skv.co.jp` でヒットした。
そのため初期実装では必ず `q = "to:ses@skv.co.jp"` を使う。

### 5.3 今回実装しない同期方式

- Gmail push通知
- Pub/Sub
- `users.watch`
- `historyId` 差分同期
- Gmailラベル更新
- 既読化

ただし将来 `historyId` 差分同期へ拡張するため、`sourceRawHeaders.historyId` にはGmailのhistoryIdを保存しておく。

## 6. 分類設計

初期分類はAIではなくルール関数で行う。

候補分類:

| 分類 | `MailCategory` | isExcluded |
|---|---|---|
| 案件紹介 | `PROJECT_INTRO` | false |
| 要員紹介 | `PERSON_INTRO` | false |
| セミナー | `SEMINAR` | true |
| メルマガ | `NEWSLETTER` | true |
| 営業広告 | `SALES_AD` | true |
| 返信 | `NORMAL_CONTACT` または `OTHER` | true |
| 要確認 | `NEEDS_REVIEW` | false |
| その他 | `OTHER` | false or true |

### 6.1 ルール例

除外優先:

- セミナー: `セミナー`, `ウェビナー`, `イベント`, `勉強会`, `開催`
- メルマガ: `メルマガ`, `ニュースレター`, `配信停止`, `unsubscribe`
- 営業広告: `キャンペーン`, `資料請求`, `サービス紹介`, `広告`, `PR`
- 返信: `isReply = true`

案件紹介:

- 件名または本文に `案件`, `募集`, `単価`, `勤務地`, `面談`, `精算`, `商流`
- `必須スキル`, `尚可`, `開始`, `契約形態` が複数含まれる

要員紹介:

- 件名または本文に `要員`, `人材`, `技術者`, `エンジニア`, `稼働`, `希望単価`
- `スキル`, `経験`, `最寄`, `リモート`, `国籍`, `年齢` が複数含まれる

どちらにも当てはまる場合:

- 案件語と要員語のスコアを比較
- 差が小さい場合は `NEEDS_REVIEW`

分類ロジックは必ず関数として分離する。

候補:

- `classifyMailByRules(mail): MailClassification`
- `extractProjectDraft(mail): ProjectDraft`
- `extractPersonDraft(mail): PersonDraft`

AI分類はこの関数の差し替え/追加で対応する。

## 7. 除外設計

初期方針:

- `SEMINAR`, `NEWSLETTER`, `SALES_AD` は `isExcluded = true`
- 返信メールは `isExcluded = true`
- `PROJECT_INTRO`, `PERSON_INTRO`, `NEEDS_REVIEW` は `isExcluded = false`
- `OTHER` は初期では `needsReview = true` に寄せる

`excludeReason` は既存schemaにあるためmigration不要。

除外メールは削除しない。将来、確認画面から復活できるように `isExcluded` を更新するだけにする。

## 8. 案件抽出設計

### 8.1 保存先マッピング

| 抽出項目 | 保存先 |
|---|---|
| 案件名 | `projects.title` |
| 業務内容 | `projects.workDescription` / `projects.summary` |
| 使用技術 | `project_skills.skillType = USED_TECHNOLOGY` |
| 必須スキル | `project_skills.skillType = REQUIRED` |
| 尚良スキル | `project_skills.skillType = PREFERRED` |
| 単価 | `project_conditions.unitPriceMin/Max/Text` |
| 上位金額 | `project_conditions.upperAmountMin/Max` |
| 勤務地 | `project_conditions.prefecture`, `workLocationText` |
| 開始月 | `project_conditions.startMonth` |
| 精算幅 | `project_conditions.settlementTimeMin/Max` |
| 面談回数 | `project_conditions.interviewCount` |
| 商流 | `project_company_roles` と `project_conditions.notes` |
| 契約形態 | `project_conditions.contractType` |
| 外国籍可否 | `project_conditions.foreignNationalityPolicy` |
| 年齢条件 | `project_conditions.ageCondition` |
| 元メール | `projects.sourceMailId` |

### 8.2 会社・商流

商流は単なる文字列ではなく、可能な範囲で会社に分ける。

- 上位会社: `project_company_roles.role = UPPER_COMPANY`
- エンド: `END_USER`
- 元請: `PRIME_CONTRACTOR`
- 二次請け: `SECONDARY_CONTRACTOR`
- 三次請け: `TERTIARY_CONTRACTOR`

会社名抽出に自信がない場合は、無理に会社を作らず `project_conditions.notes` に原文商流を残し、`needsReview = true` にする。

### 8.3 保存先なし・注意

現schemaで保存しづらいもの:

- 抽出信頼度を案件本体に直接持つカラム
- 案件単位の `needsReview`
- 抽出元本文の項目ごとの根拠位置

初期は `extraction_results.rawResult` / `normalizedResult` / `reviewStatus` に保存する。

## 9. 要員抽出設計

### 9.1 保存先マッピング

| 抽出項目 | 保存先 |
|---|---|
| 要員名 | `persons.name` |
| 所属会社 | `companies` + `persons.ownerCompanyId` |
| 希望単価 | `persons.desiredUnitPrice` |
| 稼働開始 | `persons.availableFrom` |
| スキル | `person_skills.skillName` |
| 希望勤務地 | `persons.preferredLocation` |
| リモート可否 | `persons.remotePreference` |
| 国籍 | `persons.nationality` |
| 年齢 | `persons.age` |
| 状態 | `persons.status`、初期は `AVAILABLE` |
| 経験概要 | `persons.careerSummary` / `persons.summary` |
| 元メール | `persons.sourceMailId` |

### 9.2 保存先なし・注意

現schemaで保存しづらいもの:

- 対応工程を構造化する専用カラム
- 職種カテゴリの専用カラム
- 要員単位の `needsReview`
- パワーBP等の注力要員タグ

初期は以下で代替する。

- 対応工程: `persons.summary` または `person_skills.notes`
- 要確認: `extraction_results.reviewStatus`
- 注力要員: 次フェーズで `person_tags` または `persons.isFocus` 相当を検討

## 10. 元メールとの紐付け設計

初期は以下を必ず保存する。

- 案件: `projects.sourceMailId = mail_notifications.id`
- 要員: `persons.sourceMailId = mail_notifications.id`
- 抽出結果: `extraction_results.mailNotificationId = mail_notifications.id`

1メールから複数案件/複数要員が作られる場合:

- 各 `projects.sourceMailId` / `persons.sourceMailId` に同じ `mail_notifications.id` を入れる
- 加えて `mail_entity_links` に `linkType = EXTRACTED` でリンクを作る

同一メールから案件と要員が両方抽出される場合も、`mail_entity_links` で複数リンクを許容する。

## 11. UI設計

トップ画面には `mail_notifications` 一覧を復活させない。

既存のメイン一覧は維持する。

- 案件タブ: 案件一覧のみ
- 要員タブ: 要員一覧のみ
- 提案一覧、配信履歴、メール通知一覧はトップ画面に出さない

### 11.1 案件詳細サイドペイン

既に元メール本文を折り畳み表示できる構造にする。

- `projects.sourceMail.bodyText`
- なければ `normalizedBody`
- なければ `-`

### 11.2 要員詳細サイドペイン

案件同様に `persons.sourceMail.bodyText` を折り畳み表示する。

### 11.3 取り込み結果確認導線

トップ画面とは別に、以下のどちらかを作る。

候補A: `/mail-ingest-review`

- 取り込み日時
- 件名
- 差出人
- 分類
- 除外
- 要確認
- 作成された案件/要員リンク
- 抽出結果JSONの概要
- 「案件として作成」「要員として作成」「除外」「要確認解除」など

候補B: 管理用モーダル

- 初期実装はAPI同期後に結果一覧を簡易表示
- 本格運用前に専用画面へ分離

推奨は候補A。トップ画面の一覧構成を壊さず確認できる。

## 12. セキュリティ・環境変数

`.env` に必要な候補:

```env
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_REDIRECT_URI=
GMAIL_AUTH_USER=sho.sato@skv.co.jp
GMAIL_USER_ID=me
GMAIL_QUERY=to:ses@skv.co.jp
GMAIL_INITIAL_SYNC_LIMIT=50
GMAIL_INGEST_CLASSIFICATION_VERSION=rule-v0.1
```

`.env.example` にはキー名だけを載せる。

GitHubへ上げてはいけないもの:

- OAuth client secret
- refresh token
- 実メール本文
- 実メールのヘッダー原文
- 本番DB接続文字列

初期スコープ:

- Gmail読み取り専用スコープを使う
- メール送信、ラベル操作、既読化の権限は付けない
- OAuth認証ユーザーは `sho.sato@skv.co.jp`
- Gmail APIの `userId` は `me`
- `ses@skv.co.jp` は抽出条件であり、認証ユーザーではない
- Google Workspace管理者権限、Admin SDK、Directory APIは使わない

## 13. 現在schemaで実装可能な範囲

実装可能:

- Gmail message.id / threadId / header / subject / body 保存
- 重複登録防止
- 返信判定
- ルール分類
- 除外管理
- 案件仮作成
- 要員仮作成
- 会社仮作成
- 商流の会社ロール化
- スキル保存
- 元メール紐付け
- 抽出結果のJSON保存
- 確認待ち状態の管理

初期はmigrationなしでも主要機能を開始できる。

## 14. schema変更が必要または推奨される項目

初期MUSTではないが、以下は将来migrationを検討する。

### 14.1 同期状態管理

差分同期や運用監視のために `mail_sync_runs` または `gmail_sync_states` があるとよい。

案:

- `mail_sync_runs`
  - `id`
  - `sourceAccountId`
  - `startedAt`
  - `finishedAt`
  - `status`
  - `requestedMaxResults`
  - `fetchedCount`
  - `insertedCount`
  - `updatedCount`
  - `skippedCount`
  - `errorMessage`

- `gmail_sync_states`
  - `id`
  - `sourceAccountId`
  - `lastHistoryId`
  - `lastSyncedAt`
  - `lastMessageDate`

初期はログ出力とAPIレスポンスで代替可能。historyId差分同期を始める時点でmigration推奨。

### 14.2 案件/要員のneedsReview

画面で「この案件は抽出確認待ち」と明示したい場合:

- `projects.needsReview Boolean @default(false)`
- `persons.needsReview Boolean @default(false)`

ただし初期は `extraction_results.reviewStatus` で代替する。

### 14.3 要員タグ

パワーBPなどをDB管理するなら:

- `person_tags`
  - `personId`
  - `tag`
  - `tagType`

または `persons.isFocus` / `persons.focusType`。

初期Gmail取り込みには必須ではない。

## 15. 実装ステップ案

Step 1: schema確認

- 本設計書の内容を確認
- 初期はmigrationなしで進めるか判断

Step 2: 必要ならmigration案提示

- 初期MUSTはmigrationなし
- 差分同期状態管理と要員タグは次フェーズ候補

Step 3: Gmail client作成

- OAuth refresh tokenからアクセストークン取得
- Gmail API clientを作成
- `sho.sato@skv.co.jp` でOAuth認証する
- Gmail APIは `userId = "me"` で呼ぶ
- `ses@skv.co.jp` は `GMAIL_QUERY` の抽出条件として扱う
- 管理者権限、Directory API、Googleグループ直接読み取りは使わない

Step 4: 最新50件の手動同期

- `POST /api/gmail/sync`
- `maxResults = GMAIL_INITIAL_SYNC_LIMIT`
- `query = GMAIL_QUERY`
- 初期値は `to:ses@skv.co.jp`

Step 5: `mail_notifications` 保存

- headers/bodyを正規化
- `sourceAccountId + externalMessageId` でupsert
- `bodyHash` 作成

Step 6: ルール分類

- `classifyMailByRules`
- `category`, `isExcluded`, `excludeReason`, `needsReview`, `classifiedBy = RULE`, `classificationVersion = rule-v0.1`

Step 7: 案件/要員の仮抽出

- `PROJECT_INTRO`: project draft抽出
- `PERSON_INTRO`: person draft抽出
- 抽出結果は必ず `extraction_results` に保存
- 作成した案件/要員とメールを紐付ける

Step 8: 画面反映

- 既存案件/要員一覧にDBから表示
- 詳細サイドペインで元メール本文確認
- needsReview表示を追加

Step 9: 確認手順作成

- 最新50件同期
- 件数確認
- 除外確認
- 案件/要員抽出確認
- 修正画面で補正

## 16. Google Cloud / Gmail側でユーザーが手動で行う作業

1. Google Cloud Projectを用意
2. Gmail APIを有効化
3. OAuth同意画面を設定
4. OAuth Client IDを作成
5. 読み取り専用スコープを許可
6. `sho.sato@skv.co.jp` でOAuth認可
7. refresh tokenを取得
8. `.env` に以下を設定
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `GOOGLE_REDIRECT_URI`
   - `GMAIL_AUTH_USER=sho.sato@skv.co.jp`
   - `GMAIL_USER_ID=me`
   - `GMAIL_QUERY=to:ses@skv.co.jp`
   - `GMAIL_INITIAL_SYNC_LIMIT=50`
9. `sho.sato@skv.co.jp` のGmail上で `to:ses@skv.co.jp` 検索が期待通りヒットするか確認
10. 本番メールを扱う前に、検証用または最新50件のみで確認

不要な作業:

- Google Workspace管理者権限の付与
- Admin SDK / Directory APIの有効化
- サービスアカウントのドメインワイドデリゲーション設定
- `ses@skv.co.jp` をOAuth認可しようとすること

## 17. Codexが実装する作業

- Gmail clientの作成
- MIME/header parserの作成
- 本文抽出関数の作成
- `mail_notifications` upsert処理
- ルール分類関数の作成
- 案件抽出関数の作成
- 要員抽出関数の作成
- `extraction_results` 保存
- `projects` / `persons` 仮作成
- 元メール紐付け
- 手動同期API
- 同期結果レスポンス
- 取り込み確認画面または確認導線
- 動作確認手順の作成

## 18. 実装しないもの

- AI分類
- Gmail push通知
- Pub/Sub
- `users.watch`
- Gmailラベル操作
- 既読化
- メール送信
- 添付ファイル保存
- 本番データ自動投入
- 物理削除
- トップ画面へのメール通知一覧復活
- トップ画面への提案一覧復活
- トップ画面への配信履歴復活

## 19. 実装前の確認事項

1. 初期実装はmigrationなしで進めてよいか
2. 同期APIのURLは `POST /api/gmail/sync` でよいか
3. 初期取得件数は50件固定でよいか、画面/APIで指定可能にするか
4. Gmail queryは `to:ses@skv.co.jp` を初期値にする
5. ルール分類で `OTHER` は通常一覧に残すか、要確認一覧に寄せるか
6. 案件/要員の自動作成は即作成でよいか、まず抽出結果だけ保存して確認後作成にするか
7. 1メールから複数案件/要員が出た場合、自動で複数作成してよいか
8. Google OAuthのrefresh token取得をユーザー側で行うか、ローカル補助スクリプトを作るか
9. `sho.sato@skv.co.jp` のGmailで `to:ses@skv.co.jp` が十分にヒットするか
10. `to:` で漏れるメールがある場合、List系ヘッダー条件やsubject/from条件を併用するか

## 20. 推奨する初期実装判断

最短でMUSTを満たすなら、初期はmigrationなしで進める。

推奨フロー:

1. 最新50件を `mail_notifications` に保存
2. ルール分類して除外/要確認を付ける
3. `PROJECT_INTRO` / `PERSON_INTRO` のみ仮抽出
4. 抽出結果を `extraction_results` に保存
5. 確信度が高いものだけ `projects` / `persons` を作る
6. sourceMailIdで元メールをサイドペインに表示
7. 取り込み確認画面で修正できるようにする

この順番なら、Gmail取り込みの核を早く作りつつ、後からAI分類や差分同期へ自然に拡張できる。
