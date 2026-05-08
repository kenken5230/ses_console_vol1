# SES Console DB設計書 v0.1

作成日: 2026-05-07  
対象DB: PostgreSQL  
対象範囲: DB設計方針の整理のみ。DB実装、Prisma schema、seed、API、画面修正は行わない。

## 1. DB設計の目的

SES Console で扱うメール、案件、要員、会社、担当者、提案、配信履歴を、本番運用に耐える形で一元管理するためのDB設計を定義する。

現在の画面はMOC段階だが、DBは小規模な仮実装やSQLite前提に寄せず、将来的に PostgreSQL + Prisma、または FastAPI 等のバックエンドから利用できる構造を前提にする。

この設計では、以下を重視する。

- ses@skv.co.jp に届く新規配信メールを安全に取り込み、重複なく保存できること
- 案件紹介メール、要員紹介メール、不要メールを分類できること
- 不要メールを削除せず、除外・復活・確認できること
- 案件、要員、会社、担当者、提案、配信履歴を相互に紐付けられること
- 商流を文字列だけでなく会社リレーションとして扱えること
- 他アカウントで提案済み、エントリー済み、面談中などを判定できること
- 将来的な検索、フィルター、AI分類、案件抽出、要員抽出に拡張できること

## 2. 技術前提

- DBは PostgreSQL を前提にする。
- MOC段階でも SQLite 前提の設計にはしない。
- フロントエンドは Next.js / React から利用する想定。
- 将来的には Prisma の `schema.prisma` に落とし込む想定。
- 将来的に FastAPI 等のバックエンドへ切り出しても使えるよう、DBは Next.js 専用の都合に寄せすぎない。
- 主キーは原則 UUID を推奨する。
- 日時は原則 `timestamptz` を使う。
- 金額は `integer` または `numeric` を用途で使い分ける。万円単位の単価レンジは `integer` で持てる。
- メール本文、抽出結果、フィルター条件など可変性の高い情報は `jsonb` を併用する。
- 大量メール検索に備え、PostgreSQL の全文検索、`pg_trgm`、GIN index の利用を将来候補に入れる。
- Prisma で表現しにくい制約、部分index、全文検索indexは、将来のマイグレーションでSQLを併用する前提にする。

## 3. 今回使わない分類

元サイトまたは現画面にある以下のタブ分類は、SES Console のDB分類として採用しない。

- HR
- FINANCE
- MARKETING
- 管理部採用

これらは一時的にタブUIとして残っていてもよいが、以下の分類軸には使わない。

- 案件分類
- メール分類
- 業務分類
- DB上のカテゴリ設計
- 検索・フィルターの主要分類

SES Console の分類は、SES業務に合わせて以下のように設計する。

- メール分類: 案件紹介、要員紹介、セミナー、メルマガ、営業広告、通常連絡、その他、要確認、除外
- 案件管理: 案件本体、案件条件、商流、スキル、注力条件、ステータス
- 要員管理: 要員本体、スキル、稼働条件、提案状況
- 営業進捗: 提案、エントリー、面談、オファー、参画、辞退、見送り

## 4. 中心データの考え方

中心データは以下の5つに分ける。

| 中心データ | 考え方 |
| --- | --- |
| メール | 外部から届く一次情報。案件、要員、通常連絡、不要メールの起点になる。 |
| 案件 | 案件紹介メールまたは手入力から作成される営業対象。条件、商流、スキル、進捗と紐付く。 |
| 要員 | 要員紹介メールまたは手入力から作成される提案対象。スキル、希望条件、提案履歴と紐付く。 |
| 会社・担当者 | 上位会社、エンド、元請、二次請け、三次請け、提案先、連絡先を表すマスタ。 |
| 提案・配信履歴 | 誰が、どの要員または案件を、どの会社・担当者に、どのアカウントから動かしたかを残す業務履歴。 |

メールは削除せず、分類・除外・紐付けの状態を持つ。案件や要員は、メールから抽出される場合も、手入力で作られる場合もある。抽出元メールを保持しつつ、後から人が修正できる設計にする。

## 5. 主要テーブル一覧

