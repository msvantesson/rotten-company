-- Grant SELECT privileges on materialized views to anon and authenticated roles.
-- Fixes "permission denied for materialized view" errors:
--   - category_company_rankings (POST /api/evidence/submit)
--   - ownership_signals_summary (/company/[slug] page)
--   - company_destruction_lever (/company/[slug] page)
--
-- Each GRANT is wrapped in an existence check so the migration is safe to run
-- even if a view has not yet been created. GRANT itself is idempotent in
-- PostgreSQL (re-granting an already-held privilege is a no-op).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'category_company_rankings'
  ) THEN
    GRANT SELECT ON public.category_company_rankings TO anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'ownership_signals_summary'
  ) THEN
    GRANT SELECT ON public.ownership_signals_summary TO anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'company_destruction_lever'
  ) THEN
    GRANT SELECT ON public.company_destruction_lever TO anon, authenticated;
  END IF;
END $$;
