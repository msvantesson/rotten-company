export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import type { Metadata } from "next";
import JsonLdDebugPanel from "@/components/JsonLdDebugPanel";
import { getRottenIndexData } from "@/lib/getRottenIndexData";
import RottenIndexClient from "./RottenIndexClient";
import { rottenIndexMetadata } from "./metadata";
import { canonicalUrl, buildBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = rottenIndexMetadata;

type IndexType = "company" | "leader";

type IndexedRow = {
  id: number;
  name: string;
  slug: string;
  country?: string | null;
  rotten_score: number | null;
  industry?: string | null;
  approved_evidence_count?: number;
  leader_id?: number;
  tenure_id?: number | null;
  company_name?: string | null;
  company_slug?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
};

const COMPANY_SORT_FIELDS = ["rotten_score", "approved_evidence_count", "name", "industry"] as const;
type CompanySortField = (typeof COMPANY_SORT_FIELDS)[number];

const DEFAULT_SORT_DIRS: Record<CompanySortField, "asc" | "desc"> = {
  rotten_score: "desc",
  approved_evidence_count: "desc",
  name: "asc",
  industry: "asc",
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

function buildIndexJsonLd(rows: IndexedRow[], type: IndexType, selectedCountry: string | null) {
  const baseUrl = "https://rotten-company.com";
  const entityType = type === "leader" ? "Person" : "Organization";
  const path = type === "leader" ? "leader" : "company";

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: type === "leader" ? "Leaders under whose watch the most corporate damage occurred" : "Global Rotten Index",
    itemListOrder: "Descending",
    numberOfItems: rows.length,
    ...(selectedCountry && {
      spatialCoverage: {
        "@type": "Country",
        name: formatCountry(selectedCountry),
      },
    }),
    itemListElement: rows.map((row, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/${path}/${row.slug}`,
      item: {
        "@type": entityType,
        name: row.name,
      },
    })),
  };
}

export default async function RottenIndexPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const sp = await Promise.resolve(searchParams ?? {});
  const rawType = getFirstString(sp.type);
  const type: IndexType = rawType === "leader" ? "leader" : "company";
  const limit = Number(getFirstString(sp.limit) ?? 10);
  const selectedCountry = getFirstString(sp.country);
  const q = getFirstString(sp.q);
  const rawSort = getFirstString(sp.sort) ?? "rotten_score";
  const rawDir = getFirstString(sp.dir);
  const sort: CompanySortField = (COMPANY_SORT_FIELDS as readonly string[]).includes(rawSort) ? (rawSort as CompanySortField) : "rotten_score";
  const dir: "asc" | "desc" = rawDir === "asc" || rawDir === "desc" ? rawDir : DEFAULT_SORT_DIRS[sort];

  const result = await getRottenIndexData({ type, country: selectedCountry, limit, q, sort, dir });

  if ("error" in result) {
    return <p className="mt-6">Failed to load Rotten Index.</p>;
  }

  let rows: IndexedRow[] = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country ?? null,
    rotten_score: row.rotten_score != null ? Number(row.rotten_score) : null,
    industry: row.industry ?? null,
    approved_evidence_count: Number(row.approved_evidence_count) || 0,
    tenure_id: row.tenure_id ?? null,
    company_name: row.company_name ?? null,
    company_slug: row.company_slug ?? null,
    started_at: row.started_at ?? null,
    ended_at: row.ended_at ?? null,
  }));

  if (type === "company") {
    rows = rows.filter((row) => row.rotten_score != null);
  }
  rows = rows.slice(0, limit);

  const jsonLd = buildIndexJsonLd(rows, type, selectedCountry);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: canonicalUrl("/") },
    { name: "Rotten Index", url: canonicalUrl("/rotten-index") },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {process.env.NODE_ENV !== "production" && <JsonLdDebugPanel data={jsonLd} />}

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Rotten Index</h1>
        <p className="text-sm text-muted-foreground">Ranked by severity of verified misconduct. Higher scores indicate greater documented harm.</p>
      </div>

      <RottenIndexClient
        initialType={type}
        initialCountry={selectedCountry}
        initialLimit={limit}
        initialQuery={q}
        initialSort={sort}
        initialDir={dir}
        initialRows={rows}
        initialOptions={result.countries}
      />
    </div>
  );
}
