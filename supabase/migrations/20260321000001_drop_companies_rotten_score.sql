-- Drop the legacy persisted rotten_score column from companies.
-- The canonical score is now computed on-the-fly by the company_rotten_score_v2 view.
ALTER TABLE public.companies DROP COLUMN IF EXISTS rotten_score;
