# Matching Theme

This theme covers deterministic matching between existing Projects and Persons.

Current files:

- `README.md`: deterministic matching dry-run and read-only matching review UI/API notes.
- `match-suggestion-persistence-design.md`: match suggestion persistence, review workflow, schema/API/UI/safety design, PR #28 schema foundation, and staged implementation plan.
- `match-suggestion-review-update-design.md`: docs-only design for guarded saved suggestion review status updates.
- `proposal-draft-from-approved-match-suggestions-design.md`: docs-only design for future Proposal draft creation from approved saved MatchSuggestions.
- `proposal-traceability-and-draft-status-prerequisites.md`: docs-only prerequisite design for Proposal traceability, draft status, target company resolution, and sales mail account resolution.

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

## Saved Match Suggestion Review UI

The `/matches` review surface includes read-only saved suggestion views backed by the saved suggestion APIs:

- `Dry-run review`: existing deterministic matching dry-run review.
- `Saved suggestions`: paginated saved `MatchSuggestion` metadata from `GET /api/matches/suggestions`.
- `Review queue`: paginated read-only review queue from `GET /api/matches/suggestions/review-queue`.

Selecting a saved suggestion loads safe detail metadata from `GET /api/matches/suggestions/[id]`.

The saved suggestion UI shows only safe review fields:

- short suggestion, Project, Person, review event, source evidence, and source record ids
- status, score, score band, scoring version, and attention state
- warning counts and review reason counts
- reason codes, warning codes, and review flags
- compatibility summary and skill overlap summary after UI-side key/value redaction
- redacted preview
- safe review event metadata without full notes
- safe source evidence metadata without raw source payloads
- created, updated, reviewed, and archived timestamps

The UI does not show raw Project text, raw Person text, company names, person names, email addresses, CSV raw values, source raw payloads, local paths, secrets, full review notes, or normalized payloads.

The UI supports simple read-only filters for status, score band, attention state, score range, valid UUID Project/Person filters, page, limit capped at 100, and saved-list sort. The review queue keeps the API-defined ordering: `NEEDS_REVIEW`, then `SUGGESTED`, then warning/review-count rows.

If the API returns `migrationRequired`, the UI shows a safe unavailable state without database metadata.

The saved suggestion UI includes disabled-by-default guarded review controls, but it does not enable production review writes. It does not add bulk actions, Proposal creation, email draft generation, email sending, external API calls, AI API calls, CSV/Notion mapping, or apply behavior.

## Supervised Match Suggestion Save API

The supervised save API persists a saved match suggestion for later human review:

- `POST /api/matches/suggestions`

This endpoint is disabled by default and must not write unless all guard conditions are satisfied:

- `MATCH_SUGGESTION_SAVE_ENABLED=true`
- `MATCH_SUGGESTION_WRITE_TARGET=staging`
- authenticated user has ADMIN or MANAGER role
- request body includes `confirmSave: true`

If the guard is missing, unsafe, production-like, or unknown, the endpoint returns a safe disabled response and does not parse request data for a DB write. Production writes are not enabled by this PR.

Accepted input is intentionally narrow:

- `projectId`: valid UUID
- `personId`: valid UUID
- `score`: integer from 0 to 100
- `scoreBand`: safe short value
- `scoringVersion`: safe short value
- `sourceSnapshotHash`: 64-character hash
- `suggestionKey`: optional 64-character hash; otherwise derived server-side
- `attentionState`: optional safe short value
- `warningCount` and `reviewReasonCount`: non-negative integers
- `reasonCodes`, `warningCodes`, `reviewFlags`: safe code arrays
- `compatibilitySummary`, `skillOverlapSummary`, `redactedPreview`: sanitized JSON only
- `sourceEvidence`: optional validated SourceRecord UUIDs with safe evidence roles

The endpoint rejects unsafe top-level raw or PII fields, including raw Project text, raw Person text, company names, person names, emails, CSV raw values, email bodies, source raw payloads, normalized payloads, local paths, secrets, and full notes. Nested summary JSON is sanitized before persistence.

