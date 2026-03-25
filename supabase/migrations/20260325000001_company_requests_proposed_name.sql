-- Migration: add proposed_name column to company_requests
-- This allows storing a suggested name change separate from the display name (name column).
-- The existing `name` column continues to store the current company name for identification.

alter table company_requests
  add column if not exists proposed_name text;
