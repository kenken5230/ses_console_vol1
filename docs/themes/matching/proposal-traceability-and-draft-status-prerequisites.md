# Proposal Traceability And Draft Status Prerequisites

## Purpose

This document defines the schema and workflow prerequisites that should be settled before implementing Proposal draft creation from approved saved `MatchSuggestion` records.

It follows the proposal draft design in `proposal-draft-from-approved-match-suggestions-design.md`, but remains docs/design only. It does not add migrations, schema changes, API routes, UI controls, DB write code, Proposal creation, email draft generation, email sending, external API calls, AI API calls, Vercel env changes, real CSV/Notion mapping, or real CSV files.

## Current Gaps

The current Proposal draft design cannot safely move to implementation until these open points are resolved:

- `Proposal` does not directly link back to `MatchSuggestion`.
- `ProposalStatus` does not include a separate `DRAFT` value.
- `Proposal.targetCompanyId` is required and must not be guessed from raw Project text.
- `Proposal.salesMailAccountId` is required and must not be guessed or created during match suggestion conversion.
- Duplicate prevention is weaker without explicit match suggestion traceability.

## Traceability Options

### Option A: Nullable `matchSuggestionId` on `Proposal`

Add a nullable foreign key from `Proposal` to `MatchSuggestion`.

Example future schema direction:

```prisma
model Proposal {
  matchSuggestionId String? @map("match_suggestion_id") @db.Uuid
  matchSuggestion   MatchSuggestion? @relation(fields: [matchSuggestionId], references: [id], onDelete: SetNull)

  @@index([matchSuggestionId])
}
```

Benefits:

- Simple and readable lineage from Proposal to the approved suggestion that created it.
- Easy duplicate check for one Proposal draft per source suggestion.
- Easy audit display in Proposal detail and MatchSuggestion detail.
- Smallest schema addition if one approved suggestion should create at most one active Proposal draft.

Tradeoffs:

- Less flexible if one suggestion may legitimately create multiple Proposals for different target companies or sales mail accounts.
- A plain unique constraint on `matchSuggestionId` would block legitimate retries unless partial unique indexes or status-aware rules are added manually.
- Does not preserve multiple source reasons if a Proposal is later associated with more than one suggestion.

### Option B: Bridge table such as `ProposalSourceMatchSuggestion`

Add a join table linking Proposal records to one or more MatchSuggestions.

Example future schema direction:

```prisma
model ProposalSourceMatchSuggestion {
  id                String @id @default(uuid()) @db.Uuid
  proposalId        String @map("proposal_id") @db.Uuid
  matchSuggestionId String @map("match_suggestion_id") @db.Uuid
  role              String @default("created_from") @db.VarChar(40)
  createdByUserId   String? @map("created_by_user_id") @db.Uuid
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  proposal        Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  matchSuggestion MatchSuggestion @relation(fields: [matchSuggestionId], references: [id], onDelete: Restrict)

  @@unique([proposalId, matchSuggestionId, role])
  @@index([matchSuggestionId, role])
  @@map("proposal_source_match_suggestions")
}
```

Benefits:

- Best auditability when one Proposal can have multiple safe sources.
- Supports later roles such as `created_from`, `supporting_evidence`, or `review_reference` without changing Proposal fields again.
- Avoids overloading `Proposal.notes` or unsafe metadata fields.
- Allows more nuanced duplicate policies while keeping history explicit.

Tradeoffs:

- Requires an extra table and migration.
- Slightly more code in read/detail APIs and duplicate checks.
- If first rollout only needs one source suggestion per Proposal, it is more structure than strictly necessary.

### Option C: No schema change, store only safe metadata

Create a Proposal using existing fields and store no direct relation to MatchSuggestion.

Benefits:

- No migration required.
- Fastest path to first implementation.

Tradeoffs:

- Weakest auditability.
- Duplicate prevention must rely on Project/Person/target/sales account only.
- Harder to explain why a Proposal exists from a saved suggestion review history.
- Risk of drifting into unsafe `notes` usage to preserve context.
- Harder to support skipped-existing behavior tied to a specific approved suggestion.

