# Sequence 2 Gmail Company Apply Design Pack - 2026-06-23

Observed at: 2026-06-23 JST

Scope: Gmail company candidate apply design before DB write. This pack does not approve or execute DB connection, DB write, apply execution, fixture creation, migration, schema/env/package/lockfile change, dashboard API implementation change, deploy, Ready, merge, close, cleanup, or worktree deletion.

## Purpose

Sequence 2 completes the design boundary for turning the current Gmail company candidate signal into a future supervised apply flow.

The current implementation remains read-only/advisory:

- `scripts/gmail-company-candidate.ts` infers a candidate for preview, audit, and fixture evaluation.
- `scripts/gmail-extract-preview.ts` may display the candidate name for operator review and performs no DB writes.
- `scripts/gmail-extract-unlinked.ts` includes anonymized candidate columns in dry-run/apply logs, but entity creation still uses the existing extraction fields through `lib/gmail-extract-entities.ts`.
- `scripts/gmail-extraction-quality-audit.ts` is read-only and rejects `--apply`.
- dashboard list/detail API expansion remains outside this sequence and requires separate approval.

## Recommended Apply Policy

Default recommendation until owner/PM/audit/PMO/TL decide otherwise:

| Policy item | Sequence 2 recommendation | Reason |
|---|---|---|
| Existing company link | Allow design for future apply only when the candidate resolves to one existing `Company`. | Smallest reversible write set; avoids creating noisy master data from inferred mail text. |
| New `Company` creation | Do not implement in the first apply PR. Treat as a separately approved option. | Candidate inference can be wrong, aliases/domains can be generic, and rollback is harder when new company/contact rows exist. |
| `CompanyAlias` resolution | Eligible only as a path to an existing `Company`, not as a new alias write. | Keeps apply scoped to linking, not master-data expansion. |
| `Company.mainEmailDomain` resolution | Eligible when the candidate source is `known_main_email_domain`, domain is non-generic, and it resolves to exactly one existing `Company`. | Strongest automated evidence currently available. |
| Body label company | Eligible only if it resolves to exactly one existing `Company` by normalized name or approved alias/domain. | Body text is user-provided extraction evidence, so it must not become free-form company creation. |
| Sender domain derived label | Preview-only for first apply PR. | Source is `LOW` confidence and does not prove a company record. |

The first implementation should be "existing-company link only". A later "create new Company" flow should require a separate design, UI copy, audit reason taxonomy, dedupe policy, and rollback/cleanup plan.

For the first implementation, keep `allowedSources` fixed to `known_main_email_domain` and `known_alias` only. Even when `body_label` can resolve to one existing company, treat it as preview-first evidence until a later implementation explicitly approves adding it to `allowedSources`.

## Candidate Eligibility Matrix

| Candidate source/confidence | Current source meaning | First apply eligibility | Required future evidence |
|---|---|---|---|
| `known_main_email_domain` / `HIGH` | Sender domain matched existing `Company.mainEmailDomain`. | Eligible after gate approval. | Exact existing company ID, source mail ID, domain-match reason, non-generic domain flag, one-target resolution. |
| `known_alias` / `HIGH` | Body/from/signature text matched existing company name or alias. | Eligible after gate approval. | Exact existing company ID, alias/name match reason, one-target resolution, no competing alias hit. |
| `body_label` / `HIGH` | Existing extraction body label contains a company-like value. | Preview-first; apply only if resolved to exactly one existing company. | Resolution method, normalized value match, no new company creation, operator confirmation. |
| `from_name` / `MEDIUM` | Sender name contained a company-like segment. | Advisory-only for first apply PR. | If later allowed, require explicit audited override and existing-company resolution. |
| `signature_company` / `MEDIUM` | Signature-like line contained a company designator. | Advisory-only for first apply PR. | If later allowed, require explicit audited override, existing-company resolution, and preview evidence. |
| `sender_domain` / `LOW` | Non-generic sender domain was converted to a label. | Advisory-only. | If later allowed, require owner decision, exact existing company resolution, and explicit override. |
| `generic_domain` / `LOW` | Generic sender domain such as Gmail/Yahoo/Outlook or `example.*`. | Block from apply; preview/count only. | User policy change would be required; first apply PR must not write these. |
| `none` / `NONE` | No usable candidate. | Block. | Not applicable. |

