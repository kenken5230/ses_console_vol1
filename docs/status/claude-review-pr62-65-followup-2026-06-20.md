# Claude Review PR62-65 Follow-up 2026-06-20

## Scope

- Base: latest `origin/main` at `fc12550`, after `git fetch origin`.
- Worktree: `C:\Users\ke919\OneDrive\ドキュメント\1234project\__claude_review_followup_20260620`.
- Branch: `codex/claude-review-pr62-65-followup-20260620`.
- No DB write, migration, deploy, SMTP real send, or external send was performed.

## Review Items

| Item | Result | Note |
|---|---|---|
| #63 doc says #62 is Draft/unmerged | Fixed | `#62` is merged at `bce3d04`, before `#63` at `6d73001`. `theme-progress-2026-06-19.md` now reflects that order. |
| #64 work-days required/default mismatch | Documented | Current save path treats `expectedWorkDaysPerWeek` as optional: `ProjectCreateDrawer.jsx` has no `required`, API parsing returns `null` for blank, and Prisma field is nullable. The unused `data/mockProjects.js` reference form still has `required: true` and default `週5日`; it should not be used as the implementation source of truth. |
| #65 short ASCII search precision | Improved | Short ASCII terms still require token boundaries by default. `sql` now also matches known DB technology words such as `MySQL`, `PostgreSQL`, and `MSSQL`. `AI` still does not match `ARI`, `Gmail`, or `mail`. |
| `lib/search-token-match.ts` type annotations | Improved | Public helpers and internal token helpers now have explicit TypeScript annotations. `textMatchesSearchQuery` is retained as a compatibility alias of `textIncludesSearchTerm`. |
| nodemailer 9 SMTP real-send verification | Not performed | Real SMTP/external sending is intentionally left unverified in this PR. Verify with an approved controlled SMTP target in a later task. |
| `workDays` filter uses `.includes()` | No code change | Current options are fixed Japanese labels (`週5日`, `週4日`, `週3日`), so substring matching has low practical risk. Revisit only if free-text or overlapping labels are introduced. |

## Remaining Risks

- SMTP behavior after nodemailer 9 remains unverified by real delivery.
- `data/mockProjects.js` still contains an unused legacy create-form shape. Removing or migrating that fixture should be a separate cleanup PR because it is outside this review follow-up scope.
- Search synonym coverage is intentionally narrow. Only the reviewed `sql` embedded technology case was added.

## Verification

- `git diff --check`: passed.
- `npm.cmd run test:search-token-match`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: passed.
- `npm.cmd run build`: passed with a dummy process-only `DATABASE_URL`.
- `npm.cmd audit --audit-level=high`: passed, 0 vulnerabilities.
- `npx.cmd prisma validate`: passed with a dummy process-only `DATABASE_URL`.
- `npx.cmd prisma generate`: passed with a dummy process-only `DATABASE_URL`.
