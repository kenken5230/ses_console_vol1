CREATE TYPE "match_suggestion_status" AS ENUM ('suggested', 'needs_review', 'approved', 'rejected', 'archived');

CREATE TYPE "match_suggestion_review_event_type" AS ENUM ('saved', 'approved', 'rejected', 'archived', 'reopened', 'viewed_pii_detail');

CREATE TYPE "match_staleness_state" AS ENUM ('fresh', 'stale', 'unknown');

CREATE TYPE "match_duplicate_state" AS ENUM ('none', 'possible_duplicate', 'duplicate_confirmed');

CREATE TYPE "match_source_evidence_state" AS ENUM ('none', 'optional_present', 'optional_missing', 'required_missing', 'stale');

CREATE TYPE "match_warning_severity" AS ENUM ('none', 'low', 'medium', 'high', 'critical');

CREATE TYPE "match_attention_state" AS ENUM ('normal', 'needs_attention');

CREATE TYPE "match_downstream_readiness" AS ENUM ('ready', 'blocked', 'needs_check');

CREATE TYPE "match_suggestion_source_type" AS ENUM ('csv_import', 'manual', 'system', 'external');

CREATE TYPE "match_suggestion_evidence_role" AS ENUM ('primary', 'supporting', 'optional');

CREATE TABLE "match_suggestions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" VARCHAR(80) NOT NULL,
  "organization_id" VARCHAR(80),
  "project_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "suggestion_pair_key" VARCHAR(160) NOT NULL,
  "suggestion_revision_key" VARCHAR(160) NOT NULL,
  "status" "match_suggestion_status" NOT NULL DEFAULT 'suggested',
  "score" DECIMAL(8, 4),
  "score_band" VARCHAR(40),
  "system_reason_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "system_warning_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "warning_severity" "match_warning_severity" NOT NULL DEFAULT 'none',
  "staleness_state" "match_staleness_state" NOT NULL DEFAULT 'unknown',
  "duplicate_state" "match_duplicate_state" NOT NULL DEFAULT 'none',
  "source_evidence_state" "match_source_evidence_state" NOT NULL DEFAULT 'none',
  "attention_state" "match_attention_state" NOT NULL DEFAULT 'normal',
  "promotion_blockers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "promotion_eligible" BOOLEAN NOT NULL DEFAULT false,
  "downstream_readiness" "match_downstream_readiness" NOT NULL DEFAULT 'needs_check',
  "scoring_version" VARCHAR(80) NOT NULL,
  "taxonomy_version" VARCHAR(80) NOT NULL,
  "redaction_policy_version" VARCHAR(80) NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "last_reviewed_at" TIMESTAMPTZ(6),
  "last_reviewed_by_user_id" UUID,
  "lock_version" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "match_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_suggestion_review_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" VARCHAR(80) NOT NULL,
  "organization_id" VARCHAR(80),
  "suggestion_id" UUID NOT NULL,
  "event_type" "match_suggestion_review_event_type" NOT NULL,
  "from_status" "match_suggestion_status",
  "to_status" "match_suggestion_status",
  "actor_user_id" UUID NOT NULL,
  "reason_code" VARCHAR(80),
  "system_snapshot" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "request_id" VARCHAR(120) NOT NULL,
  "idempotency_key" VARCHAR(160),

  CONSTRAINT "match_suggestion_review_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_suggestion_source_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" VARCHAR(80) NOT NULL,
  "organization_id" VARCHAR(80),
  "suggestion_id" UUID NOT NULL,
  "source_type" "match_suggestion_source_type" NOT NULL,
  "source_record_id" VARCHAR(160) NOT NULL,
  "evidence_role" "match_suggestion_evidence_role" NOT NULL,
  "safe_summary" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "match_suggestion_source_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "match_suggestion_idempotency_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" VARCHAR(80) NOT NULL,
  "organization_id" VARCHAR(80),
  "idempotency_key" VARCHAR(160) NOT NULL,
  "request_fingerprint" VARCHAR(64) NOT NULL,
  "suggestion_id" UUID,
  "result_type" VARCHAR(40) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "match_suggestion_idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_suggestions_tenant_pair_key" ON "match_suggestions"("tenant_id", "suggestion_pair_key");
