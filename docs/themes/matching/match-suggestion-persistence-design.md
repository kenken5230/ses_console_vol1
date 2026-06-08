# Match Suggestion Persistence And Review Workflow Design

## Purpose

This design defines the next step after the current deterministic matching dry-run and `/matches` review UI.

The goal is to persist reviewed Project x Person match candidates as `match_suggestions`, then let sales users review, approve, reject, archive, and eventually convert approved suggestions into proposal work.

PR #27 introduced this design as docs only. PR #28 adds the schema and migration foundation for saved match suggestions, but still does not apply the migration to any database, add write code, add API routes, add UI code, create proposals, generate email drafts, send email, call external APIs, call AI APIs, call Notion, or commit real CSV files.

## Current Context

Existing matching foundation:

- `npm.cmd run match:dry-run -- --limit=50` scores existing Projects and Persons deterministically.
- `GET /api/matches/dry-run` exposes a read-only, redacted matching review response.
- `/matches` displays anonymized candidates with short Project/Person ids, score, score band, reason codes, compatibility states, warning counts, and review signals.
- The current output deliberately excludes raw Project text, raw Person text, company labels, person labels, addresses, email addresses, full skill sheet text, local file paths, and secrets.

Existing source tracking foundation:

- `ImportSource`, `ImportRun`, `SourceRecord`, and `EntitySourceLink` track imported source items and their relationship to normalized Projects and Persons.
- Source tracking is generic and can represent CSV, Gmail, Notion, Manual, API, and unknown sources.
- `EntitySourceLink` already links a `SourceRecord` to a Project or Person by `entityType + entityId`.

Existing proposal foundation:

- `Proposal` is the business object for actual proposal tracking.
- `DistributionLog` records outbound delivery state.
- Proposal creation currently requires more business context than a match score, such as target company/contact and sales mail account.

## Non-goals For PR #28

- No migration deploy, `db push`, or real DB apply by Codex.
- No DB write code.
- No API route addition.
- No UI component addition.
- No `--apply` flag addition or usage.
- No proposal creation.
- No direct Proposal relation in the first match suggestion schema foundation.
- No email draft generation.
- No email sending.
- No external API or AI API use.
- No real CSV or Notion mapping.

## Save Target

The minimum persisted match suggestion should be a safe, reviewable snapshot of one Project x Person candidate.

Recommended minimum fields:

- `id`
- `projectId`
- `personId`
- `status`
- `score`
- `scoreBand`
- `scoringVersion`
- `sourceSnapshotHash`
- `suggestionKey`
- `attentionState`
- `warningCount`
- `reviewReasonCount`
- `reasonCodes`
- `warningCodes`
- `reviewFlags`
- `compatibilitySummary`
- `skillOverlapSummary`
- `redactedPreview`
- `createdByUserId`
- `reviewedByUserId`
- `reviewedAt`
- `archivedAt`
- `createdAt`
- `updatedAt`

Project and Person references:

- Use real `projects.id` and `persons.id` foreign keys in the persisted suggestion.
- Continue returning only short ids in list views unless the authorized detail view explicitly needs full ids internally.
- Do not store duplicated Project or Person raw text in the suggestion.
- Do not store company labels, person labels, email addresses, raw requirement text, raw career text, or full skill sheet text.

Scoring fields:

- Store `score` as the deterministic integer score at save time.
- Store `scoreBand` as a controlled value such as `HIGH`, `MEDIUM`, `LOW`, or `REVIEW`.
- Store `scoringVersion` so changed scoring logic can create a new deterministic snapshot without overwriting old review decisions.
- Store `sourceSnapshotHash` as a safe hash of the matching input/snapshot identity, not raw Project or Person text.
- Store `attentionState` as a short safe label such as high-fit, needs-review, or warning. This remains a string so UI labels can evolve without enum churn.
- Store `warningCount` and `reviewReasonCount` as denormalized counts for queue filtering.
- Store `reasonCodes`, `warningCodes`, and `reviewFlags` as JSON arrays of safe code strings.
- Store `compatibilitySummary` as safe structured values only:
  - `rateCompatibility`
  - `dateCompatibility`
  - `locationCompatibility`
  - `roleCompatible`
- Store `skillOverlapSummary` as counts only:
  - `skillOverlapCount`
  - `requiredSkillOverlapCount`
  - `niceToHaveSkillOverlapCount`
  - `technologyOverlapCount`

Redacted preview:

- Keep `redactedPreview` safe and small.
- Suggested keys:
  - `projectShortId`
  - `personShortId`
  - `score`
  - `scoreBand`
  - `attention`
  - `warningCount`
  - `reviewReasonCount`
