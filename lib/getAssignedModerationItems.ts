import { supabaseService } from "@/lib/supabase-service";

export type AssignedModerationItem = {
  kind: "evidence" | "company_request";
  id: string;
  title: string;
  created_at: string;
  href: string;
};

/**
 * Fetch all pending moderation items currently assigned to the given moderator.
 *
 * Used by both /moderation (to disable "Assign next case") and
 * /moderation/current (to redirect to the assigned item) so that both pages
 * share the same assignment-detection logic and can never diverge.
 */
export async function getAssignedModerationItems(
  moderatorId: string,
): Promise<AssignedModerationItem[]> {
  const service = supabaseService();

  const [
    { data: assignedEvidenceRows, error: evidenceError },
    { data: assignedCompanyRequestRows, error: requestError },
  ] = await Promise.all([
    service
      .from("evidence")
      .select("id, title, created_at")
      .eq("assigned_moderator_id", moderatorId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    service
      .from("company_requests")
      .select("id, name, created_at")
      .eq("assigned_moderator_id", moderatorId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  if (evidenceError) {
    console.error("[getAssignedModerationItems] evidence query failed", evidenceError);
    throw new Error(`Failed to fetch assigned evidence: ${evidenceError.message}`);
  }

  if (requestError) {
    console.error("[getAssignedModerationItems] company_requests query failed", requestError);
    throw new Error(`Failed to fetch assigned company requests: ${requestError.message}`);
  }

  return [
    ...(assignedEvidenceRows || []).map((r) => ({
      kind: "evidence" as const,
      id: String(r.id),
      title: r.title ?? "(untitled)",
      created_at: r.created_at,
      href: `/moderation/evidence/${r.id}`,
    })),
    ...(assignedCompanyRequestRows || []).map((r) => ({
      kind: "company_request" as const,
      id: String(r.id),
      title: r.name ?? "(untitled)",
      created_at: r.created_at,
      href: `/moderation/company-requests/${r.id}`,
    })),
  ];
}
