-- CreateEnum
CREATE TYPE "match_suggestion_status" AS ENUM ('suggested', 'needs_review', 'approved', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "match_suggestion_review_action" AS ENUM ('created', 'saved', 'review_requested', 'approved', 'rejected', 'archived', 'reopened');

-- CreateEnum
CREATE TYPE "match_suggestion_source_record_role" AS ENUM ('project_evidence', 'person_evidence', 'match_evidence');

-- CreateTable
CREATE TABLE "match_suggestions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "status" "match_suggestion_status" NOT NULL DEFAULT 'suggested',
  "score" INTEGER NOT NULL,
  "score_band" VARCHAR(24) NOT NULL,
  "scoring_version" VARCHAR(80) NOT NULL,
  "source_snapshot_hash" CHAR(64) NOT NULL,
  "suggestion_key" CHAR(64) NOT NULL,
  "attention_state" VARCHAR(40),
  "warning_count" INTEGER NOT NULL DEFAULT 0,
  "review_reason_count" INTEGER NOT NULL DEFAULT 0,
  "reason_codes" JSONB,
  "warning_codes" JSONB,
  "review_flags" JSONB,
  "compatibility_summary" JSONB,
  "skill_overlap_summary" JSONB,
  "redacted_preview" JSONB,
  "created_by_user_id" UUID,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "match_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_suggestion_review_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "match_suggestion_id" UUID NOT NULL,
  "action" "match_suggestion_review_action" NOT NULL,
  "from_status" "match_suggestion_status",
  "to_status" "match_suggestion_status",
  "actor_user_id" UUID,
  "reason_codes" JSONB,
  "note_redacted" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "match_suggestion_review_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_suggestion_source_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "match_suggestion_id" UUID NOT NULL,
  "source_record_id" UUID NOT NULL,
  "role" "match_suggestion_source_record_role" NOT NULL DEFAULT 'match_evidence',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "match_suggestion_source_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_suggestions_suggestion_key_key" ON "match_suggestions"("suggestion_key");

-- CreateIndex
CREATE UNIQUE INDEX "match_suggestions_pair_snapshot_key" ON "match_suggestions"("project_id", "person_id", "scoring_version", "source_snapshot_hash");

-- CreateIndex
CREATE INDEX "match_suggestions_status_created_at_idx" ON "match_suggestions"("status", "created_at");

-- CreateIndex
CREATE INDEX "match_suggestions_project_id_status_idx" ON "match_suggestions"("project_id", "status");

-- CreateIndex
CREATE INDEX "match_suggestions_person_id_status_idx" ON "match_suggestions"("person_id", "status");

-- CreateIndex
CREATE INDEX "match_suggestions_score_band_score_idx" ON "match_suggestions"("score_band", "score");

-- CreateIndex
CREATE INDEX "match_suggestions_attention_state_status_idx" ON "match_suggestions"("attention_state", "status");

-- CreateIndex
CREATE INDEX "match_suggestions_created_by_user_id_created_at_idx" ON "match_suggestions"("created_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "match_suggestions_reviewed_by_user_id_reviewed_at_idx" ON "match_suggestions"("reviewed_by_user_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "match_suggestion_events_suggestion_created_at_idx" ON "match_suggestion_review_events"("match_suggestion_id", "created_at");

-- CreateIndex
CREATE INDEX "match_suggestion_events_actor_created_at_idx" ON "match_suggestion_review_events"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "match_suggestion_events_action_created_at_idx" ON "match_suggestion_review_events"("action", "created_at");

-- CreateIndex
CREATE INDEX "match_suggestion_events_to_status_created_at_idx" ON "match_suggestion_review_events"("to_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "match_suggestion_source_records_unique" ON "match_suggestion_source_records"("match_suggestion_id", "source_record_id", "role");

-- CreateIndex
CREATE INDEX "match_suggestion_source_records_suggestion_idx" ON "match_suggestion_source_records"("match_suggestion_id");

-- CreateIndex
CREATE INDEX "match_suggestion_source_records_source_role_idx" ON "match_suggestion_source_records"("source_record_id", "role");

-- AddForeignKey
ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_project_id_fkey"
  FOREIGN KEY ("project_id")
  REFERENCES "projects"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_person_id_fkey"
  FOREIGN KEY ("person_id")
  REFERENCES "persons"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestions"
  ADD CONSTRAINT "match_suggestions_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestion_review_events"
  ADD CONSTRAINT "match_suggestion_review_events_match_suggestion_id_fkey"
  FOREIGN KEY ("match_suggestion_id")
  REFERENCES "match_suggestions"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestion_review_events"
  ADD CONSTRAINT "match_suggestion_review_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestion_source_records"
  ADD CONSTRAINT "match_suggestion_source_records_match_suggestion_id_fkey"
  FOREIGN KEY ("match_suggestion_id")
  REFERENCES "match_suggestions"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_suggestion_source_records"
  ADD CONSTRAINT "match_suggestion_source_records_source_record_id_fkey"
  FOREIGN KEY ("source_record_id")
  REFERENCES "source_records"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
