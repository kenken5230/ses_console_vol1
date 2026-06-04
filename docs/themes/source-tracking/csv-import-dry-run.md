# CSV Import Dry-run

## Purpose

The CSV import dry-run checks whether SES project/person CSV files can be mapped into the console's normalized data shape before entity creation exists.

The dry-run command is intentionally safe:

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

The supervised apply command is separate and guarded. It writes source tracking records only and must not be run casually.

## Commands

Project dry-run:

```powershell
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-projects.csv --type=project --db-duplicates=off
```

Person dry-run:

```powershell
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-persons.csv --type=person --db-duplicates=off
```

Auto type preview:

```powershell
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-projects.csv --type=auto --db-duplicates=off
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-persons.csv --type=auto --db-duplicates=off
```

Source tracking preview:

```powershell
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-projects.csv --type=project --source-preview
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-persons.csv --type=person --source-preview
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-projects.csv --type=auto --source-preview
npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-persons.csv --type=auto --source-preview
```

Supervised source-record apply:

```powershell
npm.cmd run csv:import:apply -- --file <path> --type=project --source-preview --limit=50 --confirm=APPLY_CSV_SOURCE_RECORDS
```

The apply command is implemented for owner-supervised staging use only. It requires `--source-preview`, an explicit `--limit`, a limit of `50` or less, and `--confirm=APPLY_CSV_SOURCE_RECORDS`. Codex verification must not run a successful real apply.

Read-only DB duplicate matching:

```powershell
npm.cmd run csv:import:dry-run -- --file <path> --type=project --db-duplicates=auto --limit=500
```

`--db-duplicates=auto` attempts read-only duplicate matching only when a database connection is already configured. `--db-duplicates=off` keeps the run fully fixture/local. `--db-duplicates=on` requires a configured database connection and still performs no writes.

Local synthetic duplicate check:

```powershell
$env:CSV_DRY_RUN_DUPLICATE_FIXTURE="synthetic"; npm.cmd run csv:import:dry-run -- --file tests/fixtures/csv-import/synthetic-projects.csv --type=project --db-duplicates=on; Remove-Item Env:CSV_DRY_RUN_DUPLICATE_FIXTURE
```

The synthetic fixture mode is for CI/PR verification when real DB credentials are not available. It exercises the same `--db-duplicates=on` CLI branch with bundled synthetic duplicate candidates and performs no DB connection or writes. Real DB duplicate verification should be owner-run separately only when a safe read-only environment is available.

`--limit` defaults to `5000`. The command rejects `--apply`.

`--source-preview` adds an anonymized source-tracking preview summary to the dry-run JSON. In dry-run mode, it builds in-memory preview objects only and performs no database writes, apply, migrations, external API calls, AI API calls, Notion API calls, or email sending.

## Supported Input Types

- `project`
- `person`
- `auto`

`auto` uses both header signals and row-value presence signals. If project and person signals conflict, the row is marked for review with `CSV_TYPE_CONFLICT`; it is not treated as a clean create candidate.

## Header Mapping Policy

The mapper supports Japanese and common English variants. Headers are normalized by trimming, lowercasing, Unicode NFKC normalization, and removing common separators.

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

## Duplicate Matching Policy

The dry-run detects duplicate-like candidates in two safe ways:

- Source-row duplicates inside the CSV file.
- Optional read-only DB duplicate matching against existing projects/persons.

Project matching uses normalized combinations of:

- title/project name
- company/client/upper company
- skills
- unit price
- work location
- start month

Person matching uses normalized combinations of:

- name or initials
- owner company
- skills
- desired unit price
- available date
- nearest station

Duplicate reason codes:

- `CSV_DUPLICATE_BY_SOURCE_ROW`
- `CSV_DUPLICATE_BY_PROJECT_TITLE_COMPANY`
- `CSV_DUPLICATE_BY_PROJECT_SKILL_LOCATION_PRICE`
- `CSV_DUPLICATE_BY_PERSON_NAME_OWNER`
- `CSV_DUPLICATE_BY_PERSON_SKILL_RATE_AVAILABILITY`
- `CSV_DUPLICATE_WEAK_MATCH`
- `CSV_DUPLICATE_STRONG_MATCH`

The output includes duplicate counts and group hashes only. It never prints raw DB values or raw CSV values.

The Prisma-backed path uses `findMany` reads only. It does not call create, update, delete, migrate, or push operations.

## Auto Type Detection

Auto detection reports:

- `detectedType`
- `typeConfidence`
- `projectScore`
- `personScore`
- `conflictMargin`
- type reason counts

Project signals include title, work content, business content, required skills, desired skills, unit price, start month, work location, and company-like fields.

Person signals include name, initials, skills, role headline, career summary, desired unit price, available date, nearest station, and owner company.

When both sides are close, the row is marked for review with `CSV_TYPE_CONFLICT`.

## Field Coverage Scoring

Project coverage checks:

- title/project name
- work content
- required skills or skills
- unit price
- start month
- work location
- company/client

Person coverage checks:

- name or initials
- skills
- role headline
- available from
- desired unit price
- nearest station
- owner company

Rows below the coverage threshold are counted with `CSV_LOW_FIELD_COVERAGE` and are sent to review.

## Review Summary

The report is designed for owner review without exposing PII:

- file rows and parsed rows
- requested type and detected/effective type counts
- mapped columns and unmapped column hashes
- `wouldCreate`
- `wouldNeedReview`
- `wouldSkip`
- invalid row count
- duplicate candidate counts
- strong/weak duplicate counts
- type conflict count
- low coverage count
- warning counts by code
- review reason counts by code
- max 20 anonymized sample row summaries
- optional source-tracking preview summary when `--source-preview` is enabled

