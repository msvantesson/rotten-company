-- Lock down privileged SECURITY DEFINER RPCs so they are not directly callable
-- by public API roles. The repo contains no explicit EXECUTE grants/revokes for
-- these functions, so privileged callers currently rely on PostgreSQL's default
-- EXECUTE-on-PUBLIC behavior for newly created functions.
--
-- Preserve service_role access for the public-schema RPC endpoints after
-- removing PUBLIC/anon/authenticated execute privileges.
--
-- Intentionally does not touch
-- corporate_accountability_and_moderation.recalculate_company_scores_for_evidence(bigint)
-- because the repo does not show that schema/function as exposed to PUBLIC,
-- anon, or authenticated callers.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.capture_daily_company_rotten_scores(date)',
    'public.claim_next_moderation_item(uuid)',
    'public.debug_role()',
    'public.recalculate_company_scores_for_evidence(bigint)',
    'public.refresh_scoring_materialized_views()',
    'public.reject_evidence(bigint, uuid, text)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        fn
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO service_role',
        fn
      );
    END IF;
  END LOOP;
END
$$;
