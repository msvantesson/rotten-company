-- Harden public.ratings score validation and ownership enforcement.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.ratings'::regclass
      AND conname = 'ratings_score_check'
  ) THEN
    RAISE NOTICE 'Constraint ratings_score_check already exists; skipping.';
  ELSE
    ALTER TABLE public.ratings
      ADD CONSTRAINT ratings_score_check
      CHECK (score >= 1 AND score <= 5);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND policyname = 'authenticated users can insert ratings'
  ) THEN
    DROP POLICY "authenticated users can insert ratings" ON public.ratings;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND policyname = 'authenticated users can insert own ratings'
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
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND policyname = 'authenticated users can update ratings'
  ) THEN
    DROP POLICY "authenticated users can update ratings" ON public.ratings;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ratings'
      AND policyname = 'authenticated users can update own ratings'
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
