-- Finalize async scoring refresh wiring with explicit signatures/roles.

ALTER FUNCTION public.mark_scoring_dirty() SECURITY DEFINER;
ALTER FUNCTION public.mark_scoring_dirty() OWNER TO postgres;
ALTER FUNCTION public.mark_scoring_dirty() SET search_path = pg_catalog, public;

REVOKE EXECUTE ON FUNCTION public.mark_scoring_dirty() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_scoring_dirty() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_scoring_dirty() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_scoring_dirty() FROM service_role;
GRANT EXECUTE ON FUNCTION public.mark_scoring_dirty() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_scoring_dirty() TO service_role;

DROP TRIGGER IF EXISTS trg_refresh_scoring_on_ratings ON public.ratings;
DROP TRIGGER IF EXISTS trg_refresh_scoring_on_evidence ON public.evidence;

DROP TRIGGER IF EXISTS trg_mark_scoring_dirty_on_ratings ON public.ratings;
CREATE TRIGGER trg_mark_scoring_dirty_on_ratings
  AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.ratings
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.mark_scoring_dirty();

REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM service_role;
GRANT EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() TO service_role;
