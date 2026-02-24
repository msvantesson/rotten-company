-- Migration: add company_request_pe_owners table
-- Stores Private Equity ownership periods linked to a company_request.
-- Schema supports multiple owner periods over time per request.

create table if not exists company_request_pe_owners (
  id               bigserial    primary key,
  company_request_id bigint     not null references company_requests(id) on delete cascade,
  pe_owner_id      bigint       not null references companies(id),
  ownership_start  date         not null,
  ownership_end    date,
  created_at       timestamptz  not null default now()
);

create index if not exists idx_crpe_company_request_id
  on company_request_pe_owners (company_request_id);
