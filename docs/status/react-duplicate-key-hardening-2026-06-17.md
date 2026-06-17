# React Duplicate Key Hardening 2026-06-17

## Summary

React の `Encountered two children with the same key` warning を避けるため、console の table と detail pane で使用している sibling key を UI-only で補強した。

## Scope

Touched files:

- `components/ProjectTable.jsx`
- `components/PersonTable.jsx`
- `components/UnclassifiedMailTable.jsx`
- `components/ProjectDetailPane.jsx`
- `components/PersonDetailPane.jsx`
- `docs/status/react-duplicate-key-hardening-2026-06-17.md`

Not touched:

- `components/SearchHistoryModal.jsx`
- `components/market-analysis/*`
- `app/page.jsx`
- `app/api/dashboard-data/route.ts`
- Prisma schema, migrations, env, secrets

## Implementation Notes

- Table row keys now prefer `dbId ?? id` where existing props expose both, with index fallback only for missing identifiers.
- Table header keys include column index so duplicate or empty labels cannot collide.
- Location/tag/chip-like maps no longer use value-only keys; they include the parent row/detail key, index, and rendered value.
- Detail pane meta/highlight/group/item keys include the parent entity key and map index so repeated labels or section titles remain safe.
- No display text, click behavior, API contract, DB write path, or migration was changed.

## Validation

Requested commands:

- `git diff --check`
- `npm.cmd run typecheck`
- `npm.cmd test`
- `npm.cmd run build`

Local process execution is blocked in this Codex Windows sandbox. `functions.shell_command` fails with `windows sandbox: Restricted read-only access requires the elevated Windows sandbox backend`, and Node `child_process` fails with `spawn EPERM` for `git`/`npm`. Because of that, the requested validation commands could not be executed locally in this run.

## Safety

- UI-only: yes
- DB write: none
- Migration: none
- Deploy: none
- Ready for review: not performed
- Merge/close/worktree deletion: not performed
