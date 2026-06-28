# Production Read-Only QA Checklist for Ken (2026-06-26)

This checklist is for a normal user-side production check. It is not a request
for DB access, admin tooling, browser automation, token sharing, or any write
test.

## Start Only If All Are True

- You can open the normal production app URL yourself.
- You can log in through the normal login screen.
- The account is a VIEWER/read-only account.
- You will not share passwords, cookies, tokens, secret values, or network dumps.
- You will not click any button that saves, links, applies, imports, syncs,
  archives, deletes, updates, proposes, or changes data.

If any item above is not true, stop and report `BLOCKED`.

## Stop Immediately If

- Normal login does not work.
- Someone asks for a cookie, token, password, `.env` value, or auth workaround.
- A page can only be checked by saving or changing data.
- The app appears to be the wrong production deployment.
- A screen shows personal or secret information that should not be copied into a
  report.
- A serious error blocks the main screen from loading.

## What To Record

Use short, sanitized notes only:

- Date/time of the check.
- Production URL label or domain name only.
- Browser name, such as Chrome or Edge.
- Account role label only, such as VIEWER. Do not record username/password.
- Screen names visited.
- Result for each screen: `PASS`, `PASS_WITH_NOTES`, or `BLOCKED`.
- Short notes about visible errors. Do not paste cookies, tokens, headers, raw
  response bodies, or screenshots containing sensitive data.
- Confirmation that no write action was clicked.

## Checklist

| Step | What Ken Checks | Expected Result | Result |
| --- | --- | --- | --- |
| 1 | Open the normal production app URL. | The login screen or logged-in app appears. | Not run |
| 2 | Log in through the normal login form. | Login succeeds without any workaround. | Not run |
| 3 | Confirm the account is used read-only. | The check can proceed without changing data. | Not run |
| 4 | Open the main cases/projects list. | The list loads and looks usable. | Not run |
| 5 | Click one existing case/project row to view details. | The detail area opens for viewing only. | Not run |
| 6 | Look for write-capable actions on the list/detail screens. | Save/link/apply/archive/delete/update/propose actions are avoided. | Not run |
| 7 | Open SearchHistory, if the button is visible. | The SearchHistory panel opens, or a clear unavailable/empty state appears. | Not run |
| 8 | In SearchHistory, look only. Do not save. | Existing items or empty state are understandable; no save is clicked. | Not run |
| 9 | Open the market analysis page, if reachable from the app. | The page opens and shows summary/table information. | Not run |
| 10 | Return to the main screen. | Navigation back to the console works. | Not run |
| 11 | Note any visible error messages. | No critical error blocks read-only use. | Not run |
| 12 | Log out normally. | Logout completes without needing manual cookie/session handling. | Not run |

## Write Actions To Avoid

Do not click actions with labels or meanings like:

- Save
- Link
- Apply
- Archive
- Propose
- Update
- Sync
- Import
- Delete
- Create
- Edit
- Move
- Send

If avoiding these actions makes a screen impossible to verify, stop and report
`BLOCKED`.

## Result Template

```text
Production read-only QA result: PASS / PASS_WITH_NOTES / BLOCKED
Date/time:
Production URL label/domain:
Browser:
Account role label:
Screens checked:
- Main cases/projects list:
- Detail pane:
- SearchHistory:
- Market analysis:
Visible errors or notes:
Was any write action clicked? No
Blocker/follow-up, if any:
```

## Source Basis

Prepared from local read-only inspection of `origin/main` / baseline
`e2f96b98c605aa2b8c9183acca976dd3903fd548`, especially:

- `docs/pmo/production-readonly-qa-packet-2026-06-24.md`
- `docs/status/post143-next-gates-2026-06-26.md`
- `docs/status/post142-approved-gates-progress-2026-06-26.md`
- `docs/status/dbfree-verification-refresh-2026-06-26.md`
- `docs/status/search-history-current-status-2026-06-23.md`
- `docs/status/search-history-browser-qa-plan-2026-06-24.md`
- `docs/status/market-analysis-controls-2026-06-17.md`
- `PROGRESS.md`
