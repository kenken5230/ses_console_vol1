# Project Company Contact Role Link Smoke Runbook

Date: 2026-06-20

Scope: safe operation notes for `PATCH /api/projects/[id]/company-contact-role`.

No real DB write smoke was executed in this implementation PR. Any future real DB write smoke requires separate written approval with the exact target, fixture IDs, operator session, rollback owner, and execution window.

## Hard Stop Conditions

Do not proceed from classification/preflight into any write step when any item below is true:

- DB target classification has not been recorded from sanitized evidence.
- The only "test" signal is `NODE_ENV=test` or `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=test`.
- `DATABASE_URL` is missing, malformed, production-like, staging-like, shared, or unknown.
- The DB host, DB name, branch, schema, or query options contain production/shared signals such as `prod`, `production`, `live`, `primary`, or a known shared/staging marker.
- Staging write is proposed without separate explicit staging approval, execution window, rollback owner, and evidence plan.
- `AUTH_SECRET` is missing or would need to be printed, copied, pasted, or stored to continue.
- The operator session is not a normal logged-in `ADMIN` or `MANAGER` application session.
- Browser QA would require auth bypass, cookie injection, token injection, or an auth proxy.
- Fixture IDs, current `Project.updatedAt`, existing same-role state, rollback owner, or AuditLog retention plan are not approved.
- Parent PM, executor, audit, PMO, and technical lead gate has not recorded OK.
- Ready for review, merge, deploy, close, cleanup, or worktree deletion is being bundled into the smoke run.

If any hard stop condition is present, record `Blocked` and do not run the write.

## Current Implementation

- Route: `PATCH /api/projects/[id]/company-contact-role`.
- Auth: `ADMIN` and `MANAGER` only.
- Feature guard: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED=true`.
- Route guard recognizes `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=local`, `test`, or `staging`; this runbook allows a write attempt only after sanitized DB classification and approval. Staging write requires separate explicit approval.
- Production refusal: `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=production`, `NODE_ENV=production`, or `VERCEL_ENV=production` is rejected before JSON parsing.
- Intended transaction writes: `project.update` to touch `Project.updatedAt`, `projectCompanyRole.create`, and `auditLog.create`.
- AuditLog is retained and is not deleted by this flow.

## Non-Executed Smoke Status

The real DB write smoke was not executed. This PR performed code-level and mock DB validation only.

The current implementation includes the guarded Project detail UI and code/mock validation. No schema change, migration, deploy, staging operation, production operation, or real DB write smoke was performed.

## Target Database Classification

Classify the runtime that will execute the request before selecting fixtures, opening Browser QA, or preparing a write.

Record only sanitized values:

| Item | Allowed to record | Must not record |
| --- | --- | --- |
| DB URL | Presence and classification only | Full `DATABASE_URL`, username, password, token, query secrets |
| DB host | Host locality category and sanitized host signal category | Raw host, credentials, or full URL |
| DB name | Database/path name category | Full connection string |
| DB query params | Param keys only, or approved non-secret branch/schema categories | Raw values that may contain secrets |
| Runtime | `NODE_ENV` and `VERCEL_ENV` category | Environment dump |
| Feature guard | Whether enabled is exactly true and target category | Unrelated env values |
| Auth config | `AUTH_SECRET` present/missing/invalid-length only | Secret value, cookies, JWTs, tokens |

### No-Connect DB Classification Command

Use this command as the canonical DB target classifier unless a later PM-approved revision replaces it. It parses `DATABASE_URL` only, does not connect to the database, and must not be modified to print the full URL, username, password, raw host, query values, tokens, or secrets.

```powershell
@'
const productionSignals = ["prod", "production", "live", "primary"];
const sharedSignals = ["shared", "common", "global"];
const stagingSignals = ["staging", "stage", "preview"];
const testSignals = ["test", "testing", "qa", "fixture", "sandbox"];
const localSignals = ["local", "localhost", "dev", "development"];
const localHostCategories = new Set(["localhost", "loopback", "local-docker"]);

function containsAny(value, signals) {
  const text = String(value || "").toLowerCase();
  return signals.some((signal) => text.includes(signal));
}

function classifyHostCategory(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host) return "unknown";
  if (host === "localhost" || host.endsWith(".localhost")) return "localhost";
  if (host === "::1" || host === "[::1]" || /^127\./.test(host)) return "loopback";
  if (host === "host.docker.internal" || host.endsWith(".docker.internal")) return "local-docker";
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) return "private-network";
  return "remote";
}

