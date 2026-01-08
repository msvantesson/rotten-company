import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get("country") || null;
    console.log("[api/rotten-index] Request for country:", country);

    const supabase = await supabaseServer();

    // Hent scores
    const { data: scoreRows, error: scoreError } = await supabase
      .from("company_rotten_score")
      .select("company_id, rotten_score")
      .order("rotten_score", { ascending: false });

    if (scoreError) {
      console.error("[api/rotten-index] scores error:", String(scoreError));
      return NextResponse.json({ error: "scores query failed" }, { status: 500 });
    }

    const companyIds = Array.isArray(scoreRows) ? scoreRows.map((r: any) => r.company_id) : [];

    // Hent companies
    let companyRows: any[] = [];
    if (companyIds.length > 0) {
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, name, slug, industry, country")
        .in("id", companyIds);

      if (companiesError) {
        console.error("[api/rotten-index] companies error:", String(companiesError));
        return NextResponse.json({ error: "companies query failed" }, { status: 500 });
      }
      companyRows = Array.isArray(companiesData) ? companiesData : [];
    }

    // Saml og match i score‑rækkefølge
    const companyById: Record<number, any> = {};
    for (const c of companyRows) {
      companyById[c.id] = c;
    }

    let companies = (scoreRows || [])
      .map((r: any) => {
        const c = companyById[r.company_id];
        if (!c) return null;
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          industry: c.industry || null,
          country: c.country || null,
          rotten_score: typeof r.rotten_score === "number" ? r.rotten_score : Number(r.rotten_score) || 0,
        };
      })
      .filter((x: any) => x !== null);

    // Filtrer case‑insensitive hvis country er angivet
    if (country && country.trim().length > 0) {
      const target = country.trim().toLowerCase();
      console.log("[api/rotten-index] Filtering for country:", target, "from", companies.length, "companies");
      companies = companies.filter((c: any) => c.country && c.country.trim().toLowerCase() === target);
      console.log("[api/rotten-index] After filtering:", companies.length, "companies remain");
    }

    console.log("[api/rotten-index] Returning", companies.length, "companies");
    return NextResponse.json({ companies });
  } catch (err) {
    console.error("[api/rotten-index] fatal:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
