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
  if (!value) return "All countries";
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
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

function buildRottenIndexJsonLd(
  companies: IndexedCompany[],
  selectedCountry: string | null
) {
  const baseUrl = "https://rotten-company.com";
  const isCountryScoped = !!selectedCountry;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: isCountryScoped
      ? `Global Rotten Index — Companies in ${getCountryDisplayName(selectedCountry)}`
      : "Global Rotten Index — Companies",
    description:
      "Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.",
    itemListOrder: "Descending",
    numberOfItems: companies.length,
    ...(isCountryScoped
      ? {
          spatialCoverage: {
            "@type": "Country",
            name: getCountryDisplayName(selectedCountry),
          },
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

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const sp: SearchParams = await Promise.resolve(searchParams ?? {});
  const selectedCountry = getFirstString(sp.country);
  const normalizationRaw = getFirstString(sp.normalization);

  const normalization: NormalizationMode =
    normalizationRaw === "employees" || normalizationRaw === "revenue"
      ? normalizationRaw
      : "none";

  const supabase = await supabaseServer();

  // Country options
  const { data: countryRows } = await supabase.from("companies").select("country");
  const countryOptions = [...new Set((countryRows ?? []).map((r) => r.country).filter(Boolean))]
    .map((c) => ({ dbValue: c!, label: getCountryDisplayName(c) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Fetch companies FIRST (country filter here)
  let companyQuery = supabase
    .from("companies")
    .select("id, name, slug, industry, country, employees, annual_revenue");

  if (selectedCountry) {
    companyQuery = companyQuery.ilike("country", selectedCountry);
  }

  const { data: companiesRaw } = await companyQuery;
  const companies = companiesRaw ?? [];

  const companyIds = companies.map((c) => c.id);

  // Fetch scores ONLY for these companies
  const { data: scoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .in("company_id", companyIds);

  const scoreById: Record<number, number> = {};
  for (const row of scoreRows ?? []) {
    scoreById[row.company_id] = Number(row.rotten_score) || 0;
  }

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

  const jsonLd = buildRottenIndexJsonLd(items, selectedCountry);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <JsonLdDebugPanel data={jsonLd} debug={null} initiallyOpen={false} />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">
            Ranking companies by Rotten Score based on public evidence of harm,
            misconduct, and corporate behavior.
          </p>
        </header>

        <ClientWrapper
          initialCountry={selectedCountry}
          initialOptions={countryOptions}
          normalization={normalization}
        />

        {/* 🔥 RESTORED TABLE */}
        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-sm text-gray-600">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Industry</th>
              <th className="py-2 pr-4">Country</th>
              <th className="py-2 text-right">Rotten Score</th>
            </tr>
          </thead>
          <tbody>
            {items.map((company, index) => (
              <tr
                key={company.company_id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  window.location.href = `/company/${company.slug}`;
                }}
              >
                <td className="py-2 pr-4 text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="py-2 pr-4 font-medium text-blue-700">
                  {company.name}
                </td>
                <td className="py-2 pr-4 text-sm text-gray-600">
                  {company.industry ?? "—"}
                </td>
                <td className="py-2 pr-4 text-sm text-gray-600">
                  {company.country ?? "—"}
                </td>
                <td className="py-2 text-right font-mono">
                  {normalization === "none"
                    ? company.rotten_score.toFixed(2)
                    : company.normalized_score.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
