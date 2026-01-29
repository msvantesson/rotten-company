export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { getLeaderData } from "@/lib/getLeaderData";
import ClientWrapper from "./ClientWrapper";
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

function normalizeScore(
  score: number,
  entity: { employees?: number | null; annual_revenue?: number | null } | null,
  mode: NormalizationMode
) {
  if (mode === "employees" && entity?.employees && entity.employees > 0) {
    return score / Math.log(entity.employees + 10);
  }
  if (mode === "revenue" && entity?.annual_revenue && Number(entity.annual_revenue) > 0) {
    return score / Math.log(Number(entity.annual_revenue) + 10);
  }
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

  const supabase = await supabaseServer();

  const { data: countryRows } = await supabase.from("companies").select("country");
  const countryOptions = [
    ...new Set((countryRows ?? []).map((r) => r.country).filter(Boolean)),
  ]
    .map((c) => ({ dbValue: c!, label: formatCountry(c!) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  let rows: IndexedRow[] = [];

  /* -------------------- COMPANIES -------------------- */
  if (type === "company") {
    let q = supabase
      .from("companies")
      .select("id, name, slug, country, employees, annual_revenue");

    if (selectedCountry) q = q.eq("country", selectedCountry);

    const { data: companies } = await q;

    const ids = (companies ?? []).map((c) => c.id);

    const { data: scores } = await supabase
      .from("company_rotten_score")
      .select("company_id, rotten_score")
      .in("company_id", ids);

    const scoreById: Record<number, number> = {};
    for (const s of scores ?? []) scoreById[s.company_id] = Number(s.rotten_score);

    rows = (companies ?? [])
      .map((c) => {
        const score = scoreById[c.id];
        if (!score) return null;
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          country: c.country,
          rotten_score: score,
          normalized_score: normalizeScore(score, c, normalization),
        };
      })
      .filter(Boolean) as IndexedRow[];
  }

  /* -------------------- LEADERS (PATCHED) -------------------- */
  if (type === "leader") {
    const { data: leaders } = await supabase
      .from("leaders")
      .select(`
        id,
        name,
        slug,
        companies (
          country,
          employees,
          annual_revenue
        )
      `);

    const detailed = await Promise.all(
      (leaders ?? []).map(async (l: any) => {
        const company = l.companies ?? null;
        const country = company?.country ?? null;

        if (selectedCountry && country !== selectedCountry) return null;

        try {
          const data = await getLeaderData(l.slug);

          if (!data || !data.score) {
            return {
              id: l.id,
              name: l.name,
              slug: l.slug,
              country,
              rotten_score: 0,
              normalized_score: 0,
            };
          }

          const absolute = data.score.final_score ?? 0;
          const normalized = normalizeScore(absolute, company, normalization);

          return {
            id: data.leader.id,
            name: data.leader.name,
            slug: data.leader.slug,
            country,
            rotten_score: absolute,
            normalized_score: normalized,
          };
        } catch {
          return {
            id: l.id,
            name: l.name,
            slug: l.slug,
            country,
            rotten_score: 0,
            normalized_score: 0,
          };
        }
      })
    );

    rows = detailed.filter(Boolean) as IndexedRow[];
  }

  rows.sort((a, b) =>
    normalization === "none"
      ? b.rotten_score - a.rotten_score
      : b.normalized_score - a.normalized_score
  );

  rows = rows.slice(0, limit);

  const jsonLd = buildIndexJsonLd(rows, type, selectedCountry);

  function hrefWith(next: Record<string, string | null>) {
    const p = new URLSearchParams();
    p.set("type", type);
    p.set("limit", String(limit));
    if (selectedCountry) p.set("country", selectedCountry);
    if (normalization !== "none") p.set("normalization", normalization);
    for (const [k, v] of Object.entries(next)) {
      if (!v) p.delete(k);
      else p.set(k, v);
    }
    return `/rotten-index?${p.toString()}`;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <JsonLdDebugPanel json={jsonLd} />

      <ClientWrapper
        initialCountry={selectedCountry}
        initialOptions={countryOptions}
        normalization={normalization}
      />

      <div className="mt-6 flex gap-4 text-sm font-medium">
        <Link href={hrefWith({ type: "company" })}>Companies</Link>
        <Link href={hrefWith({ type: "leader" })}>Leaders</Link>
        <Link href={hrefWith({ type: "pe" })}>Private Equity</Link>
      </div>

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
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>
                <Link href={`/${type === "leader" ? "leader" : "company"}/${r.slug}`}>
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
