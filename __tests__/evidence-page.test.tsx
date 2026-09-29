import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const supabaseServerMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://rotten-company.com${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: (item as { name: string }).name,
      item: (item as { url: string }).url,
    })),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createSupabase(
  evidenceRows: Array<Record<string, unknown>>,
  companies: Array<Record<string, unknown>>,
) {
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return query;
      },
      maybeSingle: async () => {
        const rows = table === "evidence" ? evidenceRows : companies;
        return {
          data:
            rows.find((row) =>
              filters.every(([column, value]) => row[column] === value),
            ) ?? null,
          error: null,
        };
      },
    };
    return query;
  };

  return { from };
}

const approvedEvidence = {
  id: 21,
  title: "A published finding",
  summary: "A factual stored summary about the company's records.",
  company_id: 3,
  status: "approved",
};

const company = { id: 3, name: "Acme Ltd", slug: "acme-inc" };

describe("individual evidence pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses approved evidence details in unique canonical and social metadata", async () => {
    supabaseServerMock.mockResolvedValue(
      createSupabase(
        [
          approvedEvidence,
          { ...approvedEvidence, id: 22, title: "Another finding" },
        ],
        [company],
      ),
    );
    const { generateMetadata } = await import("../app/evidence/[id]/metadata");

    const first = await generateMetadata({ params: { id: "21" } });
    const second = await generateMetadata({ params: { id: "22" } });

    expect(first.title).toEqual({
      absolute: "A published finding | Acme Ltd | Rotten Company",
    });
    expect(first.description).toBe(
      "Acme Ltd: A factual stored summary about the company's records.",
    );
    expect(first.alternates).toEqual({
      canonical: "https://rotten-company.com/evidence/21",
    });
    expect(first.openGraph).toMatchObject({
      title: "A published finding | Acme Ltd | Rotten Company",
      url: "https://rotten-company.com/evidence/21",
      description: first.description,
    });
    expect(first.twitter).toMatchObject({
      title: first.openGraph?.title,
      description: first.description,
    });
    expect(second.alternates).toEqual({
      canonical: "https://rotten-company.com/evidence/22",
    });
    expect(first.robots).toBeUndefined();
  });

  it("renders one actual-title H1, company links, and four-item accessible breadcrumbs", async () => {
    supabaseServerMock.mockResolvedValue(
      createSupabase([approvedEvidence], [company]),
    );
    const { default: EvidencePage } = await import("../app/evidence/[id]/page");
    const html = renderToStaticMarkup(
      await EvidencePage({ params: { id: "21" } }),
    );

    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("<h1 class=\"text-3xl font-semibold\">A published finding</h1>");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toMatch(/href="\/"[^>]*>Home<\/a>/);
    expect(html).toMatch(/href="\/company\/acme-inc"[^>]*>Acme Ltd<\/a>/);
    expect(html).toMatch(/href="\/company\/acme-inc\/evidence"[^>]*>Evidence<\/a>/);

    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(jsonLdMatch).not.toBeNull();
    const breadcrumb = JSON.parse(jsonLdMatch![1]);
    expect(breadcrumb).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home", item: "https://rotten-company.com/" },
        {
          position: 2,
          name: "Acme Ltd",
          item: "https://rotten-company.com/company/acme-inc",
        },
        {
          position: 3,
          name: "Evidence",
          item: "https://rotten-company.com/company/acme-inc/evidence",
        },
        {
          position: 4,
          name: "A published finding",
          item: "https://rotten-company.com/evidence/21",
        },
      ],
    });
  });

  it("provides safe noindex metadata and content for unpublished evidence", async () => {
    supabaseServerMock.mockResolvedValue(
      createSupabase(
        [
          {
            id: 21,
            title: "Private allegation",
            summary: "Private submitted summary",
            company_id: 3,
            status: "pending",
          },
        ],
        [company],
      ),
    );
    const { generateMetadata } = await import("../app/evidence/[id]/metadata");
    const { default: EvidencePage } = await import("../app/evidence/[id]/page");

    const metadata = await generateMetadata({ params: { id: "21" } });
    const html = renderToStaticMarkup(
      await EvidencePage({ params: { id: "21" } }),
    );

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toEqual({ absolute: "Evidence | Rotten Company" });
    expect(metadata.description).not.toContain("Private");
    expect(html).toContain("<h1");
    expect(html).toContain("This evidence record is not publicly available.");
    expect(html).not.toContain("Private allegation");
    expect(html).not.toContain("Private submitted summary");
    expect(html).not.toContain("Acme Ltd");
    expect(html).not.toContain("application/ld+json");
  });

  it("uses safe noindex fallbacks when evidence or its company cannot be loaded", async () => {
    supabaseServerMock.mockResolvedValue(createSupabase([approvedEvidence], []));
    const { generateMetadata } = await import("../app/evidence/[id]/metadata");

    const metadata = await generateMetadata({ params: { id: "21" } });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toEqual({ absolute: "Evidence | Rotten Company" });
    expect(metadata.description).not.toContain("A published finding");
    expect(metadata.alternates).toEqual({
      canonical: "https://rotten-company.com/evidence/21",
    });
  });
});
