# SearchHistory DB-backed Plan

## Historical Context

This document was originally created when PR #55 was stale and the team needed a clean #55R plan.
At that time, the safe direction was to rebuild DB-backed SearchHistory from latest main instead of merging the old #55 branch directly.

That historical decision is still correct for #55 itself: do not revive or directly merge #55.

## Current Status After Later PRs

SearchHistory is no longer just a rebuild plan:

- PR #57 merged the DB-backed SearchHistory API, service, UI, and tests.
- PR #91 restored saved search condition application for filters, checked filters, focus selections, page size, sort key, and tab/scope.
- The current main implementation uses the existing Prisma `SearchHistory` model and does not require a schema change or migration.
- `npm.cmd run test:search-history` passes on the current main worktree during the 2026-06-23 status sync.

## Current Safety Requirements

Keep these requirements for any future SearchHistory work:

1. `GET /api/search-histories` must return only the logged-in user's own histories.
2. `POST /api/search-histories` must ignore spoofed client `userId`.
3. Public responses must not include row `userId`.
4. User-identifying keys inside `filters` must be sanitized.
5. Query text, sort key, filters payload, list limit, and result count must stay bounded.
6. UI must clearly distinguish loading, empty, error, unauthenticated, save, and apply states.
7. Browser QA must use normal login only. Do not use cookie injection, token injection, auth proxy, or auth bypass.
8. Real DB write smoke and real own-user isolation checks require explicit local/test DB target, fixture IDs, rollback/cleanup plan, and approval.

## Current Remaining Gates

| Gate | Status | Notes |
|---|---|---|
| Static/unit test | DONE | `npm.cmd run test:search-history` passes. |
| Browser QA | READY | Requires normal local login session; no auth bypass. |
| Real DB write smoke | WAITING_APPROVAL | Requires local/test DB target and fixture approval. |
| Real own-user isolation evidence | WAITING_APPROVAL | Requires real DB fixture setup or approved existing test records. |
| Production/staging/shared DB write | BLOCKED | Not allowed without explicit owner approval. |

## Do Not Do

- Do not merge or revive the old #55 branch.
- Do not treat this historical plan as proof that SearchHistory is still unimplemented.
- Do not perform production/staging/shared DB writes.
- Do not add a migration unless a later explicit design requires it.