- Do not store raw values inside `redactedPreview`.

## Review Workflow

Recommended status model:

- `SUGGESTED`: saved from deterministic dry-run and not yet reviewed.
- `NEEDS_REVIEW`: saved but human review is required before approval.
- `APPROVED`: human-approved for the next supervised proposal step.
- `REJECTED`: reviewed and intentionally rejected as a poor or invalid match.
- `ARCHIVED`: hidden from the active queue without deleting the audit trail.

Optional future terminal status:

- `CONVERTED`: approved suggestion was used to create a Proposal in a later supervised proposal PR.

Sales review flow:

1. Sales user opens `/matches` dry-run review.
2. Sales user filters high-score candidates and review-required candidates.
3. Future save action persists selected candidates as `SUGGESTED` or `NEEDS_REVIEW`.
4. Sales user opens saved suggestion review queue.
5. Sales user reviews compatibility, reason codes, warning codes, and short references.
6. Sales user approves, rejects, or archives the suggestion.
7. Approved suggestions become eligible for a separate supervised proposal draft flow.

Automatic versus human boundary:

- Deterministic scoring may set initial status.
- `HIGH` candidates with no warning codes can default to `SUGGESTED`.
- `REVIEW` candidates or candidates with warning codes should default to `NEEDS_REVIEW`.
- No deterministic score should create a Proposal by itself.
- No deterministic score should generate or send email by itself.
- Human review is required before proposal draft generation.

Mis-match handling:

- Rejected suggestions should remain queryable for audit and dedupe.
- Rejection should capture safe reason codes such as:
  - `WRONG_ROLE`
  - `SKILL_GAP`
  - `RATE_MISMATCH`
  - `DATE_MISMATCH`
  - `LOCATION_MISMATCH`
  - `DUPLICATE`
  - `STALE_PROJECT`
  - `STALE_PERSON`
  - `OTHER`
- Rejected suggestions should not be silently recreated by repeated saves for the same Project/Person/scoring version unless the user explicitly chooses to reopen.

## Proposed DB Design

PR #28 adds this schema foundation to `prisma/schema.prisma` and creates migration `20260606113000_match_suggestion_persistence_foundation`. The migration file is committed for owner-controlled application later; Codex must not run `prisma migrate deploy`, `prisma db push`, or any successful real DB apply for this PR.

### Enums

Proposed enums:

```prisma
enum MatchSuggestionStatus {
  SUGGESTED
  NEEDS_REVIEW
  APPROVED
  REJECTED
  ARCHIVED
}

enum MatchSuggestionSourceRecordRole {
  PROJECT_EVIDENCE
  PERSON_EVIDENCE
  MATCH_EVIDENCE
}
```

```prisma
enum MatchSuggestionReviewAction {
  CREATED
  SAVED
  REVIEW_REQUESTED
  APPROVED
  REJECTED
  ARCHIVED
  REOPENED
}
```

### `match_suggestions`

Added table:

```prisma
model MatchSuggestion {
  id                  String                @id @default(uuid()) @db.Uuid
  projectId           String                @map("project_id") @db.Uuid
  personId            String                @map("person_id") @db.Uuid
  status              MatchSuggestionStatus @default(SUGGESTED)
  score               Int
  scoreBand           String                @map("score_band") @db.VarChar(24)
  scoringVersion      String                @map("scoring_version") @db.VarChar(80)
  sourceSnapshotHash  String                @map("source_snapshot_hash") @db.Char(64)
  suggestionKey       String                @unique @map("suggestion_key") @db.Char(64)
  attentionState      String?               @map("attention_state") @db.VarChar(40)
  warningCount        Int                   @default(0) @map("warning_count")
  reviewReasonCount   Int                   @default(0) @map("review_reason_count")
  reasonCodes         Json?                 @map("reason_codes")
  warningCodes        Json?                 @map("warning_codes")
  reviewFlags         Json?                 @map("review_flags")
  compatibilitySummary Json?                @map("compatibility_summary")
  skillOverlapSummary Json?                 @map("skill_overlap_summary")
  redactedPreview     Json?                 @map("redacted_preview")
  createdByUserId     String?               @map("created_by_user_id") @db.Uuid
  reviewedByUserId    String?               @map("reviewed_by_user_id") @db.Uuid
  reviewedAt          DateTime?             @map("reviewed_at") @db.Timestamptz(6)
  archivedAt          DateTime?             @map("archived_at") @db.Timestamptz(6)
  createdAt           DateTime              @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime              @updatedAt @map("updated_at") @db.Timestamptz(6)

  project       Project                       @relation(fields: [projectId], references: [id], onDelete: Restrict)
  person        Person                        @relation(fields: [personId], references: [id], onDelete: Restrict)
  createdBy     User?                         @relation("MatchSuggestionCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  reviewedBy    User?                         @relation("MatchSuggestionReviewedBy", fields: [reviewedByUserId], references: [id], onDelete: SetNull)
  reviewEvents  MatchSuggestionReviewEvent[]
  sourceRecords MatchSuggestionSourceRecord[]

  @@unique([projectId, personId, scoringVersion, sourceSnapshotHash], map: "match_suggestions_pair_snapshot_key")
  @@index([status, createdAt])
  @@index([projectId, status])
  @@index([personId, status])
  @@index([scoreBand, score])
  @@index([attentionState, status])
  @@index([createdByUserId, createdAt])
  @@index([reviewedByUserId, reviewedAt])
  @@map("match_suggestions")
}
```

