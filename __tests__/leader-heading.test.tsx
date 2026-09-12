import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const getLeaderDataMock = vi.fn();
const supabaseServerMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

vi.mock("@/lib/getLeaderData", () => ({
  getLeaderData: getLeaderDataMock,
}));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/jsonld-leader", () => ({
  buildLeaderJsonLd: vi.fn(() => ({ "@type": "Person" })),
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({ "@type": "BreadcrumbList", itemListElement: items }),
}));

vi.mock("@/components/JsonLdDebugPanel", () => ({
  JsonLdDebugPanel: () => null,
}));

vi.mock("@/app/leader/[slug]/LeaderScorePanel", () => ({
  default: ({ name }: { name: string }) => (
    <div data-testid="leader-score-panel">{name}</div>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

const mockLeaderData = (name: string, slug: string) => ({
  leader: { id: 1, name, slug, role: "CEO", company_name: "Acme Corp" },
  tenures: [],
  score: {
    final_score: 42,
    raw_score: 40,
    direct_evidence_score: 40,
    inequality_score: 0,
    company_rotten_score: 0,
  },
  categories: [],
  inequality: null,
  evidence: [],
});

function makeLeaderLookupSupabase(result: { data: unknown; error: unknown }) {
  return {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => result,
      };

      return query;
    },
  };
}

describe("leader page routing and metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders exactly one h1 with the live leader name", async () => {
    getLeaderDataMock.mockResolvedValue(mockLeaderData("Jane Doe", "jane-doe"));

    const { default: LeaderPage } = await import("../app/leader/[slug]/page");
    const html = renderToStaticMarkup(
      await LeaderPage({ params: Promise.resolve({ slug: "jane-doe" }) }),
    );

    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0][1]).toContain("Jane Doe");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("returns equivalent metadata for a valid leader", async () => {
    getLeaderDataMock.mockResolvedValue(
      mockLeaderData("Mark Zuckerberg", "mark-zuckerberg"),
    );

    const { generateMetadata } = await import("../app/leader/[slug]/page");
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "mark-zuckerberg" }),
    });

    expect(metadata.title).toBe("Mark Zuckerberg — Leadership Accountability");
    expect(metadata.description).toBe(
      "Rotten Score 42.0 for Mark Zuckerberg, CEO at Acme Corp. Explore evidence, tenure timeline, and accountability metrics.",
    );
    expect(
      (metadata.alternates as { canonical?: string } | undefined)?.canonical,
    ).toBe("https://example.test/leader/mark-zuckerberg");
    expect(
      (metadata.openGraph as { url?: string } | undefined)?.url,
    ).toBe("https://example.test/leader/mark-zuckerberg");
  });

  it("keeps canonical URLs based on the stored leader slug", async () => {
    getLeaderDataMock.mockResolvedValue(
      mockLeaderData("Test Leader", "canonical-leader-slug"),
    );

    const { default: LeaderPage, generateMetadata } = await import(
      "../app/leader/[slug]/page"
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "incoming-slug" }),
    });
    const html = renderToStaticMarkup(
      await LeaderPage({ params: Promise.resolve({ slug: "incoming-slug" }) }),
    );

    expect(
      (metadata.alternates as { canonical?: string } | undefined)?.canonical,
    ).toBe("https://example.test/leader/canonical-leader-slug");
    expect(html).toContain("https://example.test/leader/canonical-leader-slug");
  });

  it("calls notFound() for a missing leader", async () => {
    getLeaderDataMock.mockResolvedValue(null);
    supabaseServerMock.mockResolvedValue(
      makeLeaderLookupSupabase({ data: null, error: null }),
    );

    const { default: LeaderPage, generateMetadata } = await import(
      "../app/leader/[slug]/page"
    );

    await expect(
      LeaderPage({ params: Promise.resolve({ slug: "ghost-leader" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "ghost-leader" }),
    });
    expect(metadata.title).toBe("Leader Not Found");
    expect((metadata as { robots?: unknown }).robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it("throws database failures instead of converting them into notFound()", async () => {
    getLeaderDataMock.mockResolvedValue(null);
    supabaseServerMock.mockResolvedValue(
      makeLeaderLookupSupabase({
        data: null,
        error: { code: "57014", message: "db unavailable" },
      }),
    );

    const { default: LeaderPage, generateMetadata } = await import(
      "../app/leader/[slug]/page"
    );

    await expect(
      LeaderPage({ params: Promise.resolve({ slug: "broken-leader" }) }),
    ).rejects.toMatchObject({
      code: "57014",
      message: "db unavailable",
    });
    expect(notFoundMock).not.toHaveBeenCalled();

    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: "broken-leader" }),
      }),
    ).rejects.toMatchObject({
      code: "57014",
      message: "db unavailable",
    });
  });
});
