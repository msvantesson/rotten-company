// app/lib/api.ts
import { supabase } from "./supabaseClient";
import { normalizeEvidenceTimelineInput, type TimelineDatePrecision, type TimelineResolutionStatus } from "@/lib/evidence-timeline";

/**
 * Fetch a single entity by slug.
 */
export async function fetchEntityBySlug(
  kind: "company" | "leader" | "manager" | "owner",
  slug: string
) {
  const table =
    kind === "company"
      ? "companies"
      : kind === "leader"
      ? "leaders"
      : kind === "manager"
      ? "managers"
      : "owners_investors";

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch approved evidence for an entity.
 * This automatically includes `evidence_type` because we select "*".
 */
export async function fetchApprovedEvidence(
  kind: "company" | "leader" | "manager" | "owner",
  id: number
) {
  const col =
    kind === "company"
      ? "company_id"
      : kind === "leader"
      ? "leader_id"
      : kind === "manager"
      ? "manager_id"
      : "owner_id";

  const { data, error } = await supabase
    .from("evidence")
    .select("*")
    .eq(col, id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Submit new evidence (used by EvidenceUpload if you want a central API).
 * This supports the new `evidence_type` field.
 */
export async function submitEvidence(payload: {
  entity_id: number;
  entity_type: "company" | "leader" | "manager" | "owner";
  title: string;
  summary?: string;
  file_path: string;
  user_id: string;
  evidence_type: string; // NEW
  event_start_date: string;
  event_start_precision: TimelineDatePrecision;
  event_end_date?: string | null;
  event_end_precision?: TimelineDatePrecision | null;
  event_is_ongoing: boolean;
  resolution_status: TimelineResolutionStatus;
  resolution_date?: string | null;
  resolution_date_precision?: TimelineDatePrecision | null;
}) {
  const timelineResult = normalizeEvidenceTimelineInput({
    event_start_date: payload.event_start_date,
    event_start_precision: payload.event_start_precision,
    event_end_date: payload.event_end_date ?? null,
    event_end_precision: payload.event_end_precision ?? null,
    event_is_ongoing: payload.event_is_ongoing,
    resolution_status: payload.resolution_status,
    resolution_date: payload.resolution_date ?? null,
    resolution_date_precision: payload.resolution_date_precision ?? null,
  });
  if (!timelineResult.ok) throw new Error(timelineResult.error);

  const { data, error } = await supabase
    .from("evidence")
    .insert({
      entity_id: payload.entity_id,
      entity_type: payload.entity_type,
      title: payload.title,
      summary: payload.summary ?? null,
      file_path: payload.file_path,
      user_id: payload.user_id,
      evidence_type: payload.evidence_type, // NEW
      event_start_date: timelineResult.data.event_start_date,
      event_start_precision: timelineResult.data.event_start_precision,
      event_end_date: timelineResult.data.event_end_date,
      event_end_precision: timelineResult.data.event_end_precision,
      event_is_ongoing: timelineResult.data.event_is_ongoing,
      resolution_status: timelineResult.data.resolution_status,
      resolution_date: timelineResult.data.resolution_date,
      resolution_date_precision: timelineResult.data.resolution_date_precision,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