## Recommendation

Recommend Option B if the team wants strong long-term auditability before Proposal creation.

Reasoning:

- Proposal creation is a business write and should have durable, queryable lineage to the approved match suggestion.
- A bridge table avoids stuffing traceability into free-form notes or safe-but-weak metadata.
- It supports future cases where one Proposal is justified by multiple source suggestions or source records.
- It allows a clean audit page from both directions: Proposal to source suggestion, and MatchSuggestion to resulting Proposal.

A pragmatic alternative is Option A for a smaller first migration if the owner confirms that one approved suggestion should create at most one active Proposal draft. If Option A is chosen, do not store traceability in `Proposal.notes`, and do not infer traceability only from Project/Person pairs.

Avoid Option C for supervised proposal creation except as a temporary prototype that never writes production data.

## Duplicate Prevention

### With direct traceability

Duplicate checks should use both lineage and business identity.

Recommended checks:

- If a Proposal is already linked to the same `matchSuggestionId` and is active, return `skippedExisting`.
- If a Proposal already exists for the same `personId`, `projectId`, `targetCompanyId`, and `salesMailAccountId` with an active status, return `skippedExisting`.
- If a linked Proposal is terminal, require an explicit owner-approved re-entry policy before creating a new one.

Active Proposal statuses should initially include:

- `PROPOSED`
- `ENTERED`
- `INTERVIEW_SCHEDULING`
- `INTERVIEWED`
- `OFFERED`

Terminal statuses should initially include:

- `REJECTED`
- `WITHDRAWN`
- `JOINED`

This status grouping should be tested and documented before implementation.

### Without direct traceability

If schema change is deferred, duplicate prevention can only use business identity:

- `personId`
- `projectId`
- `targetCompanyId`
- `salesMailAccountId`
- active Proposal status set

This prevents obvious duplicate active proposals, but it cannot prove which approved MatchSuggestion caused the Proposal. It also cannot provide a strong idempotency key for repeated proposal-draft requests from the same suggestion.

## Draft Status Evaluation

The current `ProposalStatus` enum has `PROPOSED` but not `DRAFT`.

### Option 1: Use `PROPOSED` as the initial draft-like status

Benefits:

- No status migration required.
- Matches current default Proposal behavior.
- Keeps first Proposal draft implementation smaller.

Risks:

- `PROPOSED` may imply that a proposal has already been sent or formally offered, depending on business usage.
- It may blur the boundary between internal draft and externally proposed work.
- It may complicate future DistributionLog/email state because there is no clear pre-send status.

### Option 2: Add `DRAFT` to `ProposalStatus`

Benefits:

- Cleanly separates internal Proposal draft from sent/proposed business state.
- Provides a safer STOP condition before email draft/send flows.
- Makes UI wording and review queues clearer.
- Reduces chance of mistaking a created draft for an externally proposed record.

Risks:

- Requires an enum migration.
- Requires review of existing Proposal list filters and status assumptions.
- Requires careful rollout to avoid breaking existing code that assumes `PROPOSED` is the first status.

## Draft Status Recommendation

Recommend adding a `DRAFT` status before supervised Proposal draft creation if the business meaning of `PROPOSED` includes any external or customer-facing action.

If `PROPOSED` already means internal draft in the current product vocabulary, it can be used temporarily, but the implementation PR must document that no email draft, DistributionLog, or send action has occurred. The safer long-term model is:

```text
DRAFT -> PROPOSED -> ENTERED -> INTERVIEW_SCHEDULING -> INTERVIEWED -> OFFERED -> JOINED
```

with `REJECTED` and `WITHDRAWN` as terminal or side exits.

Adding `DRAFT` requires a separate migration PR and owner-approved DB apply. This PR does not add that migration.

## Target Company Resolution Policy

`Proposal.targetCompanyId` is required. Future implementation must not infer it from raw Project text, raw mail text, company names, email domains, or CSV/Notion raw values.

