-- Gmail classification review SQL v0.1
-- Purpose:
--   Inspect mails currently treated as projects, persons, or unclassified.
--   SELECT only. No production/staging data is modified.
--
-- Notes:
--   - DB enum values are lowercase because Prisma maps MailCategory to PostgreSQL enum values.
--   - The app's dashboard currently treats projects/persons by active rows in projects/persons.
--   - The app's unclassified tab currently shows non-excluded mails in
--     ('needs_review', 'other', 'normal_contact') with no active source project/person.

-- 1) Summary by current UI bucket.
WITH mail_link_summary AS (
  SELECT
    m.id AS mail_id,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status <> 'archived') AS active_source_project_count,
    COUNT(DISTINCT p.id) AS source_project_count,
    COUNT(DISTINCT pe.id) FILTER (WHERE pe.status <> 'archived') AS active_source_person_count,
    COUNT(DISTINCT pe.id) AS source_person_count,
    COUNT(DISTINCT mel_project.entity_id) AS extracted_project_link_count,
    COUNT(DISTINCT mel_person.entity_id) AS extracted_person_link_count,
    COUNT(DISTINCT er_project.target_id) FILTER (WHERE er_project.target_id IS NOT NULL) AS project_extraction_target_count,
    COUNT(DISTINCT er_person.target_id) FILTER (WHERE er_person.target_id IS NOT NULL) AS person_extraction_target_count
  FROM mail_notifications m
  LEFT JOIN projects p
    ON p.source_mail_id = m.id
  LEFT JOIN persons pe
    ON pe.source_mail_id = m.id
  LEFT JOIN mail_entity_links mel_project
    ON mel_project.mail_notification_id = m.id
   AND mel_project.entity_type = 'project'
   AND mel_project.link_type = 'extracted'
  LEFT JOIN mail_entity_links mel_person
    ON mel_person.mail_notification_id = m.id
   AND mel_person.entity_type = 'person'
   AND mel_person.link_type = 'extracted'
  LEFT JOIN extraction_results er_project
    ON er_project.mail_notification_id = m.id
   AND er_project.target_type = 'project'
   AND er_project.extraction_type = 'project_extraction'
  LEFT JOIN extraction_results er_person
    ON er_person.mail_notification_id = m.id
   AND er_person.target_type = 'person'
   AND er_person.extraction_type = 'person_extraction'
  GROUP BY m.id
),
bucketed AS (
  SELECT
    m.id,
    CASE
      WHEN ls.active_source_project_count > 0 THEN 'project_tab'
      WHEN ls.active_source_person_count > 0 THEN 'person_tab'
      WHEN m.category IN ('needs_review', 'other', 'normal_contact')
        AND m.is_excluded = false
        AND ls.active_source_project_count = 0
        AND ls.active_source_person_count = 0
        THEN 'unclassified_tab'
      ELSE 'not_visible_in_main_tabs'
    END AS ui_bucket
  FROM mail_notifications m
  JOIN mail_link_summary ls ON ls.mail_id = m.id
)
SELECT
  ui_bucket,
  COUNT(*) AS mail_count
FROM bucketed
GROUP BY ui_bucket
ORDER BY ui_bucket;

