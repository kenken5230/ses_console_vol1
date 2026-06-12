# Proposal Draft From Approved Match Suggestions Design

## Purpose

This document defines a future supervised flow that turns an approved saved `MatchSuggestion` into a Proposal draft.

This is docs/design only. It does not add API routes, UI controls, DB write code, migrations, Proposal creation, email draft generation, email sending, external API calls, AI API calls, CSV/Notion mapping, production enablement, Vercel environment changes, or real CSV files.

The design assumes the existing saved match suggestion foundation is already present:

- `MatchSuggestion`
- `MatchSuggestionReviewEvent`
- `MatchSuggestionSourceRecord`
- read-only saved suggestion APIs
- guarded review update API
- disabled-by-default review controls

The staging review update smoke test is accepted only as a staging DB/data-flow smoke result. It proved a synthetic saved suggestion could move from `SUGGESTED` to `NEEDS_REVIEW` and create exactly one `MatchSuggestionReviewEvent`. It did not directly boot the HTTP PATCH route, did not run the full npm suite, and must not be used to justify production or Vercel env enablement.

## Non-goals

- Do not create `Proposal` records in this PR.
- Do not add Proposal mutation endpoints.
- Do not add UI buttons for Proposal creation.
- Do not create email drafts.
- Do not send email.
- Do not call external APIs.
- Do not call AI APIs.
- Do not add or apply migrations.
- Do not write to staging or production databases.
- Do not use real CSV or Notion mapping.
- Do not accept or output raw Project text, raw Person text, company names, person names, emails, CSV raw values, email bodies, source raw payloads, normalized payloads, local paths, secrets, connection strings, full notes, or raw proposal copy.

## Eligibility

A saved match suggestion is eligible for Proposal draft creation only when all conditions pass.

Required conditions:

- `MatchSuggestion.status` is `APPROVED`.
- `MatchSuggestion.archivedAt` is null.
- The referenced Project exists and is not archived or closed according to the future business rule.
- The referenced Person exists and is not archived or inactive according to the future business rule.
- The requesting user has ADMIN or MANAGER role in the first rollout.
- The request includes explicit confirmation.
- No active duplicate Proposal already exists for the same Project/Person/suggestion scope.

Recommended stale checks:

- Optional `expectedSuggestionStatus` must still match `APPROVED`.
- Optional `expectedSuggestionUpdatedAt` must match the saved suggestion's current `updatedAt`.
- Optional `expectedProjectUpdatedAt` and `expectedPersonUpdatedAt` can be added later if the UI needs stronger stale checks.

Excluded suggestions:

- `SUGGESTED`, `NEEDS_REVIEW`, `REJECTED`, and `ARCHIVED` suggestions are not eligible.
- Suggestions with `archivedAt` set are excluded even if the status value is stale or inconsistent.
- Suggestions whose Project or Person reference is missing are excluded.
- Suggestions requiring proposal target company/contact data that cannot be safely resolved are excluded.

## Future Endpoint Shape

Preferred endpoint:

```text
POST /api/matches/suggestions/[id]/proposal-draft
```

Alternative if the repo prefers collection-level actions:

```text
POST /api/matches/proposal-drafts
```

The endpoint should be disabled by default and implemented in a later PR. It should not share a route with email draft or email send behavior.

Suggested request body:

```json
{
  "matchSuggestionId": "route-id-must-match",
  "confirmProposalDraft": true,
  "proposalType": "PERSON_TO_PROJECT",
  "expectedSuggestionStatus": "APPROVED",
  "expectedSuggestionUpdatedAt": "optional-safe-timestamp"
}
```

Initial body rules:

- `matchSuggestionId` must be a valid UUID from the route path. If also present in the body, it must match the route id.
- `confirmProposalDraft` must be exactly `true`.
- `proposalType` is optional and must be a safe enum-compatible value; initial rollout should prefer `PERSON_TO_PROJECT`.
- `expectedSuggestionStatus`, if present, must be `APPROVED`.
- `expectedSuggestionUpdatedAt`, if present, must be a safe timestamp.
- No free-form notes in the first implementation.
- No raw Project or Person payload fields.
- No email draft, email send, subject, body, recipient, or template fields.

Suggested success response:

```json
{
  "mode": "match-suggestion-proposal-draft",
  "created": true,
  "skippedExisting": false,
  "proposal": {
    "shortId": "12345678",
    "status": "PROPOSED",
    "proposalType": "PERSON_TO_PROJECT"
  },
  "sourceSuggestion": {
    "shortId": "87654321",
    "status": "APPROVED"
  }
}
```

Suggested skipped-existing response:

```json
{
  "mode": "match-suggestion-proposal-draft",
  "created": false,
  "skippedExisting": true,
  "message": "A matching active Proposal draft already exists."
}
```

Responses should return only short ids, safe status/type fields, aggregate flags, and safe reason codes. Do not return raw names, email addresses, raw text, full UUIDs in UI-facing response payloads, source payloads, local paths, database metadata, or internals.

## Guard Strategy

