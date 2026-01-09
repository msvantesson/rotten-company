import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ScoreRow = {
  company_id: number;
  rotten_score: number;
};

type CompanyRow = {
  id: number;
  name: string;
  slug: string;
  industry?: string | null;
  country?: string | null;
};

type IndexedCompany = {
  id: number;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
  rotten_score: number;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get("country") || null;

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

    const companyIds = Array.isArray(scoreRows) ? scoreRows.map((r: ScoreRow) => r.company_id) : [];

    // Hent companies
    let companyRows: CompanyRow[] = [];
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
    const companyById: Record<number, CompanyRow> = {};
    for (const c of companyRows) {
      companyById[c.id] = c;
    }

    let companies = (scoreRows || [])
      .map((r: ScoreRow) => {
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
      .filter((x: IndexedCompany | null): x is IndexedCompany => x !== null);

    // Filtrer case‑insensitive hvis country er angivet
    if (country && country.trim().length > 0) {
      const target = country.trim().toLowerCase();
      companies = companies.filter((c: IndexedCompany) => c.country && c.country.trim().toLowerCase() === target);
    }

    return NextResponse.json({ companies });
  } catch (err) {
    console.error("[api/rotten-index] fatal:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
