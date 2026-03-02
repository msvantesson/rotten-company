-- Migration: enable Row Level Security on public.leader_tenure_requests
-- Fixes Supabase linter finding: rls_disabled_in_public
-- Idempotent: enabling RLS on an already-enabled table is a no-op.
-- Note: access policies for this table already exist and are unaffected by this change.

ALTER TABLE public.leader_tenure_requests ENABLE ROW LEVEL SECURITY;
