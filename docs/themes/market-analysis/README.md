# Market Analysis Theme

This theme covers read-only market analysis for SES sales data.

## Current Runtime Surface

| Surface | Path |
|---|---|
| Page | `app/market-analysis/page.jsx` |
| API | `app/api/market-analysis/route.ts` |
| Components | `components/market-analysis/` |
| Domain helpers | `lib/market-analysis/` |

## Docs

| File | Purpose |
|---|---|
| `research.md` | Current-state research and repo inventory |
| `data-inventory.md` | Available data fields and aggregation candidates |
| `analysis-axes.md` | Analysis axes and scoring ideas |
| `mvp-proposal.md` | MVP scope and expected UI/API shape |
| `implementation-plan.md` | Candidate file layout, API contract, and tests |

## Current Status

- Read-only market analysis page/API exists.
- It must not create proposals, edit Projects/Persons, send messages, call external APIs, or call AI APIs.
- Browser visual QA remains a follow-up because the in-app browser tool was not available in the recovery thread.
