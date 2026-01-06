import { supabase } from "@/lib/supabaseClient";

type ManagerRow = {
  name: string;
};

export async function getEvidenceWithManagers(companyId: number) {
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

  const enriched = await Promise.all(
    (data ?? []).map(async (item) => {
      // Normalize manager: Supabase may return an array or a single object
      const rawManager = item.manager as ManagerRow | ManagerRow[] | null;

      const manager =
        rawManager && Array.isArray(rawManager)
          ? rawManager[0] ?? null
          : rawManager;

      if (!item.manager_id || !manager) {
        return {
          ...item,
          manager: manager
            ? { name: manager.name, report_count: null }
            : null,
        };
      }

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
          name: manager.name,
          report_count: count ?? 0,
        },
      };
    })
  );

  return enriched;
}
