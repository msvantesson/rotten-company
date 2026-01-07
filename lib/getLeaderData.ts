import { supabaseServer } from "@/lib/supabase-server";

export async function getLeaderData(slug: string) {
  const supabase = await supabaseServer();

  // 1. Fetch leader + company name
  const { data: leader, error: leaderError } = await supabase
    .from("leaders")
    .select(`
      id,
      name,
      role,
      slug,
      company_id,
      companies (
        name
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (leaderError || !leader) {
    console.error("Leader fetch error:", leaderError);
    return null;
  }

  // companies is ALWAYS an array from Supabase
  const company_name = leader.companies?.[0]?.name ?? null;

  // 2. Fetch leader score
  const { data: score, error: scoreError } = await supabase
    .from("leader_scores")
    .select("*")
    .eq("leader_id", leader.id)
    .maybeSingle();

  if (scoreError) {
    console.error("Leader score error:", scoreError);
  }

  // 3. Fetch category breakdown
  const { data: categories, error: categoriesError } = await supabase
    .from("leader_category_breakdown")
    .select("*")
    .eq("leader_id", leader.id);

  if (categoriesError) {
    console.error("Leader category breakdown error:", categoriesError);
  }

  // 4. Inequality metrics
  const { data: inequality, error: inequalityError } = await supabase
    .from("leader_inequality")
    .select("*")
    .eq("leader_id", leader.id)
    .maybeSingle();

  if (inequalityError) {
    console.error("Leader inequality error:", inequalityError);
  }

  // 5. Evidence
  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .select("*")
    .eq("leader_id", leader.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (evidenceError) {
    console.error("Leader evidence error:", evidenceError);
  }

  return {
    leader: {
      id: leader.id,
      name: leader.name,
      role: leader.role,
      slug: leader.slug,
      company_id: leader.company_id,
      company_name, // <-- FIXED
    },
    score,
    categories,
    inequality,
    evidence,
  };
}
