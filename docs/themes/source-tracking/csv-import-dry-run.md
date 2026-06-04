# CSV Import Dry-run MVP

## Purpose

The CSV import dry-run MVP checks whether SES project/person CSV files can be mapped into the console's normalized data shape before any database write path exists.

This PR is intentionally safe:

- No DB writes.
- No `--apply`.
- No migrations.
- No `prisma migrate deploy`.
- No `prisma db push`.
- No external API calls.
- No AI API calls.
- No Notion API calls.
- No email sending.
- No raw CSV row output.
- No real customer names, company names, person names, email addresses, full subjects, full bodies, tokens, connection strings, or secrets in CLI output or docs.

## Commands

Project dry-run:

```powershell
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-projects.csv --type=project
```

Person dry-run:

```powershell
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-persons.csv --type=person
```

Optional:

```powershell
npm.cmd run csv:import:dry-run -- --file <path> --type=auto --limit=500
```

`--limit` defaults to the safe maximum used by the CLI. The command rejects `--apply`.

## Supported Input Types

- `project`
- `person`
- `auto`

`auto` is intended only for early preview. Production import design should prefer explicit source type selection unless owner-approved mapping rules are in place.

## Header Mapping Policy

The mapper supports Japanese and common English variants. Headers are normalized by trimming, lowercasing, and removing common separators.

Project mapping examples:

- `companyName`
- `clientCompany`
- `upperCompany`
- `title`
- `workContent`
- `businessContent`
- `requiredSkills`
- `niceToHaveSkills`
- `technologies`
- `unitPrice`
- `startMonth`
- `workLocation`
- `remotePreference`
- `settlementRange`
- `interviewCount`
- `contractType`
- `commercialFlow`
- `endClient`
- `prime`
- `accountManager`
- `upperContactName`
- `contact`
- `recruitmentCount`
- `foreignNationalityAccepted`
- `ageLimit`
- `dressCode`
- `focusProject`

Person mapping examples:

- `name`
- `initials`
- `nearestStation`
- `age`
- `gender`
- `nationality`
- `availableFrom`
- `desiredUnitPrice`
- `skills`
- `roleHeadline`
- `careerSummary`
- `remotePreference`
- `workLocationPreference`
- `ownerCompany`
- `contact`
- `salesOwner`

CLI output does not print raw headers. It prints mapped field names and header hashes only.

## Validation Policy

Project required checks:

- `title`
- `workContent`
- `requiredSkills`

Person required checks:

- `identity` from `name` or `initials`
- `skills`
- `roleHeadline`

Validation warnings:

- `CSV_MISSING_REQUIRED_FIELD`
- `CSV_UNMAPPED_COLUMNS`
- `CSV_LOW_FIELD_COVERAGE`
- `CSV_DUPLICATE_CANDIDATE`
- `CSV_INVALID_PRICE`
- `CSV_INVALID_DATE`
- `CSV_SKILL_OVER_EXTRACTION`
- `CSV_PERSON_NAME_LOW_CONFIDENCE`
- `CSV_PROJECT_TITLE_LOW_CONFIDENCE`
- `CSV_TYPE_CONFLICT`
- `CSV_EMPTY_ROW`
- `CSV_PII_REDACTED_IN_OUTPUT`

Rows with review reasons are counted as `wouldNeedReview`. Empty rows are counted as `wouldSkip`.

## Duplicate Detection Policy

This MVP detects duplicate-like candidates only within the CSV input. It does not query or update the database.

Project duplicate key inputs:

- title
- start month
- company-like field
- skill summary

Person duplicate key inputs:

- name or initials
- available date
- skill summary

The output prints only duplicate group hashes, never raw source values.

## PII And Secret Redaction Policy

The dry-run report is aggregate and anonymized:

- File path is represented by a hash.
- Headers are represented by mapped field names and header hashes.
- Sample rows include row hash, warning codes, review reason codes, field coverage, and counts.
- Raw CSV rows are never printed.
- Raw values are never printed.
- Email-like strings, connection strings, secret-looking tokens, raw rows, subject fields, body fields, and raw value fields are rejected by output safety checks.

## Source Tracking Connection

CSV dry-run is a bridge from current Gmail-focused tracking to future generic source tracking.

Future integration should map each CSV row into a `source_records`-like payload, then link approved rows to entities through `entity_source_links`.

This PR does not create those tables. It validates the mapping and review surface first.

## Future Apply Flow Design

A future apply PR should be separate because it writes data.

Expected future safety gates:

- explicit `--apply`
- required confirmation string
- required source type
- required import run ID or generated run metadata
- dry-run summary before apply
- count-only mode
- small chunks
- stop on any failure
- post-count summary
- rollback plan
- owner approval before staging apply

## Future Source Records And Import Runs

Future schema work should connect CSV import to:

- `import_sources`
- `import_runs`
- `source_records`
- `entity_source_links`

The CSV dry-run report already exposes the data needed for that design:

- row hashes
- mapped fields
- required field coverage
- warning counts
- review reason counts
- duplicate group hashes
- anonymized samples

## Non-goals In This PR

- No DB writes.
- No migrations.
- No Prisma schema changes.
- No apply mode.
- No external API integration.
- No AI-assisted mapping.
- No Notion sync.
