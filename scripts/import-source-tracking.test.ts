import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const schemaPath = "prisma/schema.prisma";
const migrationPath = "prisma/migrations/20260604193000_import_source_tracking_foundation/migration.sql";
const docsPath = "docs/themes/source-tracking/import-source-tracking-schema.md";
const readmePath = "docs/themes/source-tracking/README.md";

const schema = readFileSync(schemaPath, "utf8");
const migration = readFileSync(migrationPath, "utf8");
const docs = readFileSync(docsPath, "utf8");
const readme = readFileSync(readmePath, "utf8");
const combined = [schema, migration, docs, readme].join("\n");

assert.equal(existsSync(migrationPath), true);

for (const expected of [
  "enum ImportSourceType",
  "enum ImportSourceStatus",
  "enum ImportRunMode",
  "enum ImportRunStatus",
  "enum SourceRecordType",
  "enum SourceRecordStatus",
  "enum EntitySourceLinkEntityType",
  "enum EntitySourceLinkType",
  "model ImportSource",
  "model ImportRun",
  "model SourceRecord",
  "model EntitySourceLink",
  "@@map(\"import_sources\")",
  "@@map(\"import_runs\")",
  "@@map(\"source_records\")",
  "@@map(\"entity_source_links\")",
]) {
  assert.ok(schema.includes(expected), `schema should include ${expected}`);
}

assert.match(schema, /entityType\s+EntitySourceLinkEntityType\s+@map\("entity_type"\)/);
assert.match(schema, /entityId\s+String\s+@map\("entity_id"\) @db\.Uuid/);
assert.match(schema, /@@unique\(\[sourceRecordId, entityType, entityId, linkType\]\)/);

assert.doesNotMatch(migration, /\bDROP\s+(TABLE|COLUMN|TYPE|INDEX)\b/i);
assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
assert.doesNotMatch(migration, /\bUPDATE\s+\S+\s+SET\b/i);
assert.doesNotMatch(migration, /\bINSERT\s+INTO\b/i);
assert.doesNotMatch(migration, /ALTER TABLE\s+"(?:projects|persons|mail_notifications|extraction_results|mail_entity_links)"/i);

for (const expected of [
  "CREATE TABLE \"import_sources\"",
  "CREATE TABLE \"import_runs\"",
  "CREATE TABLE \"source_records\"",
  "CREATE TABLE \"entity_source_links\"",
  "CREATE INDEX \"source_records_source_id_record_hash_idx\"",
  "CREATE INDEX \"entity_source_links_entity_type_entity_id_idx\"",
]) {
  assert.ok(migration.includes(expected), `migration should include ${expected}`);
}

for (const expected of [
  "Migration deploy is not run",
  "No DB writes are run",
  "No backfill is run",
  "No apply is run",
  "The existing Gmail flow remains unchanged",
  "entityType + entityId",
]) {
  assert.ok(docs.includes(expected), `docs should include ${expected}`);
}

assert.ok(readme.includes("import-source-tracking-schema.md"));

const forbiddenSecretPatterns = [
  /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
  /\bBearer\s+[A-Za-z0-9._-]+/i,
  /\b(?:DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|GMAIL_REFRESH_TOKEN|PASSWORD|TOKEN|API[_-]?KEY)\s*[:=]\s*["']?[^"',\s}]+/i,
  /-----BEGIN [A-Z ]+KEY-----/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
];

for (const pattern of forbiddenSecretPatterns) {
  assert.doesNotMatch(combined, pattern);
}

console.log("import source tracking schema tests passed");
