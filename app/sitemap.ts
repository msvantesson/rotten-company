import type { MetadataRoute } from "next";
import { supabaseService } from "@/lib/supabase-service";
import { isTestCompany } from "@/lib/test-company";
import { SITE_ORIGIN } from "@/lib/seo";

export const revalidate = 300;

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
  // No `updated_at` on this table — omit lastModified rather than stamping new Date().
  try {
    const { data: companies } = await supabase
      .from("companies")
      .select("slug, name");

    for (const company of companies ?? []) {
      if (!company.slug || isTestCompany(company.name)) continue;
      entries.push({
        url: `${SITE_ORIGIN}/company/${company.slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
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
      if (!leader.slug) continue;
      entries.push({
        url: `${SITE_ORIGIN}/leader/${leader.slug}`,
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
      if (!category.slug) continue;
      entries.push({
        url: `${SITE_ORIGIN}/category/${category.slug}`,
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
