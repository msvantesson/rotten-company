-- Migration: introduce rating_factor as a weak modifier and exponential squash in company scoring.
--
-- Changes:
--   1. company_category_full_breakdown / company_category_breakdown_live
--      Old: final_score = COALESCE(avg_rating, 0) × GREATEST(severity_score, 0) × base_weight
--           → categories with evidence but no ratings contributed 0 (bad)
--           → ratings were a dominant multiplier (bad)
--      New: rating_factor = 0.9 + 0.1 × ((COALESCE(avg_rating, 3) − 1) / 4)
--           final_score   = GREATEST(severity_score, 0) × base_weight × rating_factor
--           → evidence (severity + base_weight) is the primary driver
--           → ratings adjust the score by ±10% only
--           → neutral default (avg_rating=3 → rating_factor=0.95) when no ratings exist
--
--   2. company_rotten_score_v2
--      Exposes raw_rotten_score alongside the bounded rotten_score so that
--      both intermediate and final values are available to callers.
--      rotten_score = round(100 × (1 − exp(−raw_rotten_score / 50)), 2)
--      This is idempotent (CREATE OR REPLACE VIEW).

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared severity_score subexpression (used in both breakdown views)
-- severity_score = misconduct_units − capped_remediation_units
-- Remediation cap: eligible ≤ 25% of misconduct count, minimum 1 if any misconduct
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.company_category_full_breakdown AS
SELECT
    c.id  AS company_id,
    cat.id   AS category_id,
    cat.name AS category_name,
    cat.description AS category_description,
    cat.base_weight,
    count(DISTINCT r.id) AS rating_count,
    avg(r.score)::numeric(4,2) AS avg_rating_score,
    count(e.id) AS evidence_count,

    -- totals (all approved evidence)
    count(*) FILTER (WHERE e.severity = 'low'::severity)    AS low_count,
    count(*) FILTER (WHERE e.severity = 'medium'::severity) AS medium_count,
    count(*) FILTER (WHERE e.severity = 'high'::severity)   AS high_count,

    /* severity_score WITH remediation cap */
    (
      (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity)    * 1 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity)   * 6)
      -
      (
        (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity)    * 1 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity)   * 6)
        *
        (
          CASE
            WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))   = 0 THEN 0::numeric
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

    /* final_score: evidence quality is the primary driver; ratings are a weak ±10% modifier.
       rating_factor = 0.9 + 0.1 × ((COALESCE(avg_rating, 3) − 1) / 4)
         avg_rating=1 → factor=0.90 (lowest possible)
         avg_rating=3 → factor=0.95 (neutral default when no ratings)
         avg_rating=5 → factor=1.00 (highest possible)
    */
    (
      GREATEST(
        (
          (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity)    * 1 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity)   * 6)
          -
          (
            (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity)    * 1 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity)   * 6)
            *
            (
              CASE
                WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))   = 0 THEN 0::numeric
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
      )
      * cat.base_weight::numeric
      * (0.9 + 0.1 * ((COALESCE(avg(r.score), 3::numeric) - 1::numeric) / 4::numeric))
    )::numeric(8,2) AS final_score,

    -- split counts (approved evidence, misconduct vs remediation)
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text  AND e.severity = 'low'::severity)    AS misconduct_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text  AND e.severity = 'medium'::severity) AS misconduct_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text  AND e.severity = 'high'::severity)   AS misconduct_high_count,

    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity)    AS remediation_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) AS remediation_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity)   AS remediation_high_count

FROM public.companies c
JOIN public.categories cat ON true
LEFT JOIN public.ratings r
  ON r.company_id = c.id AND r.category = cat.id
LEFT JOIN public.evidence e
  ON e.company_id = c.id AND e.category = cat.id AND e.status = 'approved'::evidence_status
GROUP BY
    c.id, cat.id, cat.name, cat.description, cat.base_weight;


