import { supabase } from "@/lib/supabaseClient";

export async function getEvidenceWithManagers(companyId: number) {
  //
  // STEP 1 — Fetch all approved evidence for this company
  //
  const { data, error } = await supabase
    .from("evidence")
    .select(`
      id,
      title,
      summary,
      file_url,
      file_type,
      file_size,
      evidence_type,
      severity,
      recency_weight,
      file_weight,
      total_weight,
      manager_id,
      manager:managers (
        name
      )
    `)
    .eq("company_id", companyId)
    .eq("status", "approved");

  if (error) {
    console.error("Evidence query failed:", error);
    throw error;
  }

  //
  // STEP 2 — Enrich each evidence item with manager report count
  //
  const enriched = await Promise.all(
    (data ?? []).map(async (item) => {
      // No manager? Return as-is.
      if (!item.manager_id || !item.manager) {
        return {
          ...item,
          manager: item.manager
            ? { name: item.manager.name, report_count: null }
            : null,
        };
      }

      // Count how many approved evidence items reference this manager
      const { count, error: countError } = await supabase
        .from("evidence")
        .select("*", { count: "exact", head: true })
        .eq("manager_id", item.manager_id)
        .eq("status", "approved");

      if (countError) {
        console.error("Manager count error:", countError);
      }

      return {
        ...item,
        manager: {
          name: item.manager.name,
          report_count: count ?? 0,
        },
      };
    })
  );

  return enriched;
}
