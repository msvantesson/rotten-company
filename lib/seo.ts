// Shared SEO helpers — canonical URL generation, breadcrumb builder, site constants.

export const SITE_ORIGIN = "https://rotten-company.com";

/** Returns an absolute canonical URL for a given path. */
export function canonicalUrl(path: string): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalised}`;
}

/** Builds a BreadcrumbList JSON-LD object from an ordered list of { name, url } items. */
export function buildBreadcrumbJsonLd(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
