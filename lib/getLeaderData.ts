import { supabaseServer } from "@/lib/supabase-server";
import { computeLeaderScoreFromEvidence } from "@/lib/computeLeaderScoreFromEvidence";
import type { CategoryId } from "@/lib/rotten-score";

type TenureRow = {
  company_id: number;
  company_name: string | null;
  company_slug: string | null;
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
     1) Leader basic info
     ------------------------------------------------- */
  const { data: leader, error: leaderError } = await supabase
    .from("leaders")
    .select(`
      id,
      name,
      role,
      slug
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (leaderError || !leader) {
    console.error("Leader fetch error:", leaderError);
    return null;
  }

  /* -------------------------------------------------
     2) Leader tenures
     ------------------------------------------------- */
  const { data: tenuresRaw, error: tenuresError } = await supabase
    .from("leader_tenures")
    .select(`
      company_id,
      started_at,
      ended_at,
      companies (
        name,
        slug
      )
    `)
    .eq("leader_id", leader.id)
    .order("started_at", { ascending: true });

  if (tenuresError) {
    console.error("Leader tenures error:", tenuresError);
  }

  const tenures: TenureRow[] = (tenuresRaw ?? []).map((t: any) => ({
    company_id: t.company_id,
    company_name: t.companies?.name ?? null,
    company_slug: t.companies?.slug ?? null,
    started_at: t.started_at,
    ended_at: t.ended_at,
  }));

  /* -------------------------------------------------
     2.5) Derive primary company from tenures
     ------------------------------------------------- */
  // Primary company is the most recent active tenure (ended_at is null),
  // or the most recently started tenure if none are active
  let primaryCompanyId: number | null = null;
  let primaryCompanyName: string | null = null;

  if (tenures.length > 0) {
    // First try to find an active tenure (ended_at is null)
    const activeTenures = tenures.filter(t => !t.ended_at);
    if (activeTenures.length > 0) {
      // Use the most recently started active tenure
      const mostRecent = activeTenures.reduce((latest, t) => 
        new Date(t.started_at).getTime() > new Date(latest.started_at).getTime() ? t : latest
      );
      primaryCompanyId = mostRecent.company_id;
      primaryCompanyName = mostRecent.company_name;
    } else {
      // No active tenures, use the most recently started tenure
      const mostRecent = tenures.reduce((latest, t) => 
        new Date(t.started_at).getTime() > new Date(latest.started_at).getTime() ? t : latest
      );
      primaryCompanyId = mostRecent.company_id;
      primaryCompanyName = mostRecent.company_name;
    }
  }

  /* -------------------------------------------------
     3) Inequality metrics
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
        (seed evidence bypasses tenure)
     ------------------------------------------------- */
  const evidence =
    tenures.length === 0
      ? (evidenceRaw ?? [])
      : (evidenceRaw ?? []).filter((ev) => {
          if (ev.evidence_type === "seed") return true;
          return isWithinAnyTenure(ev.created_at, tenures);
        });

  /* -------------------------------------------------
     6) Compute leader score
     ------------------------------------------------- */
  const computedScore = computeLeaderScoreFromEvidence({
    evidence: evidence.map((ev) => ({
      category: ev.category as CategoryId,
      severity: ev.severity_suggested ?? ev.severity ?? 0,
    })),
    companyContext: {
      ownershipType: "public_company",
      sizeEmployees: null,
      countryRegion: "western",
    },
  });

  /* -------------------------------------------------
     7) Category breakdown
     ------------------------------------------------- */
  const { data: categories, error: categoriesError } = await supabase
    .from("leader_category_breakdown")
    .select("*")
    .eq("leader_id", leader.id);

  if (categoriesError) {
    console.error("Leader category breakdown error:", categoriesError);
  }

  /* -------------------------------------------------
     8) Return shape (UI + JSON‑LD compatible)
     ------------------------------------------------- */
  return {
    leader: {
      id: leader.id,
      name: leader.name,
      role: leader.role,
      slug: leader.slug,
      company_id: primaryCompanyId,
      company_name: primaryCompanyName,
    },
    tenures,
    score: {
      final_score: computedScore.finalScore ?? 0,
      raw_score: computedScore.baseCategoryScore ?? 0,
      direct_evidence_score: computedScore.baseCategoryScore ?? 0,
      inequality_score: inequality?.pay_ratio ?? 0,
      company_rotten_score: 0,
    },
    categories,
    inequality,
    evidence,
  };
}
