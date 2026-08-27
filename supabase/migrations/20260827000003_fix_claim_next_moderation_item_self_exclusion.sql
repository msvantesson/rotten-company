-- Fix claim_next_moderation_item to enforce the same self-exclusion rule used
-- by the moderation count queries in page.tsx:
--
--   status = 'pending'
--   AND assigned_moderator_id IS NULL
--   AND (user_id IS NULL OR user_id <> p_moderator_id)
--
-- This ensures that the "Available excluding yours" display count and the
-- actual claim/assignment operation are always computed from identical
-- eligibility criteria. Before this migration the function source was
-- outside version control; this replaces it with an auditable, self-exclusion-
-- correct implementation that also covers leader_tenure_requests (added in
-- migration 20260302000000).
--
-- Self-moderation protection is preserved: a user can never claim an item
-- whose user_id matches their own moderator UUID.
--
-- Null/imported items (user_id IS NULL) remain claimable by any moderator
-- because they have no owner.

CREATE OR REPLACE FUNCTION public.claim_next_moderation_item(p_moderator_id uuid)
RETURNS TABLE(kind text, item_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id bigint;
BEGIN
  -- ── Evidence ──────────────────────────────────────────────────────────────
  -- Atomically claim the oldest unassigned pending evidence item that was not
  -- submitted by the requesting moderator.
  UPDATE evidence
  SET assigned_moderator_id = p_moderator_id,
      assigned_at           = now()
  WHERE id = (
    SELECT id
    FROM   evidence
    WHERE  status                = 'pending'
      AND  assigned_moderator_id IS NULL
      AND  (user_id IS NULL OR user_id <> p_moderator_id)
    ORDER  BY created_at ASC
    LIMIT  1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT 'evidence'::text, v_id::text;
    RETURN;
  END IF;

  -- ── Company requests ──────────────────────────────────────────────────────
  UPDATE company_requests
  SET assigned_moderator_id = p_moderator_id,
      assigned_at           = now()
  WHERE id = (
    SELECT id
    FROM   company_requests
    WHERE  status                = 'pending'
      AND  assigned_moderator_id IS NULL
      AND  (user_id IS NULL OR user_id <> p_moderator_id)
    ORDER  BY created_at ASC
    LIMIT  1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT 'company_request'::text, v_id::text;
    RETURN;
  END IF;

  -- ── Leader tenure requests ────────────────────────────────────────────────
  -- Added after the original function was written; included here to keep the
  -- RPC consistent with the TypeScript-side count queries.
  UPDATE leader_tenure_requests
  SET assigned_moderator_id = p_moderator_id,
      assigned_at           = now()
  WHERE id = (
    SELECT id
    FROM   leader_tenure_requests
    WHERE  status                = 'pending'
      AND  assigned_moderator_id IS NULL
      AND  (user_id IS NULL OR user_id <> p_moderator_id)
    ORDER  BY created_at ASC
    LIMIT  1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT 'leader_tenure_request'::text, v_id::text;
    RETURN;
  END IF;

  -- Nothing available — return empty result set.
END;
$$;

-- Grant execute to authenticated users so the RPC remains callable via the
-- Supabase JS client (same grant pattern as the original function).
GRANT EXECUTE ON FUNCTION public.claim_next_moderation_item(uuid)
  TO authenticated;
