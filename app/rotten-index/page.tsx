export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { JsonLdDebugPanel } from "@/components/JsonLdDebugPanel";

// --- Types ---

type IndexedCompany = {
  company_id: number;
  name: string;
  slug: string;
  industry: string | null;
  country: string | null;
  rotten_score: number;
};

// --- Country name mapping (ISO-2 → full name) ---

const COUNTRY_NAME_MAP: Record<string, string> = {
  CH: "Switzerland",
  DE: "Germany",
  AT: "Austria",
  FR: "France",
  IT: "Italy",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  // Add more as needed; unknown codes will fall back to the code itself
};

function getCountryName(code: string | null | undefined): string {
  if (!code) return "Unknown country";
  return COUNTRY_NAME_MAP[code] ?? code;
}

// --- JSON-LD builder ---

function buildRottenIndexJsonLd(
  companies: IndexedCompany[],
  selectedCountryCode: string | null
) {
  const baseUrl = "https://rotten-company.com";

  const isCountryScoped = !!selectedCountryCode;
  const countryName = selectedCountryCode ? getCountryName(selectedCountryCode) : null;

  const name = isCountryScoped
    ? `Global Rotten Index — Companies in ${countryName}`
    : "Global Rotten Index — Companies";

  const description = isCountryScoped
    ? `Ranking companies in ${countryName} by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.`
    : "Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.";

  const spatialCoverage = isCountryScoped
    ? {
        "@type": "Country",
        name: countryName,
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    description,
    itemListOrder: "Descending",
    numberOfItems: companies.length,
    ...(spatialCoverage ? { spatialCoverage } : {}),
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
                addressCountry: getCountryName(c.country),
              }
            : undefined,
        },
      };
    }),
  };
}

// --- Page component ---

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await supabaseServer();

  // 1) Read selected country from query params
  const rawCountryParam = searchParams?.country;
  const selectedCountryCode =
    typeof rawCountryParam === "string" && rawCountryParam.trim().length > 0
      ? rawCountryParam.trim().toUpperCase()
      : null;

  // 2) Load all countries from companies (dynamic options)
  const { data: countryRows, error: countryError } = await supabase
    .from("companies")
    .select("country");

  if (countryError) {
    console.error("Error loading distinct countries from companies:", countryError);
  }

  const countrySet = new Set<string>();
  if (countryRows) {
    for (const row of countryRows) {
      const code = (row as any).country as string | null;
      if (code && code.trim().length > 0) {
        countrySet.add(code.trim().toUpperCase());
      }
    }
  }

  const availableCountries = Array.from(countrySet).sort((a, b) =>
    getCountryName(a).localeCompare(getCountryName(b))
  );

  // 3) Get all company scores, ordered by Rotten Score DESC
  const { data: scoreRows, error: scoreError } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false });

  if (scoreError) {
    console.error("Error loading company_rotten_score:", scoreError);
  }

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
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
            <p className="text-gray-600">
              Ranking companies by Rotten Score based on public evidence of harm,
              misconduct, and corporate behavior.
            </p>
          </header>

          <section className="mb-6 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">
              Currently showing: <strong>Companies only</strong>
            </span>
          </section>

          <p className="text-gray-600">
            No companies found in the Rotten Index. Rotten Scores may not have been
            calculated yet.
          </p>

          <section className="mt-8 text-sm text-gray-500">
            <h2 className="font-semibold mb-1">Methodology</h2>
            <p>
              The Rotten Score is derived from category-level ratings, public
              evidence, and weighted signals of corporate harm. Higher scores
              indicate more severe and systemic issues.
            </p>
          </section>
        </main>
      </>
    );
  }

  // 4) Fetch company metadata for all scored companies
  const companyIds = scoreRows.map((row) => row.company_id);

  const { data: companyRows, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, industry, country")
    .in("id", companyIds);

  if (companyError) {
    console.error("Error loading companies for Rotten Index:", companyError);
  }

  const companyById =
    companyRows?.reduce<
      Record<
        number,
        { id: number; name: string; slug: string; industry: string | null; country: string | null }
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

  // 5) Merge scores + metadata; preserve score ordering
  let companies: IndexedCompany[] = scoreRows
    .map((row: any) => {
      const c = companyById[row.company_id];
      if (!c) {
        return null;
      }
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

  // 6) Apply country filter (if any)
  if (selectedCountryCode) {
    companies = companies.filter(
      (c) => c.country && c.country.toUpperCase() === selectedCountryCode
    );
  }

  const jsonLd = buildRottenIndexJsonLd(companies, selectedCountryCode);

  const currentScopeLabel = selectedCountryCode
    ? `Companies only — ${getCountryName(selectedCountryCode)}`
    : "Companies only — All countries";

  return (
    <>
      {/* JSON-LD for the Global Rotten Index */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, null, 2),
        }}
      />

      {/* Developer-only JSON-LD debug panel */}
      <JsonLdDebugPanel data={jsonLd} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">
            Ranking companies by Rotten Score based on public evidence of harm,
            misconduct, and corporate behavior.
          </p>
        </header>

        {/* Country filter + context */}
        <section className="mb-6 flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-500">
            Currently showing: <strong>{currentScopeLabel}</strong>
          </span>

          <form
            method="GET"
            className="flex items-center gap-2 text-sm"
          >
            <label htmlFor="country" className="text-gray-600">
              Country:
            </label>
            <select
              id="country"
              name="country"
              defaultValue={selectedCountryCode ?? ""}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="">All countries</option>
              {availableCountries.map((code) => (
                <option key={code} value={code}>
                  {getCountryName(code)} ({code})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="border border-gray-300 rounded px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100"
            >
              Apply
            </button>
          </form>
        </section>

        {/* Company list */}
        {companies.length === 0 ? (
          <p className="text-gray-600">
            No companies found in the Rotten Index
            {selectedCountryCode ? ` for ${getCountryName(selectedCountryCode)}` : ""}.
          </p>
        ) : (
          <ol className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {companies.map((c, index) => (
              <li
                key={c.company_id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 font-mono w-6 text-right">
                    {index + 1}.
                  </span>
                  <div>
                    <Link
                      href={`/company/${c.slug}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-sm text-gray-500">
                      {c.industry || "Unknown industry"}
                      {c.country ? ` · ${getCountryName(c.country)}` : ""}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold">
                    {c.rotten_score.toFixed(1)}
                  </div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Rotten Score
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* Methodology */}
        <section className="mt-8 text-sm text-gray-500">
          <h2 className="font-semibold mb-1">Methodology</h2>
          <p>
            The Rotten Score is derived from category-level ratings, public evidence,
            and weighted signals of corporate harm. Higher scores indicate more severe
            and systemic issues.
          </p>
        </section>
      </main>
    </>
  );
}