Generic domain, `LOW` confidence, signature fallback, and `fromName` fallback are intentionally not first-apply write inputs. They can remain visible in preview with reason codes so reviewers can judge quality without mutating data.

## Future Preview UI Design

The preview UI should be a supervised review surface, not an automatic dashboard field.

Recommended shape:

| UI element | Requirement |
|---|---|
| Candidate badge | Show source, confidence, and whether the candidate is apply-eligible. |
| Evidence panel | Show sanitized evidence labels: source, reason codes, generic-domain flag, matched existing company ID/name summary. Avoid raw mail body expansion by default. |
| Target count summary | Before submit, show total selected, eligible, skipped, blocked by source/confidence, blocked by generic domain, and unresolved company count. |
| Per-row decision | Default to no write. Operator must choose a row or batch after seeing eligibility. |
| Apply-disabled states | Disable submit for generic domain, `LOW`, unresolved company, ambiguous company, missing rollback plan, missing audit reason, or unapproved DB target. |
| User judgment prompt | Ask the owner/PM decision at policy level, not per-code threshold. Example: "Allow first apply to link only to existing companies matched by main domain/alias?" |

The existing dashboard list/detail API should not be changed in this sequence. A future UI should call a lazy candidate preview endpoint only when an operator opens the review surface.

## Future Apply Endpoint Contract

No endpoint is implemented here. If approved later, use a dedicated write endpoint rather than hiding apply in dashboard reads.

