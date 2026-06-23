# Root README / Docs Index Draft Plan

Observed: 2026-06-24 JST
Branch: `codex/readme-index-draft-plan-20260624`

This is a docs-only draft for a future root `README.md` and `docs/README.md` navigation cleanup. It intentionally does not edit `README.md`, `docs/README.md`, or `PROGRESS.md`.

## Background

- Root `README.md` is not present on the observed `origin/main` worktree.
- `docs/README.md` is currently being rewritten by open PR [#105](https://github.com/kenken5230/ses_console_vol1/pull/105), so this draft avoids touching that file.
- `PROGRESS.md` is the current project snapshot and should stay focused on current facts, open risks, and next work choices.
- Open PR state is volatile. Root/docs indexes should link to GitHub PR views and approval-gate docs instead of embedding long-lived stale PR tables.

## User Navigation Goal

A non-technical user should be able to answer these questions without reading implementation files:

| User question | First place to look | Notes |
|---|---|---|
| What is the current project state? | [`../../PROGRESS.md`](../../PROGRESS.md) | Current base, open items, safety limits, next work candidates. |
| Where is the docs map? | [`../README.md`](../README.md) | Top-level docs index after #105 lands. |
| Which theme docs exist? | [`../themes/README.md`](../themes/README.md) | Theme entry points for SES sales console, Gmail remediation, matching, source tracking, market analysis. |
| Where are dated status reports? | [`../status/README.md`](../status/README.md) | Logs, gates, recovery reports, worktree cleanup inventory. |
| What safety rules apply? | [`../../AGENTS.md`](../../AGENTS.md), [`../../AI_WORK_RULES_SHORT.md`](../../AI_WORK_RULES_SHORT.md), [`../shared/README.md`](../shared/README.md) | Secret handling, DB/write/deploy gates, worktree deletion gates, coordination rules. |
| What open PRs need attention? | [GitHub open PRs](https://github.com/kenken5230/ses_console_vol1/pulls) | Prefer live GitHub state over duplicated docs. |
| What worktree cleanup is allowed? | [`../status/worktree-cleanup-inventory-2026-06-23.md`](../status/worktree-cleanup-inventory-2026-06-23.md), PR [#104](https://github.com/kenken5230/ses_console_vol1/pull/104) | Inventory and approval list only. No deletion without explicit approval. |

## Proposed Root README Shape

Future root `README.md` should be short and stable. Suggested sections:

1. `What this repository is`
   - One paragraph: SES sales console and related Gmail/search/matching/market-analysis support docs and app work.
   - Avoid detailed status here; status belongs in `PROGRESS.md`.
2. `Current status`
   - Link to `PROGRESS.md`.
   - Link to GitHub open PRs.
   - Say that dated history is in `docs/status/`.
3. `Where to go next`
   - Small table for status, docs index, theme docs, safety docs, release docs, worktree cleanup docs.
4. `Safety first`
   - Link to `AGENTS.md`, `AI_WORK_RULES.md`, `AI_WORK_RULES_SHORT.md`.
   - State that secrets, DB writes, migrations, deploys, Ready/merge/close, and worktree deletion are gated.
5. `Development notes`
   - Keep minimal. Link to docs/runbooks rather than duplicating commands.

Suggested root README table:

| Need | Link | Why |
|---|---|---|
| Current project snapshot | `PROGRESS.md` | The latest base, active risks, and next work candidates. |
| Documentation index | `docs/README.md` | Human navigation across docs folders. |
| Status and gates | `docs/status/README.md` | Dated reports, runbooks, merge/gate status, cleanup inventory. |
| Theme docs | `docs/themes/README.md` | Entry point for each product/theme area. |
| Shared safety and operations | `docs/shared/README.md` | Cross-theme quality and operation rules. |
| Open PRs | GitHub Pull Requests | Live approval/review state. |

## Proposed Docs Index Shape

After #105 lands, `docs/README.md` should prioritize "where to look" over exhaustive listing.

Recommended order:

1. `Start here`
   - `../PROGRESS.md`
   - `status/README.md`
   - `themes/README.md`
   - `shared/README.md`
2. `By purpose`
   - Current status and gates: `status/`
   - Theme requirements/design: `themes/`
   - Cross-theme quality/operations: `shared/`
   - Gmail ingest/classification: `gmail/`
   - Release readiness: `release/`
3. `Safety and approval gates`
   - DB writes, migrations, production/staging/shared environment changes, deploys, Ready/merge/close, and worktree deletion require the documented gates.
4. `Do not store here`
   - Secrets, env values, connection strings, tokens, raw personal data, raw mail bodies, DB dumps.

Avoid putting a large open-PR table directly in `docs/README.md`; link to the GitHub PR list and to any current merge/approval plan doc instead.

## Open PR / Approval Routing

Observed open PRs on 2026-06-24 JST:

| PR | Title | Draft | Navigation implication |
|---|---|---:|---|
| [#104](https://github.com/kenken5230/ses_console_vol1/pull/104) | Add worktree cleanup approval list | No | May add the approval-list cleanup doc and update `PROGRESS.md` / `docs/status/README.md`. Keep root/docs draft compatible with either pre- or post-merge state. |
| [#105](https://github.com/kenken5230/ses_console_vol1/pull/105) | Clarify docs README | No | Touches `docs/README.md`; future docs-index changes should wait for or rebase after this PR. |
| [#106](https://github.com/kenken5230/ses_console_vol1/pull/106) | Add Gmail company auto-apply contract guard | No | Route future Gmail apply guidance through Gmail/theme docs, not root README details. |
| [#107](https://github.com/kenken5230/ses_console_vol1/pull/107) | Add SearchHistory browser QA plan | No | Status/gate navigation should point to `docs/status/` and live PRs. |
| [#108](https://github.com/kenken5230/ses_console_vol1/pull/108) | Harden person owner preflight DB target guards | No | Safety and DB target gates belong in shared/status docs. |
| [#109](https://github.com/kenken5230/ses_console_vol1/pull/109) | Add Gmail message body fallback guard | No | Theme-specific behavior should stay outside root README. |
| [#110](https://github.com/kenken5230/ses_console_vol1/pull/110) | Add market analysis query guard tests | No | Theme navigation should lead through `docs/themes/market-analysis/`. |
| [#111](https://github.com/kenken5230/ses_console_vol1/pull/111) | Add Gmail classification characterization tests | No | Gmail classification docs belong under Gmail/theme paths. |
| [#112](https://github.com/kenken5230/ses_console_vol1/pull/112) | Add SearchHistory UI context guard | No | SearchHistory status should be linked from status docs. |
| [#113](https://github.com/kenken5230/ses_console_vol1/pull/113) | Harden import dry-run safety guards | No | Import/source-tracking safety should route through theme/shared docs. |
| [#114](https://github.com/kenken5230/ses_console_vol1/pull/114) | Add open PR merge approval plan | No | If merged, root/docs indexes can link to its plan instead of duplicating approval status. |
| [#115](https://github.com/kenken5230/ses_console_vol1/pull/115) | Add production guard contract test | No | Production guard routing belongs in safety/status docs. |
| [#116](https://github.com/kenken5230/ses_console_vol1/pull/116) | Add mutation entrypoint production guard contract | Yes | Keep Draft status visible only through GitHub/live PR lists. |
| [#117](https://github.com/kenken5230/ses_console_vol1/pull/117) | Add auth source contract test | No | Auth/source safety belongs in shared/status docs. |
| [#118](https://github.com/kenken5230/ses_console_vol1/pull/118) | Add Gmail person remediation production guard | No | Gmail remediation routing should stay theme-specific. |
| [#119](https://github.com/kenken5230/ses_console_vol1/pull/119) | Add safe-output contract test plan | No | Safe output rules should be linked from shared/status docs once merged. |

Review decisions were not recorded in the observed PR list output. Treat open non-draft PRs as "approval not confirmed here" unless GitHub shows an explicit review/merge decision.

## Safety Docs Routing

Recommended stable entry points:

| Topic | Link | Root README treatment |
|---|---|---|
| Agent operating rules | [`../../AGENTS.md`](../../AGENTS.md) | Link only; do not duplicate the full policy. |
| Short AI work rules | [`../../AI_WORK_RULES_SHORT.md`](../../AI_WORK_RULES_SHORT.md) | Link as the quick human-readable safety summary. |
| Full AI work rules | [`../../AI_WORK_RULES.md`](../../AI_WORK_RULES.md) | Link for detailed process and gates. |
| Shared docs | [`../shared/README.md`](../shared/README.md) | Link as cross-theme operations/quality index. |
| Quality policy | [`../shared/quality/two-pass-task-test-policy-v0.1.md`](../shared/quality/two-pass-task-test-policy-v0.1.md) | Link from implementation/test guidance, not from every page. |
| Coordination policy | [`../shared/operations/chat-progress-coordination-v0.1.md`](../shared/operations/chat-progress-coordination-v0.1.md) | Link from process/PMO guidance. |

Root README should state the gate categories plainly: secrets, DB writes, migrations/schema changes, production/staging/shared environment actions, deploys, Ready/merge/close, deletion, branch/worktree cleanup, auth/security changes.

## Status Docs Routing

`docs/status/README.md` should remain the index for dated and current status material. Suggested grouping:

| Group | Examples | Notes |
|---|---|---|
| Current gate summaries | Post-#95 summary, Sequence 1 DB pre-gate, Sequence 2 Gmail apply design, SearchHistory current status | These are the best user-facing "what remains" docs. |
| Dated logs | `progress-log-YYYY-MM-DD.md` | Historical and merge-result details. |
| Safety/runbooks | Link safety, preflight/smoke plans, cleanup inventory | Keep explicit "not executed" and approval-gate wording. |
| Recovery/audit reports | UI restore, recovery alignment, dependency audit | Historical reference; avoid putting them in root README unless currently relevant. |

## Theme Docs Routing

`docs/themes/README.md` should be the entry point for product/theme areas:

| Theme | Path | Root/docs index role |
|---|---|---|
| SES sales console | `docs/themes/ses-sales-console/` | Main app requirements, read/write contracts, UI/API links. |
| Gmail remediation | `docs/themes/gmail-remediation/` | Gmail company/person remediation design and operations. |
| Matching | `docs/themes/matching/` | Matching requirements, design, testing, proposal traceability. |
| Source tracking/import | `docs/themes/source-tracking/` | Source record/import/dry-run docs. |
| Market analysis | `docs/themes/market-analysis/` | Market analysis research, axes, MVP, implementation plan. |

Root README should not list every theme file. It should link to `docs/themes/README.md` and mention the major themes in one line.

## Worktree Cleanup Routing

Current safe routing:

- Cleanup inventory: [`../status/worktree-cleanup-inventory-2026-06-23.md`](../status/worktree-cleanup-inventory-2026-06-23.md)
- Approval list PR: [#104](https://github.com/kenken5230/ses_console_vol1/pull/104)
- Cleanup action rule: no worktree deletion, branch deletion, reset, clean, stash, or checkout restore without explicit approval and exact target list.

Future root/docs indexes should link to the cleanup inventory or approval list, but should not copy command blocks into root README. Commands become stale and risky when detached from their approval context.

## Suggested Follow-Up Sequence

1. Wait for #105 or rebase after it before editing `docs/README.md`.
2. Decide whether root `README.md` should be created as a short navigation page.
3. If #104 merges, point cleanup navigation at the merged approval-list doc in addition to the inventory.
4. If #114 merges, use the merged open-PR merge approval plan as the stable approval-routing doc.
5. Keep live PR status out of static docs except for time-stamped PMO notes like this one.

## Non-Goals For This Draft

- No edits to existing files.
- No DB/API connection.
- No `.env` or secret-file access.
- No Ready, merge, close, deploy, branch deletion, or worktree deletion.
- No attempt to resolve or reorder open PRs.
