# Match Suggestion Review Update Workflow Design

## Purpose

This document defines the next supervised review-update phase for saved `MatchSuggestion` records.

It is a design and implementation plan only. It does not add API routes, UI mutation controls, DB write code, migrations, Proposal creation, email draft generation, email sending, external API calls, AI API calls, CSV/Notion mapping, or production write behavior.

The design assumes the existing schema foundation is already present:

- `MatchSuggestion`
- `MatchSuggestionReviewEvent`
- `MatchSuggestionStatus`
- `MatchSuggestionReviewAction`

## Review Actions

Future review updates should use a small action vocabulary mapped to existing schema enums.

| UI/action intent | Future request `action` | Target status | Review event action | Notes |
| --- | --- | --- | --- | --- |
| Keep active as suggested | `KEEP_SUGGESTED` | `SUGGESTED` | no event for no-op, or `REOPENED` when moving from terminal state | Keeps the candidate active but not approved. |
| Mark needs review | `REQUEST_REVIEW` | `NEEDS_REVIEW` | `REVIEW_REQUESTED` | Use when a reviewer wants another pass or missing fields remain. |
| Approve | `APPROVE` | `APPROVED` | `APPROVED` | Makes the suggestion eligible for a later proposal-design phase only. |
| Reject | `REJECT` | `REJECTED` | `REJECTED` | Requires at least one safe reason code. |
| Archive | `ARCHIVE` | `ARCHIVED` | `ARCHIVED` | Hides from active queue without deleting audit history. |
| Restore from archive | `RESTORE` | `NEEDS_REVIEW` by default | `REOPENED` | Optional first implementation. A later version may restore to the last active status from event history. |

No action in this phase creates or updates `Project`, `Person`, `Proposal`, `DistributionLog`, import/source records, drafts, messages, or email state.

## Status Transition Matrix

Allowed transitions should be explicit and tested.

| From status | `KEEP_SUGGESTED` | `REQUEST_REVIEW` | `APPROVE` | `REJECT` | `ARCHIVE` | `RESTORE` |
| --- | --- | --- | --- | --- | --- | --- |
| `SUGGESTED` | no-op | `NEEDS_REVIEW` | `APPROVED` | `REJECTED` | `ARCHIVED` | invalid |
| `NEEDS_REVIEW` | `SUGGESTED` | no-op | `APPROVED` | `REJECTED` | `ARCHIVED` | invalid |
| `APPROVED` | invalid | `NEEDS_REVIEW` | no-op | invalid initially | `ARCHIVED` | invalid |
| `REJECTED` | invalid | `NEEDS_REVIEW` | invalid initially | no-op | `ARCHIVED` | invalid |
| `ARCHIVED` | invalid initially | invalid initially | invalid initially | invalid initially | no-op | `NEEDS_REVIEW` |

Conservative notes:

- `APPROVED -> REJECTED` should be deferred until proposal lifecycle rules are defined.
- `REJECTED -> APPROVED` should require a reopen to `NEEDS_REVIEW` first, then a separate approval.
- `ARCHIVED -> NEEDS_REVIEW` is safer than restoring directly to `APPROVED` because archive history does not prove the current business context is still valid.
- No-op requests should not write a new event by default. They can return `skippedNoop: true`.

## Review Event Recording

Every state-changing review update should create one `MatchSuggestionReviewEvent`.

Event fields:

- `matchSuggestionId`: existing saved suggestion id.
- `action`: mapped review action enum.
- `fromStatus`: previous `MatchSuggestion.status`.
- `toStatus`: new `MatchSuggestion.status`.
- `actorUserId`: authenticated ADMIN/MANAGER user id.
- `reasonCodes`: safe code array, if provided or required.
- `noteRedacted`: `null` in the first implementation unless a separate redacted-note policy is approved.
- `createdAt`: database default.

Suggested event rules:

- `REQUEST_REVIEW`: include safe reason codes when present, but allow no reason code.
- `APPROVED`: allow optional safe reason codes such as `REVIEWED_OK`, but do not require.
- `REJECTED`: require at least one safe reason code.
- `ARCHIVED`: require at least one safe reason code such as `STALE`, `DUPLICATE`, or `NO_LONGER_RELEVANT`.
- `REOPENED`: require a safe reason code such as `REVIEW_AGAIN`.

