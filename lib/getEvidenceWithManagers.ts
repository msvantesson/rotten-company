import { supabaseBrowser } from "@/lib/supabase-browser";

const supabase = supabaseBrowser();

type ManagerRow = {
  id: number;
  name: string | null;
  role: string | null;
};

export async function getEvidenceWithManagers(companyId: number) {
  // Prefer the canonical linkage (entity_type/entity_id) and only show approved evidence.
  // Keep a fallback for older rows that might use company_id.
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
        category,
        category_id,
        severity,
        severity_suggested,
        recency_weight,
        file_weight,
        total_weight,
        user_id,
        entity_type,
        entity_id,
        company_id,
        managers (
          id,
          name,
          role
        )
      `
    )
    .eq("status", "approved")
    // OR clause: evidence linked via entity_* OR legacy company_id
    .or(`and(entity_type.eq.company,entity_id.eq.${companyId}),company_id.eq.${companyId}`)
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
    return { ...row, managers };
  });
}
