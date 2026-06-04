-- CreateEnum
CREATE TYPE "import_source_type" AS ENUM ('gmail', 'csv', 'notion', 'manual', 'other_email', 'api', 'unknown');

-- CreateEnum
CREATE TYPE "import_source_status" AS ENUM ('active', 'disabled', 'archived');

-- CreateEnum
CREATE TYPE "import_run_mode" AS ENUM ('dry_run', 'apply', 'backfill', 'sync', 'audit');

-- CreateEnum
CREATE TYPE "import_run_status" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'partial', 'cancelled');

-- CreateEnum
CREATE TYPE "source_record_type" AS ENUM ('project', 'person', 'other', 'excluded', 'unknown');

-- CreateEnum
CREATE TYPE "source_record_status" AS ENUM ('new', 'linked', 'skipped', 'needs_review', 'applied', 'archived');

-- CreateEnum
CREATE TYPE "entity_source_link_entity_type" AS ENUM ('project', 'person');

-- CreateEnum
CREATE TYPE "entity_source_link_type" AS ENUM ('created_from', 'linked_to', 'duplicate_of', 'related_to', 'review_candidate');

-- CreateTable
CREATE TABLE "import_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "type" "import_source_type" NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "status" "import_source_status" NOT NULL DEFAULT 'active',
  "config_summary" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "import_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL,
  "mode" "import_run_mode" NOT NULL DEFAULT 'dry_run',
  "status" "import_run_status" NOT NULL DEFAULT 'pending',
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "triggered_by_user_id" UUID,
  "summary" JSONB,
  "error_summary" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL,
  "import_run_id" UUID,
  "provider_record_id" VARCHAR(512),
  "record_type" "source_record_type" NOT NULL DEFAULT 'unknown',
  "record_hash" CHAR(64) NOT NULL,
  "raw_ref" JSONB,
  "normalized_payload" JSONB,
  "redacted_preview" JSONB,
  "status" "source_record_status" NOT NULL DEFAULT 'new',
  "review_reasons" JSONB,
  "warnings" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "source_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_source_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_record_id" UUID NOT NULL,
  "entity_type" "entity_source_link_entity_type" NOT NULL,
  "entity_id" UUID NOT NULL,
  "link_type" "entity_source_link_type" NOT NULL DEFAULT 'linked_to',
  "confidence" DECIMAL(5, 4),
  "reasons" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "entity_source_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_sources_type_status_idx" ON "import_sources"("type", "status");

-- CreateIndex
CREATE INDEX "import_sources_status_idx" ON "import_sources"("status");

-- CreateIndex
CREATE INDEX "import_sources_type_name_idx" ON "import_sources"("type", "name");

-- CreateIndex
CREATE INDEX "import_runs_source_id_status_created_at_idx" ON "import_runs"("source_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "import_runs_source_id_mode_created_at_idx" ON "import_runs"("source_id", "mode", "created_at");

-- CreateIndex
CREATE INDEX "import_runs_triggered_by_user_id_created_at_idx" ON "import_runs"("triggered_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "import_runs_status_started_at_idx" ON "import_runs"("status", "started_at");

-- CreateIndex
CREATE INDEX "source_records_source_id_record_hash_idx" ON "source_records"("source_id", "record_hash");

-- CreateIndex
CREATE INDEX "source_records_source_id_provider_record_id_idx" ON "source_records"("source_id", "provider_record_id");

-- CreateIndex
CREATE INDEX "source_records_import_run_id_status_idx" ON "source_records"("import_run_id", "status");

-- CreateIndex
CREATE INDEX "source_records_record_type_status_idx" ON "source_records"("record_type", "status");

-- CreateIndex
CREATE INDEX "source_records_status_created_at_idx" ON "source_records"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "entity_source_links_source_record_id_entity_type_entity_id_link_type_key" ON "entity_source_links"("source_record_id", "entity_type", "entity_id", "link_type");

-- CreateIndex
CREATE INDEX "entity_source_links_source_record_id_idx" ON "entity_source_links"("source_record_id");

-- CreateIndex
CREATE INDEX "entity_source_links_entity_type_entity_id_idx" ON "entity_source_links"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "entity_source_links_link_type_created_at_idx" ON "entity_source_links"("link_type", "created_at");

-- AddForeignKey
ALTER TABLE "import_runs"
  ADD CONSTRAINT "import_runs_source_id_fkey"
  FOREIGN KEY ("source_id")
  REFERENCES "import_sources"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_runs"
  ADD CONSTRAINT "import_runs_triggered_by_user_id_fkey"
  FOREIGN KEY ("triggered_by_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records"
  ADD CONSTRAINT "source_records_source_id_fkey"
  FOREIGN KEY ("source_id")
  REFERENCES "import_sources"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_records"
  ADD CONSTRAINT "source_records_import_run_id_fkey"
  FOREIGN KEY ("import_run_id")
  REFERENCES "import_runs"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_source_links"
  ADD CONSTRAINT "entity_source_links_source_record_id_fkey"
  FOREIGN KEY ("source_record_id")
  REFERENCES "source_records"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