Idempotency uses the existing `suggestionKey` unique constraint and the Project/Person/scoring-version/source-snapshot uniqueness policy. Repeating the same save returns a safe skipped-existing response instead of creating duplicates.

On a new save, the endpoint creates:

- one `MatchSuggestion`
- one initial `MatchSuggestionReviewEvent` with action `CREATED`, no note text, and `toStatus` of `SUGGESTED` or `NEEDS_REVIEW`
- optional `MatchSuggestionSourceRecord` evidence links when valid evidence ids are provided

It does not create or update Projects, Persons, Proposals, drafts, emails, source payloads, or import records. It does not add approve/reject/archive controls, review update APIs, Proposal creation, email draft generation, email sending, external API calls, AI API calls, CSV/Notion mapping, or apply behavior.

If the target database is missing the match suggestion migration, the endpoint returns the same safe `migrationRequired` style response without leaking database metadata.

## Guarded Match Suggestion Save UI

The `/matches` dry-run review detail can show a supervised save control for selected candidates, but the UI is disabled by default.

Frontend flag:

- `NEXT_PUBLIC_MATCH_SUGGESTION_SAVE_UI_ENABLED=true`

When the frontend flag is missing or not exactly `true`, the UI shows a disabled save state and does not expose an active save button.

The server-side save guard remains authoritative even when the frontend flag is enabled:

- `MATCH_SUGGESTION_SAVE_ENABLED=true`
- `MATCH_SUGGESTION_WRITE_TARGET=staging`

This PR does not set or modify Vercel environment variables and does not enable production saves.

The dry-run API still returns only short Project and Person references. To avoid weakening redaction, the save control is active only when the reviewer has entered valid full Project and Person UUID filters and selected a candidate from that filtered dry-run review. If those safe identifiers are not available, the control stays disabled and explains that valid UUID filters are required.

The UI requires an explicit confirmation dialog before calling:

- `POST /api/matches/suggestions`

The request body is built only from safe deterministic match metadata:

- `confirmSave: true`
- valid `projectId` and `personId` from filters
- score, score band, scoring version, source snapshot hash, attention state, warning/review counts
- reason codes, warning codes, review flags
- sanitized compatibility summary, skill overlap summary, and redacted preview
- `sourceEvidence: []`

The UI never includes raw Project text, raw Person text, company names, person names, email addresses, CSV raw values, email bodies, source raw payloads, normalized payloads, local paths, secrets, or full notes.

Response handling is safe and aggregate-only:

- created: shows a saved message and short suggestion id if returned
- skipped existing: shows an already-saved message
- disabled guard: shows a server-save-guard-disabled message
- migration required: shows an unavailable state
- validation or generic failure: shows a safe failure message without server internals

Review update, approve/reject/archive, Proposal creation, email draft generation, and email sending remain deferred to separate owner-approved PRs.

## Supervised Match Suggestion Review Update Design

The guarded backend review update API follows the plan in `match-suggestion-review-update-design.md`.

Endpoint:

- `PATCH /api/matches/suggestions/[id]/review`

The endpoint is disabled by default and requires all server-side guards before reading a request body for mutation:

- `MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED=true`
- `MATCH_SUGGESTION_REVIEW_WRITE_TARGET=staging`
- authenticated ADMIN or MANAGER reviewer
- `confirmReviewAction: true`

Implemented actions:

- keep active as `SUGGESTED`
- mark `NEEDS_REVIEW`
- approve as `APPROVED`
- reject as `REJECTED`
- archive as `ARCHIVED`
- restore archived rows to `NEEDS_REVIEW`

The endpoint enforces the explicit status transition matrix from the design. Invalid transitions are rejected. No-op transitions return a safe skipped/no-op result without writing a new review event.

State-changing updates happen in one transaction and create exactly one `MatchSuggestionReviewEvent` with:

- previous status
- next status
- mapped review action
- actor user id
- safe reason codes when provided or required
- `noteRedacted: null`

