-- Add partial indexes for faster selection of pending unassigned rows

-- Index for company_requests: pending and unassigned
CREATE INDEX IF NOT EXISTS idx_company_requests_pending_unassigned
  ON public.company_requests (created_at)
  WHERE status = 'pending' AND assigned_moderator_id IS NULL;

-- Index for evidence: pending, company-related, and unassigned
CREATE INDEX IF NOT EXISTS idx_evidence_pending_unassigned_company
  ON public.evidence (created_at)
  WHERE status = 'pending' AND (entity_type = 'company' OR (entity_type IS NULL AND company_id IS NOT NULL)) AND assigned_moderator_id IS NULL;
