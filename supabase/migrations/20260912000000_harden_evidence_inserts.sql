-- Harden public.evidence insert ownership and moderation/scoring defaults.

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
      AND coalesce(with_check, '') = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.evidence', policy_record.policyname);
  END LOOP;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evidence'
      AND cmd = 'INSERT'
      AND 'authenticated' = ANY (roles)
      AND coalesce(with_check, '') ILIKE '%auth.uid()%user_id%'
      AND coalesce(with_check, '') ILIKE '%status = ''pending''%'
      AND coalesce(with_check, '') ILIKE '%assigned_moderator_id IS NULL%'
      AND coalesce(with_check, '') ILIKE '%assigned_at IS NULL%'
      AND coalesce(with_check, '') ILIKE '%severity IS NULL%'
      AND coalesce(with_check, '') ILIKE '%recency_weight IS NULL%'
      AND coalesce(with_check, '') ILIKE '%file_weight IS NULL%'
      AND coalesce(with_check, '') ILIKE '%total_weight IS NULL%'
      AND coalesce(with_check, '') ILIKE '%created_at = now()%'
  ) THEN
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
        AND created_at = now()
      );
  END IF;
END
$$;
