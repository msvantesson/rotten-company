-- Migration: Add CEO staging support to company requests
-- This migration adds tables and columns needed to stage CEO information
-- during company request submission and materialize it on approval.

-- 1. Add linkedin_url column to leaders table
ALTER TABLE leaders
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- 2. Add role column to leader_tenures table (if not exists)
-- Note: Some deployments may already have this column
ALTER TABLE leader_tenures
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'ceo';

-- 3. Create company_request_leader_tenures staging table
-- This table stores CEO information submitted with company requests
-- until the request is approved by a moderator.
CREATE TABLE IF NOT EXISTS company_request_leader_tenures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_request_id UUID NOT NULL REFERENCES company_requests(id) ON DELETE CASCADE,
  leader_name TEXT NOT NULL,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at DATE,
  role TEXT DEFAULT 'ceo',
  linkedin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure ended_at is >= started_at if provided
  CONSTRAINT valid_tenure_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- 4. Create index for efficient lookup during moderation approval
CREATE INDEX IF NOT EXISTS idx_company_request_leader_tenures_request_id
ON company_request_leader_tenures(company_request_id);

-- 5. Add comment for documentation
COMMENT ON TABLE company_request_leader_tenures IS 
'Staging table for CEO/leader information submitted with company requests. 
Records are materialized into leaders and leader_tenures tables upon moderation approval.';
