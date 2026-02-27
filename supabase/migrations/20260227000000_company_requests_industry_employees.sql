-- Migration: add industry and size_employees to company_requests
-- Also widens companies.size_employees from integer to text
-- so range labels like "0–50" can be stored.

-- 1. Drop the integer check constraint that would block the type change
ALTER TABLE companies
  DROP CONSTRAINT IF EXISTS companies_size_employees_check;

-- 2. Widen companies.size_employees to text (existing numeric values preserved as strings)
ALTER TABLE companies
  ALTER COLUMN size_employees TYPE text
  USING size_employees::text;

-- 3. Add industry to company_requests
ALTER TABLE company_requests
  ADD COLUMN IF NOT EXISTS industry text;

-- 4. Add size_employees (range label) to company_requests
ALTER TABLE company_requests
  ADD COLUMN IF NOT EXISTS size_employees text;
