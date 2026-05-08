-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'manager', 'sales', 'viewer', 'system');

-- CreateEnum
CREATE TYPE "mail_provider" AS ENUM ('gmail', 'outlook', 'other');

-- CreateEnum
CREATE TYPE "mail_account_purpose" AS ENUM ('inbound_shared', 'sales_outbound', 'personal_sales', 'system');

-- CreateEnum
CREATE TYPE "mail_category" AS ENUM ('project_intro', 'person_intro', 'seminar', 'newsletter', 'sales_ad', 'normal_contact', 'other', 'needs_review', 'excluded');

-- CreateEnum
CREATE TYPE "classification_source" AS ENUM ('rule', 'ai', 'manual', 'system', 'unknown');

-- CreateEnum
CREATE TYPE "mail_filter_rule_type" AS ENUM ('keyword', 'domain', 'sender', 'subject_regex', 'body_regex', 'ai_hint');

-- CreateEnum
CREATE TYPE "company_trade_status" AS ENUM ('unknown', 'ok', 'ng', 'suspended', 'needs_review');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('draft', 'open', 'paused', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "project_company_role_type" AS ENUM ('upper_company', 'end_user', 'prime_contractor', 'secondary_contractor', 'tertiary_contractor', 'account_manager_company', 'proposal_target', 'other');

-- CreateEnum
CREATE TYPE "project_skill_type" AS ENUM ('required', 'preferred', 'used_technology', 'other');

-- CreateEnum
CREATE TYPE "project_tag_type" AS ENUM ('focus', 'filter', 'manual', 'ai', 'other');

-- CreateEnum
CREATE TYPE "remote_type" AS ENUM ('unknown', 'onsite', 'hybrid', 'remote', 'full_remote');

-- CreateEnum
CREATE TYPE "contract_type" AS ENUM ('unknown', 'semi_delegation', 'dispatch', 'contract', 'other');

-- CreateEnum
CREATE TYPE "foreign_nationality_policy" AS ENUM ('unknown', 'need_confirmation', 'acceptable', 'not_acceptable');

-- CreateEnum
CREATE TYPE "sales_interview_attendance_policy" AS ENUM ('need_confirmation', 'required', 'not_required');

-- CreateEnum
CREATE TYPE "person_status" AS ENUM ('available', 'proposing', 'joined', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "proposal_status" AS ENUM ('proposed', 'entered', 'interview_scheduling', 'interviewed', 'offered', 'rejected', 'joined', 'withdrawn');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('draft', 'sent', 'failed', 'bounced', 'replied', 'unknown');

-- CreateEnum
CREATE TYPE "search_target_scope" AS ENUM ('projects', 'mails', 'persons', 'proposals', 'companies', 'company_contacts', 'distribution_logs');

-- CreateEnum
CREATE TYPE "extraction_target_type" AS ENUM ('mail', 'project', 'person', 'proposal', 'company', 'company_contact', 'distribution_log');

-- CreateEnum
CREATE TYPE "extraction_type" AS ENUM ('classification', 'project_extraction', 'person_extraction', 'company_extraction', 'other');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'approved', 'rejected', 'needs_review');

-- CreateEnum
CREATE TYPE "mail_entity_type" AS ENUM ('project', 'person', 'proposal', 'distribution_log', 'company', 'company_contact');

-- CreateEnum
CREATE TYPE "mail_entity_link_type" AS ENUM ('source', 'extracted', 'related', 'reply', 'distribution');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'sales',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_accounts" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "provider" "mail_provider" NOT NULL DEFAULT 'gmail',
    "display_name" VARCHAR(120),
    "purpose" "mail_account_purpose" NOT NULL DEFAULT 'inbound_shared',
    "is_primary_ingest" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_notifications" (
    "id" UUID NOT NULL,
    "source_account_id" UUID NOT NULL,
    "external_message_id" VARCHAR(512) NOT NULL,
    "external_thread_id" VARCHAR(512),
    "in_reply_to" VARCHAR(512),
    "references_header" TEXT,
    "message_date" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from_email" VARCHAR(255),
    "from_name" VARCHAR(255),
    "to_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "body_text" TEXT,
    "body_html" TEXT,
    "body_hash" CHAR(64),
    "normalized_subject" TEXT,
    "normalized_body" TEXT,
    "category" "mail_category" NOT NULL DEFAULT 'needs_review',
    "category_confidence" DECIMAL(5,4),
    "is_reply" BOOLEAN NOT NULL DEFAULT false,
    "is_excluded" BOOLEAN NOT NULL DEFAULT false,
    "exclude_reason" TEXT,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "classified_by" "classification_source",
    "classification_version" VARCHAR(80),
    "source_raw_headers" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mail_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_attachments" (
    "id" UUID NOT NULL,
    "mail_notification_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120),
    "file_size" INTEGER,
    "content_hash" CHAR(64),
    "storage_key" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_filter_rules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "rule_type" "mail_filter_rule_type" NOT NULL,
    "target_field" VARCHAR(80) NOT NULL,
    "pattern" TEXT NOT NULL,
    "category" "mail_category",
    "set_is_excluded" BOOLEAN,
    "exclude_reason" TEXT,
    "set_needs_review" BOOLEAN,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mail_filter_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "normalized_name" VARCHAR(255) NOT NULL,
    "corporate_number" VARCHAR(32),
    "website_url" TEXT,
    "main_email_domain" VARCHAR(255),
    "trade_status" "company_trade_status" NOT NULL DEFAULT 'unknown',
    "tdb_score" DECIMAL(8,2),
    "bankruptcy_risk_score" DECIMAL(8,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_aliases" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "alias_name" VARCHAR(255) NOT NULL,
    "normalized_alias_name" VARCHAR(255) NOT NULL,
    "source" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_contacts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(80),
    "department" VARCHAR(160),
    "position" VARCHAR(160),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "contact_policy" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "project_code" VARCHAR(80),
    "title" VARCHAR(255) NOT NULL,
    "summary" TEXT,
    "work_description" TEXT,
    "business_description" TEXT,
    "source_mail_id" UUID,
    "created_by_user_id" UUID,
    "owner_user_id" UUID,
    "status" "project_status" NOT NULL DEFAULT 'draft',
    "priority_level" INTEGER,
    "is_focus" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_conditions" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "unit_price_min" INTEGER,
    "unit_price_max" INTEGER,
    "unit_price_text" VARCHAR(120),
    "upper_amount_min" INTEGER,
    "upper_amount_max" INTEGER,
    "commission_fee_amount" INTEGER,
    "am_project_fee_amount" INTEGER,
    "bankruptcy_prediction_fee_amount" INTEGER,
    "recruiting_count" INTEGER,
    "workload" VARCHAR(120),
    "start_month" DATE,
    "expected_work_days_per_week" INTEGER,
    "settlement_time_min" INTEGER,
    "settlement_time_max" INTEGER,
    "fixed_work_start_time" TIME(0),
    "fixed_work_end_time" TIME(0),
    "core_time_start" TIME(0),
    "core_time_end" TIME(0),
    "work_location_text" TEXT,
    "prefecture" VARCHAR(20),
    "remote_type" "remote_type" NOT NULL DEFAULT 'unknown',
    "work_environment" TEXT,
    "contract_type" "contract_type" NOT NULL DEFAULT 'unknown',
    "foreign_nationality_policy" "foreign_nationality_policy" NOT NULL DEFAULT 'unknown',
    "age_condition" VARCHAR(120),
    "site_atmosphere" TEXT,
    "dress_code" TEXT,
    "hair_nail_rule" TEXT,
    "interview_count" INTEGER,
    "sales_interview_attendance_required" "sales_interview_attendance_policy",
    "am_contact_required" BOOLEAN,
    "am_contact_name" VARCHAR(160),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_company_roles" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "company_contact_id" UUID,
    "role" "project_company_role_type" NOT NULL,
    "role_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_skills" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "skill_name" VARCHAR(160) NOT NULL,
    "skill_type" "project_skill_type" NOT NULL DEFAULT 'other',
    "years_required" DECIMAL(4,1),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tags" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "tag" VARCHAR(120) NOT NULL,
    "tag_type" "project_tag_type" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "person_code" VARCHAR(80),
    "name" VARCHAR(160),
    "initials" VARCHAR(40),
    "source_mail_id" UUID,
    "owner_company_id" UUID,
    "owner_contact_id" UUID,
    "summary" TEXT,
    "career_summary" TEXT,
    "desired_unit_price" INTEGER,
    "available_from" DATE,
    "preferred_location" TEXT,
    "remote_preference" VARCHAR(120),
    "age" INTEGER,
    "nationality" VARCHAR(80),
    "status" "person_status" NOT NULL DEFAULT 'available',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_skills" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "skill_name" VARCHAR(160) NOT NULL,
    "years" DECIMAL(4,1),
    "level" VARCHAR(80),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "target_company_id" UUID NOT NULL,
    "target_contact_id" UUID,
    "sales_account_id" UUID NOT NULL,
    "owner_user_id" UUID,
    "source_mail_id" UUID,
    "latest_distribution_log_id" UUID,
    "status" "proposal_status" NOT NULL DEFAULT 'proposed',
    "status_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proposed_at" TIMESTAMPTZ(6),
    "entered_at" TIMESTAMPTZ(6),
    "interview_scheduled_at" TIMESTAMPTZ(6),
    "interviewed_at" TIMESTAMPTZ(6),
    "offered_at" TIMESTAMPTZ(6),
    "joined_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "withdrawn_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_status_histories" (
    "id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "from_status" "proposal_status",
    "to_status" "proposal_status" NOT NULL,
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "notes" TEXT,

    CONSTRAINT "proposal_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_logs" (
    "id" UUID NOT NULL,
    "mail_account_id" UUID NOT NULL,
    "sender_user_id" UUID,
    "target_company_id" UUID NOT NULL,
    "target_contact_id" UUID,
    "project_id" UUID,
    "person_id" UUID,
    "proposal_id" UUID,
    "external_message_id" VARCHAR(512),
    "external_thread_id" VARCHAR(512),
    "subject" TEXT,
    "body_hash" CHAR(64),
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_status" "delivery_status" NOT NULL DEFAULT 'unknown',
    "excluded_from_resend" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_histories" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "target_scope" "search_target_scope" NOT NULL,
    "query_text" TEXT,
    "filters" JSONB,
    "sort_key" VARCHAR(120),
    "result_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extraction_results" (
    "id" UUID NOT NULL,
    "mail_notification_id" UUID NOT NULL,
    "target_type" "extraction_target_type" NOT NULL,
    "target_id" UUID,
    "extraction_type" "extraction_type" NOT NULL,
    "model_name" VARCHAR(120),
    "model_version" VARCHAR(80),
    "prompt_version" VARCHAR(80),
    "confidence" DECIMAL(5,4),
    "raw_result" JSONB,
    "normalized_result" JSONB,
    "review_status" "review_status" NOT NULL DEFAULT 'pending',
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "extraction_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_entity_links" (
    "id" UUID NOT NULL,
    "mail_notification_id" UUID NOT NULL,
    "entity_type" "mail_entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "link_type" "mail_entity_link_type" NOT NULL DEFAULT 'related',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_entity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID,
    "before_data" JSONB,
    "after_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mail_accounts_email_key" ON "mail_accounts"("email");

-- CreateIndex
CREATE INDEX "mail_accounts_purpose_is_active_idx" ON "mail_accounts"("purpose", "is_active");

-- CreateIndex
CREATE INDEX "mail_notifications_source_account_id_external_thread_id_idx" ON "mail_notifications"("source_account_id", "external_thread_id");

-- CreateIndex
CREATE INDEX "mail_notifications_category_is_excluded_needs_review_idx" ON "mail_notifications"("category", "is_excluded", "needs_review");

-- CreateIndex
CREATE INDEX "mail_notifications_received_at_idx" ON "mail_notifications"("received_at");

-- CreateIndex
CREATE INDEX "mail_notifications_is_reply_idx" ON "mail_notifications"("is_reply");

-- CreateIndex
CREATE INDEX "mail_notifications_from_email_idx" ON "mail_notifications"("from_email");

-- CreateIndex
CREATE UNIQUE INDEX "mail_notifications_source_account_id_external_message_id_key" ON "mail_notifications"("source_account_id", "external_message_id");

-- CreateIndex
CREATE INDEX "mail_attachments_mail_notification_id_idx" ON "mail_attachments"("mail_notification_id");

-- CreateIndex
CREATE INDEX "mail_attachments_content_hash_idx" ON "mail_attachments"("content_hash");

-- CreateIndex
CREATE INDEX "mail_filter_rules_is_active_priority_idx" ON "mail_filter_rules"("is_active", "priority");

-- CreateIndex
CREATE INDEX "mail_filter_rules_category_idx" ON "mail_filter_rules"("category");

-- CreateIndex
CREATE UNIQUE INDEX "companies_corporate_number_key" ON "companies"("corporate_number");

-- CreateIndex
CREATE INDEX "companies_normalized_name_idx" ON "companies"("normalized_name");

-- CreateIndex
CREATE INDEX "companies_main_email_domain_idx" ON "companies"("main_email_domain");

-- CreateIndex
CREATE INDEX "companies_trade_status_idx" ON "companies"("trade_status");

-- CreateIndex
CREATE INDEX "company_aliases_company_id_idx" ON "company_aliases"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_aliases_normalized_alias_name_key" ON "company_aliases"("normalized_alias_name");

-- CreateIndex
CREATE INDEX "company_contacts_company_id_is_active_idx" ON "company_contacts"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "company_contacts_email_idx" ON "company_contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_code_key" ON "projects"("project_code");

-- CreateIndex
CREATE INDEX "projects_status_created_at_idx" ON "projects"("status", "created_at");

-- CreateIndex
CREATE INDEX "projects_source_mail_id_idx" ON "projects"("source_mail_id");

-- CreateIndex
CREATE INDEX "projects_owner_user_id_idx" ON "projects"("owner_user_id");

-- CreateIndex
CREATE INDEX "projects_is_focus_idx" ON "projects"("is_focus");

-- CreateIndex
CREATE UNIQUE INDEX "project_conditions_project_id_key" ON "project_conditions"("project_id");

-- CreateIndex
CREATE INDEX "project_conditions_start_month_idx" ON "project_conditions"("start_month");

-- CreateIndex
CREATE INDEX "project_conditions_unit_price_min_unit_price_max_idx" ON "project_conditions"("unit_price_min", "unit_price_max");

-- CreateIndex
CREATE INDEX "project_conditions_prefecture_idx" ON "project_conditions"("prefecture");

-- CreateIndex
CREATE INDEX "project_conditions_remote_type_idx" ON "project_conditions"("remote_type");

-- CreateIndex
CREATE INDEX "project_conditions_contract_type_idx" ON "project_conditions"("contract_type");

-- CreateIndex
CREATE INDEX "project_conditions_foreign_nationality_policy_idx" ON "project_conditions"("foreign_nationality_policy");

-- CreateIndex
CREATE INDEX "project_company_roles_project_id_role_idx" ON "project_company_roles"("project_id", "role");

-- CreateIndex
CREATE INDEX "project_company_roles_company_id_role_idx" ON "project_company_roles"("company_id", "role");

-- CreateIndex
CREATE INDEX "project_company_roles_company_contact_id_idx" ON "project_company_roles"("company_contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_company_roles_project_id_company_id_role_key" ON "project_company_roles"("project_id", "company_id", "role");

-- CreateIndex
CREATE INDEX "project_skills_project_id_skill_type_idx" ON "project_skills"("project_id", "skill_type");

-- CreateIndex
CREATE INDEX "project_skills_skill_name_idx" ON "project_skills"("skill_name");

-- CreateIndex
CREATE INDEX "project_tags_tag_idx" ON "project_tags"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "project_tags_project_id_tag_tag_type_key" ON "project_tags"("project_id", "tag", "tag_type");

-- CreateIndex
CREATE UNIQUE INDEX "persons_person_code_key" ON "persons"("person_code");

-- CreateIndex
CREATE INDEX "persons_source_mail_id_idx" ON "persons"("source_mail_id");

-- CreateIndex
CREATE INDEX "persons_owner_company_id_idx" ON "persons"("owner_company_id");

-- CreateIndex
CREATE INDEX "persons_owner_contact_id_idx" ON "persons"("owner_contact_id");

-- CreateIndex
CREATE INDEX "persons_status_idx" ON "persons"("status");

-- CreateIndex
CREATE INDEX "persons_available_from_idx" ON "persons"("available_from");

-- CreateIndex
CREATE INDEX "person_skills_person_id_idx" ON "person_skills"("person_id");

-- CreateIndex
CREATE INDEX "person_skills_skill_name_idx" ON "person_skills"("skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_latest_distribution_log_id_key" ON "proposals"("latest_distribution_log_id");

-- CreateIndex
CREATE INDEX "proposals_person_id_project_id_idx" ON "proposals"("person_id", "project_id");

-- CreateIndex
CREATE INDEX "proposals_person_id_project_id_target_company_id_sales_acco_idx" ON "proposals"("person_id", "project_id", "target_company_id", "sales_account_id");

-- CreateIndex
CREATE INDEX "proposals_project_id_status_idx" ON "proposals"("project_id", "status");

-- CreateIndex
CREATE INDEX "proposals_target_company_id_status_idx" ON "proposals"("target_company_id", "status");

-- CreateIndex
CREATE INDEX "proposals_sales_account_id_status_idx" ON "proposals"("sales_account_id", "status");

-- CreateIndex
CREATE INDEX "proposals_source_mail_id_idx" ON "proposals"("source_mail_id");

-- CreateIndex
CREATE INDEX "proposal_status_histories_proposal_id_changed_at_idx" ON "proposal_status_histories"("proposal_id", "changed_at");

-- CreateIndex
CREATE INDEX "proposal_status_histories_to_status_idx" ON "proposal_status_histories"("to_status");

-- CreateIndex
CREATE INDEX "distribution_logs_target_company_id_target_contact_id_sent__idx" ON "distribution_logs"("target_company_id", "target_contact_id", "sent_at");

-- CreateIndex
CREATE INDEX "distribution_logs_project_id_sent_at_idx" ON "distribution_logs"("project_id", "sent_at");

-- CreateIndex
CREATE INDEX "distribution_logs_person_id_sent_at_idx" ON "distribution_logs"("person_id", "sent_at");

-- CreateIndex
CREATE INDEX "distribution_logs_proposal_id_sent_at_idx" ON "distribution_logs"("proposal_id", "sent_at");

-- CreateIndex
CREATE INDEX "distribution_logs_mail_account_id_external_thread_id_idx" ON "distribution_logs"("mail_account_id", "external_thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_logs_mail_account_id_external_message_id_key" ON "distribution_logs"("mail_account_id", "external_message_id");

-- CreateIndex
CREATE INDEX "search_histories_user_id_created_at_idx" ON "search_histories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "search_histories_target_scope_created_at_idx" ON "search_histories"("target_scope", "created_at");

-- CreateIndex
CREATE INDEX "extraction_results_mail_notification_id_extraction_type_idx" ON "extraction_results"("mail_notification_id", "extraction_type");

-- CreateIndex
CREATE INDEX "extraction_results_target_type_target_id_idx" ON "extraction_results"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "extraction_results_review_status_idx" ON "extraction_results"("review_status");

-- CreateIndex
CREATE INDEX "mail_entity_links_entity_type_entity_id_idx" ON "mail_entity_links"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_entity_links_mail_notification_id_entity_type_entity_i_key" ON "mail_entity_links"("mail_notification_id", "entity_type", "entity_id", "link_type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "mail_notifications" ADD CONSTRAINT "mail_notifications_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "mail_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_attachments" ADD CONSTRAINT "mail_attachments_mail_notification_id_fkey" FOREIGN KEY ("mail_notification_id") REFERENCES "mail_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_filter_rules" ADD CONSTRAINT "mail_filter_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_aliases" ADD CONSTRAINT "company_aliases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_mail_id_fkey" FOREIGN KEY ("source_mail_id") REFERENCES "mail_notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_conditions" ADD CONSTRAINT "project_conditions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_company_roles" ADD CONSTRAINT "project_company_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_company_roles" ADD CONSTRAINT "project_company_roles_company_contact_id_fkey" FOREIGN KEY ("company_contact_id") REFERENCES "company_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_company_roles" ADD CONSTRAINT "project_company_roles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_owner_company_id_fkey" FOREIGN KEY ("owner_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_owner_contact_id_fkey" FOREIGN KEY ("owner_contact_id") REFERENCES "company_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_source_mail_id_fkey" FOREIGN KEY ("source_mail_id") REFERENCES "mail_notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_skills" ADD CONSTRAINT "person_skills_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_latest_distribution_log_id_fkey" FOREIGN KEY ("latest_distribution_log_id") REFERENCES "distribution_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_sales_account_id_fkey" FOREIGN KEY ("sales_account_id") REFERENCES "mail_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_source_mail_id_fkey" FOREIGN KEY ("source_mail_id") REFERENCES "mail_notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_target_company_id_fkey" FOREIGN KEY ("target_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_target_contact_id_fkey" FOREIGN KEY ("target_contact_id") REFERENCES "company_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_status_histories" ADD CONSTRAINT "proposal_status_histories_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_status_histories" ADD CONSTRAINT "proposal_status_histories_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_mail_account_id_fkey" FOREIGN KEY ("mail_account_id") REFERENCES "mail_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_target_company_id_fkey" FOREIGN KEY ("target_company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_logs" ADD CONSTRAINT "distribution_logs_target_contact_id_fkey" FOREIGN KEY ("target_contact_id") REFERENCES "company_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_histories" ADD CONSTRAINT "search_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_mail_notification_id_fkey" FOREIGN KEY ("mail_notification_id") REFERENCES "mail_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_entity_links" ADD CONSTRAINT "mail_entity_links_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_entity_links" ADD CONSTRAINT "mail_entity_links_mail_notification_id_fkey" FOREIGN KEY ("mail_notification_id") REFERENCES "mail_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