CREATE UNIQUE INDEX "match_suggestions_tenant_revision_key" ON "match_suggestions"("tenant_id", "suggestion_revision_key");
CREATE INDEX "match_suggestions_tenant_status_created_idx" ON "match_suggestions"("tenant_id", "status", "created_at");
CREATE INDEX "match_suggestions_tenant_status_reviewed_idx" ON "match_suggestions"("tenant_id", "status", "last_reviewed_at");
CREATE INDEX "match_suggestions_tenant_warning_idx" ON "match_suggestions"("tenant_id", "warning_severity");
CREATE INDEX "match_suggestions_tenant_stale_idx" ON "match_suggestions"("tenant_id", "staleness_state");
CREATE INDEX "match_suggestions_tenant_duplicate_idx" ON "match_suggestions"("tenant_id", "duplicate_state");
CREATE INDEX "match_suggestions_tenant_source_evidence_idx" ON "match_suggestions"("tenant_id", "source_evidence_state");
CREATE INDEX "match_suggestions_tenant_promotion_idx" ON "match_suggestions"("tenant_id", "promotion_eligible");
CREATE INDEX "match_suggestions_tenant_org_idx" ON "match_suggestions"("tenant_id", "organization_id");
CREATE INDEX "match_suggestions_project_idx" ON "match_suggestions"("project_id");
CREATE INDEX "match_suggestions_person_idx" ON "match_suggestions"("person_id");
CREATE INDEX "match_suggestions_created_by_idx" ON "match_suggestions"("created_by_user_id");
CREATE INDEX "match_suggestions_last_reviewed_by_idx" ON "match_suggestions"("last_reviewed_by_user_id");

CREATE INDEX "match_suggestion_events_tenant_suggestion_idx" ON "match_suggestion_review_events"("tenant_id", "suggestion_id", "created_at");
CREATE INDEX "match_suggestion_events_tenant_type_idx" ON "match_suggestion_review_events"("tenant_id", "event_type", "created_at");
CREATE INDEX "match_suggestion_events_tenant_actor_idx" ON "match_suggestion_review_events"("tenant_id", "actor_user_id", "created_at");
CREATE INDEX "match_suggestion_events_request_idx" ON "match_suggestion_review_events"("request_id");
CREATE UNIQUE INDEX "match_suggestion_events_tenant_idempotency_key" ON "match_suggestion_review_events"("tenant_id", "idempotency_key");

CREATE UNIQUE INDEX "match_suggestion_sources_unique_source_key" ON "match_suggestion_source_records"("tenant_id", "suggestion_id", "source_type", "source_record_id", "evidence_role");
CREATE INDEX "match_suggestion_sources_tenant_source_idx" ON "match_suggestion_source_records"("tenant_id", "source_type", "source_record_id");
CREATE INDEX "match_suggestion_sources_tenant_suggestion_idx" ON "match_suggestion_source_records"("tenant_id", "suggestion_id");
CREATE INDEX "match_suggestion_sources_tenant_org_idx" ON "match_suggestion_source_records"("tenant_id", "organization_id");

CREATE UNIQUE INDEX "match_suggestion_idempotency_tenant_key" ON "match_suggestion_idempotency_records"("tenant_id", "idempotency_key");
CREATE INDEX "match_suggestion_idempotency_tenant_suggestion_idx" ON "match_suggestion_idempotency_records"("tenant_id", "suggestion_id", "created_at");

ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id")
  REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_last_reviewed_by_user_id_fkey"
  FOREIGN KEY ("last_reviewed_by_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_project_id_fkey"
  FOREIGN KEY ("project_id")
  REFERENCES "projects"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_person_id_fkey"
  FOREIGN KEY ("person_id")
  REFERENCES "persons"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "match_suggestion_review_events"
  ADD CONSTRAINT "match_suggestion_review_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id")
  REFERENCES "users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "match_suggestion_review_events"
  ADD CONSTRAINT "match_suggestion_review_events_suggestion_id_fkey"
  FOREIGN KEY ("suggestion_id")
  REFERENCES "match_suggestions"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "match_suggestion_source_records"
  ADD CONSTRAINT "match_suggestion_source_records_suggestion_id_fkey"
  FOREIGN KEY ("suggestion_id")
  REFERENCES "match_suggestions"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "match_suggestion_idempotency_records"
  ADD CONSTRAINT "match_suggestion_idempotency_records_suggestion_id_fkey"
  FOREIGN KEY ("suggestion_id")
  REFERENCES "match_suggestions"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