| テーブル | 主な用途 |
| --- | --- |
| `users` | SES Console の利用者、営業担当、作成者、更新者 |
| `mail_accounts` | Gmail等の取り込み元・送信元アカウント |
| `mail_notifications` | 受信メール本体、分類、除外状態、返信判定情報 |
| `mail_attachments` | メール添付ファイルのメタ情報 |
| `mail_filter_rules` | 不要メール除外、分類補助、レビュー判定ルール |
| `companies` | 会社マスタ |
| `company_aliases` | 会社名ゆれ、略称、表記違い |
| `company_contacts` | 会社担当者、上位担当者、連絡先 |
| `projects` | 案件本体 |
| `project_conditions` | 単価、稼働、契約、現場条件など案件条件 |
| `project_company_roles` | 案件ごとの商流会社ロール |
| `project_skills` | 案件に紐付く必須・尚可・使用技術 |
| `project_tags` | 注力案件、特徴、運用タグ |
| `persons` | 要員本体 |
| `person_skills` | 要員スキル |
| `proposals` | 1要員 x 1案件 x 1提案先会社 x 1営業アカウント の進捗 |
| `proposal_status_histories` | 提案ステータス変更履歴 |
| `distribution_logs` | 案件・要員の配信履歴 |
| `search_histories` | 検索履歴、フィルター履歴 |
| `extraction_results` | AI/ルールによるメール抽出・分類結果 |
| `mail_entity_links` | メールと案件・要員・提案・配信履歴の補助的な相互紐付け |
| `audit_logs` | 重要操作の監査ログ |

## 6. 各テーブルの役割

| テーブル | 役割 |
| --- | --- |
| `users` | 画面操作、作成者、担当者、承認者、配信者を識別する。 |
| `mail_accounts` | `ses@skv.co.jp` や営業個人アカウントなど、外部メールアカウントを管理する。 |
| `mail_notifications` | 受信メールを原本として保存し、分類・除外・返信判定・抽出状態を管理する。 |
| `mail_attachments` | 添付ファイル名、MIME、サイズ、保存先参照、ハッシュを持つ。 |
| `mail_filter_rules` | セミナー、ウェビナー、メルマガ、営業広告などの除外・分類ルールを管理する。 |
| `companies` | 会社名、取引可否、帝国データバンク点数など、会社単位の情報を管理する。 |
| `company_aliases` | 表記ゆれを吸収し、同一会社判定に使う。 |
| `company_contacts` | 担当者名、メール、電話、部署、役職、連絡可否を管理する。 |
| `projects` | 案件名、作業内容、作成日、元メール、ステータスなど案件の中核情報を管理する。 |
| `project_conditions` | 案件の検索・フィルター対象となる条件情報を分離して管理する。 |
| `project_company_roles` | 上位会社、エンド、元請、二次請け、三次請けなどを案件ごとに会社として紐付ける。 |
| `project_skills` | 必須スキル、尚可スキル、使用技術を検索しやすく管理する。 |
| `project_tags` | 注力案件、高単価、交代要員など柔軟なタグを管理する。 |
| `persons` | 要員名、概要、単価、稼働開始、所属、元メールなどを管理する。 |
| `person_skills` | 要員のスキル、経験年数、レベルを管理する。 |
| `proposals` | 提案・エントリー・面談・オファー・参画の現在状態を管理する。 |
| `proposal_status_histories` | 提案状態の変更履歴を時系列で保存する。 |
| `distribution_logs` | 誰が誰に何を送ったかを残し、二重配信防止や返信紐付けに使う。 |
| `search_histories` | ユーザーごとの検索条件、対象、検索日時、結果件数を保存する。 |
| `extraction_results` | AI分類、AI抽出、ルール抽出の結果、信頼度、モデル情報を保存する。 |
| `mail_entity_links` | 1通のメールが複数案件・複数要員に関係する場合の補助リンクを表現する。 |
| `audit_logs` | 復活、除外、重要な更新、配信、ステータス変更の監査に使う。 |

## 7. 各テーブルの1レコードの単位

