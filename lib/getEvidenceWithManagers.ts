import { supabase } from "@/lib/supabaseClient";

type ManagerRow = {
  name: string;
};

type CategoryRow = {
  name: string;
};

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
      category_id,
      category:categories (
        name
      ),
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

  const evidence = data ?? [];

  //
  // STEP 2 — Extract unique manager IDs
  //
  const managerIds = Array.from(
    new Set(
      evidence
        .map((item) => item.manager_id)
        .filter((id): id is number => typeof id === "number")
    )
  );

  //
  // STEP 3 — Batch fetch report counts for all managers
  //
  let countMap = new Map<number, number>();

  if (managerIds.length > 0) {
    const { data: countRows, error: countError } = await supabase
      .from("evidence")
      .select("manager_id", { count: "exact" })
      .in("manager_id", managerIds)
      .eq("status", "approved");

    if (countError) {
      console.error("Manager count batch error:", countError);
    }

    const tempCount: Record<number, number> = {};

    countRows?.forEach((row) => {
      if (row.manager_id != null) {
        tempCount[row.manager_id] = (tempCount[row.manager_id] ?? 0) + 1;
      }
    });

    for (const [id, count] of Object.entries(tempCount)) {
      countMap.set(Number(id), count);
    }
  }

  //
  // STEP 4 — Normalize manager objects and attach counts
  //
  const enriched = evidence.map((item) => {
    const rawManager = item.manager as ManagerRow | ManagerRow[] | null;
    const rawCategory = item.category as CategoryRow | CategoryRow[] | null;

    const manager =
      rawManager && Array.isArray(rawManager)
        ? rawManager[0] ?? null
        : rawManager;

    const category =
      rawCategory && Array.isArray(rawCategory)
        ? rawCategory[0] ?? null
        : rawCategory;

    return {
      ...item,
      category: category ? { name: category.name } : null,
      manager: manager
        ? {
            name: manager.name,
            report_count: item.manager_id
              ? countMap.get(item.manager_id) ?? 0
              : null,
          }
        : null,
    };
  });

  return enriched;
}