Notes:

- `scoreBand` can be an enum later, but a string keeps the migration smaller if score bands evolve.
- `attentionState` also stays a string so the review UI can evolve labels without schema churn.
- `sourceSnapshotHash` is a safe hash for the matching input/snapshot identity. It must not be computed from raw text that is later stored in this table.
- `suggestionKey` is unique for idempotent saves. A separate compound unique constraint on `projectId + personId + scoringVersion + sourceSnapshotHash` protects repeated saves for the same pair and snapshot.
- Proposal linkage is intentionally deferred. Approved suggestions should not become Proposal records until a separate owner-approved proposal design and migration.

### `match_suggestion_review_events`

Added audit table:

```prisma
model MatchSuggestionReviewEvent {
  id                String                      @id @default(uuid()) @db.Uuid
  matchSuggestionId String                      @map("match_suggestion_id") @db.Uuid
  action            MatchSuggestionReviewAction
  fromStatus        MatchSuggestionStatus?      @map("from_status")
  toStatus          MatchSuggestionStatus?      @map("to_status")
  actorUserId       String?                     @map("actor_user_id") @db.Uuid
  reasonCodes       Json?                       @map("reason_codes")
  noteRedacted      String?                     @map("note_redacted") @db.Text
  createdAt         DateTime                    @default(now()) @map("created_at") @db.Timestamptz(6)

  matchSuggestion MatchSuggestion @relation(fields: [matchSuggestionId], references: [id], onDelete: Cascade)
  actor User? @relation("MatchSuggestionReviewActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([matchSuggestionId, createdAt], map: "match_suggestion_events_suggestion_created_at_idx")
  @@index([actorUserId, createdAt], map: "match_suggestion_events_actor_created_at_idx")
  @@index([action, createdAt], map: "match_suggestion_events_action_created_at_idx")
  @@index([toStatus, createdAt], map: "match_suggestion_events_to_status_created_at_idx")
  @@map("match_suggestion_review_events")
}
```

### `match_suggestion_source_records`

Added optional evidence table:

```prisma
model MatchSuggestionSourceRecord {
  id                String                          @id @default(uuid()) @db.Uuid
  matchSuggestionId String                          @map("match_suggestion_id") @db.Uuid
  sourceRecordId    String                          @map("source_record_id") @db.Uuid
  role              MatchSuggestionSourceRecordRole @default(MATCH_EVIDENCE)
  createdAt         DateTime                        @default(now()) @map("created_at") @db.Timestamptz(6)

  matchSuggestion MatchSuggestion @relation(fields: [matchSuggestionId], references: [id], onDelete: Cascade)
  sourceRecord SourceRecord @relation(fields: [sourceRecordId], references: [id], onDelete: Restrict)

  @@unique([matchSuggestionId, sourceRecordId, role], map: "match_suggestion_source_records_unique")
  @@index([matchSuggestionId], map: "match_suggestion_source_records_suggestion_idx")
  @@index([sourceRecordId, role], map: "match_suggestion_source_records_source_role_idx")
  @@map("match_suggestion_source_records")
}
```

Use this only when a saved suggestion should reference source tracking evidence. The current `/matches` dry-run can save suggestions without source records because it scores existing normalized Projects and Persons.

## Relationship To Import Source Tracking

Recommended relationship:

- `ImportSource`, `ImportRun`, `SourceRecord`, and `EntitySourceLink` remain the source ingestion/audit layer.
- `MatchSuggestion` becomes the sales matching review layer.
- `MatchSuggestionSourceRecord` can connect a saved suggestion to source evidence when the Project or Person came from CSV, Gmail, Notion, Manual, or API records.
- `EntitySourceLink` should not be overloaded to represent Project x Person matching because it currently links a source record to one normalized entity.

Example future relationship:

