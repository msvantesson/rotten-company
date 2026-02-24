-- Migration: add approved_company_id to company_requests
-- Stores the id of the company created when a request is approved.
-- Used for idempotency: if the request is approved again, the company is not re-created.

alter table company_requests
  add column if not exists approved_company_id bigint references companies(id);
