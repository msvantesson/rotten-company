-- Migration: add missing columns to global_rotten_index view
-- The view was recreated in 20260302000001 without `industry` and
-- `approved_evidence_count`, which caused the /api/rotten-index route to
-- return a 500 (PostgREST rejects queries for columns that do not exist in
-- the view).  This migration adds the two columns back while keeping every
-- other part of the view definition identical to the previous migration.

CREATE OR REPLACE VIEW public.global_rotten_index AS
SELECT
    c.id,
    c.slug,
    c.name,
    c.country,
    c.industry,
    'company'::text AS entity_type,
    crs.rotten_score,
    COALESCE(ev.approved_evidence_count, 0) AS approved_evidence_count
FROM public.companies c
JOIN public.company_rotten_score crs ON crs.company_id = c.id
LEFT JOIN (
    SELECT company_id, COUNT(*) AS approved_evidence_count
    FROM public.evidence
    WHERE status = 'approved'
    GROUP BY company_id
) ev ON ev.company_id = c.id;
