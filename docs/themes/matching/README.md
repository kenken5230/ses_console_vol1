# Matching Theme

This theme covers deterministic matching between existing Projects and Persons.

## Deterministic Matching Dry-run MVP

Command:

```powershell
npm.cmd run match:dry-run -- --limit=50
```

Optional filters:

- `--project-id <id>`
- `--person-id <id>`
- `--min-score <number>`
- `--mode project-to-person`
- `--mode person-to-project`
- `--mode all`

The command is read-only. It does not create proposals, update Projects or Persons, draft messages, send messages, call external APIs, or call AI APIs.

If a database connection is not configured, the command falls back to synthetic in-process records so local verification can still exercise the scoring and anonymized output path. Real database matching can be run later with the same command after the environment is configured.

## Score Factors

The MVP uses deterministic rule-based scoring only:

- Required skill overlap.
- Nice-to-have skill overlap.
- Technology overlap.
- Project rate versus person desired rate.
- Project start month versus person available date.
- Location and remote compatibility.
- Role text compatibility from normalized internal text tokens.
- Risk and review signals from missing key fields or low field coverage.

The output does not include raw project text, company labels, person labels, addresses, full skill text, subjects, bodies, or secrets.

## Score Bands

- `HIGH`: score 75 or higher.
- `MEDIUM`: score 55 to 74.
- `LOW`: score 35 to 54.
- `REVIEW`: score below 35 or a review-required signal is present.

## Reason Codes

- `MATCH_SKILL_REQUIRED_OVERLAP`
- `MATCH_SKILL_NICE_TO_HAVE_OVERLAP`
- `MATCH_RATE_COMPATIBLE`
- `MATCH_RATE_UNKNOWN`
- `MATCH_RATE_MISMATCH`
- `MATCH_START_COMPATIBLE`
- `MATCH_START_UNKNOWN`
- `MATCH_LOCATION_COMPATIBLE`
- `MATCH_LOCATION_UNKNOWN`
- `MATCH_ROLE_COMPATIBLE`
- `MATCH_MISSING_PROJECT_SKILLS`
- `MATCH_MISSING_PERSON_SKILLS`
- `MATCH_LOW_FIELD_COVERAGE`
- `MATCH_REVIEW_REQUIRED`

## Output Contract

The dry-run report includes:

- scanned Project count
- scanned Person count
- candidate pair count
- displayed match count
- minimum score
- score distribution
- warning counts
- review reason counts
- at most 20 anonymized top match samples

Each match sample includes only:

- short Project id
- short Person id
- score
- score band
- reason codes
- missing field codes
- skill overlap counts
- rate compatibility
- date compatibility
- location compatibility

## Limitations

- This is not AI ranking.
- This does not infer final business priority.
- This does not create Proposal records.
- This does not create message drafts.
- This does not send messages.
- This does not persist match suggestions.
- This does not use Notion or real CSV field mapping.

## Future Flow

1. Dry-run matching.
2. Review anonymized candidate matches.
3. Add supervised match suggestion save.
4. Generate proposal drafts after owner approval.
5. Human approval.
6. Send messages only after explicit owner approval.
