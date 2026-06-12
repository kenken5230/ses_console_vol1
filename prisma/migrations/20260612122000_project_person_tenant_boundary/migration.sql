-- Add tenant ownership keys to Project and Person so saved match suggestions
-- can verify project/person ownership before persistence.
--
-- Existing data is assigned to the default tenant to preserve current behavior.
-- Future tenant-specific imports or creation flows can set tenant_id explicitly.

ALTER TABLE "projects"
  ADD COLUMN "tenant_id" VARCHAR(80) NOT NULL DEFAULT 'default';

ALTER TABLE "persons"
  ADD COLUMN "tenant_id" VARCHAR(80) NOT NULL DEFAULT 'default';

CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");

CREATE INDEX "persons_tenant_id_idx" ON "persons"("tenant_id");
