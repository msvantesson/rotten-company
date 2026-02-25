-- Migration: add is_private_equity to company_requests
-- Tracks whether the submitted company is itself a Private Equity firm.
-- Mutually exclusive with having PE ownership records.

alter table company_requests
  add column if not exists is_private_equity boolean not null default false;