| テーブル | 1レコードの単位 |
| --- | --- |
| `users` | 1人のシステム利用者 |
| `mail_accounts` | 1つの外部メールアカウント |
| `mail_notifications` | 1通の外部メール |
| `mail_attachments` | 1つのメール添付ファイル |
| `mail_filter_rules` | 1つの分類・除外ルール |
| `companies` | 1社 |
| `company_aliases` | 1つの会社名表記ゆれ |
| `company_contacts` | 1人の会社担当者 |
| `projects` | 1案件 |
| `project_conditions` | 1案件に対する条件セット。原則 `projects` と1対1 |
| `project_company_roles` | 1案件における1会社の1役割 |
| `project_skills` | 1案件に紐付く1スキル |
| `project_tags` | 1案件に紐付く1タグ |
| `persons` | 1要員 |
| `person_skills` | 1要員に紐付く1スキル |
| `proposals` | 1要員 x 1案件 x 1提案先会社 x 1営業アカウント |
| `proposal_status_histories` | 1回の提案ステータス変更 |
| `distribution_logs` | 1回の配信・送信 |
| `search_histories` | 1回の検索実行または保存条件 |
| `extraction_results` | 1回の分類・抽出処理結果 |
| `mail_entity_links` | 1メールと1業務エンティティのリンク |
| `audit_logs` | 1回の監査対象操作 |

## 8. 各テーブルの主要項目

### `users`

- `id`
- `name`
- `email`
- `role`
- `is_active`
- `created_at`
- `updated_at`

### `mail_accounts`

- `id`
- `email`
- `provider`
- `display_name`
- `purpose`
- `is_primary_ingest`
- `is_active`
- `created_at`
- `updated_at`

`purpose` は `inbound_shared`, `sales_outbound`, `personal_sales`, `system` などを想定する。

### `mail_notifications`

- `id`
- `source_account_id`
- `external_message_id`
- `external_thread_id`
- `in_reply_to`
- `references_header`
- `message_date`
- `received_at`
- `from_email`
- `from_name`
- `to_emails`
- `cc_emails`
- `bcc_emails`
- `subject`
- `body_text`
- `body_html`
- `body_hash`
- `normalized_subject`
- `normalized_body`
- `category`
- `category_confidence`
- `is_reply`
- `is_excluded`
- `exclude_reason`
- `needs_review`
- `classified_by`
- `classification_version`
- `source_raw_headers`
- `created_at`
- `updated_at`

`source_account_id + external_message_id` はユニークにする。

### `mail_attachments`

- `id`
- `mail_notification_id`
- `file_name`
- `mime_type`
- `file_size`
- `content_hash`
- `storage_key`
- `created_at`

### `mail_filter_rules`

- `id`
- `name`
- `rule_type`
- `target_field`
- `pattern`
- `category`
- `set_is_excluded`
- `exclude_reason`
- `set_needs_review`
- `priority`
- `is_active`
- `created_by_user_id`
- `created_at`
- `updated_at`

`rule_type` は `keyword`, `domain`, `sender`, `subject_regex`, `body_regex`, `ai_hint` などを想定する。

### `companies`

- `id`
- `name`
- `normalized_name`
- `corporate_number`
- `website_url`
- `main_email_domain`
- `trade_status`
- `tdb_score`
- `bankruptcy_risk_score`
- `notes`
- `created_at`
- `updated_at`

会社に固定ロールは持たせない。上位会社、エンド、元請などの役割は `project_company_roles` で案件ごとに持つ。

### `company_aliases`

- `id`
- `company_id`
- `alias_name`
- `normalized_alias_name`
- `source`
- `created_at`

### `company_contacts`

- `id`
- `company_id`
- `name`
- `email`
- `phone`
- `department`
- `position`
- `is_active`
- `contact_policy`
- `notes`
- `created_at`
- `updated_at`

### `projects`

- `id`
- `project_code`
- `title`
- `summary`
- `work_description`
- `business_description`
- `source_mail_id`
- `created_by_user_id`
- `owner_user_id`
- `status`
- `priority_level`
- `is_focus`
- `created_at`
- `updated_at`
- `published_at`

`status` は `draft`, `open`, `paused`, `closed`, `archived` などを想定する。

### `project_conditions`

