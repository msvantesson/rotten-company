import { supabaseServer } from "@/lib/supabase-server";

type TenureRow = {
  company_id: number;
  started_at: string;
  ended_at: string | null;
};

function isWithinAnyTenure(createdAt: string, tenures: TenureRow[]) {
  const t = new Date(createdAt).getTime();

  for (const ten of tenures) {
    const start = new Date(ten.started_at).getTime();
    const end = ten.ended_at ? new Date(ten.ended_at).getTime() : Date.now();
    if (t >= start && t <= end) return true;
  }

  return false;
}

export async function getLeaderData(slug: string) {
  const supabase = await supabaseServer();

  // 1) Leader + company name
  const { data: leader, error: leaderError } = await supabase
    .from("leaders")
    .select(`
      id,
      name,
      role,
      slug,
      company_id,
      companies (
        id,
        name
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (leaderError || !leader) {
    console.error("Leader fetch error:", leaderError);
    return null;
  }

  const company = leader.companies?.[0] ?? null;
  const company_name = company?.name ?? null;

  // 2) Tenures
  const { data: tenuresRaw, error: tenuresError } = await supabase
    .from("leader_tenures")
    .select("company_id, started_at, ended_at")
    .eq("leader_id", leader.id)
    .order("started_at", { ascending: true });

  if (tenuresError) {
    console.error("Leader tenures error:", tenuresError);
  }

  const tenures = (tenuresRaw ?? []) as TenureRow[];

  // 3) Leader score
  const { data: score, error: scoreError } = await supabase
    .from("leader_scores")
    .select("*")
    .eq("leader_id", leader.id)
    .maybeSingle();

  if (scoreError) {
    console.error("Leader score error:", scoreError);
  }

  // 4) Category breakdown
  const { data: categories, error: categoriesError } = await supabase
    .from("leader_category_breakdown")
    .select("*")
    .eq("leader_id", leader.id);

  if (categoriesError) {
    console.error("Leader category breakdown error:", categoriesError);
  }

  // 5) Inequality metrics
  const { data: inequality, error: inequalityError } = await supabase
    .from("leader_inequality")
    .select("*")
    .eq("leader_id", leader.id)
    .maybeSingle();

  if (inequalityError) {
    console.error("Leader inequality error:", inequalityError);
  }

  // 6) Evidence
  const { data: evidenceRaw, error: evidenceError } = await supabase
    .from("evidence")
    .select("*")
    .eq("leader_id", leader.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (evidenceError) {
    console.error("Leader evidence error:", evidenceError);
  }

  // 7) Tenure filter
  const evidence =
    tenures.length === 0
      ? (evidenceRaw ?? [])
      : (evidenceRaw ?? []).filter((ev) =>
          isWithinAnyTenure(ev.created_at, tenures)
        );

  return {
    leader: {
      id: leader.id,
      name: leader.name,
      role: leader.role,
      slug: leader.slug,
      company_id: leader.company_id,
      company_name,
    },
    tenures,
    score,
    categories,
    inequality,
    evidence,
  };
}
