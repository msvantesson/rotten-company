-- Fix Supabase linter warning: function_search_path_mutable (0011)
-- Sets an explicit search_path on each flagged function so that name resolution
-- is deterministic and independent of the caller's search_path.
-- This is especially important for SECURITY DEFINER functions where a mutable
-- search_path could be exploited by schema-injection attacks.
--
-- These are ALTER-only statements (no logic change); safe to re-run.

-- SECURITY DEFINER: cross-schema – invokes public schema objects
ALTER FUNCTION corporate_accountability_and_moderation.recalculate_company_scores_for_evidence(bigint)
  SET search_path = pg_catalog, corporate_accountability_and_moderation, public;

-- SECURITY DEFINER: public-only functions
ALTER FUNCTION public.claim_next_moderation_item(uuid)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.reject_evidence(bigint, uuid, text)
  SET search_path = pg_catalog, public;

-- SECURITY DEFINER: invokes corporate_accountability_and_moderation schema
ALTER FUNCTION public.recalculate_company_scores_for_evidence(bigint)
  SET search_path = pg_catalog, public, corporate_accountability_and_moderation;

-- Other functions (language sql / plpgsql) and triggers
ALTER FUNCTION public.claim_notification_job()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.compute_entity_scores()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.compute_evidence_weights_for_row(evidence)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.refresh_scoring_materialized_views()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.release_stale_moderation_claims()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.set_assigned_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.trg_set_evidence_weights_on_approval()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.trigger_refresh_scoring_materialized_views()
  SET search_path = pg_catalog, public;
