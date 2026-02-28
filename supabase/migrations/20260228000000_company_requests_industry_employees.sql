-- Migration: add industry and employee fields to company_requests; add size_employees_range to companies
-- All columns are added idempotently with IF NOT EXISTS.

-- companies: text label for the employee range band
alter table companies
  add column if not exists size_employees_range text;

-- company_requests: text label submitted by the user (e.g. "51-200")
alter table company_requests
  add column if not exists size_employees text;

-- company_requests: numeric lower-bound of the range (e.g. 51)
alter table company_requests
  add column if not exists size_employees_min integer;

-- company_requests: industry submitted by the user
alter table company_requests
  add column if not exists industry text;
