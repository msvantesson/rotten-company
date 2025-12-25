// app/lib/api.ts
import { supabase } from "./supabaseClient";

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
}) {
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
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
