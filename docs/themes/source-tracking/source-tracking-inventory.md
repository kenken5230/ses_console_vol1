# Source Tracking Inventory

## Purpose

This inventory documents the current source tracking shape before adding a generic import foundation for Gmail, CSV, Notion, manual input, and other mail providers.

This PR is intentionally read-only:

- No DB writes.
- No Prisma schema changes.
- No migration files.
- No `prisma migrate deploy`.
- No `prisma db push`.
- No external API calls.
- No AI API calls.
- No email sending.
- No real email body, full subject, customer name, company name, person name, email address, or secret output.

## Current Source Tracking Structure

The current schema does not have a generic `source_mails` table. The practical source-mail record is `mail_notifications`, represented by the Prisma `MailNotification` model.

Current source tracking pieces:

- `mail_notifications`
  - Stores ingested mail metadata and body fields.
  - Links to `mail_accounts` through `source_account_id`.
  - Carries `category`, `needs_review`, `is_excluded`, and classification metadata.
- `mail_accounts`
  - Stores provider information such as `GMAIL`, `OUTLOOK`, or `OTHER`.
- `extraction_results`
  - Stores normalized extraction output and review status.
  - Links back to `mail_notifications` through `mail_notification_id`.
  - Can point to a created or matched entity through `target_type` and `target_id`.
- `mail_entity_links`
  - Stores mail-to-entity links such as `SOURCE`, `EXTRACTED`, `RELATED`, `REPLY`, and `DISTRIBUTION`.
  - Supports linking related or duplicate-like mails to existing projects/persons without creating a new entity.
- `projects.source_mail_id`
  - Stores direct origin mail for Gmail-derived projects.
- `persons.source_mail_id`
  - Stores direct origin mail for Gmail-derived persons.

## Current Strengths

- Gmail-created projects/persons can trace back to a source mail through `source_mail_id`.
- `extraction_results` keeps normalized extraction output separately from the final entity.
- `mail_entity_links` can represent related mails and extracted links without duplicating entities.
- PR #16 added quality audit/evaluation tooling that can inspect extraction quality without printing PII.
- Existing Gmail remediation work established a safe pattern: preview by default, explicit apply only when needed, and anonymized summaries.

## Current Gaps

- Gmail is the only source with a mature operational path today.
- CSV, Notion, manual input, Outlook, and other providers do not share a generic source abstraction.
- There is no generic import run unit such as `import_runs`.
- There is no generic source record unit such as `source_records`.
- There is no generalized mapping from any source record to a project/person.
- Review, dedupe, dry-run, apply, rollback, and audit states are not standardized across source types.
- Backfill and remediation workflows exist for specific Gmail cases but are not yet unified.

## Inventory CLI

Command:

```powershell
npm.cmd run source:inventory -- --limit=500
```

The CLI is read-only and requires `--limit`.

Output is JSON and contains aggregate-only sections:

- `summary`
- `totals`
- `sourceMails`
- `extractionResults`
- `mailEntityLinks`
- `entitySourceCoverage`
- `linkCoverage`
- `trackingGaps`
- `recommendedNextSteps`
- `notes`

The command intentionally does not select or print:

- `subject`
- `body_text`
- `body_html`
- `normalized_body`
- email addresses
- customer names
- company names
- person names
- connection strings
- token/password/secret values

## Inventory Counts

The inventory reports:

- Source mail total.
- Source mails by provider.
- Source mails by classification/category.
- Extraction result total.
- Extraction results by target type, extraction type, and review status.
- Mail entity link total.
- Mail entity links by entity type and link type.
- Project total.
- Projects with and without `source_mail_id`.
- Person total.
- Persons with and without `source_mail_id`.
- Gmail-derived project/person counts.
- Mail counts with entity links.
- Mail counts with extracted entity links.
- Mail counts with extraction target IDs.
- Limited relationship samples comparing `source_mail_id` coverage and `mail_entity_links`.
- Orphan-like counts when `source_mail_id` is present but the referenced mail is missing.

## Interpreting Tracking Gaps

Important gap indicators:

- Many entities without `source_mail_id` means the entity is not traceable to a source mail through the current direct column.
- `source_mail_id` without any mail entity link in the sample means the direct origin column exists, but link metadata is thinner than future generic source tracking needs.
- High `RELATED` link counts can indicate duplicate/relation signals, but extraction-level duplicate heuristics should still be inspected with quality audit.
- Missing generic tables are expected in this PR because migrations are intentionally not included.

## Recommended Next Steps

1. Review additive schema migration proposal for generic source tracking.
2. Build CSV import dry-run MVP.
3. Build Notion read-only sync skeleton after owner approval for Notion API boundaries.
4. Finalize deterministic matching rules that reuse existing Gmail `source_mail_id`, `extraction_results`, and `mail_entity_links` safely.

## Safety Checks

Required verification:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run source:inventory -- --limit=500`
- `git diff --check`
- changed-file secret search

All source inventory output must remain anonymized aggregate summary only.
