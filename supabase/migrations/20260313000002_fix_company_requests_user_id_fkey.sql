-- Fix /submit-company failures: company_requests_user_id_fkey was incorrectly
-- referencing public.users instead of auth.users. Drop and recreate it pointing
-- to auth.users(id) so that user_id values from supabase.auth.getUser() satisfy
-- the constraint.

ALTER TABLE public.company_requests
  DROP CONSTRAINT IF EXISTS company_requests_user_id_fkey;

ALTER TABLE public.company_requests
  ADD CONSTRAINT company_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
