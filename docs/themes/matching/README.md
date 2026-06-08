# Matching Theme

This theme covers deterministic matching between existing Projects and Persons.

Current files:

- `README.md`: deterministic matching dry-run and read-only matching review UI/API notes.
- `match-suggestion-persistence-design.md`: match suggestion persistence, review workflow, schema/API/UI/safety design, PR #28 schema foundation, and staged implementation plan.

## Deterministic Matching Dry-run MVP

Command:

```powershell
npm.cmd run match:dry-run -- --limit=50
```

Optional filters:

- `--project-id <id>`
- `--person-id <id>`
- `--min-score <number>`
- `--mode project-to-person`
- `--mode person-to-project`
- `--mode all`

The command is read-only. It does not create proposals, update Projects or Persons, draft messages, send messages, call external APIs, or call AI APIs.

If a database connection is not configured, the command falls back to synthetic in-process records so local verification can still exercise the scoring and anonymized output path. Real database matching can be run later with the same command after the environment is configured.

## Score Factors

The MVP uses deterministic rule-based scoring only:

- Required skill overlap.
- Nice-to-have skill overlap.
- Technology overlap.
- Project rate versus person desired rate.
- Project start month versus person available date.
- Location and remote compatibility.
- Role text compatibility from normalized internal text tokens.
- Risk and review signals from missing key fields or low field coverage.

The output does not include raw project text, company labels, person labels, addresses, full skill text, subjects, bodies, or secrets.

## Matching Review UI and Read-only API

Route:

- `/matches`

Read-only API:

- `GET /api/matches/dry-run`

The review UI gives ADMIN and MANAGER users a generic review surface for deterministic Project/Person match candidates before any supervised save, proposal creation, draft generation, or message sending. It reuses the dry-run scoring helpers and returns only anonymized match metadata.

The API is GET-only. It does not expose POST, PUT, PATCH, or DELETE handlers. It does not mutate Projects, Persons, Proposals, match suggestions, ImportRuns, SourceRecords, EntitySourceLinks, drafts, or messages.

If database reads are unavailable during local verification, the API falls back to synthetic in-process records and marks the response with `dataSource: synthetic-fixture-no-db`.

## Review Summary

The matching review response includes:

- scanned Project count
- scanned Person count
- candidate pair count
- displayed candidate count
- total filtered candidate count
- score distribution
- filtered score distribution
- warning code counts
- review reason code counts

Candidate rows include only:

- short Project id
- short Person id
- score
- score band
- reason codes
- review flags
- skill overlap counts
- rate compatibility
- date compatibility
- location compatibility
- role compatibility
- missing field codes

The redacted detail view may show score breakdowns, compatibility states, reason codes, missing field codes, and redacted short-id previews only.

## Review UI Usability

The matching review UI keeps the same read-only API contract and adds reviewer-focused presentation:

- Summary cards separate displayed candidates, candidate pairs, review load, and reason signals.
- Score band cards show `HIGH`, `MEDIUM`, `LOW`, and `REVIEW` counts after filters are applied.
- A score explanation panel defines score bands, compatibility states, and review-required signals.
- Candidate rows show attention states such as `High fit`, `Needs review`, and `Warning`.
- Candidate rows surface warning counts, reason counts, skill overlap counts, and rate/date/location compatibility.
- Active filter chips show which filters are currently shaping the review set.
- Loading, API failure, no-data, and filtered-empty states are shown separately.
- The detail panel groups Project and Person short references, score breakdown, reason codes, missing field codes, and compatibility details.

No raw Project text, Person text, company label, person label, address, email, full skill sheet, local path, or secret is shown.

## Match Suggestion Schema Foundation

PR #28 adds Prisma schema and migration foundation for saved match suggestions:

- `MatchSuggestion`
- `MatchSuggestionReviewEvent`
- `MatchSuggestionSourceRecord`
- `MatchSuggestionStatus`
- `MatchSuggestionReviewAction`
- `MatchSuggestionSourceRecordRole`

The migration file is `prisma/migrations/20260606113000_match_suggestion_persistence_foundation/migration.sql`.

This foundation only creates the future persistence shape. It does not add save APIs, review mutation APIs, UI changes, Proposal creation, email draft generation, email sending, external API calls, AI API calls, or real CSV/Notion mapping.

Saved suggestions store safe Project/Person references, scores, score bands, source snapshot hashes, reason/warning/review code payloads, compatibility summaries, counts, redacted previews, review status, and review events. They must not store raw Project text, raw Person text, company names, person names, email addresses, CSV raw values, email bodies, local file paths, or secrets.

The owner applied the match suggestion persistence migration to staging after PR #29. PR #30 adds read-only saved suggestion API coverage without mutation endpoints.

## Saved Match Suggestion Read-only APIs

Read-only API routes:

- `GET /api/matches/suggestions`
- `GET /api/matches/suggestions/[id]`
- `GET /api/matches/suggestions/review-queue`

