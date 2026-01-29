export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabaseServer } from "@/lib/supabase-server";
import { getLeaderData } from "@/lib/getLeaderData";
import ClientWrapper from "./ClientWrapper";
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
        if (selectedCountry && l.companies?.country !== selectedCountry) return null;

        const data = await getLeaderData(l.slug);

        if (!data) {
          return {
            id: l.id,
            name: l.name,
            slug: l.slug,
            country: l.companies?.country ?? null,
            rotten_score: 0,
            normalized_score: 0,
          };
        }

        const absolute = data.score.final_score ?? 0;
        const normalized = normalizeScore(absolute, l.companies, normalization);

        return {
          id: data.leader.id,
          name: data.leader.name,
          slug: data.leader.slug,
          country: l.companies?.country ?? null,
          rotten_score: absolute,
          normalized_score: normalized,
        };
      })
    );

    rows = detailed.filter(Boolean) as IndexedRow[];
  }

  if (type === "pe") {
    const { data } = await supabase
      .from("owners_investors")
      .select(`
        id,
        name,
        slug,
        company_ownerships (
          is_control,
          companies (
            country,
            company_rotten_score (
              rotten_score
            )
          )
        )
      `)
      .eq("owner_profile", "private_equity");

    rows = (data ?? [])
      .map((o: any) => {
        let total = 0;
        let country: string | null = null;

        for (const rel of o.company_ownerships ?? []) {
          if (!rel.is_control) continue;
          if (selectedCountry && rel.companies?.country !== selectedCountry) continue;

          const score = Number(rel.companies?.company_rotten_score?.rotten_score);
          if (score) {
            total += score;
            country ??= rel.companies?.country ?? null;
          }
        }

        if (!total) return null;

        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          country,
          rotten_score: total,
          normalized_score: total,
        };
      })
      .filter(Boolean) as IndexedRow[];
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
    if (normalization && normalization !== "none") p.set("normalization", normalization);
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

   <ClientWrapper
  initialCountry={selectedCountry}
  initialOptions={countryOptions}
  normalization={normalization}
/>

