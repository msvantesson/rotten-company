-- Add remediation guardrail + split counts to category breakdown views.
-- Guardrail (per company + category):
--   remediation eligible count <= 25% of misconduct count, minimum 1 if misconduct_count>0.
--   Remediation severity-units are scaled by eligible_ratio = eligible_remediation_count / remediation_count_total.
--   If there is no misconduct, remediation does not reduce score.
-- Also adds split counts columns (misconduct_*/remediation_*).

CREATE OR REPLACE VIEW public.company_category_full_breakdown AS
SELECT
    c.id AS company_id,
    cat.id AS category_id,
    cat.name AS category_name,
    cat.description AS category_description,
    cat.base_weight,
    count(DISTINCT r.id) AS rating_count,
    avg(r.score)::numeric(4,2) AS avg_rating_score,
    count(e.id) AS evidence_count,

    -- totals (all approved evidence)
    count(*) FILTER (WHERE e.severity = 'low'::severity) AS low_count,
    count(*) FILTER (WHERE e.severity = 'medium'::severity) AS medium_count,
    count(*) FILTER (WHERE e.severity = 'high'::severity) AS high_count,

    /* severity_score WITH remediation cap */
    (
      (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity) * 1 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity) * 6)
      -
      (
        (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity) * 1 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity) * 6)
        *
        (
          CASE
            WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text)) = 0 THEN 0::numeric
            WHEN (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text)) = 0 THEN 0::numeric
            ELSE
              LEAST(
                (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric,
                GREATEST(
                  1::numeric,
                  FLOOR(((count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))::numeric) * 0.25)
                )
              )
              /
              (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric
          END
        )
      )
    )::numeric AS severity_score,

    /* final_score WITH remediation cap (clamped >= 0) */
    (
      COALESCE(avg(r.score), 0::numeric) *
      GREATEST(
        (
          (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity) * 1 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity) * 6)
          -
          (
            (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity) * 1 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity) * 6)
            *
            (
              CASE
                WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text)) = 0 THEN 0::numeric
                WHEN (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text)) = 0 THEN 0::numeric
                ELSE
                  LEAST(
                    (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric,
                    GREATEST(
                      1::numeric,
                      FLOOR(((count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))::numeric) * 0.25)
                    )
                  )
                  /
                  (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric
              END
            )
          )
        ),
        0::numeric
      ) *
      cat.base_weight::numeric
    )::numeric(8,2) AS final_score,

    -- split counts (approved evidence)
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity) AS misconduct_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) AS misconduct_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity) AS misconduct_high_count,

    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity) AS remediation_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) AS remediation_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity) AS remediation_high_count

FROM public.companies c
JOIN public.categories cat ON true
LEFT JOIN public.ratings r
  ON r.company_id = c.id AND r.category = cat.id
LEFT JOIN public.evidence e
  ON e.company_id = c.id AND e.category = cat.id AND e.status = 'approved'::evidence_status
GROUP BY
  c.id, cat.id, cat.name, cat.description, cat.base_weight;

CREATE OR REPLACE VIEW public.company_category_breakdown_live AS
SELECT
    c.id AS company_id,
    cat.id AS category_id,
    cat.name AS category_name,
    cat.description AS category_description,
    cat.base_weight,
    count(DISTINCT r.id) AS rating_count,
    avg(r.score)::numeric(4,2) AS avg_rating_score,
    count(e.id) AS evidence_count,

    -- totals (all approved evidence)
    count(*) FILTER (WHERE e.severity = 'low'::severity) AS low_count,
    count(*) FILTER (WHERE e.severity = 'medium'::severity) AS medium_count,
    count(*) FILTER (WHERE e.severity = 'high'::severity) AS high_count,

    /* severity_score WITH remediation cap */
    (
      (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity) * 1 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity) * 6)
      -
      (
        (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity) * 1 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity) * 6)
        *
        (
          CASE
            WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text)) = 0 THEN 0::numeric
            WHEN (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text)) = 0 THEN 0::numeric
            ELSE
              LEAST(
                (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric,
                GREATEST(
                  1::numeric,
                  FLOOR(((count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))::numeric) * 0.25)
                )
              )
              /
              (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric
          END
        )
      )
    )::numeric AS severity_score,

    /* final_score WITH remediation cap (clamped >= 0) */
    (
      COALESCE(avg(r.score), 0::numeric) *
      GREATEST(
        (
          (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity) * 1 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity) * 6)
          -
          (
            (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity) * 1 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity) * 6)
            *
            (
              CASE
                WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text)) = 0 THEN 0::numeric
                WHEN (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text)) = 0 THEN 0::numeric
                ELSE
                  LEAST(
                    (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric,
                    GREATEST(
                      1::numeric,
                      FLOOR(((count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))::numeric) * 0.25)
                    )
                  )
                  /
                  (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text))::numeric
              END
            )
          )
        ),
        0::numeric
      ) *
      cat.base_weight::numeric
    )::numeric(8,2) AS final_score,

    -- split counts (approved evidence)
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity) AS misconduct_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) AS misconduct_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity) AS misconduct_high_count,

    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity) AS remediation_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) AS remediation_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity) AS remediation_high_count

FROM public.companies c
JOIN public.categories cat ON true
LEFT JOIN public.ratings r
  ON r.company_id = c.id AND r.category = cat.id
LEFT JOIN public.evidence e
  ON e.company_id = c.id AND e.category = cat.id AND e.status = 'approved'::evidence_status
GROUP BY
  c.id, cat.id, cat.name, cat.description, cat.base_weight;