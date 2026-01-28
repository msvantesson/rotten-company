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
  if (mode === "employees" && company.employees) {
    return score / Math.log(company.employees + 10);
  }
  if (mode === "revenue" && company.annual_revenue) {
    return score / Math.log(Number(company.annual_revenue) + 10);
  }
  return score;
}

export default async function RottenIndexPage({ searchParams }: any) {
  const supabase = await supabaseServer();

  const country = typeof searchParams?.country === "string"
    ? searchParams.country
    : null;

  const normalization: NormalizationMode =
    searchParams?.normalization === "employees" ||
    searchParams?.normalization === "revenue"
      ? searchParams.normalization
      : "none";

  // 1️⃣ FETCH COMPANIES FIRST (WITH COUNTRY FILTER)
  let companyQuery = supabase
    .from("companies")
    .select("id, name, slug, industry, country, employees, annual_revenue");

  if (country) {
    companyQuery = companyQuery.eq("country", country);
  }

  const { data: companies } = await companyQuery;
  if (!companies || companies.length === 0) {
    return <p>No companies found.</p>;
  }

  const companyIds = companies.map((c) => c.id);

  // 2️⃣ FETCH SCORES ONLY FOR THOSE COMPANIES
  const { data: scores } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .in("company_id", companyIds);

  const scoreById = Object.fromEntries(
    (scores ?? []).map((s) => [s.company_id, Number(s.rotten_score)])
  );

  // 3️⃣ BUILD FINAL LIST
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
    .filter(Boolean)
    .sort((a: any, b: any) =>
      normalization === "none"
        ? b.rotten_score - a.rotten_score
        : b.normalized_score - a.normalized_score
    );

  return (
    <>
      <JsonLdDebugPanel data={{ count: items.length }} />
      <ClientWrapper
        initialCountry={country}
        normalization={normalization}
      />
      <pre>{JSON.stringify(items.slice(0, 5), null, 2)}</pre>
    </>
  );
}
