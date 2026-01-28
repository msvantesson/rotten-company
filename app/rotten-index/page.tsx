export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import ClientWrapper from "./ClientWrapper";

type NormalizationMode = "none" | "employees" | "revenue";

type IndexedCompany = {
  company_id: number;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
  rotten_score: number;
  normalized_score: number;
};

function normalizeScore(
  score: number,
  company: { employees?: number | null; annual_revenue?: number | null },
  mode: NormalizationMode
) {
  if (mode === "employees" && company.employees && company.employees > 0) {
    return score / Math.log(company.employees + 10);
  }

  if (mode === "revenue" && company.annual_revenue && company.annual_revenue > 0) {
    return score / Math.log(Number(company.annual_revenue) + 10);
  }

  return score;
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await supabaseServer();

  // --- country ---
  let selectedCountry: string | null = null;
  const rawCountry = searchParams?.country;
  if (typeof rawCountry === "string" && rawCountry.trim()) {
    selectedCountry = rawCountry.trim();
  }

  // --- normalization ---
  let normalization: NormalizationMode = "none";
  const rawNorm = searchParams?.normalization;
  if (rawNorm === "employees" || rawNorm === "revenue") {
    normalization = rawNorm;
  }

  // 1️⃣ Fetch companies FIRST (apply country filter here)
  let companyQuery = supabase
    .from("companies")
    .select("id, name, slug, industry, country, employees, annual_revenue");

  if (selectedCountry) {
    companyQuery = companyQuery.eq("country", selectedCountry);
  }

  const { data: companies } = await companyQuery;

  if (!companies || companies.length === 0) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <ClientWrapper
          initialCountry={selectedCountry}
          normalization={normalization}
        />
        <p className="mt-6 text-gray-500">No companies found.</p>
      </main>
    );
  }

  const companyIds = companies.map((c) => c.id);

  // 2️⃣ Fetch scores ONLY for those companies
  const { data: scoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .in("company_id", companyIds);

  const scoreById: Record<number, number> = {};
  for (const row of scoreRows ?? []) {
    scoreById[row.company_id] = Number(row.rotten_score);
  }

  // 3️⃣ Build final list (TYPE‑SAFE)
  const items: IndexedCompany[] = companies
    .map((c) => {
      const score = scoreById[c.id];
      if (score == null) return null;

      return {
        company_id: c.id,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
        country: c.country,
        rotten_score: score,
        normalized_score: normalizeScore(score, c, normalization),
      };
    })
    .filter((c): c is IndexedCompany => c !== null)
    .sort((a, b) =>
      normalization === "none"
        ? b.rotten_score - a.rotten_score
        : b.normalized_score - a.normalized_score
    );

  return (
    <>
      <JsonLdDebugPanel
        data={{
          count: items.length,
          country: selectedCountry,
          normalization,
        }}
        debug={null}
        initiallyOpen={false}
      />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">
            Ranking companies by Rotten Score based on public evidence of harm.
          </p>
        </header>

        <ClientWrapper
          initialCountry={selectedCountry}
          normalization={normalization}
        />

        <pre className="mt-6 text-xs bg-gray-100 p-4 rounded">
          {JSON.stringify(items.slice(0, 10), null, 2)}
        </pre>
      </main>
    </>
  );
}
