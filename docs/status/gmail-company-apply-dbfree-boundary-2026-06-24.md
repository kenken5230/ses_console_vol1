# Gmail Company Apply DB-free Boundary - 2026-06-24

## Scope

This change keeps Gmail company candidate apply policy DB-free. It does not add an apply endpoint, persistence path, migration, Prisma write, Gmail API call, package change, or environment/config change.

## Policy

Only candidates that satisfy all of the following may be considered apply-eligible by the pure helper:

- source is `known_main_email_domain` or `known_alias`
- confidence is `HIGH`
- `existingCompanyId` is present
- candidate source is not `generic_domain`
- candidate name is present

All other sources remain advisory-only, including:

- `LOW` confidence candidates
- generic-domain-derived candidates, meaning candidates whose `source` is `generic_domain`
- signature fallback
- `from_name` fallback
- body-label-only candidates
- known-domain or known-alias matches that do not carry an existing company id

This policy does not reject every candidate merely because the sender email uses a generic domain such as Gmail.
For example, `known_alias` means the candidate matched an existing company alias, so `known_alias` + `HIGH` confidence + `existingCompanyId` remains apply-eligible even if the sender address is on a generic email domain.

## Safety Boundary

- No new `Company` creation.
- No contact creation.
- No Prisma transaction or write in the candidate helper.
- Anonymous quality output omits both raw candidate names and existing company ids, exposing only presence flags.
- Existing dashboard/API boundary remains read-only; future apply work must add an explicitly reviewed write boundary in a separate PR.

## Verification

Run locally without DB/Gmail access:

```powershell
npm.cmd run test:gmail-extraction-quality
npm.cmd run typecheck
git diff --check
git diff --name-status --diff-filter=D
```
