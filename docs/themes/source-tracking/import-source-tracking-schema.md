# Import Source Tracking Schema Foundation

## Purpose

This schema foundation adds generic import/source traceability for SES Console without changing the existing Gmail extraction flow.

The goal is to track where a normalized project/person came from and how it moved through dry-run, review, apply, sync, audit, or future backfill flows.

Supported future source categories:

- `GMAIL`
- `CSV`
- `NOTION`
- `MANUAL`
- `OTHER_EMAIL`
- `API`
- `UNKNOWN`

## Model Overview

`import_sources`

- Represents a configured source system or logical source.
- Stores source type, display name, lifecycle status, and safe `configSummary`.
- `configSummary` must contain only non-secret metadata such as labels, enabled feature flags, redaction policy names, or source-safe counters.
- It must not contain credentials, tokens, refresh tokens, connection strings, passwords, mailbox addresses, or raw customer data.

`import_runs`

- Represents one import, sync, dry-run, apply, backfill, or audit run.
- Belongs to one `import_source`.
- Can optionally reference the user who triggered it.
- Stores aggregate `summary` and safe `errorSummary`.
- Does not store raw rows, full subjects, full bodies, or secret values.

`source_records`

- Represents one imported source item such as a CSV row, Gmail message pointer, Notion page pointer, manual input draft, or API item.
- Belongs to one `import_source`.
- Can optionally belong to one `import_run`.
- Stores `providerRecordId`, `recordHash`, `rawRef`, `normalizedPayload`, `redactedPreview`, review reasons, and warnings.
- `rawRef` is a safe pointer only, not raw full content.
- `redactedPreview` is the owner-facing review preview and must be anonymized/redacted.
- `normalizedPayload` may contain PII in a future apply flow, so future PRs must define retention, redaction, and review policies before writing production data.

`entity_source_links`

- Maps a `source_record` to a normalized SES entity.
- Supports links such as created-from, linked-to, duplicate-of, related-to, and review-candidate.
- Uses `entityType + entityId` instead of polymorphic foreign keys because Prisma does not support polymorphic FK constraints directly.

## Relationship Diagram

Text form:

```text
import_sources
  -> import_runs
  -> source_records
       -> entity_source_links
            -> PROJECT or PERSON by entityType + entityId

users
  -> import_runs.triggeredByUserId
```

Existing Gmail tables remain separate:

```text
mail_notifications
  -> extraction_results
  -> mail_entity_links
  -> projects.source_mail_id / persons.source_mail_id
```

Future bridging can create source records for existing Gmail mail only after a dry-run/count-only/supervised apply plan.

## Gmail Compatibility Plan

This PR does not remove or rewrite:

- `mail_notifications`
- `extraction_results`
- `mail_entity_links`
- `projects.source_mail_id`
- `persons.source_mail_id`

The existing Gmail flow remains unchanged.

The new source tracking foundation is for future CSV, Notion, Manual, API, and later Gmail bridging. A future Gmail bridge should first run read-only inventory/count-only checks, then create `source_records` only after owner-approved supervised apply.

## CSV Dry-run To Source Records Preview Flow

The CSV dry-run can now build this shape in memory with `--source-preview`:

```text
CSV file
  -> preview ImportSource(type=CSV, status=ACTIVE)
  -> preview ImportRun(mode=DRY_RUN, status=SUCCEEDED or PARTIAL)
  -> preview SourceRecord(recordHash, rawRef.rowIndex, redactedPreview, normalizedPayload)
  -> preview EntitySourceLink(linkType=CREATED_FROM, REVIEW_CANDIDATE, or DUPLICATE_OF)
```

The preview uses safe metadata only. It does not print raw CSV values, real customer/company/person names, emails, local file paths, subjects, bodies, tokens, connection strings, or secrets.

The current CSV dry-run remains read-only. `--source-preview` does not insert into `import_sources`, `import_runs`, `source_records`, or `entity_source_links`. Future source record writes must be a separate supervised apply PR with explicit apply gates.

## Notion Read-only Sync Future Flow

Future Notion integration should start with read-only sync:

```text
Notion database/page pointer
  -> import_sources(type=NOTION)
  -> import_runs(mode=SYNC or AUDIT)
  -> source_records(providerRecordId, recordHash, rawRef, redactedPreview)
```

No Notion API call is added by this PR. No Notion data is copied by this PR.

## Manual Input Future Flow

Manual entry can be tracked as:

```text
manual form draft
  -> import_sources(type=MANUAL)
  -> import_runs(mode=APPLY or AUDIT)
  -> source_records(recordType=PROJECT or PERSON)
  -> entity_source_links(linkType=CREATED_FROM)
```

Future manual apply flows should keep the same review/audit policy as CSV and Gmail.

## Entity Source Links Tradeoff

Chosen implementation:

- `entityType`
- `entityId`
- indexes on `entityType, entityId`
- unique key on `sourceRecordId, entityType, entityId, linkType`

Why this approach:

- It matches the existing `mail_entity_links` pattern.
- It avoids nullable `projectId/personId` columns and cross-column check constraints that Prisma cannot fully express.
- It keeps the new schema additive and does not require changes to `projects` or `persons`.

Tradeoff:

- The database cannot enforce that `entityId` exists in the matching entity table.
- Application code and validation scripts must verify entity existence before future apply.

## PII And Secret Policy

Never store secrets in:

- `configSummary`
- `summary`
- `errorSummary`
- `rawRef`
- `redactedPreview`
- docs
- tests

Do not store:

- connection strings
- access tokens
- refresh tokens
- passwords
- SMTP credentials
- API keys
- full email bodies
- full email subjects
- real customer names
- real company names
- real person names
- email addresses

`normalizedPayload` can become sensitive in future apply flows. Before production writes, a later PR must define retention, redaction, access control, and preview behavior.

## Migration Safety Policy

This PR is additive only:

- Migration file may be added.
- Migration deploy is not run.
- No DB writes are run.
- No backfill is run.
- No apply is run.
- No existing table drops.
- No column drops.
- No required column is added to populated existing tables.
- No existing Gmail tracking is rewritten.

The migration creates only new enums, new tables, indexes, and foreign keys from new tables to existing safe references.

## Next PR Plan

Recommended next PRs:

- Source tracking read-only validation CLI.
- CSV dry-run to `source_records` preview integration.
- Notion inventory/read-only sync design.
- Supervised source record apply only after owner approval.
- Gmail bridge count-only/dry-run before any backfill.
