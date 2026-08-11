import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { logDebug } from "@/lib/log";

export async function GET(req: NextRequest) {
  const supabase = supabaseService();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  logDebug("search-entities-api", "Searching companies", { q });

  const { data, error } = await supabase
    .from("global_rotten_index")
    .select("id, name, slug, country, industry, rotten_score")
    .ilike("name", `%${q}%`)
    .limit(10);

  if (error) {
    logDebug("search-entities-api", "Search error", error);
    return new NextResponse("Search failed", { status: 500 });
  }

  const results = (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country ?? null,
    industry: row.industry ?? null,
    rotten_score: row.rotten_score != null ? Number(row.rotten_score) : null,
    submitEvidenceUrl: `/company/${row.slug}/submit-evidence`,
  }));

  return NextResponse.json({ results });
}
