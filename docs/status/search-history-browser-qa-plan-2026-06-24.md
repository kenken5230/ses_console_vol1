# SearchHistory Browser QA Plan 2026-06-24

## Purpose

Run Browser QA for the current DB-backed SearchHistory implementation without DB writes and without authentication bypass.

This plan is limited to browser-observable behavior that can be checked through a normal login session. It does not perform real `POST /api/search-histories` writes, migrations, deploys, PR Ready transitions, merges, or worktree cleanup.

## Current Implementation Summary

SearchHistory is already implemented on current `origin/main` after #57/#91/#102. The old #55/#55R rebuild wording is historical reference only.

| Area | Current state |
|---|---|
| API | `GET /api/search-histories` and `POST /api/search-histories` exist in `app/api/search-histories/route.ts`. |
| Auth | Both routes call `requireAnyRole` for `ADMIN`, `MANAGER`, `SALES`, and `VIEWER`. |
| User scoping | `lib/search-history.ts` lists and creates histories with `userId: user.id` from the authenticated session. |
| Public response | `publicSearchHistory()` omits row `userId` and sanitizes user-identifying filter keys. |
| UI | `SearchHistoryModal` loads, displays, saves, and applies histories. |
| Toolbar wiring | `SearchToolbar` stores the current target scope, keyword, filters, page size, sort key, and result count in `sessionStorage` before opening the modal. |
| Apply wiring | `app/page.jsx` reapplies keyword, target tab, filter values, checked quick filters, focus, page size, and sort key, then resets the current page to 1. |
| Schema | Uses the existing Prisma `SearchHistory` model. No schema change or migration is required. |
| Static test | `npm.cmd run test:search-history` is the focused non-DB test gate. |

## Non-Negotiable Boundaries

- Use normal login only.
- Do not use auth bypass, cookie injection, token injection, localStorage/session tampering for auth, auth proxying, or direct session fabrication.
- Do not read, print, copy, or summarize `.env`, `.env.*`, key/certificate, credential, secret, DB dump, or local cloud/SSH credential files.
- Do not perform DB writes.
- Do not run migrations.
- Do not deploy.
- Do not mark any PR Ready.
- Do not merge.
- Do not delete worktrees.
- Do not edit `PROGRESS.md`, `docs/status/README.md`, or `docs/README.md` for this QA task.

## Preconditions

- Browser QA runs against a local or otherwise approved environment where the tester can log in normally.
- The tester has a legitimate test account for each role/user isolation check that will be performed.
- If existing SearchHistory rows are needed for list/reapply/user separation checks, they must already exist in an approved local/test database before this no-write Browser QA run starts.
- The tester records the app URL, commit SHA, branch, browser name/version, and test account labels. Do not record passwords, tokens, cookies, or secret values.

## Browser QA Steps

1. Start the app in the approved QA environment.
2. Open the app in a fresh browser profile or private window.
3. Log in through the normal UI.
4. Confirm no cookies, tokens, or session values were manually injected.
5. Open the main search/list screen.
6. For each available target tab that maps to SearchHistory scope, verify the search history button opens the modal:
   - Projects / `PROJECTS`
   - Persons / `PERSONS`
   - Unclassified mails / `MAILS`
7. For each target tab, set a representative keyword, quick filter, detailed filter, focus option if available, page size, and sort option.
8. Open SearchHistory and confirm the modal summary reflects the currently selected conditions.
9. Do not click the save button in this no-write run. Record that the save affordance is visible and enabled/disabled state is reasonable.
10. If approved pre-existing history rows exist for the logged-in user, confirm the modal lists only rows for the current target scope.
11. Apply a pre-existing history row and confirm the visible search state updates:
    - keyword
    - target tab
    - checked quick filters
    - detailed filter values
    - focus selections
    - page size
    - sort option
    - current page reset to page 1
12. Switch to a target scope that has no approved pre-existing rows and confirm the empty state appears without console errors.
13. Validate failure state without DB writes by using a non-writing environment failure, such as stopping the local app server after the modal has been opened once, then reopening/reloading the modal and confirming a user-visible fetch error appears. Restart the app afterward.
14. Log out through the normal UI.
15. Log in as a second legitimate test user, if available, and repeat list checks. Confirm histories visible to user A are not visible to user B unless the approved fixture explicitly says otherwise.
16. Log out normally.

