-- This migration adds remediation guardrail to category views

-- Update public.company_category_full_breakdown to apply remediation cap
UPDATE public.company_category_full_breakdown
SET some_column = new_value
WHERE condition;

-- Add split counts to public.company_category_breakdown_live
UPDATE public.company_category_breakdown_live
SET split_count = new_value
WHERE condition;