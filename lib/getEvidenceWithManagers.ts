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

  const rows = evidenceRows ?? [];

  // Collect unique category IDs so we can resolve category names.
  // Prefer category_id (canonical FK) and fall back to the legacy category column.
  const categoryIdSet = new Set<number>();
  for (const row of rows) {
    const id =
      typeof row.category_id === "number"
        ? row.category_id
        : typeof row.category === "number"
          ? row.category
          : null;
    if (id !== null) categoryIdSet.add(id);
  }

  // Build a lookup map { categoryId -> categoryName }.
  const categoryNameById: Record<number, string> = {};
  if (categoryIdSet.size > 0) {
    const { data: cats, error: catsError } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", Array.from(categoryIdSet));

    if (catsError) {
      console.error(
        "[getEvidenceWithManagers] error loading categories; evidence will display without category names",
        { error: catsError },
      );
    }

    for (const cat of cats ?? []) {
      if (typeof cat.id === "number" && typeof cat.name === "string") {
        categoryNameById[cat.id] = cat.name;
      }
    }
  }

  return rows.map((row: any) => {
    const managers: ManagerRow[] = row.managers ?? [];

    // Resolve the category name from the lookup map.
    const catId =
      typeof row.category_id === "number"
        ? row.category_id
        : typeof row.category === "number"
          ? row.category
          : null;
    const catName = catId !== null ? (categoryNameById[catId] ?? null) : null;

    return {
      ...row,
      managers,
      // Provide category as { name } so components can display the category name
      // without falling back to "Uncategorized" when category_id is present.
      category: catName !== null ? { name: catName } : null,
    };
  });
}
