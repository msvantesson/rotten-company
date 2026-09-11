-- Harden public.ratings score validation and ownership enforcement.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.ratings'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%score >= 1%score <= 5%'
        OR pg_get_constraintdef(oid) ILIKE '%score <= 5%score >= 1%'
        OR pg_get_constraintdef(oid) ILIKE '%score BETWEEN 1 AND 5%'
      )
  ) THEN
    RAISE NOTICE 'Equivalent ratings score check constraint already exists; skipping.';
  ELSE
    ALTER TABLE public.ratings
      ADD CONSTRAINT ratings_score_check
      CHECK (score >= 1 AND score <= 5) NOT VALID;
  END IF;
END
$$;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND cmd = 'INSERT'
      AND 'authenticated' = ANY (roles)
      AND coalesce(with_check, '') = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.ratings', policy_record.policyname);
  END LOOP;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND cmd = 'INSERT'
      AND 'authenticated' = ANY (roles)
      AND coalesce(with_check, '') ILIKE '%auth.uid()%user_id%'
  ) THEN
    CREATE POLICY "authenticated users can insert own ratings"
      ON public.ratings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND cmd = 'UPDATE'
      AND 'authenticated' = ANY (roles)
      AND (
        coalesce(qual, '') = 'true'
        OR coalesce(with_check, '') = 'true'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.ratings', policy_record.policyname);
  END LOOP;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND cmd = 'UPDATE'
      AND 'authenticated' = ANY (roles)
      AND coalesce(qual, '') ILIKE '%auth.uid()%user_id%'
      AND coalesce(with_check, '') ILIKE '%auth.uid()%user_id%'
  ) THEN
    CREATE POLICY "authenticated users can update own ratings"
      ON public.ratings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
