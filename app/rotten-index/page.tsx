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

  let rows: IndexedRow[] = [];

  if (type === "leader") {
    console.log("[LEADER] Fetching leaders…");

    const { data: leaders, error } = await supabase
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

    if (error) {
      console.error("[LEADER] Supabase error:", error);
    }

    console.log("[LEADER] Raw leaders count:", leaders?.length ?? 0);
    console.log("[LEADER] Slugs:", leaders?.map((l) => l.slug));

    const detailed = await Promise.all(
      (leaders ?? []).map(async (l: any) => {
        const company = l.companies ?? null;
        const country = company?.country ?? null;

        console.log(`[LEADER] Processing ${l.slug}`);
        console.log(`[LEADER] Company country:`, country);

        // TEMPORARILY DISABLED COUNTRY FILTER
        // if (selectedCountry && country !== selectedCountry) {
        //   console.log(`[LEADER] SKIP ${l.slug} — country mismatch`);
        //   return null;
        // }

        try {
          const data = await getLeaderData(l.slug);

          if (!data) {
            console.warn(`[LEADER] getLeaderData returned null for ${l.slug}`);
            return {
              id: l.id,
              name: l.name,
              slug: l.slug,
              country,
              rotten_score: 0,
              normalized_score: 0,
            };
          }

          if (!data.score) {
            console.warn(`[LEADER] No score for ${l.slug}`);
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

          console.log(`[LEADER] OK ${l.slug} → score=${absolute}, normalized=${normalized}`);

          return {
            id: data.leader.id,
            name: data.leader.name,
            slug: data.leader.slug,
            country,
            rotten_score: absolute,
            normalized_score: normalized,
          };
        } catch (err) {
          console.error(`[LEADER] ERROR ${l.slug}`, err);
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
    console.log("[LEADER] Final rows length:", rows.length);
  }

  rows.sort((a, b) =>
    normalization === "none"
      ? b.rotten_score - a.rotten_score
      : b.normalized_score - a.normalized_score
  );

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
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>
                <Link href={`/leader/${r.slug}`}>{r.name}</Link>
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
