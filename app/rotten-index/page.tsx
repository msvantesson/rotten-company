export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import ClientCountrySync from "@/components/ClientCountrySync";

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
  DK: "Denmark",
  IE: "Ireland",
};

function getCountryDisplayName(value: string | null | undefined): string {
  if (!value) return "All countries";
  const v = value.trim();
  if (v.length === 0) return "All countries";
  if (v.length === 2) return COUNTRY_NAME_MAP[v.toUpperCase()] ?? v.toUpperCase();
  const found = Object.values(COUNTRY_NAME_MAP).find((n) => n.toLowerCase() === v.toLowerCase());
  if (found) return found;
  return v
    .split(/[^a-zA-Z]+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function normalizeCountry(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim();
  if (v.length === 0) return "";
  if (v.length === 2) {
    const code = v.toUpperCase();
    const mapped = COUNTRY_NAME_MAP[code];
    return (mapped ?? code).toUpperCase();
  }
  const foundEntry = Object.entries(COUNTRY_NAME_MAP).find(([_k, name]) => {
    return name.toLowerCase() === v.toLowerCase();
  });
  if (foundEntry) return foundEntry[1].toUpperCase();
  return v.toUpperCase();
}

function buildRottenIndexJsonLd(companies: IndexedCompany[], selectedCountryCode: string | null) {
  const baseUrl = "https://rotten-company.com";
  const isCountryScoped = !!selectedCountryCode;
  const countryName = selectedCountryCode ? getCountryDisplayName(selectedCountryCode) : null;
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
  const supabase = await supabaseServer();
  const rawCountryParam = searchParams?.country;
  const selectedCountryCode = typeof rawCountryParam === "string" && rawCountryParam.trim().length > 0 ? rawCountryParam.trim() : null;

  const { data: countryRows } = await supabase.from("companies").select("country");
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
    .map((dbValue) => {
      return { dbValue, norm: normalizeCountry(dbValue), label: getCountryDisplayName(dbValue) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  let selectedDbValue = "";
  let selectedNormalized = "";
  if (selectedCountryCode) {
    const targetNorm = normalizeCountry(selectedCountryCode);
    const match = countryOptions.find((opt) => opt.norm === targetNorm);
    if (match) {
      selectedDbValue = match.dbValue;
      selectedNormalized = match.norm;
    } else {
      selectedDbValue = selectedCountryCode;
      selectedNormalized = normalizeCountry(selectedCountryCode);
    }
  }

  const { data: scoreRows } = await supabase
    .from("company_rotten_score")
    .select("company_id, rotten_score")
    .order("rotten_score", { ascending: false });

  if (!scoreRows || scoreRows.length === 0) {
    const emptyJsonLd = buildRottenIndexJsonLd([], selectedCountryCode);
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(emptyJsonLd, null, 2) }} />
        <JsonLdDebugPanel data={emptyJsonLd} />
        <main className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">No companies found.</p>
        </main>
      </>
    );
  }

  const companyIds = scoreRows.map((row) => row.company_id);
  const { data: companyRows } = await supabase.from("companies").select("id, name, slug, industry, country").in("id", companyIds);

  const companyById =
    companyRows?.reduce<Record<number, { id: number; name: string; slug: string; industry: string | null; country: string | null }>>((acc, row: any) => {
      acc[row.id] = { id: row.id, name: row.name, slug: row.slug, industry: row.industry ?? null, country: row.country ?? null };
      return acc;
    }, {}) ?? {};

  let companies: IndexedCompany[] = scoreRows
    .map((row: any) => {
      const c = companyById[row.company_id];
      if (!c) return null;
      return { company_id: row.company_id, rotten_score: row.rotten_score ?? 0, name: c.name, slug: c.slug, industry: c.industry, country: c.country };
    })
    .filter((c): c is IndexedCompany => c !== null);

  if (selectedCountryCode) {
    // Exclude companies without a country and match normalized values
    companies = companies.filter((c) => c.country && normalizeCountry(c.country) === selectedNormalized);
  }

  const jsonLd = buildRottenIndexJsonLd(companies, selectedCountryCode);

  const currentScopeLabel = selectedCountryCode
    ? `Companies only — ${getCountryDisplayName(selectedDbValue || selectedCountryCode)}`
    : "Companies only — All countries";

  const debugParam = (searchParams && (searchParams as any).debug) as string | string[] | undefined;
  const showDebug = typeof debugParam === "string" && debugParam.length > 0;
  const debugInfo = showDebug
    ? { searchParamsCountry: selectedCountryCode, selectedDbValue, selectedNormalized, countryOptions: countryOptions, companiesSample: companies.slice(0, 200).map((c) => ({ id: c.company_id, name: c.name, country: c.country })) }
    : null;

  if (showDebug && debugInfo) {
    try {
      console.log(`[rotten-index] Debug @ ${new Date().toISOString()}:`, JSON.stringify(debugInfo, null, 2));
    } catch (e) {
      console.log("[rotten-index] Debug (raw):", debugInfo);
    }
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd, null, 2) }} />

      <JsonLdDebugPanel data={jsonLd} debug={debugInfo} initiallyOpen={!!debugInfo} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Global Rotten Index</h1>
          <p className="text-gray-600">Ranking companies by Rotten Score based on public evidence of harm, misconduct, and corporate behavior.</p>
        </header>

        <section className="mb-6 flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-500">Currently showing: <strong>{currentScopeLabel}</strong></span>

          <form method="GET" action="/rotten-index" className="flex items-center gap-2 text-sm">
            <label htmlFor="country" className="text-gray-600">Country:</label>
            <select id="country" name="country" defaultValue={selectedDbValue ?? ""} className="border border-gray-300 rounded px-2 py-1 text-sm bg-white">
              <option value="">All countries</option>
              {countryOptions.map((opt) => (
                <option key={opt.dbValue} value={opt.dbValue}>{opt.label} ({opt.dbValue})</option>
              ))}
            </select>
            <button type="submit" className="border border-gray-300 rounded px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100">Apply</button>
          </form>

          <ClientCountrySync />
        </section>

        {companies.length === 0 ? (
          <p className="text-gray-600">No companies found{selectedCountryCode ? ` for ${getCountryDisplayName(selectedDbValue || selectedCountryCode)}` : ""}.</p>
        ) : (
          <ol className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {companies.map((c, index) => (
              <li key={c.company_id} data-country={c.country ?? ""} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 font-mono w-6 text-right">{index + 1}.</span>
                  <div>
                    <Link href={`/company/${c.slug}`} className="text-lg font-semibold hover:underline">{c.name}</Link>
                    <div className="text-sm text-gray-500">{c.industry || "Unknown industry"}{c.country ? ` · ${getCountryDisplayName(c.country)}` : ""}</div>
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
          <p>The Rotten Score is derived from category-level ratings, public evidence, and weighted signals of corporate harm. Higher scores indicate more severe and systemic issues.</p>
        </section>
      </main>
    </>
  );
}
