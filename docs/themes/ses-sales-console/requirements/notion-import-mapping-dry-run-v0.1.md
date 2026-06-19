# Notion Import Mapping Dry-run v0.1

## Purpose

Add a read-only CLI that inspects a Notion-exported CSV before any database import work. The command maps columns to the current Project/Person target shape, identifies rows that need owner review, and prints short JSON previews.

This version is intentionally local-only:

- No DB reads.
- No DB writes.
- No Prisma client import.
- No migrations.
- No deploy.
- No Notion API connection.
- No external API or AI calls.
- No raw row value output.

## Command

```powershell
npm.cmd run notion:import:dry-run -- --file <csv> --type project|person|auto --limit <n>
```

Examples:

```powershell
npm.cmd run notion:import:dry-run -- --file tests/fixtures/notion-import/synthetic-projects.csv --type=project
npm.cmd run notion:import:dry-run -- --file tests/fixtures/notion-import/synthetic-persons.csv --type=person --limit=50
npm.cmd run notion:import:dry-run -- --file tests/fixtures/notion-import/synthetic-projects.csv --type=auto
```

`--limit` defaults to `100` rows and is capped to `1..1000`. `--apply` is rejected because this command has no write mode.

## Output Contract

The JSON output includes:

- `summary.readOnly: true`
- `summary.dbAccess: false`
- `summary.sourceType: "notion_csv"`
- `mappedColumns[]`
  - zero-based `columnIndex`
  - safe `columnName`
  - target `model` and `field`
  - `confidence`
  - `notes`
- `unmappedColumns[]`
- `targetFieldCoverage`
- `rows[]`
  - `rowNumber`
  - `action`
  - `reviewReasons`
  - `targetPreview`

Supported row actions:

- `would_create`
- `would_need_review`
- `would_skip`
- `would_fail`

`targetPreview` reports only target type, present target fields, missing required targets, parse signals, and counts. It does not print full source values, email/body text, local paths, secrets, company labels, person labels, or long raw text.

## Initial Mapping

Project headers:

- `案件名`, `title` -> `Project.title`
- `作業内容`, `workDescription` -> `Project.workDescription`
- `業務内容`, `businessDescription` -> `Project.businessDescription`
- `単価`, `amount` -> `ProjectCondition.unitPriceText`
- `上位金額` -> `ProjectCondition.upperAmountMin/upperAmountMax`
- `勤務地`, `location` -> `ProjectCondition.workLocationText`
- `スキル`, `skills` -> `ProjectSkill.skillName`
- `開始`, `稼働開始`, `startMonth` -> `ProjectCondition.startMonth`
- `商流` -> `ProjectCompanyRole.roleOrder/notes`
- `上位会社` -> `ProjectCompanyRole.company:UPPER_COMPANY`
- `エンド` -> `ProjectCompanyRole.company:END_USER`
- `元請` -> `ProjectCompanyRole.company:PRIME_CONTRACTOR`
- `ステータス`, `status` -> `Project.status`
- `注力`, `focus` -> `Project.isFocus`

Person headers:

- `氏名`, `name` -> `Person.name`
- `イニシャル` -> `Person.initials`
- `スキル`, `skills` -> `PersonSkill.skillName`
- `希望単価` -> `Person.desiredUnitPrice`
- `所属`, `company` -> `Person.ownerCompanyId`
- `稼働開始` -> `Person.availableFrom`
- `国籍` -> `Person.nationality`
- `年齢` -> `Person.age`
- `ステータス` -> `Person.status`
- `注力` -> `Person.focusNote` as review-only metadata because the current Person model has no persisted focus field

`auto` uses header scores. If headers do not clearly indicate project or person, rows are marked `would_need_review` with `NOTION_AUTO_TYPE_AMBIGUOUS`.

## Review Reasons

Rows can need review for:

- ambiguous auto type
- no mapped columns
- missing required target fields
- low target coverage
- unmapped source values
- invalid amount/date/age shape
- sensitive-looking values that were redacted
- long values that were redacted
- person focus data that has no current persisted field

## Validation

Project checks for this PR:

```powershell
npm.cmd run test:notion-import-dry-run
```

Full pre-PR checks:

```powershell
git diff --check
npm.cmd run test:notion-import-dry-run
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd audit --audit-level=high
npx.cmd prisma validate
npx.cmd prisma generate
```

For Prisma validation/generation, provide a dummy `DATABASE_URL` only in the process environment and do not print it.
