# Production Read-Only QA Packet (2026-06-24)

This packet defines the next safe production verification step. It does not
authorize DB writes, auth bypass, deploy actions, or destructive operations.

## Purpose

Several recent tasks are locally validated, but production verification still
needs a normal-login, read-only pass. The goal is to confirm that the deployed
application opens and key screens render without using any bypass or write
route.

## Allowed Scope

- Use the normal production URL and normal user login only.
- Confirm the app loads after login.
- Confirm the main cases/projects list renders.
- Confirm detail panes open read-only.
- Confirm SearchHistory UI opens read-only, if visible.
- Confirm market analysis page opens read-only, if reachable.
- Record visible UI errors, console errors, failed network calls, or obvious
  regression symptoms.

## Explicitly Forbidden

- Auth bypass, cookie injection, token injection, or local proxy login.
- Any production/staging/shared DB write.
- Clicking guarded write actions such as save, link, apply, archive, propose,
  update, sync, import, delete, or destructive menus.
- Running write smoke against production.
- Reading or outputting secrets, tokens, cookies, or `.env` values.
- Changing Vercel, GitHub, DNS, environment variables, DB schema, migrations,
  package/lockfile, or deployment settings.

## Stop Conditions

Stop the QA and report instead of continuing if any of these occur:

- Normal login is unavailable.
- The page requires auth bypass or token/cookie handling.
- The only way to verify a screen is to perform a write.
- The production URL does not match the expected deployment.
- The UI displays personal/secret data that should not be shared in a report.
- A critical runtime error appears before the read-only screens can load.

## Evidence To Collect

Use sanitized evidence only:

- production URL label, not secrets;
- current deployed commit if visible from Vercel/GitHub;
- browser and viewport;
- screen names visited;
- pass/fail status for each screen;
- console/network error summary without cookies/tokens;
- whether any write-capable button was avoided.

## Suggested Checklist

| Item | Expected Result | Result |
| --- | --- | --- |
| Normal login | Login succeeds without bypass | Not run |
| Cases/projects list | List renders read-only | Not run |
| Detail pane | Opens without write action | Not run |
| SearchHistory UI | Opens read-only or clear unavailable state | Not run |
| Market analysis | Opens and shows summary/table area | Not run |
| Console/network | No critical runtime error | Not run |
| Write actions | Not clicked | Not run |

## Output Format

After QA, report:

- `PASS`, `PASS_WITH_NOTES`, or `BLOCKED`;
- screens checked;
- blockers or regressions;
- whether any write action was clicked (`must be no`);
- follow-up task if blocked.

## Current Gate

This packet is READY for a human or browser-capable AI to execute only if
normal production login is available. If login is not available, keep this as
`WAITING_FOR_LOGIN` and continue other READY tasks.
