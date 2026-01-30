// app/api/rotten-index/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type IndexType = "company" | "leader" | "owner";

function getSearchParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = (getSearchParam(url, "type") as IndexType) || "company";
    const limit = Number(getSearchParam(url, "limit") || "10");
    const country = getSearchParam(url, "country");

    let query;

    if (type === "company") {
      query = supabase
        .from("companies")
        .select("id, name, slug, country, rotten_score")
        .order("rotten_score", { ascending: false })
        .limit(limit);

      if (country) query.eq("country", country);
    }

    if (type === "leader") {
      query = supabase
        .from("leaders")
        .select("id, name, slug, country, rotten_score")
        .order("rotten_score", { ascending: false })
        .limit(limit);

      if (country) query.eq("country", country);
    }

    if (type === "owner") {
      query = supabase
        .from("owners_investors")
        .select("id, name, slug, rotten_score")
        .order("rotten_score", { ascending: false })
        .limit(limit);

      // owners don't have country yet
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      country: r.country ?? null,
      rotten_score: Number(r.rotten_score) || 0,
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
