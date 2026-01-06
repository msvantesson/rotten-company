import { supabaseServer } from "@/lib/supabase-server";

export async function getLeaderData(slug: string) {
  const supabase = await supabaseServer();

  const { data: leader, error: leaderError } = await supabase
    .from("leaders")
    .select("id, name, role, company_id, slug")
    .eq("slug", slug)
    .single();

  if (leaderError || !leader) {
    return null;
  }

  const leaderId = leader.id;

  const { data: score } = await supabase
    .from("leader_rotten_score")
    .select("*")
    .eq("leader_id", leaderId)
    .single();

  const { data: categories } = await supabase
    .from("leader_category_breakdown")
    .select("*")
    .eq("leader_id", leaderId);

  const { data: inequality } = await supabase
    .from("leader_inequality_signal")
    .select("*")
    .eq("leader_id", leaderId)
    .single();

  const { data: evidence } = await supabase
    .from("evidence")
    .select(`
      id,
      title,
      summary,
      category,
      severity,
      created_at,
      company_id,
      leader_id
    `)
    .eq("leader_id", leaderId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return {
    leader,
    score,
    categories,
    inequality,
    evidence,
  };
}
