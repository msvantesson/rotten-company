export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";

// --- Types ---
type IndexedCompany = {
  company_id: number;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
  rotten_score: number;
};

// --- Country display helper ---
function getCountryDisplayName(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) return "All countries";
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) =>
      w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w
    )
    .join(" ");
}

// --- JSON-LD builder ---
function buildRottenIndexJsonLd(
  companies: IndexedCompany[],
  selectedCountryCode: string | null
) {
  const baseUrl = "https://rotten-company.com";
  const isCountryScoped =
    !!selectedCountryCode && selectedCountryCode.trim().length > 0;
  const countryName = isCountryScoped
    ? getCountryDisplayName(selectedCountryCode)
    : null;

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
          industry: c.industry ?? undefined,
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

// --- Main page ---
type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  try {
    const supabase = await supabaseServer();

    const selectedCountryCode =
      typeof searchParams?.country === "string" &&
      searchParams.country.trim().length > 0
        ? searchParams.country.trim()
        : null;

    const { data: countryRows } = await supabase
      .from("companies")
      .select("country");

    const countrySet = new Set<string>();
    if (countryRows) {
      for (const row of countryRows) {
        const code = (row as any).country as string | null;
        if (code && code.trim().length > 0) {
          countrySet.add(code.trim());
        }
      }
    }

    const countryOptions = Array.from(countrySet)
      .map((dbValue) => ({
        dbValue,
        label: getCountryDisplayName(dbValue),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const { data: scoreRows } = await supabase
      .from("company_rotten_score")
      .select("company_id, rotten_score")
      .order("rotten_score", { ascending: false });

    if (!scoreRows || scoreRows.length === 0) {
      const emptyJsonLd = buildRottenIndexJsonLd([], selectedCountryCode);
      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(emptyJsonLd, null, 2),
            }}
          />
          <JsonLdDebugPanel data={emptyJsonLd} />
          <main className="max-w-5xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
            <p className="text-gray-600">No companies found.</p>
          </main>
        </>
      );
    }

    const companyIds = scoreRows.map((row) => row.company_id);
    const { data: companyRows } = await supabase
      .from("companies")
      .select("id, name, slug, industry, country")
      .in("id", companyIds);

    const companyById =
      companyRows?.reduce<
        Record<
          number,
          {
            id: number;
            name: string;
            slug: string;
            industry: string | null;
            country: string | null;
          }
        >
      >((acc, row: any) => {
        acc[row.id] = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          industry: row.industry ?? null,
          country: row.country ?? null,
        };
        return acc;
      }, {}) ?? {};

    let companies: IndexedCompany[] = scoreRows
      .map((row: any) => {
        const c = companyById[row.company_id];
        if (!c) return null;
        return {
          company_id: row.company_id,
          rotten_score: row.rotten_score ?? 0,
          name: c.name,
          slug: c.slug,
          industry: c.industry,
          country: c.country,
        };
      })
      .filter((c): c is IndexedCompany => c !== null);

    if (selectedCountryCode) {
      companies = companies.filter(
        (c) => c.country?.trim() === selectedCountryCode
      );
    }

    const jsonLd = buildRottenIndexJsonLd(companies, selectedCountryCode);

    const currentScopeLabel = selectedCountryCode
      ? `Companies only — ${getCountryDisplayName(selectedCountryCode)}`
      : "Companies only — All countries";

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd, null, 2),
          }}
        />

        <JsonLdDebugPanel data={jsonLd} />

        <main className="max-w-5xl mx-auto px-4 py-10">
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
            <p className="text-gray-600">
              Ranking companies by Rotten Score based on public evidence of
              harm, misconduct, and corporate behavior.
            </p>
          </header>

          <section className="mb-6 flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-500">
              Currently showing: <strong>{currentScopeLabel}</strong>
            </span>

            <form
              method="GET"
              action="/rotten-index"
              className="flex items-center gap-2 text-sm"
            >
              <label htmlFor="country" className="text-gray-600">
                Country:
              </label>

              <select
                id="country"
                name="country"
                defaultValue={selectedCountryCode ?? ""}
                onChange={(e) => e.target.form?.submit()}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value="">All countries</option>
                {countryOptions.map((opt) => (
                  <option key={opt.dbValue} value={opt.dbValue}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </form>
          </section>

          {companies.length === 0 ? (
            <p className="text-gray-600">
              No companies found
              {selectedCountryCode
                ? ` for ${getCountryDisplayName(selectedCountryCode)}`
                : ""}
              .
            </p>
          ) : (
            <ol className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {companies.map((c, index) => (
                <li
                  key={c.company_id}
                  data-country={c.country ?? ""}
                  className="flex items-center justify-between px-4 py-3"