function classifyTextCategory(value) {
  if (!value) return "unknown";
  if (containsAny(value, productionSignals)) return "production";
  if (containsAny(value, sharedSignals)) return "shared";
  if (containsAny(value, stagingSignals)) return "staging";
  if (containsAny(value, testSignals)) return "test";
  if (containsAny(value, localSignals)) return "local";
  return "unknown";
}

function classifyEnvCategory(value) {
  if (!value) return "missing";
  return classifyTextCategory(value);
}

function classifyWriteTarget(value) {
  if (!value) return "missing";
  const category = classifyTextCategory(value);
  return ["local", "test", "staging", "production", "shared"].includes(category) ? category : "unknown";
}

const rawDatabaseUrl = process.env.DATABASE_URL || "";
const result = {
  classifier: "project-company-contact-role-link-db-target-v1",
  connectsToDatabase: false,
  databaseUrl: { present: Boolean(rawDatabaseUrl), parseable: false },
  targetClassification: "unknown",
  decision: "blocked",
  stopReason: "missing_DATABASE_URL",
  host: { category: "unknown", signalCategory: "unknown", rawHostPrinted: false },
  database: {
    databaseNamePresent: false,
    databaseNamePrinted: false,
    databaseNameCategory: "unknown"
  },
  query: {
    keys: [],
    valuesPrinted: false,
    valueSignalCategory: "unknown"
  },
  runtime: {
    nodeEnvCategory: classifyEnvCategory(process.env.NODE_ENV),
    vercelEnvCategory: classifyEnvCategory(process.env.VERCEL_ENV)
  },
  writeGuard: {
    enabledIsExactlyTrue: process.env.PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_ENABLED === "true",
    targetCategory: classifyWriteTarget(process.env.PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET)
  },
  redaction: {
    printsFullDatabaseUrl: false,
    printsUsername: false,
    printsPassword: false,
    printsRawHost: false,
    printsQueryValues: false,
    printsTokensOrSecrets: false
  }
};

try {
  const parsed = new URL(rawDatabaseUrl);
  result.databaseUrl.parseable = true;

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, "").split("/")[0] || "");
  const queryKeys = Array.from(new Set(Array.from(parsed.searchParams.keys()).sort()));
  const queryValueSignalCategory = classifyTextCategory(Array.from(parsed.searchParams.values()).join(" "));

  result.host.category = classifyHostCategory(parsed.hostname);
  result.host.signalCategory = classifyTextCategory(parsed.hostname);
  result.database.databaseNamePresent = Boolean(databaseName);
  result.database.databaseNameCategory = classifyTextCategory(databaseName);
  result.query.keys = queryKeys;
  result.query.valueSignalCategory = queryValueSignalCategory;

  const safetyCategories = [
    result.host.signalCategory,
    result.database.databaseNameCategory,
    classifyTextCategory(queryKeys.join(" ")),
    queryValueSignalCategory
  ];

  if (safetyCategories.includes("production")) {
    result.targetClassification = "production";
    result.stopReason = "production_signal";
  } else if (safetyCategories.includes("shared")) {
    result.targetClassification = "shared";
    result.stopReason = "shared_signal";
  } else if (safetyCategories.includes("staging")) {
    result.targetClassification = "staging";
    result.stopReason = "staging_requires_separate_explicit_approval";
  } else if (localHostCategories.has(result.host.category) && result.database.databaseNameCategory === "test") {
    result.targetClassification = "test";
    result.decision = "eligible-next-gate";
    result.stopReason = "none";
  } else if (localHostCategories.has(result.host.category) && result.database.databaseNameCategory === "local") {
    result.targetClassification = "local";
    result.decision = "eligible-next-gate";
    result.stopReason = "none";
  } else {
    result.targetClassification = "unknown";
    result.stopReason = "unknown_target";
  }
} catch {
  result.stopReason = rawDatabaseUrl ? "malformed_DATABASE_URL" : "missing_DATABASE_URL";
}