-- ─────────────────────────────────────────────────────────────────────────────
-- company_category_breakdown_live — kept in sync with company_category_full_breakdown
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.company_category_breakdown_live AS
SELECT
    c.id  AS company_id,
    cat.id   AS category_id,
    cat.name AS category_name,
    cat.description AS category_description,
    cat.base_weight,
    count(DISTINCT r.id) AS rating_count,
    avg(r.score)::numeric(4,2) AS avg_rating_score,
    count(e.id) AS evidence_count,

    -- totals (all approved evidence)
    count(*) FILTER (WHERE e.severity = 'low'::severity)    AS low_count,
    count(*) FILTER (WHERE e.severity = 'medium'::severity) AS medium_count,
    count(*) FILTER (WHERE e.severity = 'high'::severity)   AS high_count,

    /* severity_score WITH remediation cap */
    (
      (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity)    * 1 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
       count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity)   * 6)
      -
      (
        (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity)    * 1 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
         count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity)   * 6)
        *
        (
          CASE
            WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))   = 0 THEN 0::numeric
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

    /* final_score: evidence quality is the primary driver; ratings are a weak ±10% modifier */
    (
      GREATEST(
        (
          (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'low'::severity)    * 1 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'medium'::severity) * 3 +
           count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text AND e.severity = 'high'::severity)   * 6)
          -
          (
            (count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity)    * 1 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) * 3 +
             count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity)   * 6)
            *
            (
              CASE
                WHEN (count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text))   = 0 THEN 0::numeric
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
      )
      * cat.base_weight::numeric
      * (0.9 + 0.1 * ((COALESCE(avg(r.score), 3::numeric) - 1::numeric) / 4::numeric))
    )::numeric(8,2) AS final_score,

    -- split counts (approved evidence, misconduct vs remediation)
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text  AND e.severity = 'low'::severity)    AS misconduct_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text  AND e.severity = 'medium'::severity) AS misconduct_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'misconduct'::text  AND e.severity = 'high'::severity)   AS misconduct_high_count,

    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'low'::severity)    AS remediation_low_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'medium'::severity) AS remediation_medium_count,
    count(*) FILTER (WHERE e.evidence_type = 'remediation'::text AND e.severity = 'high'::severity)   AS remediation_high_count

FROM public.companies c
JOIN public.categories cat ON true
LEFT JOIN public.ratings r
  ON r.company_id = c.id AND r.category = cat.id
LEFT JOIN public.evidence e
  ON e.company_id = c.id AND e.category = cat.id AND e.status = 'approved'::evidence_status
GROUP BY
    c.id, cat.id, cat.name, cat.description, cat.base_weight;


-- ─────────────────────────────────────────────────────────────────────────────
-- company_rotten_score_v2 — company-level score with exponential squash
--
-- raw_rotten_score = category_score + manager_component
-- rotten_score     = round(100 × (1 − exp(−raw_rotten_score / 50)), 2)
--                    → bounded [0, 100); approaches 100 asymptotically
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.company_rotten_score_v2 AS
SELECT
    b.company_id,
    round(avg(b.final_score), 2)                                            AS category_score,
    COALESCE(mg.manager_rollup, 0::numeric) * 2::numeric                    AS manager_component,
    round(avg(b.final_score), 2)
      + COALESCE(mg.manager_rollup, 0::numeric) * 2::numeric                AS raw_rotten_score,
    round(
        100.0 * (
            1.0 - exp(
                -(round(avg(b.final_score), 2)
                  + COALESCE(mg.manager_rollup, 0::numeric) * 2::numeric)
                / 50.0
            )
        ),
        2
    )                                                                        AS rotten_score
FROM public.company_category_full_breakdown b
LEFT JOIN (
    -- manager_rollup: average rolled-up rotten score of active leaders at the company
    SELECT
        lt.company_id,
        avg(lrs.rotten_score) AS manager_rollup
    FROM public.leader_tenures lt
    JOIN public.leader_rotten_score lrs ON lrs.leader_id = lt.leader_id
    WHERE lt.ended_at IS NULL
    GROUP BY lt.company_id
) mg ON mg.company_id = b.company_id
GROUP BY
    b.company_id,
    mg.manager_rollup;
