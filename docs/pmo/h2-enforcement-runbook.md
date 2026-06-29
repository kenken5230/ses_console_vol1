# H2 Enforcement Runbook

## Purpose

H2 protects the AI safety gate from being bypassed by Codex itself.

This runbook describes the GitHub settings Ken should enable after reviewing the Draft PRs for:

- `ai-safety-gate` GitHub Actions workflow
- `CODEOWNERS`
- `AI_PROJECT_PROFILE.md` H2 profile update

Codex must not change repository settings, branch protection, token scopes, or auto-merge settings.

## Scope

Repository: `kenken5230/ses_console_vol1`

Target branch: `main`

This runbook does not change:

- production/staging/shared DB
- schema/migrations
- env/secret values
- Vercel project settings
- application runtime code

## Preconditions

Before enabling protection, confirm:

1. The CI workflow PR is merged and the following checks exist on a test pull request:
   - `ai-safety-gate`
   - `typecheck`
   - `test`
   - `build`
2. The CODEOWNERS PR is merged.
3. `AI_PROJECT_PROFILE.md` still says delegated automerge is `PENDING / disabled for now`.
4. No secret value, token, cookie, or connection string is stored in the repo.

## GitHub Branch Protection Setup

Open GitHub:

1. Go to `kenken5230/ses_console_vol1`.
2. Open `Settings`.
3. Open `Branches`.
4. Create or edit the branch protection rule for `main`.

Enable these settings:

| Setting | Required value |
|---|---|
| Branch name pattern | `main` |
| Require a pull request before merging | enabled |
| Require approvals | enabled |
| Require review from Code Owners | enabled |
| Dismiss stale pull request approvals when new commits are pushed | recommended enabled |
| Require status checks to pass before merging | enabled |
| Require branches to be up to date before merging | recommended enabled |
| Required status checks | `ai-safety-gate`, `typecheck`, `test`, `build`, existing Vercel check if available |
| Require conversation resolution before merging | recommended enabled |
| Do not allow bypassing the above settings | enabled if available |
| Restrict who can push to matching branches | enabled if available; allow only Ken / trusted maintainers |
| Allow force pushes | disabled |
| Allow deletions | disabled |

Do not enable any option that lets Codex bypass branch protection.

## Token Permission Setup

Codex execution tokens should be fine-grained and should not have repository administration authority.

Use a fine-grained PAT or equivalent credential with the minimum necessary repo access.

Do not grant Codex tokens:

- Administration / repository settings permission
- Branch protection edit permission
- Webhooks/settings management permission
- Organization owner permission
- Secret management permission
- Billing permission

Allowed capabilities should be limited to what is needed for normal development:

- Read repository contents
- Create branches
- Push branches
- Open Draft PRs
- Comment on PRs/issues if needed
- Read checks/statuses

If merge is delegated later, it should happen only after H2/H3 are complete and only through branch protection, required checks, CODEOWNERS, and standing authorization rules.

## Optional Auto-Merge

Auto-merge may be considered only after:

1. H2 branch protection is enabled.
2. H3 standing authorization token handling is complete.
3. Required checks are stable.
4. CODEOWNERS review is required.
5. Rollback/revert path is verified.

Auto-merge must not bypass:

- `ai-safety-gate`
- `typecheck`
- `test`
- `build`
- Vercel production/preview checks
- CODEOWNERS review
- LARGE-change notification and decision record

## LARGE Change Handling

When `scripts/safety-gate.ps1` prints a LARGE CHANGE flag:

1. Confirm rollback or revert works before merge.
2. Confirm CI and Vercel are green.
3. Confirm no four-exception category applies.
4. Notify Ken after completion through the configured notification helper.
5. Record the LARGE decision without writing secret values.

## Validation After Setup

Create a small test PR that changes a harmless docs file.

Expected:

- Required checks appear.
- CODEOWNERS review requirement appears when protected files are touched.
- Direct push to `main` is rejected.
- Force push to `main` is disabled.
- Codex token cannot edit branch protection or repo settings.

Do not use production secrets or DB write for this validation.

## Rollback

If the protection blocks normal work unexpectedly:

1. Ken reviews the blocked check.
2. Ken adjusts the branch protection settings manually.
3. Do not ask Codex to remove or bypass the protection.

Rollback for this runbook itself is a normal docs revert.