console.log(JSON.stringify(result, null, 2));
'@ | node
```

Fixed output schema:

```json
{
  "classifier": "project-company-contact-role-link-db-target-v1",
  "connectsToDatabase": false,
  "databaseUrl": {
    "present": true,
    "parseable": true
  },
  "targetClassification": "local | test | staging | production | shared | unknown",
  "decision": "eligible-next-gate | blocked",
  "stopReason": "none | missing_DATABASE_URL | malformed_DATABASE_URL | production_signal | shared_signal | staging_requires_separate_explicit_approval | unknown_target",
  "host": {
    "category": "localhost | loopback | local-docker | private-network | remote | unknown",
    "signalCategory": "local | test | staging | production | shared | unknown",
    "rawHostPrinted": false
  },
  "database": {
    "databaseNamePresent": true,
    "databaseNamePrinted": false,
    "databaseNameCategory": "local | test | staging | production | shared | unknown"
  },
  "query": {
    "keys": ["schema"],
    "valuesPrinted": false,
    "valueSignalCategory": "local | test | staging | production | shared | unknown"
  },
  "runtime": {
    "nodeEnvCategory": "missing | local | test | staging | production | shared | unknown",
    "vercelEnvCategory": "missing | local | test | staging | production | shared | unknown"
  },
  "writeGuard": {
    "enabledIsExactlyTrue": true,
    "targetCategory": "missing | local | test | staging | production | shared | unknown"
  },
  "redaction": {
    "printsFullDatabaseUrl": false,
    "printsUsername": false,
    "printsPassword": false,
    "printsRawHost": false,
    "printsQueryValues": false,
    "printsTokensOrSecrets": false
  }
}
```

The default schema records only `databaseNamePresent` and `databaseNameCategory`; it does not print `databaseName`. A raw `databaseName` may be added only after PM approval and only when audit confirms it is not secret-like. A raw host must not be printed without PM approval. Query values must never be printed; query keys are allowed.

Production, shared, staging, and unknown decisions are evaluated before local/test eligibility. `NODE_ENV=test` and `PROJECT_COMPANY_CONTACT_ROLE_LINK_WRITE_TARGET=test` are reported as guard categories only and must not make an otherwise unknown DB target eligible.

Classification decisions:

| Target | Decision |
| --- | --- |
| `local` | Eligible for the next gate only when host/name evidence is local and fixture data is synthetic or disposable. |
| `test` | Eligible for the next gate only when host/name evidence is test/disposable and not shared. |
| `staging` | Blocked. Do not proceed unless it is classified as staging by sanitized evidence and separate explicit staging approval, execution window, rollback owner, and evidence plan are recorded. |
| `production` | Forbidden. Stop before auth, fixture lookup, Browser write action, or HTTP request execution. |
| `shared` | Forbidden. Treat as unsafe for write smoke. |
| `unknown` | Blocked. Do not proceed while classification remains unknown. An auditor must reclassify it as local/test, or reclassify it as staging and then obtain separate explicit staging approval. |

`NODE_ENV=test` and write target `test` are guard signals only. They do not classify the DB by themselves.

## Read-Only Preflight

Run read-only fixture checks only after DB classification is local/test. If staging is being investigated, stop until it is classified as staging by sanitized evidence and separate staging read-only approval is recorded; this does not authorize a write.

The read-only preflight must:

- Avoid printing secrets, passwords, tokens, cookies, full DB URLs, raw personal data, or environment dumps.
- Use a read-only transaction or read-only connection mode when available.
- Select only the approved fixture IDs, current `Project.updatedAt`, existing same-role state, `Company.tradeStatus`, `CompanyContact.companyId`, `CompanyContact.isActive`, and relevant AuditLog counts.
- Perform no `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, migration, seed, reset, deploy, or cleanup.
- Stop if the fixture set is not synthetic, disposable, or explicitly approved.

## Fixture Scope

Each approved smoke run is limited to one route request target:

- One `projectId`.
- One `companyId`.
- One `contactId`.
- One role.
- One `expectedUpdatedAt` captured immediately before the approved request.

Do not batch multiple projects, companies, contacts, or roles. Run a separate gate and evidence bundle for each case.

Before write approval, confirm:

- The project exists and current `Project.updatedAt` is recorded.
- No existing `ProjectCompanyRole` has the same project and role.
- The selected `CompanyContact.companyId` matches the selected `Company.id`.
- The selected `CompanyContact.isActive` is true.
- The selected company `tradeStatus` is not `NG`, `NEEDS_REVIEW`, or `SUSPENDED`.
- Operator session is a normal logged-in `ADMIN` or `MANAGER`.

## Write Cases

Use mock/code tests for broad behavior. A real DB write smoke, if later approved, should run only the minimal success case against one approved local/test fixture.

