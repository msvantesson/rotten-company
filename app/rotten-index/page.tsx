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

type SearchParams = { [key: string]: string | string[] | undefined };

function getFirstString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return null;
}

function getCountryDisplayName(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) return "All countries";
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
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

  if (mode === "revenue" && company.annual_revenue && Number(company.annual_revenue) > 0) {
    return score / Math.log(Number(company.annual_revenue) + 10);
  }

  return score;
}

function buildRottenIndexJsonLd(companies: IndexedCompany[], selectedCountry: string | null) {
  const baseUrl = "https://rotten-company.com";
  const isCountryScoped = !!selectedCountry && selectedCountry.trim().length > 0;
  const countryName = isCountryScoped ? getCountryDisplayName(selectedCountry) : null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isCountryScoped
      ? `Global Rotten Index — Companies in ${countryName}`
      : "Global Rotten Index — Companies",
    description: isCountryScoped
      ? `Ranking companies in ${countryName} by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.`
      : "Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.",
    itemListOrder: "Descending",
    numberOfItems: companies.length,
    ...(isCountryScoped
      ? {
          spatialCoverage: { "@type": "Country", name: countryName },
        }
      : {}),
    itemListElement: companies.map((c, index) => {
      const url = `${baseUrl}/company/${c.slug}`;
      return {
        "@type": "ListItem",
        position: index + 1,
        url,
        item: {
          "@type": "Organization",
          "@id": url,
          url,
          name: c.name,
          identifier: c.slug,
          additionalProperty: [
            { "@type": "PropertyValue", name: "Rotten Score", value: c.rotten_score },
          ],
          industry: c.industry || undefined,
          address:
            c.country && c.country.trim().length > 0
              ? { "@type": "PostalAddress", addressCountry: getCountryDisplayName(c.country) }
              : undefined,
        },
      };
    }),
  };
}

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  // ✅ Works whether Next gives you an object or a Promise
  const sp: SearchParams = await Promise.resolve(searchParams ?? {});

  const selectedCountryRaw = getFirstString(sp.country); // e.g. "IRELAND"
  const selectedCountry = selectedCountryRaw && selectedCountryRaw.length > 0 ? selectedCountryRaw : null;

  const normRaw = getFirstString(sp.normalization);
  const normalization: NormalizationMode =
    normRaw === "employees" || normRaw === "revenue" ? normRaw : "none";

  const supabase = await supabaseServer();

  // Country dropdown options
  const { data: rawCountryRows } = await supabase.from("companies").select("country");

  const countrySet = new Set<string>();
  for (const row of rawCountryRows ?? []) {
    if (row.country && row.country.trim().length > 0) countrySet.add(row.country.trim());
  }

  const countryOptions = [...countrySet]
    .map((dbValue) => ({ dbValue, label: getCountryDisplayName(dbValue) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // 1) Fetch companies FIRST (apply country filter here, case-insensitive)
  let companyQuery = supabase
    .from("companies")
    .select("id, name, slug, industry, country, employees, annual_revenue");

  if (selectedCountry) {
    // ✅ Case-insensitive equality
    companyQuery = companyQuery.ilike("country", selectedCountry);
  }

  const { data: companyRows } = await companyQuery;
  const companies = companyRows ?? [];

  // If nothing matches, render the shell still
  if (companies.length === 0) {
    const jsonLdEmpty = buildRottenIndexJsonLd([], selectedCountry);

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdEmpty) }}
        />
        <JsonLdDebugPanel data={jsonLdEmpty} debug={null} initiallyOpen={false} />

        <main className="max-w-5xl mx-auto px-4 py-10">
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
            <p className="text-gray-600">
              Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.
            </p>
          </header>

          <ClientWrapper
            initialCountry={selectedCountry}
            initialOptions={countryOptions}
            normalization={normalization}
          />

          <p className="mt-8 text-sm text-gray-500">No companies found for that country filter.</p>
        </main>
      </>
    );
  }

  const companyIds = companies.map((c) => c.id);

  // 2) Fetch scores ONLY for these companies
  const { data: scoreRowsRaw } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .in("company_id", companyIds);

  const scoreById: Record<number, number> = {};
  for (const row of scoreRowsRaw ?? []) {
    scoreById[row.company_id] = Number(row.rotten_score) || 0;
  }

  // 3) Build, normalize, sort (type-safe)
  const items: IndexedCompany[] = companies
    .map((c) => {
      const score = scoreById[c.id];
      if (score == null) return null;

      const normalized = normalizeScore(score, c, normalization);

      return {
        company_id: c.id,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
        country: c.country,
        rotten_score: score,
        normalized_score: normalized,
      };
    })
    .filter((c): c is IndexedCompany => c !== null)
    .sort((a, b) =>
      normalization === "none" ? b.rotten_score - a.rotten_score : b.normalized_score - a.normalized_score
    );

  const jsonLd = buildRottenIndexJsonLd(items, selectedCountry);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <JsonLdDebugPanel data={jsonLd} debug={null} initiallyOpen={false} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">
            Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.
          </p>
        </header>

        <ClientWrapper
          initialCountry={selectedCountry}
          initialOptions={countryOptions}
          normalization={normalization}
        />

        <section className="mt-8 text-sm text-gray-500">
          <h2 className="font-semibold mb-1">Methodology</h2>
          <p>
            Rotten Scores are absolute measures of verified corporate harm. Normalization, when enabled, provides an
            analytical lens and does not replace the underlying score.
          </p>
        </section>

        {/* Keep your real UI here; if you don’t have it yet, this at least proves correctness */}
        <pre className="mt-6 text-xs bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(items.slice(0, 15), null, 2)}
        </pre>
      </main>
    </>
  );
}