These endpoints require the same ADMIN/MANAGER review access pattern as the current matching review API. They read only from saved match suggestion tables and do not write to `MatchSuggestion`, `MatchSuggestionReviewEvent`, `MatchSuggestionSourceRecord`, `Project`, `Person`, `Proposal`, `DistributionLog`, drafts, messages, or import tables.

Returned fields are limited to safe review metadata:

- match suggestion id and short id
- short Project id and short Person id
- status
- score
- score band
- scoring version
- attention state
- warning count
- review reason count
- reason codes
- warning codes
- review flags
- compatibility summary
- skill overlap summary
- redacted preview
- created, updated, reviewed, and archived timestamps
- safe review event metadata without note text
- safe source-record evidence metadata without raw source payloads

The APIs do not return raw Project text, raw Person text, company names, person names, email addresses, CSV raw values, email bodies, source raw payloads, local file paths, secrets, or full review notes.

Supported list filters:

- `status`
- `scoreBand`
- `attentionState`
- `minScore`
- `maxScore`
- `projectId`, accepted only when it is a valid UUID and returned only as a short id
- `personId`, accepted only when it is a valid UUID and returned only as a short id
- `page`
- `limit`, capped at 100

The review queue endpoint focuses on saved suggestions that are `NEEDS_REVIEW`, `SUGGESTED`, have warnings, or have review reasons. It returns `NEEDS_REVIEW` rows first, then `SUGGESTED` rows, then other warning/review rows, with score descending and newest fallback ordering inside each group.

If the target database has not received the match suggestion migration, the endpoints return a safe `migrationRequired` response instead of leaking database metadata or internal Prisma details.

Mutation and downstream work remain deferred. PR #30 does not add POST, PUT, PATCH, DELETE, save, review update, Proposal creation, email draft generation, email sending, external API, AI API, CSV/Notion mapping, or apply behavior.

## Filters, Sorting, and Pagination

Supported filters:

- score band
- minimum score
- review flag present
- rate compatibility
- date compatibility
- location compatibility
- skill overlap present
- Project id or Person id, accepted as safe UUID input and returned only as short id

Supported sorting:

- score descending
- score ascending
- review first
- newest where source ordering is applicable

Pagination uses a small default page size and enforces a max limit of 100.

## Redaction Policy

The matching review API and UI do not return:

- raw company labels
- raw person labels
- addresses
- full Project text
- full Person text
- full skill sheet text
- message subjects or bodies
- secrets
- local file paths

The response keeps source records generic and returns only short ids, scores, compatibility states, counts, and reason codes. Future CSV or Notion header mapping can expand safe `redactedPreview` keys without changing the review surface contract.

Real Notion-exported CSV files should not be committed. The local private export path assumption is `private/notion-exports/`, which is ignored by Git through `/private/`.

## Score Bands

- `HIGH`: score 75 or higher.
- `MEDIUM`: score 55 to 74.
- `LOW`: score 35 to 54.
- `REVIEW`: score below 35 or a review-required signal is present.

## Reason Codes

- `MATCH_SKILL_REQUIRED_OVERLAP`
- `MATCH_SKILL_NICE_TO_HAVE_OVERLAP`
- `MATCH_RATE_COMPATIBLE`
- `MATCH_RATE_UNKNOWN`
- `MATCH_RATE_MISMATCH`
- `MATCH_START_COMPATIBLE`
- `MATCH_START_UNKNOWN`
- `MATCH_LOCATION_COMPATIBLE`
- `MATCH_LOCATION_UNKNOWN`
- `MATCH_ROLE_COMPATIBLE`
- `MATCH_MISSING_PROJECT_SKILLS`
- `MATCH_MISSING_PERSON_SKILLS`
- `MATCH_LOW_FIELD_COVERAGE`
- `MATCH_REVIEW_REQUIRED`

## Output Contract

The dry-run report includes:

- scanned Project count
- scanned Person count
- candidate pair count
- displayed match count
- minimum score
- score distribution
- warning counts
- review reason counts
- at most 20 anonymized top match samples

Each match sample includes only:

- short Project id
- short Person id
- score
- score band
- reason codes
- missing field codes
- skill overlap counts
- rate compatibility
- date compatibility
- location compatibility

## Limitations

- This is not AI ranking.
- This does not infer final business priority.
- This does not create Proposal records.
- This does not create message drafts.
- This does not send messages.
- The current UI/API does not persist match suggestions.
- PR #28 adds only the schema/migration foundation for future match suggestion persistence.
- PR #30 adds read-only saved suggestion APIs, but no saved suggestion write path.
- This does not use Notion or real CSV field mapping.
- The review UI/API does not write to the database.
- The review UI/API does not generate email drafts.
- The review UI/API does not call external APIs or AI APIs.

## Future Flow

1. Dry-run matching.
2. Review anonymized candidate matches.
3. Apply PR #28 migration only after owner approval.
4. Add read-only saved suggestion APIs.
5. Add saved suggestion review UI.
6. Add supervised match suggestion save.
7. Generate proposal drafts after owner approval.
8. Human approval.
9. Send messages only after explicit owner approval.
