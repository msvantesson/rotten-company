-- Harden public.evidence authenticated insert ownership and moderation/scoring defaults.

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evidence'
      AND cmd = 'INSERT'
      AND 'authenticated' = ANY (roles)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.evidence', policy_record.policyname);
  END LOOP;
END
$$;

CREATE POLICY "authenticated users can insert own pending evidence"
  ON public.evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND assigned_moderator_id IS NULL
    AND assigned_at IS NULL
    AND severity IS NULL
    AND recency_weight IS NULL
    AND file_weight IS NULL
    AND total_weight IS NULL
  );