- `id`
- `project_id`
- `unit_price_min`
- `unit_price_max`
- `unit_price_text`
- `upper_amount_min`
- `upper_amount_max`
- `commission_fee_amount`
- `am_project_fee_amount`
- `bankruptcy_prediction_fee_amount`
- `recruiting_count`
- `workload`
- `start_month`
- `expected_work_days_per_week`
- `settlement_time_min`
- `settlement_time_max`
- `fixed_work_start_time`
- `fixed_work_end_time`
- `core_time_start`
- `core_time_end`
- `work_location_text`
- `prefecture`
- `remote_type`
- `work_environment`
- `contract_type`
- `foreign_nationality_policy`
- `age_condition`
- `site_atmosphere`
- `dress_code`
- `hair_nail_rule`
- `interview_count`
- `sales_interview_attendance_required`
- `am_contact_required`
- `am_contact_name`
- `notes`
- `created_at`
- `updated_at`

### `project_company_roles`

- `id`
- `project_id`
- `company_id`
- `company_contact_id`
- `role`
- `role_order`
- `is_primary`
- `notes`
- `created_at`

`role` は `upper_company`, `end_user`, `prime_contractor`, `secondary_contractor`, `tertiary_contractor`, `account_manager_company`, `proposal_target` などを想定する。

### `project_skills`

- `id`
- `project_id`
- `skill_name`
- `skill_type`
- `years_required`
- `notes`
- `created_at`

`skill_type` は `required`, `preferred`, `used_technology`, `other` を想定する。

### `project_tags`

- `id`
- `project_id`
- `tag`
- `tag_type`
- `created_at`

`tag_type` は `focus`, `filter`, `manual`, `ai` などを想定する。

### `persons`

- `id`
- `person_code`
- `name`
- `initials`
- `source_mail_id`
- `owner_company_id`
- `owner_contact_id`
- `summary`
- `career_summary`
- `desired_unit_price`
- `available_from`
- `preferred_location`
- `remote_preference`
- `age`
- `nationality`
- `status`
- `created_by_user_id`
- `created_at`
- `updated_at`

`status` は `available`, `proposing`, `joined`, `inactive`, `archived` などを想定する。

### `person_skills`

- `id`
- `person_id`
- `skill_name`
- `years`
- `level`
- `notes`
- `created_at`

### `proposals`

- `id`
- `person_id`
- `project_id`
- `target_company_id`
- `target_contact_id`
- `sales_account_id`
- `owner_user_id`
- `source_mail_id`
- `latest_distribution_log_id`
- `status`
- `status_changed_at`
- `proposed_at`
- `entered_at`
- `interview_scheduled_at`
- `interviewed_at`
- `offered_at`
- `joined_at`
- `rejected_at`
- `withdrawn_at`
- `notes`
- `created_at`
- `updated_at`

`status` は `proposed`, `entered`, `interview_scheduling`, `interviewed`, `offered`, `rejected`, `joined`, `withdrawn` などを想定する。

### `proposal_status_histories`

- `id`
- `proposal_id`
- `from_status`
- `to_status`
- `changed_by_user_id`
- `changed_at`
- `reason`
- `notes`

### `distribution_logs`

- `id`
- `mail_account_id`
- `sender_user_id`
- `target_company_id`
- `target_contact_id`
- `project_id`
- `person_id`
- `proposal_id`
- `external_message_id`
- `external_thread_id`
- `subject`
- `body_hash`
- `sent_at`
- `delivery_status`
- `excluded_from_resend`
- `notes`
- `created_at`

`project_id` と `person_id` は、案件配信または要員配信のどちらかを表す。将来はDB制約で「少なくともどちらか一方」を担保する。

### `search_histories`

- `id`
- `user_id`
- `target_scope`
- `query_text`
- `filters`
- `sort_key`
- `result_count`
- `created_at`

`filters` は `jsonb` で保持し、画面フィルターの変更に追随しやすくする。

### `extraction_results`

- `id`
- `mail_notification_id`
- `target_type`
- `target_id`
- `extraction_type`
- `model_name`
- `model_version`
- `prompt_version`
- `confidence`
- `raw_result`
- `normalized_result`
- `review_status`
- `reviewed_by_user_id`
- `created_at`
- `updated_at`

### `mail_entity_links`

- `id`
- `mail_notification_id`
- `entity_type`
- `entity_id`
- `link_type`
- `created_by_user_id`
- `created_at`

Prismaで厳密な外部キーを表現したい場合は、将来 `mail_project_links`, `mail_person_links`, `mail_proposal_links` に分ける案もある。v0.1では、多様な紐付けを受ける補助テーブルとして設計する。

### `audit_logs`