| Case | Fixture/precondition | Expected HTTP result | DB expectation |
| --- | --- | --- | --- |
| Success | Project/company/contact/role fixture passes preflight and uses current `expectedUpdatedAt` | `200` | `project.update`, `projectCompanyRole.create`, and `auditLog.create` occur in one transaction |
| Existing same role | Same project already has the requested role | `409` manual review | No new role link and no audit write for the attempted link |
| Stale `expectedUpdatedAt` | Request uses an older timestamp than the current Project row | `409` manual review | No role link and no audit write |
| Contact-company mismatch | `CompanyContact.companyId` differs from request `companyId` | `409` manual review | No role link and no audit write |
| Inactive contact | `CompanyContact.isActive=false` | `409` manual review | No role link and no audit write |
| Blocked company | Company `tradeStatus` is `NG`, `NEEDS_REVIEW`, or `SUSPENDED` | `409` manual review | No role link and no audit write |

Do not create failure fixtures by mutating shared data unless that mutation is separately approved.

## HTTP Request Requirements

The approved request body may contain only:

- `companyId`
- `contactId`
- `role`
- `expectedUpdatedAt`
- `reasonCode`
- `confirmationToken`

Do not include names, email addresses, notes, raw mail body, raw CSV values, free text, cookies, tokens, passwords, or secrets in the body, logs, screenshots, or report.

## Browser QA Boundary

Browser QA for PR #89 must use normal login only. Auth bypass, cookie injection, token injection, and auth proxy are forbidden.

Browser QA can confirm navigation and disabled/blocked states before DB write approval. It must not submit the role-link write unless the DB classification, fixture approval, and approval gate have passed.

## Rollback And Cleanup

Prepare rollback before requesting write approval.

Rollback rules:

- Roll back only with separate approval unless the original smoke approval explicitly includes rollback authority.
- Keep rollback limited to the single approved fixture and role.
- Re-query the project role state after rollback and record sanitized state.
- Retain `AuditLog` by default. It is evidence that the route was exercised and/or rolled back.
- AuditLog cleanup requires separate explicit approval and a separate audit trail.

## Required Report After Execution

Report the following, with secrets and PII omitted:

- Git commit/deployment identifier and route path.
- Target classification: local/test/staging, DB host category, and DB name category.
- Confirmation that production, shared, and unknown DB targets were not used.
- Runtime guard values: write enabled exact match and write target category.
- Operator role: `ADMIN` or `MANAGER`.
- Fixture IDs: project, company, contact, and role.
- Preflight result and `Project.updatedAt` used for `expectedUpdatedAt`.
- Case executed and HTTP status/result.
- Before and after Project role-link state.
- AuditLog count before and after; retain the new audit row as evidence.
- Rollback status, rollback owner, and post-rollback state if rollback was run.
- Confirmation that no cookie, token, `AUTH_SECRET`, full `DATABASE_URL`, password, or raw PII was displayed.

## Minimum Four-Role / Preferred Five-Role Approval Gate

Use a minimum four-role operating gate for planning and docs work. The preferred model is a five-role model including Parent PM.

Before a real DB write smoke, re-open any paused role and confirm all preferred five-role checks have recorded OK:

| Role | Required confirmation |
| --- | --- |
| Parent PM | Scope, approval state, Ready/merge/deploy separation, and whether staging or deferral is separately approved. |
| Executor | Exact command/manual action, fixture scope, expected request body, and evidence capture plan. |
| Audit | Read-only review of DB classification, deleted files, forbidden actions, rollback/cleanup scope, and evidence redaction. |
| PMO | Process completeness, blockers, role separation, and report fields. |
| Technical lead | Route behavior, fixture suitability, expected writes, transaction/rollback risk, and Browser QA boundary. |

If capacity forces a temporary four-role fallback, keep Parent PM, executor, audit, and at least one of PMO or technical lead active. Record the paused role, and do not approve DB write, Ready, merge, deploy, or cleanup until the paused role is re-opened or explicitly handled by the PM gate.

## Future Approval Checklist

- Target is classified as local/test by sanitized evidence, or classified as staging by sanitized evidence and has separate explicit staging approval.
- Fixture project/company/contact IDs are synthetic, disposable, or explicitly approved.
- The selected project has a current `updatedAt` captured immediately before the request.
- The selected project has no existing `ProjectCompanyRole` for the requested role.
- The selected `CompanyContact.companyId` matches the selected `Company.id`.
- The selected `CompanyContact.isActive` is true.
- The selected company `tradeStatus` is not `NG`, `NEEDS_REVIEW`, or `SUSPENDED`.
- Operator session is an active `ADMIN` or `MANAGER`.
- Request body contains only `companyId`, `contactId`, `role`, `expectedUpdatedAt`, `reasonCode`, and `confirmationToken`.
- Rollback plan is approved before the write.
- `AuditLog` evidence is retained.