The update and event insert should happen in one transaction in the future implementation.

## Guard Strategy

Future mutation endpoints must be disabled by default and staging-only at first.

Recommended server guard:

- `MATCH_SUGGESTION_REVIEW_UPDATE_ENABLED=true`
- `MATCH_SUGGESTION_REVIEW_WRITE_TARGET=staging`
- authenticated user role is `ADMIN` or `MANAGER`
- request includes `confirmReviewAction: true`

Guard behavior:

- If either env guard is missing, unknown, production-like, or not staging, return a safe disabled response.
- Do not parse or execute a DB mutation when the guard fails.
- Do not set or modify Vercel environment variables in the implementation PR.
- Production review updates remain disabled until a separate owner-approved rollout.

Client/UI guard:

- Future controls should be hidden or disabled by default.
- If a frontend flag is added, use a separate flag such as `NEXT_PUBLIC_MATCH_SUGGESTION_REVIEW_UI_ENABLED=true`.
- The frontend flag is only a UI affordance. The server guard remains authoritative.

## Future Endpoint Shape

Prefer one focused endpoint:

```text
PATCH /api/matches/suggestions/[id]/review
```

Alternative if the repo style prefers POST-only mutation routes:

```text
POST /api/matches/suggestions/[id]/review
```

The read-only endpoints must remain unchanged:

- `GET /api/matches/suggestions`
- `GET /api/matches/suggestions/[id]`
- `GET /api/matches/suggestions/review-queue`

The future review endpoint should not accept proposal or email actions.

## Safe Request Body

Suggested request body:

```json
{
  "suggestionId": "validated-by-path-or-body",
  "action": "APPROVE",
  "toStatus": "APPROVED",
  "confirmReviewAction": true,
  "reasonCodes": ["REVIEWED_OK"],
  "noteRedacted": null,
  "expectedStatus": "NEEDS_REVIEW",
  "expectedUpdatedAt": "optional-safe-timestamp"
}
```

Validation rules:

- `suggestionId` must be a valid UUID from the route path. If also present in the body, it must match.
- `action` must be one of the supported safe action strings.
- `toStatus` must match the transition matrix for the action.
- `confirmReviewAction` must be exactly `true`.
- `reasonCodes` must be an array of safe uppercase code strings with a small max length.
- `noteRedacted` should be omitted or `null` in the first implementation.
- `expectedStatus` and `expectedUpdatedAt` can be used for stale-update detection.

Reason code examples:

- `REVIEWED_OK`
- `NEEDS_MORE_CONTEXT`
- `SKILL_GAP`
- `RATE_MISMATCH`
- `DATE_MISMATCH`
- `LOCATION_MISMATCH`
- `WRONG_ROLE`
- `DUPLICATE`
- `STALE_PROJECT`
- `STALE_PERSON`
- `NO_LONGER_RELEVANT`
- `OTHER`

## Forbidden Input And Output Fields

Future review update endpoints and UI controls must never accept, persist, or display these fields:

- raw Project text
- raw Person text
- company names
- person names
- email addresses
- CSV raw values
- email bodies
- source raw payloads
- normalized payloads
- local paths
- secrets
- connection strings
- full notes unless a separate redacted/sanitized note policy is designed

Reject any top-level request key matching raw/PII categories. Redact or reject nested values that look like addresses, local paths, connection strings, secrets, URLs, or free-form raw text.

## Safe Response Handling

Future endpoint responses should be safe and compact.

Success:

```json
{
  "mode": "saved-match-suggestion-review-update",
  "updated": true,
  "skippedNoop": false,
  "suggestion": {
    "shortId": "12345678",
    "status": "APPROVED",
    "reviewEventCount": 2
  }
}
```

No-op:

- Return `updated: false`, `skippedNoop: true`.
- Do not create an event for an unchanged status.

Disabled guard:

- Return a safe disabled message.
- Include no DB metadata.

Migration required:

- Return the existing safe `migrationRequired` shape.

Validation error:

- Return a safe validation category and a non-sensitive message.

