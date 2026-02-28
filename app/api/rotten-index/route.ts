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

    // LEADERS — query leader_tenures (CEO role) joined with leaders + companies
    } else {
      let tenureQuery = supabase
        .from("leader_tenures")
        .select(
          "id, leader_id, started_at, ended_at, leaders!inner(id, name, slug, country, rotten_score), companies(id, name, slug, country)"
        )
        .eq("role", "ceo");

      if (country) tenureQuery = tenureQuery.filter("leaders.country", "eq", country);

      const { data: tenureData, error: tenureError } = await tenureQuery;

      if (tenureError) {
        console.error("Supabase error:", tenureError);
        return NextResponse.json({ error: tenureError.message }, { status: 500 });
      }

      // Sort: current (ended_at IS NULL) first, then started_at DESC
      const sorted = (tenureData ?? []).sort((a: any, b: any) => {
        const aCurrent = !a.ended_at;
        const bCurrent = !b.ended_at;
        if (aCurrent && !bCurrent) return -1;
        if (!aCurrent && bCurrent) return 1;
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });

      const rows = sorted.slice(0, limit).map((r: any) => ({
        id: r.id,
        leader_id: r.leader_id,
        name: r.leaders?.name ?? "Unknown",
        slug: r.leaders?.slug ?? "",
        country: r.leaders?.country ?? r.companies?.country ?? null,
        rotten_score: Number(r.leaders?.rotten_score) || 0,
        company_name: r.companies?.name ?? null,
        company_slug: r.companies?.slug ?? null,
        started_at: r.started_at ?? null,
        ended_at: r.ended_at ?? null,
      }));

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
