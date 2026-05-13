CREATE TYPE "mail_sync_run_mode" AS ENUM ('pipeline', 'sync', 'classify', 'extract');

CREATE TYPE "mail_sync_run_trigger" AS ENUM ('manual', 'cron', 'admin_secret', 'system');

CREATE TYPE "mail_sync_run_status" AS ENUM ('running', 'success', 'failed', 'already_running', 'cancelled');

CREATE TABLE "job_locks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_name" VARCHAR(120) NOT NULL,
  "locked_by" VARCHAR(120),
  "locked_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "job_locks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mail_sync_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_name" VARCHAR(120) NOT NULL,
  "mode" "mail_sync_run_mode" NOT NULL DEFAULT 'pipeline',
  "trigger" "mail_sync_run_trigger" NOT NULL DEFAULT 'manual',
  "source" VARCHAR(120),
  "triggered_by_user_id" UUID,
  "status" "mail_sync_run_status" NOT NULL DEFAULT 'running',
  "query" TEXT,
  "max_results" INTEGER,
  "fetched" INTEGER NOT NULL DEFAULT 0,
  "created" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "project_created" INTEGER NOT NULL DEFAULT 0,
  "person_created" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "duration_ms" INTEGER,
  "error_message" TEXT,
  "error_stack" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "mail_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_locks_job_name_key" ON "job_locks"("job_name");
CREATE INDEX "job_locks_expires_at_idx" ON "job_locks"("expires_at");
CREATE INDEX "mail_sync_runs_job_name_status_started_at_idx" ON "mail_sync_runs"("job_name", "status", "started_at");
CREATE INDEX "mail_sync_runs_triggered_by_user_id_idx" ON "mail_sync_runs"("triggered_by_user_id");

ALTER TABLE "mail_sync_runs"
  ADD CONSTRAINT "mail_sync_runs_triggered_by_user_id_fkey"
  FOREIGN KEY ("triggered_by_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