Sample rows include row hashes, action, type signals, coverage scores, warning codes, review reason codes, duplicate strength, duplicate group hash, and counts. They never include raw values.

## Source Preview Mode

`--source-preview` connects the CSV dry-run report to the generic import source tracking model without persisting anything.

Preview `ImportSource`:

- `type`: `CSV`
- `nameRedacted`: the synthetic fixture file label, or a redacted `csv-file-<hash>` label for non-synthetic paths
- `status`: `ACTIVE`
- `configSummary`: safe metadata only, including file hash, file byte count, row count, requested type, read-only duplicate mode, and path redaction flags

Preview `ImportRun`:

- `mode`: `DRY_RUN`
- `status`: `SUCCEEDED` when all parsed rows are clean creates, otherwise `PARTIAL`
- `summary`: file rows, parsed rows, would-create rows, rows needing review, skipped rows, duplicate candidate count, type conflict count, and invalid row count

Preview `SourceRecord`:

- One preview record is built for each parsed CSV row.
- `recordType` is `PROJECT` or `PERSON` for resolved rows, `UNKNOWN` for auto type conflicts, and `EXCLUDED` for skipped rows.
- `recordHash` is a deterministic hash.
- `rawRef` contains only safe row position metadata, including one-based CSV body row index and CSV row number.
- `normalizedPayload` includes normalized field names, coverage, missing fields, and counts, but not raw values.
- `redactedPreview` includes action, type signal, confidence, warning count, review reason count, and duplicate strength.
- `status` is `NEW` for clean create rows, `NEEDS_REVIEW` for review rows, and `SKIPPED` for skipped rows.

Preview `EntitySourceLink`:

- Clean create rows produce `CREATED_FROM` link previews for `PROJECT` or `PERSON`.
- Duplicate rows produce `DUPLICATE_OF` link previews with duplicate reason codes.
- Review rows without duplicate candidates produce `REVIEW_CANDIDATE` link previews.
- Link previews include entity type, link type, confidence, and reasons only. They do not include real entity IDs or raw source values.

The source preview output includes aggregate counts, warning counts, review reason counts, and at most 20 anonymized `SourceRecord` and `EntitySourceLink` samples.

## Supervised Apply Mode

`csv:import:apply` persists the source preview into source tracking tables only:

- `import_sources`
- `import_runs`
- `source_records`
- `entity_source_links`

It does not write:

- `projects`
- `persons`
- project/person relation tables
- Gmail tables
- Notion data
- email/send logs

Apply safety guards:

- `--confirm=APPLY_CSV_SOURCE_RECORDS` is required.
- `--limit` is required.
- `--limit` must be `50` or less.
- `--source-preview` is required.
- Output is aggregate and anonymized.
- No raw CSV values or local file paths are printed.

Duplicate and idempotency policy:

- `ImportSource` is reused by CSV type and redacted source name when already active.
- `SourceRecord` is checked by `sourceId`, content-derived `recordHash`, and `recordType` before create.
- `EntitySourceLink` is checked by `sourceRecordId`, `entityType`, deterministic preview entity candidate ID, and `linkType` before create.
- `recordHash` remains content-based and does not include row number.
- `rawRef.rowIndex` and `rawRef.rowNumber` preserve row position separately.

Entity link policy:

- Apply persists the source-preview link concepts because `entity_source_links` requires a UUID-shaped `entityId`.
- The apply path uses a deterministic preview entity candidate UUID derived from the source record hash and link metadata.
- This is not a real project or person ID, and no project/person row is created or updated by this PR.

Failure policy:

- If a source-record or entity-link write fails, the write block stops.
- The ImportRun is marked `FAILED` when a write failure is observed.
- Error output is sanitized to a generic code and hash.
- Raw CSV values, DB connection strings, local file paths, and secrets must not be printed.

Rollback/manual cleanup policy:

- Because apply writes only source tracking rows, manual cleanup should target the created `import_runs`, their `source_records`, and related `entity_source_links`.
- Cleanup should be owner-approved and performed in a separate supervised operation.
- Project and person tables do not require rollback for this PR because they are not written.

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

The dry-run maps each CSV row into an in-memory `SourceRecord` preview and maps clean, duplicate, or review rows into in-memory `EntitySourceLink` previews.

The supervised apply path can persist those preview concepts into source tracking tables only. It still does not create or update projects/persons.

## Future Entity Creation Flow Design

A future project/person creation PR should be separate because it writes normalized business entities.

Expected future safety gates:

- source records must already exist
- explicit confirmation string
- required source type
- apply limit
- dry-run summary before entity creation
- count-only mode
- small chunks
- stop on any failure
- post-count summary
- rollback plan
- owner approval before staging apply

## Source Records And Import Runs

Supervised apply persists the current preview concepts to:

- `import_sources`
- `import_runs`
- `source_records`
- `entity_source_links`

The CSV dry-run source preview exposes the data needed:

- row hashes
- mapped fields
- required field coverage
- field coverage scores
- warning counts
- review reason counts
- duplicate reason counts
- anonymized samples
- preview import run summary
- preview source record statuses
- preview entity source link types

## Non-goals In This PR

- No project/person creation.
- No project/person updates.
- No project/person deletes.
- No migrations.
- No Prisma schema changes.
- No external API integration.
- No AI-assisted mapping.
- No Notion sync.
