import type { MetadataRoute } from "next";
import { supabaseService } from "@/lib/supabase-service";
import { isTestCompany } from "@/lib/test-company";
import { SITE_ORIGIN } from "@/lib/seo";
import { calculateCompanyModifiedAt, latestValidIsoDate } from "@/lib/company-modified-at";

export const revalidate = 300;
export const COMPANY_SITEMAP_PAGE_SIZE = 500;

const EXCLUDED_COMPANY_SLUGS = new Set(["test1"]);
const EXCLUDED_LEADER_SLUGS = new Set(["demo-leader"]);

type CompanySitemapRow = {
  id: number;
  slug: string | null;
  name: string;
  updated_at: string | null;
};

type ApprovedEvidenceTimestampRow = {
  company_id: number | null;
  created_at: string | null;
};

function normalizeSlug(slug: string | null | undefined): string | null {
  if (typeof slug !== "string") return null;
  const normalized = slug.trim();
  return normalized ? normalized : null;
}

function parseLastModified(updatedAt: string | null | undefined): Date | undefined {
  if (!updatedAt) return undefined;
  const parsed = new Date(updatedAt);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function fetchCompaniesForSitemap(supabase: ReturnType<typeof supabaseService>) {
  const companies: CompanySitemapRow[] = [];

  for (let offset = 0; ; offset += COMPANY_SITEMAP_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, slug, name, updated_at")
      .order("id", { ascending: true })
      .range(offset, offset + COMPANY_SITEMAP_PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    companies.push(...(data as CompanySitemapRow[]));

    if (data.length < COMPANY_SITEMAP_PAGE_SIZE) break;
  }

  return companies;
}

async function fetchLatestApprovedEvidenceTimestamps(
  supabase: ReturnType<typeof supabaseService>,
  companyIds: number[],
) {
  const latestByCompanyId = new Map<number, string>();

  for (let offset = 0; offset < companyIds.length; offset += COMPANY_SITEMAP_PAGE_SIZE) {
    const idBatch = companyIds.slice(offset, offset + COMPANY_SITEMAP_PAGE_SIZE);
    if (idBatch.length === 0) continue;

    const { data, error } = await supabase
      .from("evidence")
      .select("company_id, created_at")
      .in("company_id", idBatch)
      .eq("status", "approved");

    if (error) throw error;

    for (const row of (data ?? []) as ApprovedEvidenceTimestampRow[]) {
      if (typeof row.company_id !== "number") continue;

      const latest = latestValidIsoDate(
        latestByCompanyId.get(row.company_id) ?? null,
        row.created_at,
      );

      if (latest) {
        latestByCompanyId.set(row.company_id, latest);
      }
    }
  }

  return latestByCompanyId;
}

// Static institutional pages — always present regardless of DB availability.
const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  {
    url: SITE_ORIGIN,
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${SITE_ORIGIN}/rotten-index`,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${SITE_ORIGIN}/rotten-score`,
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${SITE_ORIGIN}/moderation-guidelines`,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${SITE_ORIGIN}/guides/seo-keyword-list-2026`,
    changeFrequency: "yearly",
    priority: 0.7,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = supabaseService();
  const entries: MetadataRoute.Sitemap = [...STATIC_ENTRIES];

  // --- Approved companies (all rows in the companies table are approved) ---
  // Exclude test companies identified by "(test)" in the name.
  try {
    const companies = await fetchCompaniesForSitemap(supabase);
    const companyIds = companies.map((company) => company.id);

    let approvedEvidenceUpdatedAtByCompanyId = new Map<number, string>();
    try {
      approvedEvidenceUpdatedAtByCompanyId = await fetchLatestApprovedEvidenceTimestamps(
        supabase,
        companyIds,
      );
    } catch {
      approvedEvidenceUpdatedAtByCompanyId = new Map<number, string>();
    }

    for (const company of companies) {
      const slug = normalizeSlug(company.slug);
      if (!slug || EXCLUDED_COMPANY_SLUGS.has(slug) || isTestCompany(company.name)) continue;

      const computedModifiedAt = calculateCompanyModifiedAt({
        companyUpdatedAt: company.updated_at,
        approvedEvidenceUpdatedAt: approvedEvidenceUpdatedAtByCompanyId.get(company.id),
      });
      const lastModified = parseLastModified(computedModifiedAt);
      entries.push({
        url: `${SITE_ORIGIN}/company/${slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
        ...(lastModified ? { lastModified } : {}),
      });
    }
  } catch {
    // DB unavailable — continue with static entries and any already-added entries.
  }

  // --- Public leaders ---
  // No timestamps on the leaders table — omit lastModified.
  try {
    const { data: leaders } = await supabase
      .from("leaders")
      .select("slug");

    for (const leader of leaders ?? []) {
      const slug = normalizeSlug(leader.slug);
      if (!slug || EXCLUDED_LEADER_SLUGS.has(slug)) continue;
      entries.push({
        url: `${SITE_ORIGIN}/leader/${slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    // DB unavailable — continue.
  }

  // --- Active categories ---
  // No timestamps on the categories table — omit lastModified.
  try {
    const { data: categories } = await supabase
      .from("categories")
      .select("slug");

    for (const category of categories ?? []) {
      const slug = normalizeSlug(category.slug);
      if (!slug) continue;
      entries.push({
        url: `${SITE_ORIGIN}/category/${slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // DB unavailable — continue.
  }

  // Deduplicate by URL (preserves first occurrence).
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}