```text
source_records
  -> entity_source_links -> Project
  -> entity_source_links -> Person

Project + Person
  -> match_suggestions
       -> match_suggestion_source_records -> source_records
```

## Unique Constraints And Idempotency

Recommended `suggestionKey`:

```text
sha256(projectId + personId + scoringVersion + sourceSnapshotHash + normalizedReasonCodes + normalizedWarningCodes)
```

Why:

- Prevents duplicate suggestions from repeated dry-run saves.
- Allows a new suggestion when scoring logic changes.
- Avoids relying on partial unique indexes that Prisma may not express cleanly.
- Keeps the idempotency key derived from stable identifiers and safe hashes, not raw Project text, raw Person text, CSV rows, email body, company name, person name, or email address.

PR #28 database constraints:

- `match_suggestions.suggestion_key` is unique.
- `match_suggestions(project_id, person_id, scoring_version, source_snapshot_hash)` is unique.
- `match_suggestion_source_records(match_suggestion_id, source_record_id, role)` is unique.

Recommended duplicate policy:

- If a `suggestionKey` already exists and status is active, skip create and return `skippedExisting`.
- If a `suggestionKey` exists with `REJECTED`, do not recreate automatically.
- If a `suggestionKey` exists with `ARCHIVED`, allow explicit reopen only through a review endpoint.
- If a later scoring version changes the key, create a new suggestion but surface prior status history in the UI.

Recommended transaction boundary for a future save endpoint:

- Validate all Project and Person ids exist.
- Build safe suggestion payload.
- Insert or skip by `suggestionKey`.
- Insert review event for newly created or reopened suggestions.
- Return aggregate counts only.

## API Design

The current API stays read-only:

- `GET /api/matches/dry-run`

Future read-only suggestion APIs:

- `GET /api/matches/suggestions`
- `GET /api/matches/suggestions/:id`
- `GET /api/matches/suggestions/review-queue`

PR #30 implementation:

- Adds these read-only endpoints only.
- Returns paginated, redacted data from `match_suggestions`, `match_suggestion_review_events`, and `match_suggestion_source_records`.
- Enforces safe default limits and a max limit of 100.
- Returns only safe suggestion ids, short Project/Person ids, status, score metadata, compatibility summaries, counts, and safe reason/warning codes.
- Does not return raw Project text, raw Person text, company labels, person labels, emails, CSV raw values, source raw payloads, local paths, secrets, or full notes.
- Does not add POST, PUT, PATCH, DELETE, save, review-update, proposal, or email endpoints.
- Returns a safe `migrationRequired` response when the target database is missing the match suggestion migration.

Future mutation APIs:

- `POST /api/matches/suggestions`
- `PATCH /api/matches/suggestions/:id/review`
- `PATCH /api/matches/suggestions/:id/archive`
- Optional later: `POST /api/matches/suggestions/:id/create-proposal-draft`

Save API input:

- selected candidates from current dry-run
- `limit`
- `confirm`
- `scoringVersion`
- safe reason/warning/compatibility payloads

Save API safety:

- Require ADMIN or MANAGER initially.
- Require explicit confirmation such as `SAVE_MATCH_SUGGESTIONS`.
- Require `limit`, with a max such as `50`.
- Reject unknown or mutation-like dry-run parameters.
- Recompute candidates server-side; do not trust client scores.
- Write only `match_suggestions` and `match_suggestion_review_events`.
- Do not write Proposals.
- Do not write DistributionLogs.
- Do not generate drafts.
- Do not send email.
- Return aggregate anonymized counts only.

Review update API:

- Accept status transitions only.
- Require review reason code for rejection.
- Require actor user.
- Append a review event.
- Do not delete rows; archive instead.

Read-only and mutation separation:

- Keep `GET /api/matches/dry-run` read-only forever.
- Saved suggestion mutation endpoints should live under `/api/matches/suggestions`.
- Bulk operations should require confirm strings and limits.
- No mutation endpoint should accept `send`, `draftEmail`, `createProposal`, or email-related parameters until a separate approved proposal/email PR.

## UI Design

Future `/matches` layout:

- Tab 1: Dry-run candidates.
- Tab 2: Saved suggestions.
- Tab 3: Review queue.
- Tab 4: Archived/rejected audit.

Dry-run candidates:

- Keep current read-only candidate list.
- Add future explicit action: `Save selected suggestions`.
- Show a confirmation modal before save.
- Show what will be written, max count, and safe payload preview.

Saved suggestions:

- Show short Project id, short Person id, status, score, score band, warning count, review reason count, reviewer, and timestamps.
- Show prior rejection/archival state to avoid repeated mis-match review.
- Show source evidence count when `match_suggestion_source_records` exists.