Conflict/stale update:

- Return `409` with a safe stale/conflict message.
- Do not leak previous raw values.

Generic error:

- Return a safe generic failure message.
- Do not print Prisma internals, database metadata, connection details, full UUIDs, or raw payloads.

## UI Rollout Plan

Future UI controls should live in the saved suggestion detail/review queue area, not in the dry-run save panel.

Default state:

- Hidden or disabled by default.
- No active approve/reject/archive controls unless the frontend flag is enabled and the server guard is configured.

Suggested controls:

- `Keep suggested`
- `Needs review`
- `Approve`
- `Reject`
- `Archive`
- Optional `Restore` only for archived rows.

Confirmation:

- Show a confirmation dialog before mutation.
- Display only short ids, current status, target status, reason code, score, score band, warning count, and review reason count.
- Do not show raw Project/Person text or full notes.

After success:

- Refresh saved suggestions list.
- Refresh review queue.
- Refresh selected detail.
- Show safe result message and short suggestion id only.

Deferred UI:

- No Proposal creation button.
- No email draft button.
- No email send button.
- No bulk approve/reject/archive until a separate limit and confirm policy is designed.

## Test Strategy

Implementation PR tests should cover these areas before any production rollout.

Transition matrix:

- Every allowed transition returns the correct target status and event action.
- Every invalid transition is rejected.
- No-op transitions return `skippedNoop` and create no event.

Guard and role checks:

- Guard missing rejects before write.
- Non-staging target rejects before write.
- `confirmReviewAction: true` is required.
- ADMIN and MANAGER allowed.
- SALES, VIEWER, unauthenticated, and inactive users rejected.

Request safety:

- Invalid UUID rejected.
- Invalid action rejected.
- `toStatus` mismatch rejected.
- Reject/archive reason code requirement enforced.
- Raw/PII top-level fields rejected.
- Nested raw/PII values redacted or rejected according to helper policy.
- Full notes are not accepted until separately designed.

DB write boundary with mocks:

- Only `MatchSuggestion` status/timestamp/reviewer fields update.
- Exactly one `MatchSuggestionReviewEvent` is created for state-changing updates.
- No Project/Person writes.
- No Proposal writes.
- No DistributionLog writes.
- No import/source-record writes.
- No email/draft writes.

Response handling:

- success
- skipped/no-op
- disabled guard
- migrationRequired
- validation error
- conflict/stale update
- generic error

UI:

- Controls disabled by default.
- Frontend flag enabled state.
- Confirmation dialog required.
- Safe body construction.
- No raw/PII fields in body.
- Success refreshes saved suggestions and review queue.
- Disabled/migrationRequired/error states are safe.
- No Proposal/email controls are introduced.

Safety searches:

- No new migration files.
- No new unguarded mutation endpoints.
- No `prisma db push`.
- No `prisma migrate reset`.
- No Proposal/email/external/AI side effects.
- No real CSV files or private exports committed.

## Recommended Implementation PRs

1. `Add guarded match suggestion review update API`
   - Adds the guarded endpoint and unit tests with mocked DB.
   - Disabled by default and staging-only.
   - No UI controls yet.
   - No Proposal/email behavior.

2. `Add guarded match suggestion review controls`
   - Adds disabled-by-default UI controls and confirmation dialogs.
   - Uses the guarded review update endpoint.
   - No production enablement.

3. `Run staging review update smoke test`
   - Not a PR unless code fixes are needed.
   - Owner-confirmed staging only.
   - One synthetic saved suggestion update.
   - No cleanup unless separately instructed.

4. `Design proposal draft from approved suggestions`
   - Docs-only.
   - Defines target company/contact and sales mail account requirements.

## Open Questions

- Should `SALES` users ever be allowed to reject/archive suggestions they own, or should first rollout stay ADMIN/MANAGER only?
- Should `APPROVED -> REJECTED` be allowed before any Proposal exists, or should all reversals go through `NEEDS_REVIEW` first?
- Should archived restore use the last non-archived status from review events, or always restore to `NEEDS_REVIEW`?
- Should redacted notes be supported in the first implementation, or should reason codes be the only reviewer input?