-- 2) Review samples from project/person/unclassified buckets.
-- Change params.sample_limit if you want more or fewer rows per bucket.
WITH params AS (
  SELECT 100::int AS sample_limit
),
mail_link_summary AS (
  SELECT
    m.id AS mail_id,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status <> 'archived') AS active_source_project_count,
    COUNT(DISTINCT p.id) AS source_project_count,
    COUNT(DISTINCT pe.id) FILTER (WHERE pe.status <> 'archived') AS active_source_person_count,
    COUNT(DISTINCT pe.id) AS source_person_count,
    COUNT(DISTINCT mel_project.entity_id) AS extracted_project_link_count,
    COUNT(DISTINCT mel_person.entity_id) AS extracted_person_link_count,
    COUNT(DISTINCT er_project.target_id) FILTER (WHERE er_project.target_id IS NOT NULL) AS project_extraction_target_count,
    COUNT(DISTINCT er_person.target_id) FILTER (WHERE er_person.target_id IS NOT NULL) AS person_extraction_target_count
  FROM mail_notifications m
  LEFT JOIN projects p
    ON p.source_mail_id = m.id
  LEFT JOIN persons pe
    ON pe.source_mail_id = m.id
  LEFT JOIN mail_entity_links mel_project
    ON mel_project.mail_notification_id = m.id
   AND mel_project.entity_type = 'project'
   AND mel_project.link_type = 'extracted'
  LEFT JOIN mail_entity_links mel_person
    ON mel_person.mail_notification_id = m.id
   AND mel_person.entity_type = 'person'
   AND mel_person.link_type = 'extracted'
  LEFT JOIN extraction_results er_project
    ON er_project.mail_notification_id = m.id
   AND er_project.target_type = 'project'
   AND er_project.extraction_type = 'project_extraction'
  LEFT JOIN extraction_results er_person
    ON er_person.mail_notification_id = m.id
   AND er_person.target_type = 'person'
   AND er_person.extraction_type = 'person_extraction'
  GROUP BY m.id
),
active_projects AS (
  SELECT
    source_mail_id AS mail_id,
    string_agg(coalesce(project_code, id::text) || ':' || title, ' | ' ORDER BY created_at DESC) AS linked_projects
  FROM projects
  WHERE source_mail_id IS NOT NULL
    AND status <> 'archived'
  GROUP BY source_mail_id
),
active_persons AS (
  SELECT
    source_mail_id AS mail_id,
    string_agg(coalesce(person_code, id::text) || ':' || coalesce(name, initials, '(no name)'), ' | ' ORDER BY created_at DESC) AS linked_persons
  FROM persons
  WHERE source_mail_id IS NOT NULL
    AND status <> 'archived'
  GROUP BY source_mail_id
),
review_rows AS (
  SELECT
    'project_tab' AS ui_bucket,
    m.id AS mail_id,
    m.external_message_id,
    coalesce(m.message_date, m.received_at) AS received_at,
    m.from_email,
    m.subject,
    m.category,
    m.needs_review,
    (ls.active_source_project_count > 0) AS has_active_source_project,
    (ls.active_source_person_count > 0) AS has_active_source_person,
    ls.extracted_project_link_count,
    ls.extracted_person_link_count,
    ls.project_extraction_target_count,
    ls.person_extraction_target_count,
    ap.linked_projects,
    aps.linked_persons,
    left(regexp_replace(coalesce(m.body_text, m.normalized_body, ''), '[[:space:]]+', ' ', 'g'), 500) AS body_text_head_500,
    row_number() OVER (ORDER BY coalesce(m.message_date, m.received_at) DESC) AS bucket_rank
  FROM mail_notifications m
  JOIN mail_link_summary ls ON ls.mail_id = m.id
  LEFT JOIN active_projects ap ON ap.mail_id = m.id
  LEFT JOIN active_persons aps ON aps.mail_id = m.id
  WHERE ls.active_source_project_count > 0

  UNION ALL

  SELECT
    'person_tab' AS ui_bucket,
    m.id AS mail_id,
    m.external_message_id,
    coalesce(m.message_date, m.received_at) AS received_at,
    m.from_email,
    m.subject,
    m.category,
    m.needs_review,
    (ls.active_source_project_count > 0) AS has_active_source_project,
    (ls.active_source_person_count > 0) AS has_active_source_person,
    ls.extracted_project_link_count,
    ls.extracted_person_link_count,
    ls.project_extraction_target_count,
    ls.person_extraction_target_count,
    ap.linked_projects,
    aps.linked_persons,
    left(regexp_replace(coalesce(m.body_text, m.normalized_body, ''), '[[:space:]]+', ' ', 'g'), 500) AS body_text_head_500,
    row_number() OVER (ORDER BY coalesce(m.message_date, m.received_at) DESC) AS bucket_rank
  FROM mail_notifications m
  JOIN mail_link_summary ls ON ls.mail_id = m.id
  LEFT JOIN active_projects ap ON ap.mail_id = m.id
  LEFT JOIN active_persons aps ON aps.mail_id = m.id
  WHERE ls.active_source_person_count > 0

  UNION ALL

  SELECT
    'unclassified_tab' AS ui_bucket,
    m.id AS mail_id,
    m.external_message_id,
    coalesce(m.message_date, m.received_at) AS received_at,
    m.from_email,
    m.subject,
    m.category,
    m.needs_review,
    (ls.active_source_project_count > 0) AS has_active_source_project,
    (ls.active_source_person_count > 0) AS has_active_source_person,
    ls.extracted_project_link_count,
    ls.extracted_person_link_count,
    ls.project_extraction_target_count,
    ls.person_extraction_target_count,
    ap.linked_projects,
    aps.linked_persons,
    left(regexp_replace(coalesce(m.body_text, m.normalized_body, ''), '[[:space:]]+', ' ', 'g'), 500) AS body_text_head_500,
    row_number() OVER (ORDER BY coalesce(m.message_date, m.received_at) DESC) AS bucket_rank
  FROM mail_notifications m
  JOIN mail_link_summary ls ON ls.mail_id = m.id
  LEFT JOIN active_projects ap ON ap.mail_id = m.id
  LEFT JOIN active_persons aps ON aps.mail_id = m.id
  WHERE m.category IN ('needs_review', 'other', 'normal_contact')
    AND m.is_excluded = false
    AND ls.active_source_project_count = 0
    AND ls.active_source_person_count = 0
)
SELECT
  ui_bucket,
  mail_id,
  external_message_id,
  received_at,
  from_email,
  subject,
  category,
  needs_review,
  has_active_source_project,
  has_active_source_person,
  extracted_project_link_count,
  extracted_person_link_count,
  project_extraction_target_count,
  person_extraction_target_count,
  linked_projects,
  linked_persons,
  body_text_head_500