Server guard for the future mutation endpoint:

- `MATCH_SUGGESTION_PROPOSAL_DRAFT_ENABLED=true`
- `MATCH_SUGGESTION_PROPOSAL_WRITE_TARGET=staging`
- authenticated user role is ADMIN or MANAGER
- request includes `confirmProposalDraft: true`

Guard behavior:

- Disabled by default.
- Staging-only first.
- Production disabled until separate owner-approved rollout.
- If the guard is missing, unknown, production-like, or not staging, return a safe disabled response.
- Do not parse or execute a DB mutation when the server guard fails.
- Do not set or modify Vercel environment variables from Codex.
- Do not enable frontend proposal controls until a separate UI PR and owner decision.

Frontend guard for a later UI PR:

- Optional `NEXT_PUBLIC_MATCH_SUGGESTION_PROPOSAL_UI_ENABLED=true`.
- Hidden or disabled by default.
- Server guard remains authoritative.
- Frontend flag never enables production writes by itself.

## Proposal Field Mapping

The existing `Proposal` schema requires business context beyond a match score:

- `personId`
- optional `projectId`
- `proposalType`
- `targetCompanyId`
- optional `targetContactId`
- `salesMailAccountId`
- optional `ownerUserId`
- optional `sourceMailId`
- `status`
- timestamps and status history fields

Future implementation should populate only fields that can be safely and deterministically resolved:

- `personId` from the approved `MatchSuggestion.personId`.
- `projectId` from the approved `MatchSuggestion.projectId` for `PERSON_TO_PROJECT`.
- `proposalType` as `PERSON_TO_PROJECT` in the first rollout unless the user explicitly chooses a safe supported type.
- `status` using the existing draft/proposed equivalent. The current schema default is `PROPOSED`, so the implementation should decide whether a separate draft status/migration is needed before creating records.
- `ownerUserId` from the authenticated reviewer or current ownership rule.
- `sourceMailId` only if there is a safe existing source mail relationship and no raw mail content is exposed.

Fields that need a STOP condition before write:

- `targetCompanyId`: required by current schema. Do not guess it from raw text. Use an explicit safe Project company role such as proposal target only if already modeled and reviewed.
- `targetContactId`: optional, but do not infer from raw text or email bodies.
- `salesMailAccountId`: required by current schema. It must be selected or resolved from an existing safe active sales mail account rule; do not create or modify mail accounts.
- `notes`: leave null in the first implementation because free-form notes can contain PII.

Because the current schema does not directly link `Proposal` to `MatchSuggestion`, future implementation has two options:

1. Store safe source metadata in a constrained field only after a separate policy is approved.
2. Add a dedicated relation or bridge table in a later migration before Proposal draft creation.

The second option is cleaner for auditability, but it requires a separate migration PR and owner approval before any DB apply.

## Duplicate Prevention

Initial duplicate policy:

- Do not create a duplicate active Proposal for the same `personId`, `projectId`, `targetCompanyId`, and `salesMailAccountId`.
- If a future direct `Proposal -> MatchSuggestion` relation exists, also dedupe by `matchSuggestionId`.
- Treat statuses such as `PROPOSED`, `ENTERED`, `INTERVIEW_SCHEDULING`, `INTERVIEWED`, and `OFFERED` as active for duplicate checks.
- Treat terminal statuses such as `REJECTED` and `WITHDRAWN` according to a later owner-approved re-entry rule.

Suggested response for duplicates:

- `created: false`
- `skippedExisting: true`
- short existing Proposal id only if safe and authorized
- no raw notes or customer/person labels

Do not silently create another Proposal when a duplicate exists. Do not delete or update existing Proposals in the draft creation endpoint.

## Review Event And Audit Policy

Proposal draft creation should not rewrite match suggestion history. Recommended behavior:

- Verify the source `MatchSuggestion` is `APPROVED`.
- Create the Proposal draft in one transaction.
- Create a safe audit event if an audit table or future `MatchSuggestionReviewEvent` action supports it.
- Do not mutate the `MatchSuggestion.status` unless a future schema adds a `CONVERTED` or proposal-linked status.
- Do not add a new `MatchSuggestionReviewEvent` unless the event action vocabulary is extended or a safe existing action is clearly appropriate.

If a future `CONVERTED` status is needed, add it in a separate schema/migration design before implementation.

## Safe Response Handling

Future endpoint should handle:

- success: Proposal draft created with safe short ids.
- skippedExisting: active duplicate already exists.
- disabled guard: server guard is off or not staging.
- migration/schema not ready: safe `migrationRequired` style response without internals.
- validation error: invalid id, status, confirmation, proposal type, or stale input.
- not found: suggestion, Project, Person, target company, or mail account not found.
- conflict/stale update: suggestion status or timestamp changed.
- ineligible suggestion: not approved, archived, missing references, unsafe target data.
- generic error: safe message only.

No response should include raw Project text, raw Person text, company names, person names, email addresses, CSV raw values, source raw payloads, local paths, secrets, connection strings, database metadata, full notes, stack traces, or Prisma internals.

