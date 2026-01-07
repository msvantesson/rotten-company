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

  // Normalize company_name into a flat field
  const company_name = leader.companies?.name ?? null;

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
    .select("*