## Check Matrix

| Check item | No-write Browser QA method | Expected result |
|---|---|---|
| Real history save | Verify save affordance, current-condition summary, and POST boundary without clicking save. Full POST save is not executed because DB writes are prohibited in this plan. | Save action remains a documented deferred DB smoke item; no DB write occurs during Browser QA. |
| History list | Use approved pre-existing rows for the logged-in user and current scope. | Modal lists relevant rows, newest first, with readable chips and timestamps. |
| Reapply history | Click apply on an approved pre-existing row. | Search UI state changes to the saved conditions and modal closes. |
| Empty state | Use a scope/user with no approved pre-existing rows. | Empty state is displayed and there are no console errors. |
| Failure state | Trigger non-writing network/server failure during GET. | Error state is displayed; app remains recoverable after reload/server restart. |
| User separation | Log in normally as user A and user B with approved fixture rows. | Each user sees only their own histories. No row owner identifier is exposed in public UI or response bodies. |

## Evidence To Capture

- Screenshot of the logged-in main screen before opening SearchHistory.
- Screenshot of SearchHistory modal current-condition summary for each tested scope.
- Screenshot of list state with approved pre-existing rows, if available.
- Screenshot of reapply result after applying a history row.
- Screenshot of empty state.
- Screenshot of failure state.
- Browser console result for each run: no unexpected `error` entries, or a captured list of expected errors during the intentional failure-state check.
- Network panel evidence for `GET /api/search-histories`:
  - request method and URL path/query only
  - HTTP status
  - response shape summary, not raw secret-bearing values
  - confirmation that no response body exposes `userId`
- Network panel evidence that no `POST /api/search-histories` was sent during the no-write run.
- Notes identifying browser, app URL, commit SHA, branch, and sanitized test account labels.

Do not capture passwords, cookies, bearer tokens, session values, `.env` values, database connection strings, or secret headers.

## Items Not Executed Now

| Item | Reason |
|---|---|
| Clicking save / real `POST /api/search-histories` | It writes to DB, and this Browser QA plan is explicitly no-write. |
| Creating SearchHistory fixture rows | It writes to DB. Use already-approved existing local/test fixtures only. |
| Real DB write smoke | Requires explicit approval of DB target, fixture IDs, exact request body, cleanup/rollback plan, and auditor. |
| Real own-user isolation fixture setup | Requires approved two-user fixture records or an equivalent approved test setup. |
| Migration or schema change | Current implementation uses the existing `SearchHistory` model and this task is QA planning only. |
| Deploy / Ready / merge | Outside this task scope and explicitly prohibited. |
| Auth bypass, cookie injection, token injection | Prohibited because Browser QA must use normal login only. |
| Worktree deletion/cleanup | Outside this task scope and explicitly prohibited. |

## Pass Criteria

- Tester logs in through the normal login flow.
- No auth bypass, cookie injection, token injection, or fabricated session is used.
- No DB write occurs; network evidence shows no `POST /api/search-histories`.
- SearchHistory modal opens for the expected target scopes.
- Current-condition summary matches the visible search state before opening the modal.
- Existing approved histories list correctly by scope.
- Applying an existing approved history restores the expected keyword, filters, focus, page size, sort, target tab, and page reset behavior.
- Empty state is understandable and stable.
- Failure state is understandable and recoverable.
- User A cannot see User B histories in the approved fixture scenario.
- No unexpected browser console errors are present.
- `npm.cmd run test:search-history`, `git diff --check`, `git diff --name-status --diff-filter=D`, and `git status -sb` are recorded for this documentation change. This plan task was verified after restoring local dependencies in the isolated worktree.

## Residual Risks

- This plan does not prove that a new row can be saved, because clicking save is a DB write and is intentionally deferred.
- User separation evidence depends on approved pre-existing fixture rows. Without such rows, the no-write run can only confirm absence/empty state for the available user.
- Failure-state coverage is limited to non-writing network/server failure and does not prove every server-side error branch.
- Browser QA may reveal visual text encoding or copy issues; fixing them is outside this task's write scope and should be filed separately.
- Production/staging/shared DB behavior remains unverified and blocked without explicit owner approval.
