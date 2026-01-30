export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { headers } from "next/headers";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import Link from "next/link";

type IndexType = "company" | "leader" | "owner";

type IndexedRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number;
};

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
  const path = type === "leader" ? "leader" : type === "owner" ? "owner" : "company";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name:
      type === "leader"
        ? "Leaders under whose watch the most corporate damage occurred"
        : type === "owner"
        ? "Owners behind the most destructive portfolio patterns"
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
  const type = (getFirstString(sp.type) as IndexType) ?? "company";
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

  const res = await fetch(
    `${baseUrl}/api/rotten-index?${qs.toString()}`,
    { cache: "no-store" }
  );

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
      }))
    : [];

  rows = rows.slice(0, limit);

  const countryRes = await fetch(
    `${baseUrl}/api/rotten-index?type=company&limit=1000`,
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <JsonLdDebugPanel data={jsonLd} />

      <p className="mt-2 text-sm text-gray-600">
        Ranked by severity of verified misconduct. Higher scores indicate greater documented harm.
      </p>

      <form
        method="get"
        className="mt-6 mb-8 flex flex-wrap items-end gap-4 rounded-lg border bg-gray-50 p-4"
      >
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">
            Entity
          </label>
          <select
            name="type"
            defaultValue={type}
            className="border rounded px-3 py-2 bg-white"
          >
            <option value="company">Companies</option>
            <option value="leader">Leaders</option>
            <option value="owner">Owners</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">
            Country
          </label>
          <select
            name="country"
            defaultValue={selectedCountry ?? ""}
            className="border rounded px-3 py-2 bg-white"
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
          <label className="text-xs font-semibold text-gray-600 mb-1">
            Results
          </label>
          <select
            name="limit"
            defaultValue={String(limit)}
            className="border rounded px-3 py-2 bg-white"
          >
            <option value="10">Top 10</option>
            <option value="25">Top 25</option>
            <option value="50">Top 50</option>
          </select>
        </div>

        <button
          type="submit"
          className="ml-auto rounded bg-black px-5 py-2 text-white font-semibold hover:bg-gray-800"
        >
          Apply
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100 border-b">
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-2 w-12">#</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Country</th>
              <th className="py-2 text-right w-32">Rotten Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${type}-${r.id}`} className="border-b hover:bg-gray-50">
                <td className="py-2 pr-2 text-gray-500">{i + 1}</td>
                <td className="py-2 pr-4 font-medium">
                  <Link
                    href={`/${type}/${r.slug}`}
                    className="hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  {r.country ?? "—"}
                </td>
      <th className="py-2 text-center w-32">Rotten Score</th>
<td className="py-2 text-center font-mono tabular-nums w-32 bg-gray-50">
  {r.rotten_score.toFixed(2)}
</td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
