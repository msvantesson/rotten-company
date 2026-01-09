export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";

type SearchParams = { [key: string]: string | string[] | undefined };

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

type CountryRow = {
  country?: string | null;
};

export default async function RottenIndexDiagnostics({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  try {
    const supabase = await supabaseServer();

    const selectedCountry =
      typeof searchParams?.country === "string" && searchParams.country.trim().length > 0
        ? searchParams.country.trim()
        : null;

    // Run the same queries your page uses and capture results and errors
    const countryResult = await supabase.from("companies").select("country");
    console.log("[rotten-index-diagnostics] countryResult:", {
      error: countryResult.error ? String(countryResult.error) : null,
      count: Array.isArray(countryResult.data) ? countryResult.data.length : null,
    });

    const scoreResult = await supabase
      .from("company_rotten_score")
      .select("company_id, rotten_score")
      .order("rotten_score", { ascending: false });
    console.log("[rotten-index-diagnostics] scoreResult:", {
      error: scoreResult.error ? String(scoreResult.error) : null,
      count: Array.isArray(scoreResult.data) ? scoreResult.data.length : null,
    });

    const companyIds = Array.isArray(scoreResult.data)
      ? scoreResult.data.map((r: ScoreRow) => r.company_id).slice(0, 200)
      : [];

    const companyResult = companyIds.length
      ? await supabase
          .from("companies")
          .select("id, name, slug, industry, country")
          .in("id", companyIds)
      : { data: [], error: null };
    console.log("[rotten-index-diagnostics] companyResult:", {
      error: companyResult.error ? String(companyResult.error) : null,
      count: Array.isArray(companyResult.data) ? companyResult.data.length : null,
    });

    // Sample rows for quick inspection
    const sampleCountries = Array.isArray(countryResult.data)
      ? (countryResult.data as CountryRow[]).slice(0, 20)
      : [];
    const sampleScores = Array.isArray(scoreResult.data)
      ? (scoreResult.data as ScoreRow[]).slice(0, 20)
      : [];
    const sampleCompanies = Array.isArray(companyResult.data)
      ? (companyResult.data as CompanyRow[]).slice(0, 20)
      : [];

    // Render a simple diagnostic page with the raw values
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Rotten Index Diagnostics</h1>

        <section style={{ marginBottom: 16 }}>
          <strong>Selected country query param</strong>
          <pre style={{ background: "#f3f4f6", padding: 12 }}>{selectedCountry ?? "(none)"}</pre>
        </section>

        <section style={{ marginBottom: 16 }}>
          <strong>Countries query (sample)</strong>
          <pre style={{ background: "#f3f4f6", padding: 12 }}>
            {JSON.stringify(sampleCountries, null, 2)}
          </pre>
        </section>

        <section style={{ marginBottom: 16 }}>
          <strong>Scores query (sample)</strong>
          <pre style={{ background: "#f3f4f6", padding: 12 }}>
            {JSON.stringify(sampleScores, null, 2)}
          </pre>
        </section>

        <section style={{ marginBottom: 16 }}>
          <strong>Companies query (sample)</strong>
          <pre style={{ background: "#f3f4f6", padding: 12 }}>
            {JSON.stringify(sampleCompanies, null, 2)}
          </pre>
        </section>

        <section style={{ marginTop: 20 }}>
          <p style={{ color: "#6b7280" }}>
            Also check server logs for lines starting with <code>[rotten-index-diagnostics]</code>.
          </p>
        </section>
      </main>
    );
  } catch (err) {
    console.error("[rotten-index-diagnostics] fatal error:", err);
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Rotten Index Diagnostics</h1>
        <p style={{ color: "red" }}>Fatal error occurred. Check server logs for details.</p>
        <pre style={{ background: "#fef2f2", padding: 12 }}>{String(err)}</pre>
      </main>
    );
  }
}
