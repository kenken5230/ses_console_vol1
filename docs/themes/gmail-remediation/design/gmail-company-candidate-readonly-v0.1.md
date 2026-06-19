# Gmail Company Candidate Read-Only Inference v0.1

## Scope

Gmail extraction now has a shared read-only company candidate inference helper for quality review surfaces.

The helper can use:

- existing body label extraction candidates
- sender `fromName`
- sender email domain
- known `Company.mainEmailDomain`
- known `CompanyAlias`
- signature-like company lines

## Non-Goals

This change does not alter persistence behavior.

- No schema migration.
- No Gmail sync/classify/extract apply behavior change.
- No project/person/company/contact update rule change.
- No automatic replacement of `ProjectExtraction.upperCompanyName`.
- No automatic replacement of `PersonExtraction.ownerCompanyName`.

Existing DB writes still use the original extraction fields in `lib/gmail-extract-entities.ts`.

## Candidate Contract

`inferGmailCompanyCandidate` returns:

- `candidateName`
- `source`
- `confidence`
- `confidenceScore`
- `reasonCodes`
- `isGenericDomain`

The candidate is advisory. It is intended for preview, audit, and fixture evaluation only.

## Source Priority

1. Known `mainEmailDomain` match.
2. Known alias/name match.
3. Existing body label company.
4. Company-like `fromName`.
5. Signature company line.
6. Non-generic sender domain derived label.
7. Generic sender domain as a weak no-name candidate.

Generic domains such as Gmail, Yahoo, Outlook, iCloud, and synthetic `example.*` domains produce a weak candidate without a company name.

## Privacy

Quality reports and fixture evaluation must not print candidate names, full bodies, email addresses, person names, or raw company names.

Allowed report fields are source, confidence, score, reason codes, generic-domain flag, and whether a candidate is present.

The interactive preview command may show the advisory candidate name because it already displays extraction preview fields for operator review and performs no DB writes.
