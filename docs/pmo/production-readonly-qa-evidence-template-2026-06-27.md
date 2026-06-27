# Production Read-Only QA Evidence Template (2026-06-27)

This template records the result of a normal-login production read-only QA pass.
It does not authorize auth bypass, cookie/token handling, DB writes, guarded write
routes, Vercel env changes, redeploys, schema changes, migrations, or destructive
operations.

Use this template only after production login is available through a normal
authorized user session.

## Scope Confirmation

| Item | Value |
| --- | --- |
| QA date/time | TBD |
| Tester role | Human user / browser-capable AI with normal authorized login |
| Production URL | `https://ses-console-vol1.vercel.app/` |
| Deployed commit / deployment label | TBD |
| Browser / viewport | TBD |
| Login method | Normal login only |
| Auth bypass / cookie injection / token injection used | Must be `No` |
| Production/staging/shared write performed | Must be `No` |
| Secrets/cookies/tokens captured in evidence | Must be `No` |

## Read-Only Screen Checklist

| Area | Expected read-only result | Result | Notes |
| --- | --- | --- | --- |
| Login | Login succeeds without bypass | Not run | |
| Cases/projects list | List renders without requiring a write action | Not run | |
| Detail pane | Opens a selected row and shows read-only details | Not run | |
| SearchHistory UI | Opens read-only or shows clear unavailable/empty state | Not run | |
| Market analysis | Opens and shows summary/table area | Not run | |
| Navigation/header | No broken or misleading primary navigation | Not run | |
| Console/runtime errors | No critical runtime error blocking read-only use | Not run | |
| Network failures | No unexpected 5xx on read-only page load/navigation | Not run | |
| Write actions | Save/link/apply/archive/sync/import/delete/propose/update actions not clicked | Not run | |

## Sanitized Evidence

Do not paste screenshots, browser storage, cookies, tokens, authorization headers,
raw personal data, raw email bodies, full DB URLs, or secret values into this
section.

Record only sanitized facts:

- Screens visited:
  - TBD
- Visible blocker message, if any:
  - TBD
- Console/network summary without headers/cookies/tokens:
  - TBD
- Whether a guarded write action was visible but avoided:
  - TBD
- Follow-up issue/PR needed:
  - TBD

## Result

Choose one:

- `PASS`: all read-only checks completed; no critical blocker.
- `PASS_WITH_NOTES`: read-only checks completed but follow-up improvements are needed.
- `BLOCKED_LOGIN`: normal login failed; do not attempt auth bypass.
- `BLOCKED_RUNTIME`: app/login succeeded but read-only screens are blocked by runtime errors.
- `BLOCKED_POLICY`: verification would require a write, secret handling, or bypass.

Selected result: `TBD`

## Stop Conditions

Stop immediately and report if any of these occurs:

- normal login fails;
- a cookie/token/proxy/auth bypass seems necessary;
- production URL or deployment target is unclear;
- a screen can only be verified by clicking a write action;
- network evidence would require copying cookies/tokens/authorization headers;
- personal or secret data would be exposed in the evidence.

## Relationship To Other Docs

- Procedure and allowed scope:
  `docs/pmo/production-readonly-qa-packet-2026-06-24.md`
- Production login/env recovery:
  `docs/pmo/vercel-production-login-recovery-runbook-2026-06-26.md`
- Current approval gates:
  `docs/pmo/next-approval-gates-2026-06-26.md`
