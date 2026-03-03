-- Migration: fix company_request_pe_owners to use uuid FK for company_request_id
-- The original migration (20260224000000) created company_request_id as bigint,
-- but public.company_requests.id is uuid in production.
-- This migration converges all environments to the correct schema.

do $$
declare
  col_type text;
begin
  -- Case 1: table does not exist → create with correct schema
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'company_request_pe_owners'
  ) then
    create table public.company_request_pe_owners (
      id                 bigserial    primary key,
      company_request_id uuid         not null references public.company_requests(id) on delete cascade,
      pe_owner_id        bigint       not null references public.companies(id),
      ownership_start    date         not null,
      ownership_end      date,
      created_at         timestamptz  not null default now()
    );

  else
    -- Case 2: table exists → check type of company_request_id
    select data_type into col_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'company_request_pe_owners'
      and column_name  = 'company_request_id';

    if col_type <> 'uuid' then
      -- bigint values cannot be cast to uuid, so data migration is impossible.
      -- Intentional data loss: drop the incorrectly-typed table (and any dependent
      -- objects such as views or FK constraints) then recreate with the correct schema.
      -- This situation only arises in dev/staging environments where the original
      -- broken migration (20260224000000) was applied; production already has uuid.
      raise notice 'company_request_pe_owners.company_request_id is %; dropping and recreating table (data loss is intentional and unavoidable)', col_type;
      drop table public.company_request_pe_owners cascade;

      create table public.company_request_pe_owners (
        id                 bigserial    primary key,
        company_request_id uuid         not null references public.company_requests(id) on delete cascade,
        pe_owner_id        bigint       not null references public.companies(id),
        ownership_start    date         not null,
        ownership_end      date,
        created_at         timestamptz  not null default now()
      );
    end if;
    -- Case 3: table already has uuid → nothing to do
  end if;
end;
$$;

-- Ensure index exists (safe to run regardless of which branch above was taken)
create index if not exists idx_crpe_company_request_id
  on public.company_request_pe_owners (company_request_id);
