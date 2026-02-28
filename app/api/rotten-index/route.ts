// app/api/rotten-index/route.ts
import { NextResponse } from "next/server"; 
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type IndexType = "company" | "leader";

function getSearchParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawType = getSearchParam(url, "type");
    const type: IndexType =
      rawType === "leader" ? "leader" : "company";
    const limit = Number(getSearchParam(url, "limit") || "10");
    const country = getSearchParam(url, "country");

    let query;

    // ✅ COMPANIES — use the VIEW
    if (type === "company") {
      query = supabase
        .from("global_rotten_index")
        .select("id, name, slug, country, rotten_score")
        .order("rotten_score", { ascending: false })
        .limit(limit);

      if (country) query.eq("country", country);

    // LEADERS — query all leaders (base), enrich with optional best CEO tenure
    } else {
      let leadersQuery = supabase
        .from("leaders")
        .select("id, name, slug, country, rotten_score")
        .order("rotten_score", { ascending: false })
        .limit(limit);

      if (country) leadersQuery = leadersQuery.eq("country", country);

      const { data: leadersData, error: leadersError } = await leadersQuery;

      if (leadersError) {
        console.error("Supabase error:", leadersError);
        return NextResponse.json({ error: leadersError.message }, { status: 500 });
      }

      const leaders = leadersData ?? [];

      if (leaders.length === 0) {
        return NextResponse.json({ rows: [] }, { status: 200 });
      }

      // Fetch all tenures for these leaders
      const leaderIds = leaders.map((l: any) => l.id);
      const { data: tenuresData } = await supabase
        .from("leader_tenures")
        .select("id, leader_id, started_at, ended_at, companies(id, name, slug)")
        .in("leader_id", leaderIds);

      // For each leader, pick the best tenure:
      // Priority: active (ended_at IS NULL) > past; then most recent started_at
      const tenureMap = new Map<number, any>();
      for (const tenure of tenuresData ?? []) {
        const existing = tenureMap.get(tenure.leader_id);
        if (!existing) {
          tenureMap.set(tenure.leader_id, tenure);
          continue;
        }
        const tActive = !tenure.ended_at;
        const eActive = !existing.ended_at;
        if (tActive && !eActive) {
          tenureMap.set(tenure.leader_id, tenure);
          continue;
        }
        if (!tActive && eActive) continue;
        const tTime = new Date(tenure.started_at).getTime();
        const eTime = new Date(existing.started_at).getTime();
        if (tTime > eTime) tenureMap.set(tenure.leader_id, tenure);
      }

      const rows = leaders.map((l: any) => {
        const tenure = tenureMap.get(l.id);
        const company = tenure?.companies as any;
        return {
          id: l.id,
          name: l.name,
          slug: l.slug,
          country: l.country ?? null,
          rotten_score: Number(l.rotten_score) || 0,
          tenure_id: tenure?.id ?? null,
          company_name: company?.name ?? null,
          company_slug: company?.slug ?? null,
          started_at: tenure?.started_at ?? null,
          ended_at: tenure?.ended_at ?? null,
        };
      });

      return NextResponse.json({ rows }, { status: 200 });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      country: r.country ?? null,
      rotten_score: Number(r.rotten_score),
    }));

    return NextResponse.json({ rows }, { status: 200 });

  } catch (err) {
    console.error("Error in /api/rotten-index:", err);
    return NextResponse.json(
      { error: "Failed to load Rotten Index" },
      { status: 500 }
    );
  }
}
