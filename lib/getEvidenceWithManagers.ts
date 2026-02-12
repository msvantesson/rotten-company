import { supabaseBrowser } from "@/lib/supabase-browser";

const supabase = supabaseBrowser();

type ManagerRow = {
  id: number;
  name: string | null;
  role: string | null;
};

export async function getEvidenceWithManagers(companyId: number) {
  // Load evidence rows for a company and join managers if present.
  const { data: evidenceRows, error: evidenceError } = await supabase
    .from("evidence")
    .select(
      `
        id,
        title,
        summary,
        file_url,
        created_at,
        category,
        user_id,
        entity_type,
        entity_id,
        managers (
          id,
          name,
          role
        )
      `,
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
    return {
      ...row,
      managers,
    };
  });
}
