import { supabaseBrowser } from "@/lib/supabase-browser";

const supabase = supabaseBrowser();

type ManagerRow = {
  id: number;
  name: string | null;
  role: string | null;
};

export async function getEvidenceWithManagers(companyId: number) {
  // Load evidence rows for a company and join managers if present.
  // Include weight-related fields used by EvidenceList/EvidenceListGrouped.
  const { data: evidenceRows, error: evidenceError } = await supabase
    .from("evidence")
    .select(
      `
        id,
        title,
        summary,
        file_url,
        file_type,
        file_size,
        evidence_type,
        created_at,
        category_id,
        category ( name ),
        user_id,
        entity_type,
        entity_id,
        severity,
        recency_weight,
        file_weight,
        total_weight,
        managers (
          id,
          name,
          role
        )
      `
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (evidenceError) {
    console.error("[getEvidenceWithManagers] error loading evidence", {
      companyId,
      error: evidenceError,
    });
    return [];
  }

  return (evidenceRows ?? []).map((row: any) => {
    const managers: ManagerRow[] = row.managers ?? [];

    // EvidenceList expects `manager` (singular) in addition to whatever else you carry.
    // If there are multiple managers, pick the first for display.
    const manager =
      managers.length > 0
        ? {
            id: managers[0].id,
            name: managers[0].name,
            role: managers[0].role,
          }
        : null;

    return {
      ...row,
      managers,
      manager,
    };
  });
}