FROM review_rows
WHERE bucket_rank <= (SELECT sample_limit FROM params)
ORDER BY
  CASE ui_bucket
    WHEN 'project_tab' THEN 1
    WHEN 'person_tab' THEN 2
    WHEN 'unclassified_tab' THEN 3
    ELSE 9
  END,
  received_at DESC;

-- 3) Potential mismatches: active project/person rows whose source mail category disagrees.
SELECT
  'project_linked_but_not_project_category' AS mismatch_type,
  m.id AS mail_id,
  m.external_message_id,
  coalesce(m.message_date, m.received_at) AS received_at,
  m.from_email,
  m.subject,
  m.category,
  m.needs_review,
  p.id AS linked_project_id,
  p.project_code,
  p.title AS linked_project_title,
  NULL::uuid AS linked_person_id,
  NULL::text AS person_code,
  NULL::text AS linked_person_name,
  left(regexp_replace(coalesce(m.body_text, m.normalized_body, ''), '[[:space:]]+', ' ', 'g'), 500) AS body_text_head_500
FROM projects p
JOIN mail_notifications m ON m.id = p.source_mail_id
WHERE p.status <> 'archived'
  AND m.category <> 'project_intro'

UNION ALL

SELECT
  'person_linked_but_not_person_category' AS mismatch_type,
  m.id AS mail_id,
  m.external_message_id,
  coalesce(m.message_date, m.received_at) AS received_at,
  m.from_email,
  m.subject,
  m.category,
  m.needs_review,
  NULL::uuid AS linked_project_id,
  NULL::text AS project_code,
  NULL::text AS linked_project_title,
  pe.id AS linked_person_id,
  pe.person_code,
  coalesce(pe.name, pe.initials, '(no name)') AS linked_person_name,
  left(regexp_replace(coalesce(m.body_text, m.normalized_body, ''), '[[:space:]]+', ' ', 'g'), 500) AS body_text_head_500
FROM persons pe
JOIN mail_notifications m ON m.id = pe.source_mail_id
WHERE pe.status <> 'archived'
  AND m.category <> 'person_intro'
ORDER BY received_at DESC;

-- 4) Unclassified sender/category summary. Useful before tuning rules.
SELECT
  m.category,
  coalesce(nullif(split_part(lower(m.from_email), '@', 2), ''), '(no domain)') AS from_domain,
  COUNT(*) AS mail_count,
  COUNT(*) FILTER (WHERE m.needs_review) AS needs_review_count,
  MAX(coalesce(m.message_date, m.received_at)) AS latest_received_at
FROM mail_notifications m
WHERE m.category IN ('needs_review', 'other', 'normal_contact')
  AND m.is_excluded = false
  AND NOT EXISTS (
    SELECT 1
    FROM projects p
    WHERE p.source_mail_id = m.id
      AND p.status <> 'archived'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM persons pe
    WHERE pe.source_mail_id = m.id
      AND pe.status <> 'archived'
  )
GROUP BY
  m.category,
  coalesce(nullif(split_part(lower(m.from_email), '@', 2), ''), '(no domain)')
ORDER BY mail_count DESC, latest_received_at DESC;
