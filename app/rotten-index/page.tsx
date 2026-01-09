export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import ClientWrapper from "./ClientWrapper";

type IndexedCompany = {
  company_id: number;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
  rotten_score: number;
};

function getCountryDisplayName(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) return "All countries";
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function buildRottenIndexJsonLd(companies: IndexedCompany[], selectedCountryCode: string | null) {
  const baseUrl = "https://rotten-company.com";
  const isCountryScoped = !!selectedCountryCode && selectedCountryCode.trim().length > 0;
  const countryName = isCountryScoped ? getCountryDisplayName(selectedCountryCode) : null;

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
          spatialCoverage: {
            "@type": "Country",
            name: countryName,
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
          address:
            c.country && c.country.trim().length > 0
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

export default async function RottenIndexPage({ searchParams }: { searchParams?: SearchParams }) {
  // Read query param safely
  let selectedCountryCode: string | null = null;
  const raw = searchParams?.country;
  if (typeof raw === "string" && raw.trim()) selectedCountryCode = raw.trim();
  if (Array.isArray(raw) && raw[0]?.trim()) selectedCountryCode = raw[0].trim();

  console.log("[rotten-index] incoming selectedCountryCode:", selectedCountryCode);

  const supabase = await supabaseServer();

  // Fetch countries safely
  const { data: rawCountryRows } = await supabase
    .from("companies")
    .select("country");

  const countryRows: { country: string | null }[] = Array.isArray(rawCountryRows)
    ? rawCountryRows
    : [];

  const countrySet = new Set<string>();
  for (const row of countryRows) {
    if (row.country && row.country.trim().length > 0) {
      countrySet.add(row.country.trim());
    }
  }

  const countryOptions = [...countrySet]
    .map((dbValue) => ({ dbValue, label: getCountryDisplayName(dbValue) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Fetch scores
  const { data: rawScoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false });

  const scoreRows: { company_id: number; rotten_score: number | string }[] =
    Array.isArray(rawScoreRows) ? rawScoreRows : [];

  const companyIds = scoreRows.map((r) => r.company_id);

  // Fetch companies
  const { data: rawCompanyRows } = await supabase
    .from("companies")
    .select("id, name, slug, industry, country")
    .in("id", companyIds);

  const companyRows: {
    id: number;
    name: string;
    slug: string;
    industry: string | null;
    country: string | null;
  }[] = Array.isArray(rawCompanyRows) ? rawCompanyRows : [];

  const companyById: Record<number, {
    id: number;
    name: string;
    slug: string;
    industry: string | null;
    country: string | null;
  }> = {};
  for (const c of companyRows) companyById[c.id] = c;

  const companiesForJsonLd: IndexedCompany[] = scoreRows
    .map((row) => {
      const c = companyById[row.company_id];
      if (!c) return null;
      return {
        company_id: row.company_id,
        rotten_score: Number(row.rotten_score) || 0,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
        country: c.country,
      };
    })
    .filter(Boolean) as IndexedCompany[];

  const jsonLd = buildRottenIndexJsonLd(companiesForJsonLd, selectedCountryCode);

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
          initialCountry={selectedCountryCode}
          initialOptions={countryOptions}
        />

        <section className="mt-8 text-sm text-gray-500">
          <h2 className="font-semibold mb-1">Methodology</h2>
          <p>
            The Rotten Score is derived from category-level ratings, public evidence, and weighted signals of corporate
            harm. Higher scores indicate more severe and systemic issues.
          </p>
        </section>
      </main>
    </>
  );
}