Recommended endpoint family:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/gmail/company-candidates/preview` | `GET` | Lazy read-only preview. Returns candidate metadata and eligibility summary. |
| `/api/admin/gmail/company-candidates/apply` | `POST` | Explicit write endpoint after DB gate approval. |

Recommended `POST` body shape:

```json
{
  "mailNotificationIds": ["..."],
  "mode": "existingCompanyLinkOnly",
  "allowedSources": ["known_main_email_domain", "known_alias"],
  "blockedSources": ["generic_domain", "sender_domain", "signature_company", "from_name", "none"],
  "minConfidence": "HIGH",
  "targetCount": 1,
  "reasonCode": "GMAIL_COMPANY_CANDIDATE_EXISTING_COMPANY_LINK",
  "confirmationToken": "operator-reviewed-local-test-only"
}
```

The first implementation should reject:

- absent `targetCount`;
- target count mismatch;
- more than a small first-smoke batch;
- `mode` other than `existingCompanyLinkOnly`;
- `allowedSources` containing generic, `LOW`, signature fallback, or `fromName` fallback sources;
- unresolved or ambiguous `Company`;
- production/staging/shared/unknown DB target;
- missing operator session or insufficient role;
- missing rollback plan evidence for the approved smoke.

## Audit Reason Taxonomy

Future writes should create an audit trail that can explain why a candidate became a link.

Required audit fields:

| Field | Requirement |
|---|---|
| Actor | Operator user ID or role category; do not store tokens/cookies. |
| Target | Mail notification ID and affected entity/link IDs. |
| Candidate source | Exact `GmailCompanyCandidateSource`. |
| Confidence | Exact `GmailCompanyCandidateConfidence` and score. |
| Reason codes | Candidate `reasonCodes`. |
| Policy mode | `existingCompanyLinkOnly` for first implementation. |
| Blocked counts | Counts by source/confidence/generic/unresolved/ambiguous/skipped. |
| Target count | Declared before write and recorded after write. |
| Rollback reference | The scoped rollback strategy and affected table list. |

Initial reason codes:

| Code | Meaning |
|---|---|
| `GMAIL_COMPANY_CANDIDATE_EXISTING_COMPANY_LINK` | Existing company was linked from an approved Gmail company candidate. |
| `GMAIL_COMPANY_CANDIDATE_DOMAIN_MATCH` | Existing `Company.mainEmailDomain` matched the sender domain. |
| `GMAIL_COMPANY_CANDIDATE_ALIAS_MATCH` | Existing company alias/name matched candidate evidence. |
| `GMAIL_COMPANY_CANDIDATE_BODY_LABEL_MATCH` | Body label was accepted after resolving to an existing company. |
| `GMAIL_COMPANY_CANDIDATE_OPERATOR_OVERRIDE` | Reserved for later, not allowed in first implementation. |

## Rollback Design

Rollback must be designed before any apply write and recorded in the gate evidence.

Minimum rollback requirements:

- List affected tables before execution. Candidate first implementation should avoid creating `Company`, `CompanyAlias`, or `CompanyContact`.
- Record exact target IDs and previous values before write.
- Update only rows whose current values still match the approved apply values.
- Retain audit logs by default; audit cleanup is separate and requires approval.
- If multiple entity types are supported later, separate rollback per entity type.
- No broad delete, truncate, reset, or cleanup command.

Likely first-write affected tables depend on the final apply target and must be confirmed before implementation. Candidate examples:

| Apply target | Potential affected fields | Rollback idea |
|---|---|---|
| Person owner company | `Person.ownerCompanyId` and possibly `Person.ownerContactId` | Restore previous owner IDs, or clear only if previous values were null and current values match approved company/contact. |
| Project upper company role | `ProjectCompanyRole.companyId/companyContactId` for an existing approved role row | Restore previous role row values, or remove only the single smoke-created role row if explicitly approved. |
| Extraction result annotation | `ExtractionResult.normalizedResult` or review metadata if implemented | Restore previous JSON/metadata snapshot for approved rows only. |

New `Company` creation would require separate rollback covering company row, aliases, contacts, references, and dedupe collisions. It is not part of the recommended first apply.

## Target Count Gate

Before any future apply smoke:

| Gate | Required value |
|---|---|
| First write smoke target count | `1` mail/entity target unless owner explicitly approves a larger local/test-only batch. |
| Preview count | Read-only count by source, confidence, generic-domain flag, eligibility, and unresolved/ambiguous company. |
| Apply request count | Must equal preview-approved `targetCount`. |
| Result count | Record success, skipped, blocked, failed, and rollback-ready counts. |
| Evidence privacy | Do not paste raw email addresses, full subjects, raw mail body, secrets, or customer text. |

If preview count and apply request count differ, the endpoint must fail closed.

## Test Scope

Already covered by static/DB-free tests:

- `scripts/gmail-extraction-quality.test.ts` checks candidate behavior for body label, `fromName`, known domain, alias, generic domain, and signature sources.
- The same test checks quality-audit read-only guards, no Prisma write calls in quality audit, and no raw candidate name leakage in anonymized reports.
- `scripts/gmail-extraction-quality-eval.ts` evaluates golden fixtures without Prisma or runtime apply flags.

Recommended additional test coverage for a future apply PR:

| Test type | Requirement |
|---|---|
| Eligibility unit tests | Source/confidence/generic/fallback matrix rejects blocked candidates. |
| Contract tests | Apply body rejects new company creation unless explicitly supported, rejects target count mismatch, and requires audit reason. |
| Static boundary tests | dashboard API must not inline company candidate preview fields without separate approval. |
| Read-only preview tests | Preview returns counts and sanitized evidence without DB writes. |
| Local/test write smoke | Separate owner-approved gate; target count, rollback, executor/auditor separation, and sanitized evidence required. |
| Rollback test | For the approved smoke target, rollback can restore exactly the approved row(s). |

DB write smoke is a separate gate and cannot be claimed by passing static tests.

## DB Write Smoke Separate Gate

This design pack does not approve DB connection or DB write. Before any DB-connected step:

1. Re-open the five-role check from Sequence 1.
2. Classify DB target without printing secret values.
3. Stop if target is production, staging without explicit staging approval, shared, unknown, or requires `.env*` content to be read.
4. Declare fixture/target IDs, target count, request body shape, expected before state, rollback plan, execution window, executor, and separate auditor.
5. Run read-only preflight first.
6. Obtain explicit owner approval for the write smoke after preflight evidence.

The future write smoke must be local/test-only and small-batch. Production/staging/shared writes remain prohibited unless a new explicit approval says otherwise.

## Dashboard API Boundary

Dashboard API implementation changes are forbidden in this sequence.

Future dashboard expansion requires separate approval because:

- candidate evaluation can increase payload size and recomputation on normal list reads;
- candidate evidence has privacy/audit implications;
- preview and apply must remain separate from ordinary dashboard reads;
- accidental dashboard inlining could make advisory candidates look authoritative.

Approved direction for later work:

- keep ordinary dashboard list/detail responses unchanged;
- add a lazy read-only preview endpoint only for intentional operator review;
- add a dedicated apply endpoint only after policy and DB write gates;
- keep apply writes out of `app/api/dashboard-data/route.ts`.

## User Decisions Needed Before Implementation

Owner/PM decision points:

| Decision | Recommended answer for first apply |
|---|---|
| Link existing company only, or create new company? | Existing company link only. |
| Allow generic domain candidates? | No, preview/count only. |
| Allow `LOW` confidence candidates? | No, preview/count only. |
| Allow signature fallback? | No for first apply; later explicit override only. |
| Allow `fromName` fallback? | No for first apply; later explicit override only. |
| Allow body label company if unresolved? | No; must resolve to one existing company. |
| Add candidate fields to dashboard API? | No in this sequence; separate approval only. |
| First write smoke target count? | One local/test-only target after read-only preflight and rollback approval. |
| Audit reason requirements? | Required for every future write. |
| Rollback owner/auditor? | Must be named before write; executor and auditor must be separate. |

Plain-language approval question for a later implementation:

**Should the first Gmail company apply implementation link only one local/test mail candidate to one already-existing company, using only high-confidence known domain/alias evidence, with generic/LOW/signature/fromName blocked from writes and dashboard API left unchanged?**

## Internal Five-Role Check

| Role | Check | Current status for this pack |
|---|---|---|
| Parent PM | Scope is design/static only; user decisions are policy-level and separated from DB execution. | OK. |
| Audit | No secret files, DB values, DB connection, apply execution, fixture creation, schema/env/package/lockfile change, deploy, PR state change, deletion, or worktree deletion. | OK; verify final diff and deletion diff. |
| PMO | Remaining gates and owner decisions are explicit; DB write smoke is separate. | OK. |
| Technical lead | Existing candidate contract stays advisory; first apply is scoped to existing-company link only; dashboard lazy boundary is preserved. | OK. |
| Executor | May create this doc, link it from status index/PROGRESS, and add DB-free static contract tests only. | OK. |

## Completion Boundary For Sequence 2

Sequence 2 can be marked complete only up to:

- Gmail company apply policy/design pack completed;
- existing-company-link-only recommendation recorded;
- generic domain, `LOW`, signature fallback, and `fromName` fallback write treatment recorded;
- preview UI, apply endpoint, audit reason, rollback, target count, test scope, DB write smoke gate, dashboard API boundary, and owner decisions recorded;
- optional DB-free static tests updated;
- no DB connection, no DB write, no apply execution, no fixture creation, no migration/schema/env/package/lockfile change, no dashboard API implementation change, no deploy, no Ready/merge/close, no deletion, and no worktree deletion performed.

Sequence 2 cannot be marked complete as apply implemented, DB preflight executed, DB write smoke passed, dashboard API expanded, or production/staging/shared operation approved.
