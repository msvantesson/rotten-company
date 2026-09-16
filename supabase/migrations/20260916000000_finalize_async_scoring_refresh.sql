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
  IF to_regprocedure('public.mark_scoring_dirty()') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'trg_mark_scoring_dirty_on_evidence'
         AND tgrelid = 'public.evidence'::regclass
         AND NOT tgisinternal
     ) THEN
    CREATE TRIGGER trg_mark_scoring_dirty_on_evidence
      AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.evidence
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.mark_scoring_dirty();
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regprocedure('public.mark_scoring_dirty()') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'trg_mark_scoring_dirty_on_ratings'
         AND tgrelid = 'public.ratings'::regclass
         AND NOT tgisinternal
     ) THEN
    CREATE TRIGGER trg_mark_scoring_dirty_on_ratings
      AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.ratings
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.mark_scoring_dirty();
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regprocedure('public.refresh_scoring_if_dirty()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.refresh_scoring_if_dirty() TO service_role;
  END IF;
END
$$;
