import { supabaseServer } from "@/lib/supabase-server";
import { computeLeaderScoreFromEvidence } from "@/lib/computeLeaderScoreFromEvidence";
import type { CategoryId } from "@/lib/rotten-score";

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

  /* -------------------------------------------------
     1) Leader + company
     ------------------------------------------------- */
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

  /* -------------------------------------------------
     2) Leader tenures (authoritative time windows)
     ------------------------------------------------- */
  const { data: tenuresRaw, error: tenuresError } = await supabase
    .from("leader_tenures")
    .select("company_id, started_at, ended_at")
    .eq("leader_id", leader.id)
    .order("started_at", { ascending: true });

  if (tenuresError) {
    console.error("Leader tenures error:", tenuresError);
  }

  const tenures = (tenuresRaw ?? []) as TenureRow[];

  /* -------------------------------------------------
     3) Inequality metrics (unchanged)
     ------------------------------------------------- */
  const { data: inequality, error: inequalityError } = await supabase
    .from("leader_inequality")
    .select("*")
    .eq("leader_id", leader.id)
    .maybeSingle();

  if (inequalityError) {
    console.error("Leader inequality error:", inequalityError);
  }

  /* -------------------------------------------------
     4) Evidence (approved only)
     ------------------------------------------------- */
  const { data: evidenceRaw, error: evidenceError } = await supabase
    .from("evidence")
    .select("*")
    .eq("leader_id", leader.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (evidenceError) {
    console.error("Leader evidence error:", evidenceError);
  }

  /* -------------------------------------------------
     5) Tenure‑bounded evidence filter
        Fallback: if no tenures exist, keep all evidence
     ------------------------------------------------- */
  const evidence =
    tenures.length === 0
      ? (evidenceRaw ?? [])
      : (evidenceRaw ?? []).filter((ev) =>
          isWithinAnyTenure(ev.created_at, tenures)
        );

  /* -------------------------------------------------
     6) Compute leader score from tenure‑bounded evidence
     ------------------------------------------------- */
  const computedScore = computeLeaderScoreFromEvidence({
    evidence: evidence.map((ev) => ({
      category: ev.category as CategoryId,
      severity: ev.severity_suggested ?? ev.severity ?? 0,
    })),
    companyContext: {
      ownershipType: "public_company", // derive later if needed
      sizeEmployees: null,
      countryRegion: "western",
    },
  });

  /* -------------------------------------------------
     7) Category breakdown (still DB‑backed for now)
     ------------------------------------------------- */
  const { data: categories, error: categoriesError } = await supabase
    .from("leader_category_breakdown")
    .select("*")
    .eq("leader_id", leader.id);

  if (categoriesError) {
    console.error("Leader category breakdown error:", categoriesError);
  }

  /* -------------------------------------------------
     8) Return shape (UNCHANGED for UI + JSON‑LD)
     ------------------------------------------------- */
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
    score: {
      final_score: computedScore.finalScore ?? 0,
      raw_score: computedScore.baseCategoryScore ?? 0,
      direct_evidence_score: computedScore.baseCategoryScore ?? 0,
      inequality_score: inequality?.pay_ratio ?? 0,
      company_rotten_score: 0, // legacy field, safe placeholder
    },
    categories,
    inequality,
    evidence,
  };
}
