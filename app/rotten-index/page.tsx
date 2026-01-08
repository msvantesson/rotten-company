export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import RottenIndexClientWrapper from "./RottenIndexClientWrapper";

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
    name: isCountryScoped ? `Global Rotten Index — Companies in ${countryName}` : "Global Rotten Index — Companies",
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
  const startTs = Date.now();
  try {
    // Read raw country query param robustly
    let selectedCountryCode: string | null = null;
    const raw = searchParams && searchParams.country;
    if (typeof raw === "string" && raw.trim().length > 0) {
      selectedCountryCode = raw.trim();
    } else if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "string" && raw[0].trim().length > 0) {
      selectedCountryCode = raw[0].trim();
    } else {
      selectedCountryCode = null;
    }

    console.log(`[rotten-index] start @ ${new Date(startTs).toISOString()}`);
    console.log("[rotten-index] incoming selectedCountryCode:", selectedCountryCode);

    const supabase = await supabaseServer();
    console.log("[rotten-index] supabaseServer() returned");

    // Fetch countries (for dropdown options)
    let countryRows: any[] = [];
    try {
      const countryRes = await supabase.from("companies").select("country");
      if (countryRes.error) {
        console.error("[rotten-index] countries query error:", String(countryRes.error));
      } else {
        countryRows = Array.isArray(countryRes.data) ? countryRes.data : [];
      }
      console.log("[rotten-index] countries fetched count:", countryRows.length);
    } catch (err) {
      console.error("[rotten-index] countries query threw:", String(err));
      countryRows = [];
    }

    const countrySet = new Set<string>();
    if (Array.isArray(countryRows)) {
      for (const row of countryRows) {
        const rawCountry = row && row.country;
        if (typeof rawCountry === "string" && rawCountry.trim().length > 0) {
          countrySet.add(rawCountry.trim());
        }
      }
    }
    const countryOptions = Array.from(countrySet)
      .map((dbValue) => ({ dbValue, label: getCountryDisplayName(dbValue) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    console.log("[rotten-index] countryOptions count:", countryOptions.length);

    // Fetch scores and companies to build JSON-LD and server-side counts (non-interactive)
    let scoreRows: any[] = [];
    try {
      const scoreRes = await supabase.from("company_rotten_score").select("company_id, rotten_score").order("rotten_score", { ascending: false });
      if (scoreRes.error) {
        console.error("[rotten-index] scores query error:", String(scoreRes.error));
        throw scoreRes.error;
      }
      scoreRows = Array.isArray(scoreRes.data) ? scoreRes.data : [];
      console.log("[rotten-index] scores fetched count:", scoreRows.length);
    } catch (err) {
      console.error("[rotten-index] scores query threw:", String(err));
      throw err;
    }

    const companyIds = scoreRows.map((r: any) => r.company_id);
    console.log("[rotten-index] companyIds length:", companyIds.length);

    let companyRows: any[] = [];
    try {
      if (companyIds.length > 0) {
        const companyRes = await supabase.from("companies").select("id, name, slug, industry, country").in("id", companyIds);
        if (companyRes.error) {
          console.error("[rotten-index] companies query error:", String(companyRes.error));
          throw companyRes.error;
        }
        companyRows = Array.isArray(companyRes.data) ? companyRes.data : [];
      } else {
        companyRows = [];
      }
      console.log("[rotten-index] companies fetched count:", companyRows.length);
    } catch (err) {
      console.error("[rotten-index] companies query threw:", String(err));
      throw err;
    }

    const companyById: Record<number, { id: number; name: string; slug: string; industry: string | null; country: string | null }> = {};
    if (Array.isArray(companyRows)) {
      for (const row of companyRows) {
        if (row && typeof row.id === "number") {
          companyById[row.id] = {
            id: row.id,
            name: row.name,
            slug: row.slug,
            industry: row.industry || null,
            country: row.country || null,
          };
        }
      }
    }

    const companiesForJsonLd: IndexedCompany[] = scoreRows
      .map((row: any) => {
        const c = companyById[row.company_id];
        if (!c) return null;
        const rottenScore = typeof row.rotten_score === "number" ? row.rotten_score : Number(row.rotten_score) || 0;
        return {
          company_id: row.company_id,
          rotten_score: rottenScore,
          name: c.name,
          slug: c.slug,
          industry: c.industry,
          country: c.country,
        };
      })
      .filter((c): c is IndexedCompany => c !== null);

    // Build JSON-LD from the full dataset (client will fetch filtered list)
    const jsonLd = buildRottenIndexJsonLd(companiesForJsonLd, selectedCountryCode);

    const debugParam = (searchParams && (searchParams as any).debug) as string | string[] | undefined;
    const showDebug = typeof debugParam === "string" && debugParam.length > 0;
    if (showDebug) {
      try {
        console.log(
          `[rotten-index] Debug @ ${new Date().toISOString()}:`,
          JSON.stringify(
            {
              selectedCountryCode,
              countryOptionsCount: countryOptions.length,
              companiesCount: companiesForJsonLd.length,
              sampleCompanies: companiesForJsonLd.slice(0, 6).map((c) => ({ id: c.company_id, name: c.name, country: c.country })),
            },
            null,
            2
          )
        );
      } catch (e) {
        console.log("[rotten-index] Debug fallback:", { selectedCountryCode, countryOptionsCount: countryOptions.length, companiesCount: companiesForJsonLd.length });
      }
    }

    const currentScopeLabel = selectedCountryCode ? `Companies only — ${getCountryDisplayName(selectedCountryCode)}` : "Companies only — All countries";

    const endTs = Date.now();
    console.log(`[rotten-index] finished @ ${new Date(endTs).toISOString()} durationMs=${endTs - startTs}`);

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }} />

        <JsonLdDebugPanel data={jsonLd} debug={showDebug ? { selectedCountryCode, countryOptions } : null} initiallyOpen={showDebug} />

        <main className="max-w-5xl mx-auto px-4 py-10">
          <header className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
            <p className="text-gray-600">Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.</p>
          </header>

          {/* Client component handles dropdown interactivity and list fetching */}
          <RottenIndexClientWrapper initialCountry={selectedCountryCode} initialOptions={countryOptions} />

          <section className="mt-8 text-sm text-gray-500">
            <h2 className="font-semibold mb-1">Methodology</h2>
            <p>The Rotten Score is derived from category-level ratings, public evidence, and weighted signals of corporate harm. Higher scores indicate more severe and systemic issues.</p>
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
        <pre className="bg-red-50 p-3 rounded text-sm">{String(err)}</pre>
        <p className="text-gray-600 text-sm">Check the server logs for lines starting with <code>[rotten-index]</code>.</p>
      </main>
    );
  }
}
