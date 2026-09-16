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

DO $$
DECLARE
  mark_scoring_dirty_oid oid;
  mark_scoring_dirty_fn text;
  granted_role text;
BEGIN
  FOR mark_scoring_dirty_oid, mark_scoring_dirty_fn IN
    SELECT
      p.oid,
      format(
        '%I.%I(%s)',
        n.nspname,
        p.proname,
        pg_get_function_identity_arguments(p.oid)
      )
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'mark_scoring_dirty'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', mark_scoring_dirty_fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', mark_scoring_dirty_fn);
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM authenticated',
      mark_scoring_dirty_fn
    );

    FOR granted_role IN
      SELECT DISTINCT r.rolname
      FROM pg_proc p
      JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl ON true
      JOIN pg_roles r ON r.oid = acl.grantee
      WHERE p.oid = mark_scoring_dirty_oid
        AND acl.privilege_type = 'EXECUTE'
        AND r.rolname NOT IN ('postgres', 'authenticated', 'service_role')
    LOOP
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM %I',
        mark_scoring_dirty_fn,
        granted_role
      );
    END LOOP;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', mark_scoring_dirty_fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', mark_scoring_dirty_fn);
  END LOOP;
END
$$;

DROP TRIGGER IF EXISTS trg_refresh_scoring_on_ratings ON public.ratings;
DROP TRIGGER IF EXISTS trg_refresh_scoring_on_evidence ON public.evidence;

DO $$
BEGIN
  IF to_regprocedure('public.mark_scoring_dirty()') IS NOT NULL THEN
    IF to_regclass('public.evidence') IS NOT NULL THEN
      DROP TRIGGER IF EXISTS trg_mark_scoring_dirty_on_evidence ON public.evidence;
      CREATE TRIGGER trg_mark_scoring_dirty_on_evidence
        AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.evidence
        FOR EACH STATEMENT
        EXECUTE FUNCTION public.mark_scoring_dirty();
    END IF;

    IF to_regclass('public.ratings') IS NOT NULL THEN
      DROP TRIGGER IF EXISTS trg_mark_scoring_dirty_on_ratings ON public.ratings;
      CREATE TRIGGER trg_mark_scoring_dirty_on_ratings
        AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON public.ratings
        FOR EACH STATEMENT
        EXECUTE FUNCTION public.mark_scoring_dirty();
    END IF;
  END IF;
END
$$;

DO $$
DECLARE
  refresh_if_dirty_oid oid;
  refresh_if_dirty_fn text;
  granted_role text;
BEGIN
  FOR refresh_if_dirty_oid, refresh_if_dirty_fn IN
    SELECT
      p.oid,
      format(
        '%I.%I(%s)',
        n.nspname,
        p.proname,
        pg_get_function_identity_arguments(p.oid)
      )
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'refresh_scoring_if_dirty'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', refresh_if_dirty_fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', refresh_if_dirty_fn);
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM authenticated',
      refresh_if_dirty_fn
    );

    FOR granted_role IN
      SELECT DISTINCT r.rolname
      FROM pg_proc p
      JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl ON true
      JOIN pg_roles r ON r.oid = acl.grantee
      WHERE p.oid = refresh_if_dirty_oid
        AND acl.privilege_type = 'EXECUTE'
        AND r.rolname NOT IN ('postgres', 'service_role')
    LOOP
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM %I',
        refresh_if_dirty_fn,
        granted_role
      );
    END LOOP;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', refresh_if_dirty_fn);
  END LOOP;
END
$$;
