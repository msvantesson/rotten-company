import { createServerClient } from "@/lib/supabase/server";


import { Database } from "@/types/supabase";

export async function getLeaderData(slug: string) {
  const supabase = createServerClient<Database>();

  // 1. Fetch leader by slug
  const { data: leader, error: leaderError } = await supabase
    .from("leaders")
    .select("id, name, role, company_id, slug")
    .eq("slug", slug)
    .single();

  if (leaderError || !leader) {
    return null;
  }

  const leaderId = leader.id;

  // 2. Fetch leader rotten score
  const { data: score } = await supabase
    .from("leader_rotten_score")
    .select("*")
    .eq("leader_id", leaderId)
    .single();

  // 3. Fetch category breakdown
  const { data: categories } = await supabase
    .from("leader_category_breakdown")
    .select("*")
    .eq("leader_id", leaderId);

  // 4. Fetch inequality signal
  const { data: inequality } = await supabase
    .from("leader_inequality_signal")
    .select("*")
    .eq("leader_id", leaderId)
    .single();

  // 5. Fetch evidence timeline
  const { data: evidence } = await supabase
    .from("evidence")
    .select(
      `
      id,
      title,
      summary,
      category,
      severity,
      created_at,
      company_id,
      leader_id
    `
    )
    .eq("leader_id", leaderId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return {
    leader,
    score,
    categories,
    inequality,
    evidence
  };
}
