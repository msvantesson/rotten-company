export const dynamic = "force-dynamic";
export const dynamicParams = true;
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

function getCountryDisplayName(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) return "All countries";
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

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

function buildRottenIndexJsonLd(
  companies: IndexedCompany[],
  selectedCountryCode: string | null
) {
  const baseUrl = "https://rotten-company.com";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: selectedCountryCode
      ? `Global Rotten Index — Companies in ${getCountryDisplayName(selectedCountryCode)}`
      : "Global Rotten Index — Companies",
    itemListOrder: "Descending",
    numberOfItems: companies.length,
    itemListElement: companies.map((c, index) => {
      const url = `${baseUrl}/company/${c.slug}`;
      return {
        "@type": "ListItem",
        position: index + 1,
        url,
        item: {
          "@type": "Organization",
          "@id": url,
          name: c.name,
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Rotten Score",
              value: c.rotten_score,
            },
          ],
          industry: c.industry || undefined,
          address: c.country
            ? {
                "@type": "PostalAddress",
                addressCountry: getCountryDisplayName(c.country),
              }
            : undefined,
        },
      };
    }),
  };
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // --- country ---
  let selectedCountryCode: string | null = null;
  const rawCountry = searchParams?.country;
  if (typeof rawCountry === "string" && rawCountry.trim())
    selectedCountryCode = rawCountry.trim();
  if (Array.isArray(rawCountry) && rawCountry[0]?.trim())
    selectedCountryCode = rawCountry[0].trim();

  // --- normalization ---
  let normalization: NormalizationMode = "none";
  const rawNorm = searchParams?.normalization;
  if (rawNorm === "employees" || rawNorm === "revenue") {
    normalization = rawNorm;
  }

  const supabase = await supabaseServer();

  // --- country options ---
  const { data: rawCountryRows } = await supabase
    .from("companies")
    .select("country");

  const countryOptions = [...new Set((rawCountryRows ?? [])
    .map((r) => r.country)
    .filter(Boolean))]
    .map((c) => ({ dbValue: c!, label: getCountryDisplayName(c) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // --- scores ---
  const { data: scoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false });

  const companyIds = (scoreRows ?? []).map((r) => r.company_id);

  // --- companies (WITH COUNTRY FILTER) ---
  let companyQuery = supabase
    .from("companies")
    .select("id, name, slug, industry, country, employees, annual_revenue")
    .in("id", companyIds);

  if (selectedCountryCode) {
    companyQuery = companyQuery.eq("country", selectedCountryCode);
  }

  const { data: companyRows } = await companyQuery;

  const companyById: Record<number, any> = {};
  for (const c of companyRows ?? []) companyById[c.id] = c;

  const companies: IndexedCompany[] = (scoreRows ?? [])
    .map((row) => {
      const c = companyById[row.company_id];
      if (!c) return null;

      const absolute = Number(row.rotten_score) || 0;
      const normalized = normalizeScore(absolute, c, normalization);

      return {
        company_id: row.company_id,
        rotten_score: absolute,
        normalized_score: normalized,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
        country: c.country,
      };
    })
    .filter((c): c is IndexedCompany => c !== null)
    .sort((a, b) =>
      normalization === "none"
        ? b.rotten_score - a.rotten_score
        : b.normalized_score - a.normalized_score
    );

  const jsonLd = buildRottenIndexJsonLd(companies, selectedCountryCode);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <JsonLdDebugPanel data={jsonLd} debug={null} initiallyOpen={false} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">
            Ranking companies by Rotten Score based on public evidence of harm.
          </p>
        </header>

        <ClientWrapper
          initialCountry={selectedCountryCode}
          initialOptions={countryOptions}
          normalization={normalization}
        />
      </main>
    </>
  );
}
