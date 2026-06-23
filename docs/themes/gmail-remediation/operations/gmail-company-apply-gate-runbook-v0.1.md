# Gmail Company Candidate Apply Gate Runbook v0.1

## Purpose

This runbook records the review gates for any future Gmail company completion apply PR that wants to use the current company candidate inference.

The current candidate remains advisory/read-only. It is not connected to apply persistence, DB writes, dashboard write paths, or automatic company linkage.

This document is for parent PM, audit, PMO, and TL confirmation before implementation. It should not be converted into fine-grained technical prompts for end users.

## Apply Policy Decisions

Before candidate output can drive an apply write, reviewers must decide:

- Whether apply may link only to an existing `Company`, or whether it may create a new `Company`.
- Whether candidates from generic domains are blocked, preview-only, or allowed only with explicit audited override.
- Whether `LOW` confidence candidates are blocked, preview-only, or allowed only with explicit audited override.
- Whether signature fallback candidates are eligible for apply, and under which confidence and evidence requirements.
- Whether `fromName` fallback candidates are eligible for apply, and under which confidence and evidence requirements.
- Whether each accepted source must resolve to an existing `Company.mainEmailDomain`, `CompanyAlias`, or exact company record before apply.

Recommended default until reviewers decide otherwise:

- Existing-company link only.
- No new `Company` creation from Gmail candidate inference.
- Generic domain, `LOW` confidence, signature fallback, and `fromName` fallback remain advisory-only.
- Apply writes require an explicit candidate source and reason-code audit trail.

## DB Write Gate

Any future apply write that uses the candidate must be gated by all of the following:

- Environment is local or isolated test only.
- Production, staging, and shared databases are prohibited for candidate-driven apply write tests.
- Target count is declared before execution, with a small bounded batch for first smoke.
- Read-only preflight captures candidate count, target IDs, source distribution, confidence distribution, and generic-domain count without exposing raw personal data.
- Rollback plan is documented before execution, including affected table names, record identifiers, and the exact reversal strategy.
- Auditor is separate from the executor. The executor does not self-approve the write.
- Evidence is recorded after execution: target count, success count, skipped count, rollback readiness, and whether any unexpected source/confidence entered the write set.

If any gate is missing, the apply write must not run.

## Dashboard API Boundary

Do not inline advisory company candidates into ordinary dashboard list or detail responses by default.

Keep a lazy GET candidate API boundary for future UI review because it:

- Fetches candidate evaluation only when an operator intentionally opens the review surface.
- Avoids increasing dashboard payload size and recomputation on normal list reads.
- Separates read-only candidate evidence from apply/write APIs.
- Makes audit logging and privacy review easier to reason about.

The lazy GET may remain read-only even after an apply API exists. Apply should use an explicit write endpoint with its own gate checks, not an incidental dashboard response field.

## Future Apply PR Review Checklist

Parent PM, audit, PMO, and TL should confirm the following before approving an implementation PR:

- The PR is explicit about advisory/read-only inputs becoming apply-eligible inputs.
- The PR states whether it supports existing-company link only or new `Company` creation.
- The PR blocks or explicitly gates generic domain, `LOW` confidence, signature fallback, and `fromName` fallback candidates.
- The PR has local/test-only write evidence and no production/staging/shared DB write evidence.
- The PR documents target count, rollback, and auditor separation for any write smoke.
- The PR preserves the dashboard lazy GET boundary and does not hide candidate apply semantics inside dashboard read APIs.
- The PR has no schema, migration, or persistence expansion beyond the reviewed apply scope.

## Non-Goals

- This runbook does not approve any DB write.
- This runbook does not define a production rollout.
- This runbook does not change API, schema, package, or application code.
- This runbook does not require end users to choose confidence thresholds or fallback rules.
