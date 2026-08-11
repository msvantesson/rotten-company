export type PreviousEvidenceRow = {
  id: number;
  entity_type: string | null;
  entity_id: number | null;
  company_id: number | null;
  company_request_id: number | null;
  category: number | null;
  category_id: number | null;
  evidence_type: string | null;
  event_start_date: string | null;
  event_start_precision: "day" | "month" | "year" | null;
  event_end_date: string | null;
  event_end_precision: "day" | "month" | "year" | null;
  event_is_ongoing: boolean | null;
  resolution_status: "resolved" | "unresolved" | null;
  resolution_date: string | null;
  resolution_date_precision: "day" | "month" | "year" | null;
};

export function buildResubmittedEvidenceInsertPayload(
  previous: PreviousEvidenceRow,
  formData: FormData,
  userId: string,
) {
  return {
    title: formData.get("title"),
    summary: formData.get("summary"),
    contributor_note: formData.get("contributor_note"),
    entity_type: previous.entity_type,
    entity_id: previous.entity_id,
    company_id: previous.company_id,
    company_request_id: previous.company_request_id,
    category: previous.category,
    category_id: previous.category_id,
    evidence_type: previous.evidence_type,
    event_start_date: previous.event_start_date,
    event_start_precision: previous.event_start_precision,
    event_end_date: previous.event_end_date,
    event_end_precision: previous.event_end_precision,
    event_is_ongoing: previous.event_is_ongoing,
    resolution_status: previous.resolution_status,
    resolution_date: previous.resolution_date,
    resolution_date_precision: previous.resolution_date_precision,
    user_id: userId,
    status: "pending" as const,
    resubmits_evidence_id: previous.id,
  };
}
