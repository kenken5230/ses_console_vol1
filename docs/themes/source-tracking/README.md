# Source Tracking Theme

This folder keeps design notes for importing SES sales data from multiple source systems into the normalized console database.

The theme covers:

- Gmail-derived source mail tracking.
- CSV import dry-run and source tracking previews.
- Future Notion read-only sync tracking.
- Manual entry traceability.
- Generic source record to entity mapping.

Safety rules for this folder:

- Do not include real email bodies, full subjects, customer names, company names, person names, email addresses, tokens, connection strings, or secrets.
- Prefer anonymized counts, schema names, and design decisions.
- Keep implementation proposals separate from migration execution notes.

Current files:

- `source-tracking-inventory.md`: current-state inventory and CLI output contract.
- `source-tracking-design.md`: future source tracking design and migration proposal notes.
- `csv-import-dry-run.md`: CSV import dry-run MVP design, source-preview mode, supervised source-record apply, read-only import review, validation policy, and future apply paths.
- `import-source-tracking-schema.md`: additive Prisma schema foundation plus the generic read-only review surface for import sources, runs, records, and entity links.