The request body is intentionally narrow: action, target status, confirm flag, safe reason codes, optional route-matching suggestion id, and optional stale-update fields. It rejects raw Project text, raw Person text, company names, person names, emails, CSV raw values, email bodies, source raw payloads, normalized payloads, local paths, secrets, connection strings, and full notes. Free-form notes are not supported in this implementation.

The saved suggestion UI can show disabled-by-default review controls in the saved detail/review queue area.

Frontend flag:

- `NEXT_PUBLIC_MATCH_SUGGESTION_REVIEW_UI_ENABLED=true`

When the frontend flag is missing or not exactly `true`, review update controls remain disabled and show a safe unavailable message. The server guard remains authoritative even when the frontend flag is enabled:

- `MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED=true`
- `MATCH_SUGGESTION_REVIEW_WRITE_TARGET=staging`

The UI supports only the guarded review-update actions from the transition matrix. Invalid transitions are disabled in the UI, and the server endpoint still performs authoritative validation. The UI requires an in-app confirmation dialog before calling `PATCH /api/matches/suggestions/[id]/review`.

The UI request body contains only safe review metadata:

- `action`
- `toStatus`
- `confirmReviewAction: true`
- safe predefined `reasonCodes`
- `expectedStatus`
- optional safe `expectedUpdatedAt`

Reject, archive, and restore actions require selecting at least one predefined safe reason code before the confirmation can be submitted. Free-form notes are not accepted or sent.

After a successful or skipped/no-op response, the UI refreshes saved suggestions, the review queue, and the selected detail. Disabled guard, migration-required, validation, conflict, not-found, and generic errors are displayed as safe compact messages.

The review controls do not add bulk approve/reject/archive, Proposal creation, email draft generation, email sending, external API calls, AI API calls, CSV/Notion mapping, or production enablement.

## Proposal Draft Design And Prerequisites

Proposal draft work remains deferred and split into docs-first stages:

- `proposal-draft-from-approved-match-suggestions-design.md` defines the future guarded flow for turning an `APPROVED` saved MatchSuggestion into a Proposal draft.
- `proposal-traceability-and-draft-status-prerequisites.md` defines the prerequisite decisions for Proposal traceability, draft status, target company resolution, and sales mail account resolution.

Current recommendation:

- Prefer a future traceability migration before Proposal draft creation. A bridge table from Proposal to MatchSuggestion gives the strongest audit trail; a nullable `Proposal.matchSuggestionId` is a smaller alternative if one approved suggestion should produce at most one active Proposal draft.
- Avoid storing match suggestion lineage only in `Proposal.notes` or safe metadata because it weakens auditability and duplicate prevention.
- Consider adding a future `DRAFT` Proposal status if `PROPOSED` means externally proposed rather than internal draft.
- Resolve `targetCompanyId` only from reviewed structured Project company roles or future manual safe selection. Do not infer it from raw Project text.
- Resolve `salesMailAccountId` only from an existing active sales mail account selected by a reviewer or from one deterministic structured rule. Do not create or modify mail accounts in the Proposal draft endpoint.

Proposal creation is still not implemented. No Proposal records, email drafts, DistributionLogs, or send actions should be created until a separate owner-approved guarded implementation PR.

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
- Proposal draft creation remains deferred until traceability, draft status, target company, and sales mail account prerequisites are resolved.

## Future Flow

1. Dry-run matching.
2. Review anonymized candidate matches.
3. Apply PR #28 migration only after owner approval.
4. Add read-only saved suggestion APIs.
5. Add saved suggestion review UI.
6. Add supervised match suggestion save.
7. Add guarded match suggestion review update and disabled-by-default review controls.
8. Design Proposal draft creation from approved suggestions.
9. Resolve Proposal traceability, draft status, target company, and sales mail account prerequisites.
10. Add any owner-approved schema migration needed for Proposal traceability or draft status.
11. Add supervised Proposal draft creation after owner approval.
12. Human approval.
13. Send messages only after explicit owner approval.