- `id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `before_data`
- `after_data`
- `created_at`

## 9. テーブル間のリレーション

主要なリレーションは以下。

- `mail_accounts` 1:N `mail_notifications`
- `mail_notifications` 1:N `mail_attachments`
- `mail_notifications` 1:N `extraction_results`
- `mail_notifications` 1:N `mail_entity_links`
- `mail_notifications` 1:N `projects` via `projects.source_mail_id`
- `mail_notifications` 1:N `persons` via `persons.source_mail_id`
- `companies` 1:N `company_aliases`
- `companies` 1:N `company_contacts`
- `projects` 1:1 `project_conditions`
- `projects` 1:N `project_company_roles`
- `companies` 1:N `project_company_roles`
- `company_contacts` 1:N `project_company_roles`
- `projects` 1:N `project_skills`
- `projects` 1:N `project_tags`
- `persons` 1:N `person_skills`
- `persons` 1:N `proposals`
- `projects` 1:N `proposals`
- `companies` 1:N `proposals` via `target_company_id`
- `company_contacts` 1:N `proposals` via `target_contact_id`
- `mail_accounts` 1:N `proposals` via `sales_account_id`
- `proposals` 1:N `proposal_status_histories`
- `proposals` 1:N `distribution_logs`
- `mail_accounts` 1:N `distribution_logs`
- `users` 1:N `search_histories`
- `users` 1:N `audit_logs`

## 10. メール取り込み設計

主対象は `ses@skv.co.jp` に届く新規配信メールとする。

返信メールは主対象外だが、完全削除はしない。DB上には保存し、`is_reply`, `is_excluded`, `needs_review` で一覧表示や処理対象から外せるようにする。

取り込み時に保持する外部IDは以下。

- `source_account_id`
- `external_message_id`
- `external_thread_id`
- `in_reply_to`
- `references_header`

重複登録防止のため、`source_account_id + external_message_id` をユニークにする。外部IDが取れない例外ケースでは、将来 `body_hash + received_at + from_email + subject` による補助重複判定を検討する。

メール取り込みの流れは以下を想定する。

1. 外部メールアカウントからメッセージ一覧を取得
2. `source_account_id + external_message_id` で既存チェック
3. 新規メールを `mail_notifications` に保存
4. `in_reply_to` または `references_header` から返信判定
5. ルール分類を実行
6. AI分類・抽出を実行する場合は `extraction_results` に保存
7. 案件・要員候補として人間が確認
8. 確定後に `projects` または `persons` へリンク

## 11. メール分類設計

初期カテゴリは以下を想定する。

| 表示名 | DB値の例 | 意味 |
| --- | --- | --- |
| 案件紹介 | `project_intro` | 案件情報を含む新規配信メール |
| 要員紹介 | `person_intro` | 要員情報を含む新規配信メール |
| セミナー | `seminar` | セミナー、ウェビナー、イベント |
| メルマガ | `newsletter` | ニュースレター、定期配信 |
| 営業広告 | `sales_ad` | 営業広告、キャンペーン、宣伝 |
| 通常連絡 | `normal_contact` | 通常の業務連絡 |
| その他 | `other` | 上記に当てはまらないもの |
| 要確認 | `needs_review` | 自動分類では判断できないもの |
| 除外 | `excluded` | 通常一覧から除外するもの |

`category` と `is_excluded` は分ける。例えば `seminar` で `is_excluded = true` のように、分類と表示除外状態を独立させる。

分類元は以下を想定する。

- `rule`: ルール分類
- `ai`: AI分類
- `manual`: 人による分類
- `system`: システム判定

分類結果には `category_confidence`, `classified_by`, `classification_version` を持たせる。

## 12. 不要メール除外設計

セミナー、ウェビナー、イベント、メルマガ、ニュースレター、営業広告、キャンペーンなどは通常一覧から除外できるようにする。

ただし、自動削除はしない。メール本体は `mail_notifications` に残し、除外一覧から確認・復活できるようにする。

必要項目は以下。

- `category`
- `is_excluded`
- `exclude_reason`
- `needs_review`
- `classified_by`
- `updated_at`

復活操作では `is_excluded = false` に戻す。復活、再除外、手動カテゴリ変更は `audit_logs` に残す。

除外ルールは `mail_filter_rules` に保存し、ルールのON/OFF、優先度、対象フィールド、パターンを管理する。

## 13. 案件管理設計

案件は `projects` を本体、`project_conditions` を条件、`project_company_roles` を商流、`project_skills` をスキルとして分ける。

案件本体に持つべき情報。

- 案件名
- 概要
- 作業内容
- 業務内容
- 元メール
- 作成者
- 担当者
- ステータス
- 注力フラグ
- 作成日

案件条件に持つべき情報。

- 手数料
- AM案件手数料
- 倒産予測値手数料
- 単価
- 上位金額
- 募集人数
- 工数
- 開始月
- 作業場所
- 都道府県
- 就業環境
- リモート条件
- 精算時間幅
- 想定稼働日数
- 現場の定時
- コアタイム
- 契約形態
- 外国籍の受け入れ
- 年齢条件
- 現場の雰囲気
- 作業時の服装
- 髪型、爪等の規定
- 面談回数
- 営業の面談同席の要否
- AM経由連絡要否
- AM担当者名

スキルは `project_skills` に分ける。

- 使用技術
- 必須スキル
- 尚可スキル
- その他スキル

案件条件は検索・フィルター対象になりやすいため、主要項目は `jsonb` のみにはしない。単価、開始月、作業場所、契約形態、外国籍可否、年齢条件、面談回数などはカラムとして持つ。

## 14. 要員管理設計

要員は `persons` を本体、`person_skills` をスキルとして管理する。

要員本体に持つべき情報。

- 要員名
- イニシャル
- 所属会社
- 所属担当者
- 経歴概要
- 希望単価
- 稼働開始日
- 希望勤務地
- リモート希望
- 年齢
- 国籍
- 元メール
- ステータス

要員スキルに持つべき情報。

- スキル名
- 経験年数
- レベル
- 備考

要員紹介メールから抽出した情報は、確定前には `extraction_results` に保持し、人が確認してから `persons` に反映する設計を推奨する。

## 15. 提案・エントリー管理設計

`proposals` は以下を1レコードの基本単位にする。

1要員 x 1案件 x 1提案先会社 x 1営業アカウント

この単位にすることで、以下の判定ができる。

- 他アカウントですでに提案済みか
- 他アカウントですでにエントリー済みか
- 面談調整中か
- 面談済みか
- オファー済みか
- 参画済みか
- 辞退・見送り済みか

ステータス候補。

- `proposed`
- `entered`
- `interview_scheduling`
- `interviewed`
- `offered`
- `rejected`
- `joined`
- `withdrawn`

状態変更は `proposal_status_histories` に履歴として保存する。現在状態は `proposals.status` に持つ。

## 16. 配信履歴設計

`distribution_logs` は、誰が、どの要員または案件を、どの会社・担当者に、どのメールアカウントから、いつ送ったかを保存する。

主な利用目的。

- 二重配信防止
- 返信メールの紐付け
- 配信除外
- 営業別の履歴確認
- 提案ステータスとの連動
- 会社・担当者単位の接触履歴確認

保存すべき情報。

- 送信元メールアカウント
- 送信者ユーザー
- 対象会社
- 対象担当者
- 案件または要員
- 提案レコード
- 外部メッセージID
- 外部スレッドID
- 件名
- 本文ハッシュ
- 送信日時
- 配信状態
- 再配信除外フラグ

## 17. 検索・フィルター設計

検索対象は以下を想定する。

- 案件
- メール
- 要員
- 提案
- 会社
- 担当者
- 配信履歴

案件フィルター候補。

- 案件作成日
- 案件ID
- 除外キーワード
- 案件開始月
- スキル
- 単価
- 都道府県
- リモート有無
- フルリモート
- 想定稼働日数
- 取引可否
- 注力案件
- 契約形態
- 外国籍可否
- 年齢条件
- 面談回数
- 募集状況

メールフィルター候補。

- 受信日時
- 送信者
- 件名
- カテゴリ
- 除外状態
- 要確認
- 返信メールかどうか
- 添付有無

検索履歴は `search_histories.filters` に `jsonb` として保存する。画面のフィルター項目変更に対応しやすくするため、検索履歴は完全正規化しない。

大量検索に備え、以下を検討する。

- `mail_notifications.subject`
- `mail_notifications.normalized_body`
- `projects.title`
- `projects.work_description`
- `persons.summary`
- `companies.name`
- `company_aliases.alias_name`

上記に全文検索indexまたは trigram index を検討する。

## 18. 重複判定方針

### メール

必須の重複判定。

- `source_account_id + external_message_id`

補助的な重複判定候補。

- `body_hash`
- `normalized_subject`
- `from_email`
- `message_date`
- `external_thread_id`

### 会社

会社重複は以下で判定する。

- `normalized_name`
- `corporate_number`
- `main_email_domain`
- `company_aliases.normalized_alias_name`

会社名は表記ゆれが多いため、削除や自動統合は避け、候補提示と人間確認を前提にする。

### 案件

案件重複候補。

- `source_mail_id`
- 案件名の正規化値
- 上位会社
- 開始月
- 単価レンジ
- 作業内容ハッシュ

完全自動統合は避け、重複候補として表示する設計を推奨する。

### 要員

要員重複候補。

- 氏名またはイニシャル
- 所属会社
- 所属担当者
- スキル構成
- 希望単価
- 元メール

要員は匿名・イニシャルの場合が多いため、確定的な一意判定は危険。候補提示に留める。

### 提案

提案は以下を基本ユニーク候補にする。

- `person_id`
- `project_id`
- `target_company_id`
- `sales_account_id`

同じ組み合わせで再提案が必要な場合に備え、完全ユニーク制約ではなく、`status` や `withdrawn_at` を考慮した部分ユニークindexも検討する。

### 配信履歴

配信重複候補。

- `mail_account_id + external_message_id`
- `target_contact_id + project_id + person_id + body_hash`
- `proposal_id + sent_at`

## 19. インデックス方針

必須候補。

- `mail_notifications(source_account_id, external_message_id)` unique
- `mail_notifications(source_account_id, external_thread_id)`
- `mail_notifications(category, is_excluded, needs_review)`
- `mail_notifications(received_at)`
- `mail_notifications(is_reply)`
- `projects(status, created_at)`
- `projects(source_mail_id)`
- `project_conditions(project_id)` unique
- `project_conditions(start_month)`
- `project_conditions(unit_price_min, unit_price_max)`
- `project_conditions(prefecture)`
- `project_conditions(remote_type)`
- `project_company_roles(project_id, role)`
- `project_company_roles(company_id, role)`
- `project_skills(project_id, skill_name)`
- `persons(source_mail_id)`
- `person_skills(person_id, skill_name)`
- `proposals(person_id, project_id)`
- `proposals(project_id, status)`
- `proposals(target_company_id, status)`
- `proposals(sales_account_id, status)`
- `distribution_logs(target_company_id, target_contact_id, sent_at)`
- `distribution_logs(project_id, sent_at)`
- `distribution_logs(person_id, sent_at)`
- `search_histories(user_id, created_at)`

全文検索・曖昧検索候補。

- `mail_notifications.subject`
- `mail_notifications.normalized_body`
- `projects.title`
- `projects.work_description`
- `persons.summary`
- `companies.normalized_name`
- `company_aliases.normalized_alias_name`

PostgreSQLでは、将来的に以下を検討する。

- `GIN` index for `jsonb`
- `GIN` index for `to_tsvector`
- `pg_trgm` index for 会社名、案件名、件名
- 部分index for `is_excluded = false`
- 部分index for `needs_review = true`

## 20. MOC段階で作る範囲

今回作成するのはこの設計書のみ。DB実装は行わない。

将来、MOCからDB接続に進む場合の最小範囲は以下を推奨する。

- `users`
- `mail_accounts`
- `mail_notifications`
- `mail_filter_rules`
- `companies`
- `company_contacts`
- `projects`
- `project_conditions`
- `project_company_roles`
- `persons`
- `proposals`
- `distribution_logs`
- `search_histories`

MOC段階では、全テーブルを一度に作るより、メール取り込みから案件・要員候補を作る導線に必要な範囲を優先する。

ただし、DB設計自体は本番を見据え、後から商流、提案、配信履歴、AI抽出に拡張できる形を維持する。

## 21. 将来実装する範囲

将来実装候補。

- Gmail API等からのメール取り込み
- 返信メール判定
- 不要メール自動分類
- 除外一覧と復活操作
- AIによる案件抽出
- AIによる要員抽出
- 会社名ゆれ候補提示
- 案件重複候補提示
- 要員重複候補提示
- 提案済み・エントリー済み判定
- 配信二重防止
- 配信履歴からの返信紐付け
- 全文検索
- saved search
- 監査ログ
- 権限管理
- FastAPI等へのバックエンド切り出し

## 22. 不明点・確認事項

確認が必要な事項。

- ses@skv.co.jp 以外に取り込む共有メールアカウントがあるか
- 営業個人アカウントも同じDBで配信履歴管理するか
- Gmailのラベル、フォルダ、既読状態をDBに保持する必要があるか
- 返信メールをどの画面で見せるか
- 除外メールの保存期間をどうするか
- 添付ファイルの保存先をDB外ストレージにするか
- 会社マスタの正規化ルールをどこまで厳密にするか
- 帝国データバンク点数、倒産予測値の取得元と更新頻度
- 取引可否を会社全体に持つか、部署・担当者・案件単位にも持つか
- 要員の個人情報をどの粒度で保存してよいか
- 提案ステータスの正式な業務フロー
- 参画後の契約・請求管理まで含めるか
- AI抽出結果をどの程度保存するか
- 監査ログが必要な操作範囲
- ユーザー権限の粒度

## 23. DB設計上の改善提案

### 23.1 商流は会社ロールとして扱う

上位会社、エンド、元請、二次請け、三次請けを案件テーブルに文字列で固定カラムとして持つだけだと、検索、名寄せ、履歴管理が難しくなる。

`project_company_roles` を使い、会社マスタと案件ごとの役割を分離する設計が望ましい。同じ会社が案件によって元請にも二次請けにもなり得るため、`companies` に固定役割を持たせない。

### 23.2 案件条件は分けるが、分けすぎない

案件本体と案件条件は分けるべきだが、条件項目を細かいマスタに分けすぎるとMOC段階で重くなる。

単価、開始月、都道府県、契約形態、外国籍可否、面談回数など検索頻度が高いものはカラム化し、曖昧な補足は `notes` や一部 `jsonb` に逃がす方針がよい。

### 23.3 メールは原本として保存し、削除しない

不要メールは削除ではなく、`is_excluded`, `exclude_reason`, `needs_review` で管理する。これにより、誤分類時の復活、監査、ルール改善が可能になる。

### 23.4 AI抽出結果と確定データを分ける

AI分類・抽出の結果をそのまま案件・要員に確定反映すると、誤抽出時の追跡が難しい。

`extraction_results` に生の抽出結果、正規化結果、信頼度、モデル情報を残し、人間確認後に `projects` や `persons` へ反映する方が安全。

### 23.5 メール紐付けは将来厳密化する

`mail_entity_links` は柔軟だが、Prismaや外部キー制約の観点では弱い。将来、紐付け対象が固まったら以下のように分割してもよい。

- `mail_project_links`
- `mail_person_links`
- `mail_proposal_links`
- `mail_distribution_log_links`

MOC初期は柔軟性を優先し、本番化時に厳密化を検討する。

### 23.6 提案の一意性は業務ルール確認後に制約化する

`person_id + project_id + target_company_id + sales_account_id` は自然な提案単位だが、再提案や辞退後の再開がある場合、単純なユニーク制約では詰まる。

MOCでは重複警告に留め、本番化時にステータスを考慮した部分ユニークindexを検討する。

### 23.7 検索はPostgreSQL機能を前提に設計する

大量メールを対象にするため、単純な `LIKE` 検索だけでは厳しい。

PostgreSQL の全文検索、trigram、GIN index を前提に、検索対象テキストの正規化カラムを持つ設計がよい。

### 23.8 タブ分類はDBに入れない

HR / FINANCE / MARKETING / 管理部採用 の分類はSES業務の分類軸として使わない。DBに残すと将来的な検索や集計のノイズになるため、案件分類・メール分類・業務分類には採用しない。

### 23.9 MOCと将来本番の境界を明確にする

MOCでは、最初から全機能を実装しない。ただし、メール、案件、要員、提案、配信履歴の中心リレーションだけは後から壊しにくいように設計しておく。

最初に作るべきは、画面都合の仮テーブルではなく、メール原本、案件、要員、会社、提案、配信履歴の核になるテーブルである。
