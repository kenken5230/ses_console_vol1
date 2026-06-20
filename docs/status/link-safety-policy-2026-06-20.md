# Company Contact Link Safety Policy - 2026-06-20

## Scope

This change localizes shared safety conditions for Person owner company/contact links and Project company/contact role links in `lib/link-safety-policy.ts`.

Centralized conditions:

- Writer roles: `ADMIN`, `MANAGER`
- Blocked company trade statuses: `NG`, `NEEDS_REVIEW`, `SUSPENDED`
- Link write production runtime checks for `NODE_ENV`, `VERCEL_ENV`, and target `production`
- Forbidden raw or sensitive payload keys such as `rawMailBody`, `freeNote`, and `customerData`
- Shared sensitive value patterns used by link request validation and output checks

## Intent

The goal is to make future safety-condition additions easier by keeping the small, repeated policy pieces in one place. The Person API/UI and Project API still own their route-specific request shapes, feature flags, error messages, and write behavior.

This is intentionally not a larger permission framework. Project role derivation, Person stale-write checks, audit log details, and route-specific guards remain in their existing modules.

## Safety Notes

- No DB write was performed.
- No migration or schema change was added.
- No deploy or real HTTP smoke was performed.
- UI behavior is unchanged; existing gates now read the shared writer-role and blocked-status policy.