## UI Rollout Plan

Future UI should live on saved suggestion detail only:

- Show a disabled-by-default `Create proposal draft` control only for approved saved suggestion detail.
- Keep the control hidden or disabled for `SUGGESTED`, `NEEDS_REVIEW`, `REJECTED`, and `ARCHIVED` rows.
- Show why a row is ineligible using safe reason codes only.
- Require a confirmation dialog before mutation.
- The confirmation dialog should show only short suggestion id, status, score, score band, warning/review counts, proposal type, and safe target readiness flags.
- Do not show or collect free-form notes in the first implementation.
- Do not show email draft or send controls in this phase.

After success:

- Refresh saved suggestion detail.
- Refresh saved suggestions and review queue.
- Show a safe created/skipped message.
- Link to a Proposal detail page only if that page already enforces authorization and safe display policy.

The proposal UI flag should not be enabled in production until the owner approves both the server guard and UI rollout.

## Test Strategy

Future implementation tests should cover:

Eligibility:

- `APPROVED` suggestion is eligible.
- `SUGGESTED`, `NEEDS_REVIEW`, `REJECTED`, and `ARCHIVED` are rejected.
- `archivedAt` set is rejected.
- missing Project or Person is rejected.
- stale `expectedSuggestionStatus` is rejected.
- stale `expectedSuggestionUpdatedAt` is rejected.

Guard and role:

- server guard missing rejects before write.
- non-staging target rejects before write.
- production-like target rejects before write.
- `confirmProposalDraft: true` is required.
- ADMIN and MANAGER allowed initially.
- SALES, VIEWER, unauthenticated, and inactive users rejected initially.

Request safety:

- invalid UUID rejected.
- route/body id mismatch rejected.
- unsupported proposal type rejected.
- raw/PII top-level fields rejected.
- nested raw/PII values rejected or sanitized according to helper policy.
- free-form notes rejected.
- email draft/send fields rejected.

DB write boundary with mocks:

- creates only `Proposal` and any approved audit/event rows for the designed transaction.
- does not update Project or Person.
- does not update SourceRecord, ImportRun, ImportSource, EntitySourceLink, or MatchSuggestionSourceRecord.
- does not create DistributionLog.
- does not create email drafts.
- does not send email.
- does not call external APIs.
- does not call AI APIs.

Duplicate prevention:

- active duplicate returns `skippedExisting`.
- duplicate check uses Project/Person/target/sales account and future `matchSuggestionId` relation if available.
- repeated request is idempotent.

Response handling:

- success.
- skippedExisting.
- disabled guard.
- migration/schema not ready.
- validation error.
- not found.
- conflict/stale update.
- ineligible suggestion.
- generic error.
- no PII or secrets in serialized output.

UI tests for later PR:

- controls hidden/disabled by default.
- controls visible only behind frontend flag.
- controls enabled only for approved eligible suggestion.
- confirmation required.
- safe request body construction.
- no raw/PII fields in body.
- safe success/skipped/disabled/migration/error handling.
- no email draft/send controls.

## Staged Implementation Plan

Recommended next PR sequence:

1. Docs-only design for Proposal draft from approved suggestions.
2. Optional schema design for direct `Proposal -> MatchSuggestion` traceability if needed.
3. Optional migration PR for proposal-source linkage or draft status if current schema is insufficient.
4. Guarded Proposal draft API with mocked DB tests only; disabled by default and staging-only.
5. Owner-approved staging smoke test for one synthetic approved suggestion.
6. Disabled-by-default UI control for eligible approved suggestions.
7. Separate docs-only email draft/send design.
8. Separate guarded email draft implementation after owner approval.
9. Separate guarded email send implementation after owner approval.

The first PR that creates Proposal records must require explicit owner approval before any staging smoke test. Production remains disabled until a later owner-approved rollout.

## STOP Conditions

Stop before Proposal creation if:

- source suggestion is not `APPROVED`.
- source suggestion is archived.
- Project or Person reference is missing.
- target company cannot be resolved from safe reviewed structured data.
- sales mail account cannot be resolved from safe reviewed structured data.
- the operation would require raw Project text, raw Person text, company name, person name, email address, raw source payload, normalized payload, local path, or secret.
- a duplicate active Proposal exists.
- email draft generation would be required.
- email sending would be required.
- an external or AI API call would be required.
- production guard is requested without a separate owner-approved rollout.

## Open Questions

- Should the system add a direct `proposal.matchSuggestionId` relation, or a bridge table, before Proposal draft creation?
- Does the current `ProposalStatus.PROPOSED` represent a draft closely enough, or is a new draft status needed?
- How should target company/contact be selected when a Project has multiple company roles?
- Should first rollout require manual target company/contact selection instead of automatic resolution?
- Should SALES users ever create Proposal drafts, or should first rollout stay ADMIN/MANAGER only?
- Should approved suggestions remain `APPROVED` after Proposal draft creation, or should a future `CONVERTED` status be added?
