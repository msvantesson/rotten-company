export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import Link from "next/link";

type NormalizationMode = "none" | "employees" | "revenue";
type IndexType = "company" | "leader" | "pe";

type IndexedRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number;
  normalized_score: number;
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

function normalizeScore(score: number, mode: NormalizationMode) {
  // Normalization by employees / revenue should now live in DB later.
  // For now we keep behavior identical.
  return score;
}

function buildIndexJsonLd(
  rows: IndexedRow[],
  type: IndexType,
  selectedCountry: string | null
) {
  const baseUrl = "https://rotten-company.com";
  const entityType = type === "leader" ? "Person" : "Organization";
  const path = type === "leader" ? "leader" : type === "pe" ? "owner" : "company";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name:
      type === "leader"
        ? "Leaders under whose watch the most corporate damage occurred"
        : type === "pe"
        ? "Private equity firms behind the most destructive portfolio patterns"
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
  const normalizationRaw = getFirstString(sp.normalization);

  const normalization: NormalizationMode =
    normalizationRaw === "employees" || normalizationRaw === "revenue"
      ? normalizationRaw
      : "none";

  const qs = new URLSearchParams();
  qs.set("type", type);
  qs.set("limit", String(limit));
  if (selectedCountry) qs.set("country", selectedCountry);

  // ✅ FIXED: relative URL (no env vars, no crashes)
  const res = await fetch(`/api/rotten-index?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return <p className="mt-6">Failed to load Rotten Index.</p>;
  }

  const json = await res.json();

  let rows: IndexedRow[] = (json.rows ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    country: r.country ?? null,
    rotten_score: Number(r.rotten_score) || 0,
    normalized_score: normalizeScore(Number(r.rotten_score) || 0, normalization),
  }));

  rows = rows.slice(0, limit);

  const jsonLd = buildIndexJsonLd(rows, type, selectedCountry);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <JsonLdDebugPanel data={jsonLd} />

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Country</th>
            <th>Rotten Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${type}-${r.id}`}>
              <td>{i + 1}</td>
              <td>
                <Link
                  href={`/${
                    type === "leader"
                      ? "leader"
                      : type === "pe"
                      ? "owner"
                      : "company"
                  }/${r.slug}`}
                >
                  {r.name}
                </Link>
              </td>
              <td>{r.country ?? "—"}</td>
              <td>{r.normalized_score.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
