export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { headers } from "next/headers";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import Link from "next/link";
import ExportCsvButton from "./ExportCsvButton";

type IndexType = "company" | "leader";

type IndexedRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number;
  // leader tenure fields (present when type === "leader")
  leader_id?: number;
  tenure_id?: number | null;
  company_name?: string | null;
  company_slug?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

type SearchParams = { [key: string]: string | string[] | undefined };

function getFirstString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return null;
}

function formatCountry(value: string) {
  return value
    .split(/[^a-zA-Z]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function buildIndexJsonLd(
  rows: IndexedRow[],
  type: IndexType,
  selectedCountry: string | null
) {
  const baseUrl = "https://rotten-company.com";
  const entityType = type === "leader" ? "Person" : "Organization";
  const path = type === "leader" ? "leader" : "company";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name:
      type === "leader"
        ? "Leaders under whose watch the most corporate damage occurred"
        : "Global Rotten Index",
    itemListOrder: "Descending",
    numberOfItems: rows.length,
    ...(selectedCountry && {
      spatialCoverage: {
        "@type": "Country",
        name: formatCountry(selectedCountry),
      },
    }),
    itemListElement: rows.map((r, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/${path}/${r.slug}`,
      item: {
        "@type": entityType,
        name: r.name,
      },
    })),
  };
}

export default async function RottenIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const rawType = getFirstString(sp.type);
  const type: IndexType =
    rawType === "leader" ? "leader" : "company";
  const limit = Number(getFirstString(sp.limit) ?? 10);
  const selectedCountry = getFirstString(sp.country);

  const qs = new URLSearchParams();
  qs.set("type", type);
  qs.set("limit", String(limit));
  if (selectedCountry) qs.set("country", selectedCountry);

  const h = await headers();
  const host = h.get("host");
  if (!host) throw new Error("Missing host header");

  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/rotten-index?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return <p className="mt-6">Failed to load Rotten Index.</p>;
  }

  const json = await res.json();

  let rows: IndexedRow[] = Array.isArray(json.rows)
    ? json.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        country: r.country ?? null,
        rotten_score: Number(r.rotten_score) || 0,
        leader_id: r.leader_id ?? undefined,
        tenure_id: r.tenure_id ?? null,
        company_name: r.company_name ?? null,
        company_slug: r.company_slug ?? null,
        started_at: r.started_at ?? null,
        ended_at: r.ended_at ?? null,
      }))
    : [];

  rows = rows.filter((r) => typeof r.rotten_score === "number");
  if (type === "company") {
    rows = rows.sort((a, b) => b.rotten_score - a.rotten_score);
  }
  rows = rows.slice(0, limit);

  const countryRes = await fetch(
    `${baseUrl}/api/rotten-index?type=${type}&limit=1000`,
    { cache: "no-store" }
  );

  const countryJson = await countryRes.json();

  const countryOptions = Array.from(
    new Set<string>(
      Array.isArray(countryJson.rows)
        ? countryJson.rows
            .map((r: any) => (r.country ?? "").trim())
            .filter(Boolean)
        : []
    )
  ).sort((a, b) => a.localeCompare(b));

  const jsonLd = buildIndexJsonLd(rows, type, selectedCountry);

  const safeCountry = (selectedCountry ?? "all-countries")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
  const fileName = `rotten-index_${type}_${safeCountry}_top${limit}.csv`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {process.env.NODE_ENV !== "production" && (
        <JsonLdDebugPanel data={jsonLd} />
      )}

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Rotten Index</h1>
        <p className="text-sm text-muted-foreground">
          Ranked by severity of verified misconduct. Higher scores indicate
          greater documented harm.
        </p>
      </div>

      {/* FILTER CONTROLS */}
      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface-2 p-4"
      >
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-1">
            Entity
          </label>
          <select
            name="type"
            defaultValue={type}
            className="border border-border rounded-md px-3 py-2 bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="company">Companies</option>
            <option value="leader">Leaders</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-1">
            Country
          </label>
          <select
            name="country"
            defaultValue={selectedCountry ?? ""}
            className="border border-border rounded-md px-3 py-2 bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All countries</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {formatCountry(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-muted-foreground mb-1">
            Results
          </label>
          <select
            name="limit"
            defaultValue={String(limit)}
            className="border border-border rounded-md px-3 py-2 bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="10">Top 10</option>
            <option value="25">Top 25</option>
            <option value="50">Top 50</option>
          </select>
        </div>

        {/* Right aligned actions */}
        <div className="ml-auto flex items-center gap-3">
          <ExportCsvButton tableId="rotten-index-table" filename={fileName} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Apply
          </button>
        </div>
      </form>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table id="rotten-index-table" className="w-full border-collapse text-sm">
          <thead className="bg-muted border-b border-border">
            {type === "leader" ? (
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2 pl-3 w-12">#</th>
                <th className="py-2 pr-4">CEO Name</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Country</th>
                <th className="py-2 pr-4">Started</th>
                <th className="py-2 pr-4">Ended</th>
                <th className="py-2 pr-3 text-right">
                  Rotten Score
                </th>
              </tr>
            ) : (
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2 pl-3 w-12">#</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Country</th>
                <th className="py-2 pr-3 text-right">
                  Rotten Score
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((r, i) =>
              type === "leader" ? (
                <tr
                  key={`leader-${r.id}`}
                  className="border-b border-border hover:bg-muted last:border-0"
                >
                  <td className="py-2 pr-2 pl-3 text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-4 font-medium">
                    <Link href={`/leader/${r.slug}`} className="text-accent hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {r.company_slug ? (
                      <Link href={`/company/${r.company_slug}`} className="text-accent hover:underline">
                        {r.company_name ?? "—"}
                      </Link>
                    ) : (
                      r.company_name ?? "—"
                    )}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {r.country ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {formatDate(r.started_at)}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {r.ended_at ? (
                      formatDate(r.ended_at)
                    ) : r.started_at ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Current
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                    {r.rotten_score.toFixed(2)}
                  </td>
                </tr>
              ) : (
                <tr
                  key={`company-${r.id}`}
                  className="border-b border-border hover:bg-muted last:border-0"
                >
                  <td className="py-2 pr-2 pl-3 text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-4 font-medium">
                    <Link href={`/${type}/${r.slug}`} className="text-accent hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {r.country ?? "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums">
                    {r.rotten_score.toFixed(2)}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
