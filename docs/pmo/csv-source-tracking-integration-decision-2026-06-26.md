# CSV / Source Tracking Integration Decision (2026-06-26)

This is a decision packet only. It does not run schema changes, migrations,
DB writes, CSV apply, or production/staging/shared operations.

## Current Finding

Earlier status notes said CSV apply was blocked because source tracking tables
were missing. On the latest observed `origin/main`, the codebase now contains:

- `prisma/schema.prisma` models:
  - `ImportSource`
  - `ImportRun`
  - `SourceRecord`
  - `EntitySourceLink`
- migration:
  - `prisma/migrations/20260604193000_import_source_tracking_foundation/migration.sql`
- tests:
  - `scripts/import-source-tracking.test.ts`
  - `test:import-source-tracking`
- docs:
  - `docs/themes/source-tracking/import-source-tracking-schema.md`
  - `docs/themes/source-tracking/csv-import-dry-run.md`

This means the repository has the source-tracking foundation. It does **not**
prove that a specific local/test DB has the migration applied.

## Decision Needed

Before CSV apply can move forward, decide which target is the integration
target:

1. an existing local/test DB with source tracking tables already applied;
2. a fresh disposable local/test DB where migrations can be applied;
3. a docs-only/read-only dry-run path with no DB apply yet.

## Still HOLD

The following remain blocked without a separate approval:

- real schema/migration execution;
- `prisma migrate deploy`;
- `prisma db push`;
- CSV apply DB write;
- production/staging/shared DB access;
- source tracking table creation in any shared environment;
- raw data import using real customer CSV files.

## Safe Read-Only Next Checks

Allowed before a write/schema gate:

```powershell
npm.cmd run test:import-source-tracking
npm.cmd run test:csv-import-dry-run
```

If a DB target is proposed later, collect only sanitized evidence:

- target classification: local/test/shared/staging/production;
- database name category, not secret URL;
- whether source tracking tables exist;
- table existence check SQL, not table contents;
- rollback/cleanup plan before any write.

## Recommended Next Path

Use a two-step gate:

1. **Read-only validation gate**: run source tracking and CSV dry-run tests,
   confirm repo contracts, and prepare a target DB classification plan.
2. **Local/test schema/apply gate**: only after the user approves the exact
   local/test DB target, schema state, command, expected rows, and cleanup.

Do not combine schema preparation and CSV apply in one approval.
