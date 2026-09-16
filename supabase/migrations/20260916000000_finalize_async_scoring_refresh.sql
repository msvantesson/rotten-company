-- Finalize async scoring refresh wiring for evidence and ratings writes.
-- Keep writes fast by marking scoring dirty in statement-level triggers and
-- restricting privileged refresh execution to service_role.

DO $$
BEGIN
  IF to_regprocedure('public.mark_scoring_dirty()') IS NOT NULL THEN
    ALTER FUNCTION public.mark_scoring_dirty() SECURITY DEFINER;
    ALTER FUNCTION public.mark_scoring_dirty() OWNER TO postgres;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_refresh_scoring_on_ratings ON public.ratings;
DROP TRIGGER IF EXISTS trg_refresh_scoring_on_evidence ON public.evidence;

DO $$
BEGIN
  IF to_regprocedure('public.mark_scoring_dirty()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_mark_scoring_dirty_on_evidence ON public.evidence;
    CREATE TRIGGER trg_mark_scoring_dirty_on_evidence
      AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.evidence
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.mark_scoring_dirty();

    DROP TRIGGER IF EXISTS trg_mark_scoring_dirty_on_ratings ON public.ratings;
    CREATE TRIGGER trg_mark_scoring_dirty_on_ratings
      AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.ratings
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.mark_scoring_dirty();
  END IF;
END
$$;

DO $$
DECLARE
  granted_role text;
BEGIN
  IF to_regprocedure('public.refresh_scoring_if_dirty()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM authenticated;

    FOR granted_role IN
      SELECT DISTINCT grantee
      FROM information_schema.role_routine_grants
      WHERE specific_schema = 'public'
        AND routine_name = 'refresh_scoring_if_dirty'
        AND privilege_type = 'EXECUTE'
        AND grantee NOT IN ('postgres', 'service_role')
    LOOP
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM %I',
        granted_role
      );
    END LOOP;

    GRANT EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() TO service_role;
  END IF;
END
$$;