Review queue:

- Default to `NEEDS_REVIEW` and `SUGGESTED`.
- Filters:
  - status
  - score band
  - warning present
  - reason code
  - reviewer
  - created date
  - source evidence present
- Sorting:
  - review first
  - score descending
  - newest
  - oldest

Detail view:

- Show short ids, score breakdown, compatibility summary, reason codes, warning codes, review events, and source evidence counts.
- Do not show raw Project text, raw Person text, company labels, person labels, addresses, email addresses, full skill sheet text, or source payloads.
- Link to existing Project/Person detail only if the user already has permission and the destination is clearly outside the redacted matching view.

Proposal conversion:

- Approved suggestions may later show `Create proposal draft`.
- This must remain disabled until a separate proposal-draft PR defines target company/contact and sales mail account requirements.
- No email draft or send action belongs in the match suggestion review UI until later owner approval.

## Safety Design

DB write prerequisites:

- Migration has been reviewed and applied by the owner in the target environment.
- Mutation endpoint has explicit confirm guard.
- Mutation endpoint requires a safe limit.
- Server recomputes or validates score payloads.
- Output is aggregate and anonymized.
- Tests prove no Proposal, DistributionLog, Project, Person, email, external API, or AI API writes happen.

Migration cautions:

- Additive only.
- No existing table drops.
- No existing column drops.
- No required columns on populated existing tables.
- New foreign keys should use `Restrict` or `SetNull` based on audit needs.
- Consider Prisma limitations for partial unique indexes.
- Do not run migration deploy in Codex verification unless explicitly instructed by the owner.

PII and secret policy:

- Do not store raw Project text or raw Person text in suggestions.
- Do not store company labels, person labels, addresses, email addresses, full skill sheet text, message subjects, message bodies, local file paths, or secrets.
- Real CSV or Notion exports stay outside Git, under the local private export path.
- Docs and tests must use synthetic ids and synthetic code strings only.

STOP conditions before proposal/email:

- Stop if match suggestion is not `APPROVED`.
- Stop if target company/contact is missing.
- Stop if sales mail account is missing.
- Stop if proposal payload would include raw source payloads.
- Stop if any email body/draft content would be generated without a separate owner-approved PR.
- Stop if any send action is requested without explicit human approval and a separate email-sending PR.
- Stop if external or AI APIs would be needed.

## Recommended Implementation PR Sequence

1. `Add match suggestion schema`
   - Implemented by PR #28 as Prisma schema and migration file only.
   - No migration deploy by Codex.
   - No DB writes by Codex.
   - Owner decides when to apply migration to staging.

2. `Add match suggestion read-only API`
   - Implemented by PR #30 as list/detail/read-only review queue endpoints.
   - No mutation endpoints.
   - No DB writes.
   - Requires migration to be present in target environment before deployed reads are useful.
   - Should use the PR #28 schema without exposing raw text or PII fields.

3. `Add saved match suggestion review UI`
   - Adds `/matches` saved suggestion tabs and detail views.
   - No writes.
   - No proposal/email features.

4. `Add supervised match suggestion save`
   - First PR where application code can write `match_suggestions`.
   - Requires confirm string and max limit.
   - Codex must not execute successful real save during verification.
   - Owner decides when to run/enable write path.

5. `Add supervised match suggestion review updates`
   - Writes status changes and review events.
   - Requires role checks and safe reason codes.
   - No proposal creation.
   - No email draft.

6. `Design proposal draft from approved suggestions`
   - Docs first.
   - Defines target company/contact and sales mail account policy.
   - No implementation yet.

7. `Add supervised proposal draft creation from approved suggestions`
   - First PR that may write Proposal records.
   - Requires approved suggestion and explicit confirmation.
   - No email sending.

8. `Design supervised email draft/send flow`
   - Docs first.
   - Defines human approval, draft content policy, and send STOP conditions.

## Owner Approval Points

- Migration PR: owner approval required before applying migration to any DB.
- Save API PR: owner approval required before enabling or executing successful save.
- Review update PR: owner approval required before status writes in production.
- Proposal draft PR: owner approval required before creating Proposal records.
- Email PR: owner approval required before generating drafts or sending email.

## Open Questions After PR #28

- Should rejected suggestions block future scoring-version duplicates, or only exact `suggestionKey` duplicates?
- Should `SALES` users be allowed to approve/reject, or should initial writes be ADMIN/MANAGER only?
- Should notes be allowed at all, or limited to safe reason codes only?
- Should the future proposal draft schema link directly to `match_suggestions`, or use a separate proposal-source bridge table?
