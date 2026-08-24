import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

vi.mock("@/lib/getLeaderData", () => ({
  getLeaderData: vi.fn(),
}));

vi.mock("@/lib/jsonld-leader", () => ({
  buildLeaderJsonLd: vi.fn(() => ({ "@type": "Person" })),
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
  buildBreadcrumbJsonLd: () => ({ "@type": "BreadcrumbList" }),
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

import { getLeaderData } from "@/lib/getLeaderData";

const mockLeaderData = (name: string, slug: string) => ({
  leader: { id: 1, name, slug, role: "CEO", company_name: "Acme Corp" },
  tenures: [],
  score: { final_score: 42, raw_score: 40, direct_evidence_score: 40, inequality_score: 0, company_rotten_score: 0 },
  categories: [],
  inequality: null,
  evidence: [],
});

describe("leader page heading hierarchy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders exactly one h1 with the leader name", async () => {
    vi.mocked(getLeaderData).mockResolvedValue(mockLeaderData("Jane Doe", "jane-doe"));

    const { default: LeaderPage } = await import("../app/leader/[slug]/page");
    const html = renderToStaticMarkup(
      await LeaderPage({ params: Promise.resolve({ slug: "jane-doe" }) }),
    );

    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0][1]).toContain("Jane Doe");
  });

  it("h1 uses the live leader name from the database", async () => {
    vi.mocked(getLeaderData).mockResolvedValue(mockLeaderData("Mark Zuckerberg", "mark-zuckerberg"));

    const { default: LeaderPage } = await import("../app/leader/[slug]/page");
    const html = renderToStaticMarkup(
      await LeaderPage({ params: Promise.resolve({ slug: "mark-zuckerberg" }) }),
    );

    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0][1]).toContain("Mark Zuckerberg");
  });

  it("h1 is present in the server-rendered HTML (not client-only)", async () => {
    vi.mocked(getLeaderData).mockResolvedValue(mockLeaderData("Test Leader", "test-leader"));

    const { default: LeaderPage } = await import("../app/leader/[slug]/page");
    // renderToStaticMarkup simulates SSR — if h1 appears here it is server-rendered
    const html = renderToStaticMarkup(
      await LeaderPage({ params: Promise.resolve({ slug: "test-leader" }) }),
    );

    expect(html).toContain("<h1");
    expect(html).toContain("Test Leader");
  });

  it("renders 404 content for a missing leader", async () => {
    vi.mocked(getLeaderData).mockResolvedValue(null);

    const { default: LeaderPage } = await import("../app/leader/[slug]/page");
    const html = renderToStaticMarkup(
      await LeaderPage({ params: Promise.resolve({ slug: "ghost-leader" }) }),
    );

    // 404 path renders an h1 with "Leader not found"
    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    expect(h1Matches.length).toBeGreaterThanOrEqual(1);
    expect(html).toContain("Leader not found");
  });
});
