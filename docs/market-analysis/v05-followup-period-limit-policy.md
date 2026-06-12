# Market Analysis v0.5 Follow-up: Period, Optional Limit, Cumulative Counts

## Purpose

This note records the additional follow-up requirements before implementation. Use it as the safety checklist for this task.

## Requirements

- Default market analysis period should be the latest 3 months when `fromMonth` / `toMonth` are not provided.
  - Example on 2026-06-12: `fromMonth=2026-04`, `toMonth=2026-06`.
- Remove fixed `100 / 500 / 1000` limit choices from the UI.
- Keep an optional free-input count limit for cases where the user wants to cap DB reads.
  - Empty limit means no `limit` query is sent.
  - API should use `take` only when `limit` is a positive integer.
- Show cumulative record counts somewhere in the summary.
  - Use read-only DB `count` from `2026-01` onward.
  - Exclude `ARCHIVED`.
  - Apply `focusOnly` to cumulative project count when enabled.
- Keep the existing safety boundaries:
  - No DB change.
  - No migration.
  - No DB write.
  - No API write endpoint.
  - Do not touch `app/globals.css`, `/matches`, CSV import, project create/edit, mail generation/sending, or dashboard API.
  - Do not use #29 MatchSuggestion tables.

## Design

- Period filter:
  - API and page both default to the latest 3 months.
  - Explicit URL/query values override the default.
  - Reset returns the period to the latest 3 months.
- Optional limit:
  - UI uses a number input.
  - URL/share URL includes `limit` only when a positive value is entered.
  - API response may include the applied `limit` as `null` when not specified.
- Cumulative counts:
  - `summary.cumulativeProjectCount`
  - `summary.cumulativePersonCount`
  - `summary.cumulativeFromMonth`
  - These counts are overall read-only counts from `2026-01`, not ranking row counts.

## Task Checklist

- [x] Record requirements in this markdown before implementation.
- [x] Add latest-3-month default period and optional limit parsing to the API adapter.
- [x] Use `take` only when API `limit` is specified.
- [x] Return read-only cumulative counts from `2026-01`.
- [x] Replace the fixed limit select with a free number input.
- [x] Reset period filters back to the latest 3 months.
- [x] Show cumulative counts in summary cards.
- [x] Keep URL sync/share URL behavior for period and optional limit.
- [x] Update market-analysis tests.
- [x] Run individual market-analysis tests.
- [x] Run typecheck / lint / test / build.

## Notes

- The optional count limit is a manual performance escape hatch, not the default data scope.
- The default data scope is period-based, not count-based.
- Cumulative counts must not select names, raw text, source payload, or other unsafe details.
