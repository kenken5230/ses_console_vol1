# Source Tracking Design

## Goal

The console should eventually import SES sales data from multiple sources into the same normalized database:

- Gmail
- Outlook or other mail providers
- CSV files
- Notion read-only sync
- Manual input
- Future source systems

This PR creates only inventory and design documentation. It does not execute a migration and does not change the Prisma schema.

## Design Principles

- Preserve existing Gmail behavior.
- Keep import preview and dry-run as the default.
- Require explicit owner approval before any apply/backfill path.
- Store enough traceability to answer where each entity came from.
- Separate raw source records from normalized entity data.
- Keep dedupe and review state visible before writes.
- Avoid storing unnecessary PII in logs, CLI output, PR text, or docs.

## Candidate Future Tables

### `import_sources`

Represents a configured source system.

Candidate columns:

- `id`
- `source_type`
- `display_name`
- `provider`
- `purpose`
- `is_active`
- `config_summary`
- `created_at`
- `updated_at`

Notes:

- `config_summary` must not store secrets.
- Actual credentials should stay in environment or secure secret storage.

### `import_runs`

Represents one read/import attempt from a source.

Candidate columns:

- `id`
- `import_source_id`
- `mode`
- `status`
- `requested_limit`
- `scanned_count`
- `candidate_count`
- `created_count`
- `updated_count`
- `skipped_count`
- `failed_count`
- `started_at`
- `finished_at`
- `error_summary`

Candidate statuses:

- `PREVIEW`
- `RUNNING`
- `SUCCESS`
- `FAILED`
- `CANCELLED`
- `NEEDS_REVIEW`

### `source_records`

Represents one source-side record before it becomes a normalized entity.

Candidate columns:

- `id`
- `import_source_id`
- `import_run_id`
- `external_record_id`
- `source_record_type`
- `source_record_hash`
- `normalized_payload`
- `dedupe_key`
- `dedupe_status`
- `review_status`
- `apply_status`
- `created_at`
- `updated_at`

Examples:

- Gmail mail record.
- CSV row.
- Notion database page.
- Manual draft payload.

### `entity_source_links`

Represents a generalized link from a source record to a normalized entity.

Candidate columns:

- `id`
- `source_record_id`
- `entity_type`
- `entity_id`
- `link_type`
- `confidence`
- `created_by_user_id`
- `created_at`

Candidate link types:

- `SOURCE`
- `EXTRACTED`
- `MATCHED_EXISTING`
- `RELATED`
- `REMEDIATED`
- `REJECTED`

## Candidate Indexes

Possible future indexes:

- `import_sources(source_type, is_active)`
- `import_runs(import_source_id, started_at)`
- `source_records(import_source_id, external_record_id)`
- `source_records(import_run_id)`
- `source_records(source_record_hash)`
- `source_records(dedupe_key)`
- `source_records(review_status, apply_status)`
- `entity_source_links(entity_type, entity_id)`
- `entity_source_links(source_record_id, link_type)`

## Candidate Unique Constraints

Possible future unique constraints:

- `import_sources(source_type, display_name)`
- `source_records(import_source_id, external_record_id)`
- `entity_source_links(source_record_id, entity_type, entity_id, link_type)`

These must be validated against existing Gmail data before implementation.

## Compatibility With Existing Gmail Data

Existing Gmail structures should not be broken:

- Do not remove `mail_notifications`.
- Do not remove `projects.source_mail_id`.
- Do not remove `persons.source_mail_id`.
- Do not remove or rewrite `extraction_results`.
- Do not remove or rewrite `mail_entity_links`.

Possible staged path:

1. Add generic source tracking tables.
2. Keep Gmail flow writing current tables.
3. Add read-only mapping from `mail_notifications` to future `source_records`.
4. Add count-only backfill preview.
5. Add supervised backfill only after owner approval.
6. Gradually let CSV/Notion/manual import use generic source tables first.

## Migration Risks

Risks to review before a future migration:

- Duplicate source records if external IDs are not stable.
- Incorrect dedupe keys across Gmail, CSV, and Notion.
- Conflicting source records pointing to the same project/person.
- Large backfills causing lock or runtime issues.
- Review/apply state drift between source records and final entities.
- Incomplete rollback if writes touch both generic links and entity fields.

## Rollback Proposal

Future rollback should be planned before any migration is applied:

- Additive table creation can usually roll back by dropping empty new tables.
- Backfilled rows should include run IDs to identify and reverse only rows from that run.
- Entity updates should not be part of the first schema migration.
- If entity updates become necessary, require dry-run, count-only, supervised apply, and owner approval.

## Backfill Policy

Backfill is likely needed to connect existing Gmail records to generic source records, but it must not happen in this PR.

Future backfill must support:

- count-only
- dry-run preview
- small internal chunks
- supervised apply
- failed-row stop
- post-count summary
- no full subject/body/email/name/company output

## CSV Import MVP Path

CSV import should start with a dry-run MVP:

1. Upload or local-read CSV.
2. Parse headers.
3. Normalize rows into source-record-like payloads.
4. Detect project/person candidate type.
5. Compute dedupe keys.
6. Output anonymized counts and sample row hashes.
7. Require owner approval before any apply path exists.

## Notion Read-only Sync Skeleton Path

Notion integration should start read-only:

1. Owner confirms API access and target database scope.
2. Sync only metadata and anonymized counts at first.
3. Map Notion pages to source records without entity writes.
4. Add dry-run candidate classification.
5. Add apply only after schema and review flow are approved.

## Deterministic Matching MVP Path

Matching should be deterministic before AI-assisted scoring:

- Reuse existing `source_mail_id`.
- Reuse `mail_entity_links`.
- Reuse `extraction_results.target_id`.
- Use stable source hashes and dedupe keys.
- Prefer review-needed state over silent creation when confidence is low.

## Owner Approvals Needed For Next PRs

Before future implementation PRs:

- Approve additive schema migration.
- Approve whether Gmail backfill is needed.
- Approve staging backfill dry-run commands.
- Approve CSV import field mapping.
- Approve Notion API scope and credentials handling.
- Approve rollback and supervised apply policy.

## Explicit Non-goals In This PR

- No migration files.
- No Prisma schema changes.
- No DB writes.
- No source backfill.
- No data deletion.
- No external API calls.
- No AI API calls.
- No email sending.
