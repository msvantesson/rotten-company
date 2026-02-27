-- Migration: add industry and size_employees fields to company_requests,
-- and add size_employees_range label column to companies.
-- companies.size_employees remains an integer storing employee count.
-- companies.size_employees_range stores the display label (e.g. "51–200").

-- 1. Add size_employees_range (display label) to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS size_employees_range text;

-- 2. Add industry to company_requests
ALTER TABLE company_requests
  ADD COLUMN IF NOT EXISTS industry text;

-- 3. Add size_employees (range label) to company_requests
ALTER TABLE company_requests
  ADD COLUMN IF NOT EXISTS size_employees text;

-- 4. Add size_employees_min (numeric helper) to company_requests
ALTER TABLE company_requests
  ADD COLUMN IF NOT EXISTS size_employees_min integer;
