# Dependency Security Audit 2026-06-15

## Scope

`npm.cmd audit --audit-level=high` で検出された依存脆弱性を、DB write/migrationなしで改善する。

Base branch:

- `origin/codex/recovery-main-alignment-20260614`

Working branch:

- `codex/dependency-security-audit-20260615`

## Initial Findings

| Package path | Severity | Cause | Initial fix path |
|---|---|---|---|
| `next` / `postcss` | critical/moderate | `next@14.2.15` is affected by multiple Next advisories and pulls vulnerable `postcss`. | Upgrade `next` to latest `16.2.9` if typecheck/test/build pass. |
| `tsx` / `esbuild` | high | `tsx@4.21.x` pulls vulnerable `esbuild`. | Upgrade `tsx` to latest `4.22.4` and override `esbuild` to `0.28.1` if needed. |
| `prisma` / `@prisma/dev` / `hono` / `@hono/node-server` | moderate | `prisma@7.8.0` is latest, but its dev dependency tree pulls vulnerable Hono packages. | Keep Prisma latest and use narrow `overrides` for `hono` and `@hono/node-server`. Do not downgrade Prisma. |

Node/runtime compatibility checked locally:

- `node -v`: `v22.20.0`
- `next@16.2.9` engines: `node >=20.9.0`
- `next@16.2.9` peers: React `^18.2.0 || ... || ^19.0.0`
- `tsx@4.22.4` engines: `node >=18.0.0`
- `@hono/node-server@1.19.13` engines: `node >=18.14.1`
- `hono@4.12.25` engines: `node >=16.9.0`

## Task Plan

| Task | Action | Task test | Status |
|---|---|---|---|
| D-001 | Record audit findings and split remediation tasks. | This document exists and references exact packages. | Done |
| D-002 | Upgrade direct dependencies: `next`, `tsx`. | `npm.cmd install --ignore-scripts` and `npm.cmd audit --audit-level=high`. | Done |
| D-003 | Add narrow overrides for transitive vulnerable packages if audit still flags Prisma/Hono/esbuild/PostCSS. | `npm.cmd audit --audit-level=high`: `found 0 vulnerabilities`. | Done |
| D-004 | Update Next 16 dynamic route handlers for promised `context.params`. | `npm.cmd run typecheck`, `npm.cmd run build`. | Done |
| D-005 | Verify Prisma/TypeScript/test/build after dependency changes. | Prisma validate/generate, typecheck, test, build. | Done |
| D-006 | Update status docs and PR body with final result. | `git diff --check`, clean status before commit. | Done |

## Changes Applied

| File | Change |
|---|---|
| `package.json` | `next` `14.2.15` -> `16.2.9`; `tsx` `^4.21.0` -> `^4.22.4`; added `overrides`. |
| `package-lock.json` | Refreshed dependency tree. |
| `tsconfig.json` | Accepted Next 16 type settings: `jsx: react-jsx`, `target: ES2017`, `.next/dev/types/**/*.ts`. |
| `next-env.d.ts` | Accepted Next 16 generated route type reference. |
| dynamic route handlers | Updated `[id]` handlers to `await context.params`. |

Overrides:

```json
{
  "@hono/node-server": "1.19.13",
  "esbuild": "0.28.1",
  "hono": "4.12.25",
  "postcss": "8.5.15"
}
```

## Final Verification

| Gate | Result | Notes |
|---|---|---|
| `npm.cmd audit --audit-level=high` | PASS | `found 0 vulnerabilities` |
| `npx.cmd prisma validate` | PASS | Schema valid |
| `npx.cmd prisma generate` | PASS | Prisma Client generated |
| `npm.cmd run typecheck` | PASS | Uses `next typegen && tsc --noEmit` |
| fresh `.next` typecheck | PASS | `.next` removed, then `npm.cmd run typecheck` regenerated route types |
| `npm.cmd test` | PASS | Gmail/import/matching tests passed |
| `npm.cmd run build` | PASS | Next `16.2.9` production build passed |
| local start smoke | PASS | `npm.cmd start -- -p 3102`, `http://localhost:3102` returned 200 |

## Safety

- No DB write.
- No migration.
- No production env changes.
- No `npm audit fix --force`; changes are explicit and reviewed.
