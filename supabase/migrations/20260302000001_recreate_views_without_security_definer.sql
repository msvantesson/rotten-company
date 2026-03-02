-- Migration: recreate views without SECURITY DEFINER (use default invoker security)
-- Fixes Supabase linter finding: security_definer_view for:
--   public.company_category_full_breakdown
--   public.company_category_breakdown_live
--   public.global_rotten_index

-- global_rotten_index: aggregated rotten score per company
CREATE OR REPLACE VIEW public.global_rotten_index AS
SELECT
    c.id,
    c.slug,
    c.name,
    c.country,
    'company'::text AS entity_type,
    crs.rotten_score
FROM public.companies c
JOIN public.company_rotten_score crs ON crs.company_id = c.id;

-- company_category_full_breakdown: per-company, per-category breakdown (all evidence statuses)
-- Severity weights: low=1, medium=3, high=6
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
    count(*) FILTER (WHERE e.severity = 'low'::severity) AS low_count,
    count(*) FILTER (WHERE e.severity = 'medium'::severity) AS medium_count,
    count(*) FILTER (WHERE e.severity = 'high'::severity) AS high_count,
    (count(*) FILTER (WHERE e.severity = 'low'::severity) * 1 +
     count(*) FILTER (WHERE e.severity = 'medium'::severity) * 3 +
     count(*) FILTER (WHERE e.severity = 'high'::severity) * 6)::numeric AS severity_score,
    (COALESCE(avg(r.score), 0::numeric) *
     (count(*) FILTER (WHERE e.severity = 'low'::severity) * 1 +
      count(*) FILTER (WHERE e.severity = 'medium'::severity) * 3 +
      count(*) FILTER (WHERE e.severity = 'high'::severity) * 6)::numeric *
     cat.base_weight::numeric)::numeric(8,2) AS final_score
FROM public.companies c
JOIN public.categories cat ON true
LEFT JOIN public.ratings r ON r.company_id = c.id AND r.category = cat.id
LEFT JOIN public.evidence e ON e.company_id = c.id AND e.category = cat.id AND e.status = 'approved'::evidence_status
GROUP BY c.id, cat.id, cat.name, cat.description, cat.base_weight;

-- company_category_breakdown_live: same definition as company_category_full_breakdown
-- (both views intentionally share the same query; they may diverge in future)
-- Severity weights: low=1, medium=3, high=6
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
    count(*) FILTER (WHERE e.severity = 'low'::severity) AS low_count,
    count(*) FILTER (WHERE e.severity = 'medium'::severity) AS medium_count,
    count(*) FILTER (WHERE e.severity = 'high'::severity) AS high_count,
    (count(*) FILTER (WHERE e.severity = 'low'::severity) * 1 +
     count(*) FILTER (WHERE e.severity = 'medium'::severity) * 3 +
     count(*) FILTER (WHERE e.severity = 'high'::severity) * 6)::numeric AS severity_score,
    (COALESCE(avg(r.score), 0::numeric) *
     (count(*) FILTER (WHERE e.severity = 'low'::severity) * 1 +
      count(*) FILTER (WHERE e.severity = 'medium'::severity) * 3 +
      count(*) FILTER (WHERE e.severity = 'high'::severity) * 6)::numeric *
     cat.base_weight::numeric)::numeric(8,2) AS final_score
FROM public.companies c
JOIN public.categories cat ON true
LEFT JOIN public.ratings r ON r.company_id = c.id AND r.category = cat.id
LEFT JOIN public.evidence e ON e.company_id = c.id AND e.category = cat.id AND e.status = 'approved'::evidence_status
GROUP BY c.id, cat.id, cat.name, cat.description, cat.base_weight;