Allowed resolution paths:

1. Use a structured `ProjectCompanyRole` with role `PROPOSAL_TARGET` only if it already exists, is reviewed, and is unambiguous.
2. Let an authorized reviewer manually select a target company from an existing safe structured Company record in a future UI.
3. Stop and return a safe `targetCompanyRequired` response when no unambiguous safe structured target exists.

Do not create Company records in the Proposal draft endpoint. Do not update Project company roles in the Proposal draft endpoint. Do not use raw text matching to guess target company.

Target contact should remain optional initially. If selected, it must be an existing structured contact related to the chosen target company. Do not infer target contact from email bodies, raw signatures, CSV values, or free-form notes.

## Sales Mail Account Resolution Policy

`Proposal.salesMailAccountId` is required. Future implementation must not create, update, or infer mail accounts from raw email values.

Allowed resolution paths:

1. Authorized reviewer manually selects an existing active sales mail account in a future UI.
2. Use an existing deterministic rule only if it is based on structured, reviewed ownership data and returns exactly one active sales mail account.
3. Stop and return a safe `salesMailAccountRequired` response when no safe account is selected or resolved.

The Proposal draft endpoint must not create `MailAccount`, `DistributionLog`, email draft, or sent-mail records. It must not set or use send-related fields.

## Migration Needs

If Option B is accepted, a later migration PR should add a bridge table like `proposal_source_match_suggestions`.

If Option A is accepted, a later migration PR should add nullable `matchSuggestionId` on `proposals` plus an index and relation.

If `DRAFT` is accepted, a later migration PR should add `DRAFT` to `proposal_status` and update any app code assumptions in a separate implementation PR.

Migration guardrails:

- Additive only.
- No existing table drops.
- No destructive enum rewrite.
- No required columns on populated existing tables.
- No DB apply by Codex unless explicitly requested by the owner for a specific environment.
- No `prisma db push`.
- No `prisma migrate reset`.

## STOP Conditions Before Implementation

Stop before implementing Proposal draft creation if:

- Traceability option is not selected.
- Draft status policy is not selected.
- Migration needs are unresolved.
- Target company cannot be resolved from reviewed structured data or manual selection.
- Sales mail account cannot be selected or resolved safely.
- The source MatchSuggestion is not `APPROVED`.
- The source MatchSuggestion is archived.
- The operation would require raw Project text, raw Person text, company names, person names, emails, CSV raw values, email bodies, source raw payloads, normalized payloads, local paths, secrets, connection strings, or full notes.
- Duplicate active Proposal checks cannot be enforced.
- Email draft or send behavior would be required.
- External or AI APIs would be required.
- Production enablement is requested without a separate owner-approved rollout.

## Recommended Next PRs

1. `Add proposal traceability schema foundation`
   - Adds either the bridge table or nullable direct relation.
   - Adds `DRAFT` only if the owner chooses that status policy.
   - Migration file only; no DB apply by Codex.

2. `Add read-only proposal-source traceability API`
   - Optional if UI needs to display Proposal-to-MatchSuggestion lineage before writes.
   - GET-only and redacted.

3. `Add guarded proposal draft creation API`
   - First Proposal write path.
   - Disabled by default and staging-only.
   - Requires approved MatchSuggestion, target company, sales mail account, duplicate check, and explicit confirmation.
   - No email draft or send.

4. `Run staging proposal draft smoke test`
   - Not a PR unless fixes are needed.
   - One synthetic approved suggestion only.
   - No production.

5. `Add disabled-by-default proposal draft UI control`
   - Only after the guarded API exists.
   - No email draft/send controls.

## Open Questions

- Does the owner prefer bridge-table traceability or a direct nullable `Proposal.matchSuggestionId`?
- Does `PROPOSED` currently mean internal draft or externally proposed state?
- Should a Proposal draft require manual target company selection in the first UI rollout?
- Should a sales mail account always be manually selected initially?
- Should a future `CONVERTED` MatchSuggestion status be added after Proposal draft creation, or should linkage alone be enough?
