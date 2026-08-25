import type { MetadataRoute } from "next";
import { supabaseService } from "@/lib/supabase-service";
import { isTestCompany } from "@/lib/test-company";
import { SITE_ORIGIN } from "@/lib/seo";
import { latestValidIsoDate } from "@/lib/latest-valid-iso-date";

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

function normalizeSlug(slug: string | null | undefined): string | null {
  if (typeof slug !== "string") return null;
  const normalized = slug.trim();
  return normalized ? normalized : null;
}

/**
 * Bulk-fetches the latest approved evidence created_at per company_id.
 * Returns a Map<company_id, created_at_string>.
 * A single query — no N+1.
 */
async function fetchLatestEvidenceTimestamps(
  supabase: ReturnType<typeof supabaseService>,
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const { data, error } = await supabase
      .from("evidence")
      .select("company_id, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error || !data) return map;

    for (const row of data as Array<{ company_id: number | null; created_at: string | null }>) {
      const id = row.company_id;
      const ts = row.created_at;
      if (id == null || ts == null) continue;
      // First occurrence is the latest because rows are ordered desc.
      if (!map.has(id)) map.set(id, ts);
    }
  } catch {
    // Non-fatal: sitemap falls back to company.updated_at only.
  }
  return map;
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
    const [companies, evidenceTimestamps] = await Promise.all([
      fetchCompaniesForSitemap(supabase),
      fetchLatestEvidenceTimestamps(supabase),
    ]);

    for (const company of companies) {
      const slug = normalizeSlug(company.slug);
      if (!slug || EXCLUDED_COMPANY_SLUGS.has(slug) || isTestCompany(company.name)) continue;

      const isoDate = latestValidIsoDate(
        company.updated_at,
        evidenceTimestamps.get(company.id) ?? null,
      );
      const lastModified = isoDate ? new Date(isoDate) : undefined;
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
