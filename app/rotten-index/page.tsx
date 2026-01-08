export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";

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
    .map((w) =>
      w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w
    )
    .join(" ");
}

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

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  try {
    const supabase = await supabaseServer();

    // Read raw country query param (supports string or array)
    let selectedCountryCode: string | null = null;
    const raw = searchParams && searchParams.country;
    if (typeof raw === "string" && raw.trim().length > 0) {
      selectedCountryCode = raw.trim();
    } else if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string" && raw[0].trim().length > 0) {
      selectedCountryCode = raw[0].trim();
    } else {
      selectedCountryCode = null;
    }

    // Fetch distinct countries from DB (raw strings)
    const { data: countryRows, error: countryError } = await supabase
      .from("companies")
      .select("country");

    if (countryError) {
      console.error("[rotten-index] Error fetching countries:", String(countryError));
    }

    const countrySet = new Set<string>();
    if (Array.isArray(countryRows)) {
      for (const row of countryRows as any[]) {
        const c = row && row.country;
        if (typeof c === "string" && c.trim().length > 0) {
          countrySet.add(c.trim());
        }
      }
    }

    const countryOptions = Array.from(countrySet)
      .map((dbValue) => ({
        dbValue,
        label: getCountryDisplayName(dbValue),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // Fetch rotten scores
    const { data: scoreRows, error: scoreError } = await supabase
      .from("company_rotten_score")
      .select("company_id, rotten_score")
      .order("rotten_score", { ascending: false });

    if (scoreError) {
      console.error("[rotten-index] Error fetching scores:", String(scoreError));
      throw scoreError;
    }

    if (!Array.isArray(scoreRows) || scoreRows.length === 0) {
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

    const companyIds = scoreRows.map((r: any) => r.company_id);

    const { data: companyRows, error: companyError } = await supabase
      .from("companies")
      .select("id, name, slug, industry, country")
      .in("id", companyIds);

    if (companyError) {
      console.error("[rotten-index] Error fetching companies:", String(companyError));
      throw companyError;
    }

    const companyById: Record<number, { id: number; name: string; slug: string; industry: string | null; country: string | null; }> = {};
    if (Array.isArray(companyRows)) {
      for (const row of companyRows as any[]) {
        companyById[row.id] = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          industry: row.industry || null,
          country: row.country || null,
        };
      }
    }

    let companies: IndexedCompany[] = scoreRows
      .map((row: any) => {
        const c = companyById[row.company_id];
        if (!c) return null;
        return {
          company_id: row.company_id,
          rotten_score: typeof row.rotten_score === "number" ? row.rotten_score : Number(row.rotten_score) || 0,
          name: c.name,
          slug: c.slug,
          industry: c.industry,
          country: c.country,
        };
      })
      .filter((c): c is IndexedCompany => c !== null);

    // Case-insensitive match against raw DB country strings, safe for NULL
    if (selectedCountryCode) {
      const target = selectedCountryCode.trim().toLowerCase();
      companies = companies.filter((c) => {
        if (!c.country) return false;
        return c.country.trim().toLowerCase() === target;
      });
    }

    const jsonLd = buildRottenIndexJsonLd(companies, selectedCountryCode);

    const currentScopeLabel = selectedCountryCode
      ? `Companies only — ${getCountryDisplayName(selectedCountryCode)}`
      : "Companies only — All countries";

    const debugParam = (searchParams && (searchParams as any).debug) as string | string[] | undefined;
    const showDebug = typeof debugParam === "string" && debugParam.length > 0;

    if (showDebug) {
      try {
        console.log(
          `[rotten-index] Debug @ ${new Date().toISOString()}:`,
          JSON.stringify(
            {
              selectedCountryCode,
              countryOptions,
              companiesCount: companies.length,
            },
            null,
            2
          )
        );
      } catch (e) {
        console.log("[rotten-index] Debug (raw):", { selectedCountryCode, countryOptions, companiesCount: companies.length });
      }
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd, null, 2),
          }}
        />

        <JsonLdDebugPanel data={jsonLd} debug={showDebug ? { selectedCountryCode, countryOptions } : null} initiallyOpen={showDebug} />

        <main className="max-w-5xl mx-auto px-4 py-10">
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
            <p className="text-gray-600">
              Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.
            </p>
          </header>

          <section className="mb-6 flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-500">
              Currently showing: <strong>{currentScopeLabel}</strong>
            </span>

            <form method="GET" action="/rotten-index" className="flex items-center gap-2 text-sm">
              <label htmlFor="country" className="text-gray-600">Country:</label>

              <select
                id="country"
                name="country"
                defaultValue={selectedCountryCode || ""}
                onChange={(e) => e.target.form && e.target.form.submit()}
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
              {selectedCountryCode ? ` for ${getCountryDisplayName(selectedCountryCode)}` : ""}.
            </p>
          ) : (
            <ol className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {companies.map((c, index) => (
                <li
                  key={c.company_id}
                  data-country={c.country ? c.country : ""}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-mono w-6 text-right">{index + 1}.</span>
                    <div>
                      <Link href={`/company/${c.slug}`} className="text-lg font-semibold hover:underline">
                        {c.name}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {c.industry || "Unknown industry"}
                        {c.country ? ` · ${getCountryDisplayName(c.country)}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold">{c.rotten_score.toFixed(1)}</div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Rotten Score</div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <section className="mt-8 text-sm text-gray-500">
            <h2 className="font-semibold mb-1">Methodology</h2>
            <p>
              The Rotten Score is derived from category-level ratings, public evidence, and weighted signals of corporate harm. Higher scores indicate more severe and systemic issues.
            </p>
          </section>
        </main>
      </>
    );
  } catch (err) {
    console.error("[rotten-index] Fatal error:", err);
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
        <p className="text-red-600 mb-4">Something went wrong while loading the Rotten Index.</p>
        <p className="text-gray-600 text-sm">Check the server logs for details.</p>
      </main>
    );
  }
}
