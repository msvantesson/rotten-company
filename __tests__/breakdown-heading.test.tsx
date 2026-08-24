import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const supabaseServerMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/CompanyTabs", () => ({
  default: ({ slug }: { slug: string }) => <nav data-testid="tabs">{slug}</nav>,
}));

vi.mock("@/components/CategoryBreakdown", () => ({
  CategoryBreakdown: ({
    company,
    breakdown,
  }: {
    company: { name: string };
    breakdown: unknown[];
    showHeader?: boolean;
  }) => (
    <div data-testid="category-breakdown">
      {breakdown.length === 0 ? (
        <p>No category data available yet.</p>
      ) : (
        <ul>
          {(breakdown as Array<{ category_name: string }>).map((item) => (
            <li key={item.category_name}>{item.category_name}</li>
          ))}
        </ul>
      )}
    </div>
  ),
}));

vi.mock("@/lib/getEvidenceWithManagers", () => ({
  getEvidenceWithManagers: vi.fn(async () => []),
}));

function makeSupabase(
  company: Record<string, unknown> | null,
  breakdown: Array<Record<string, unknown>> = [],
) {
  const from = (table: string) => {
    const state: { eqs: Array<[string, unknown]> } = { eqs: [] };
    const query = {
      select: () => query,
      eq: (col: string, val: unknown) => {
        state.eqs.push([col, val]);
        return query;
      },
      maybeSingle: async () => {
        if (table === "companies") {
          return { data: company, error: null };
        }
        return { data: null, error: null };
      },
      then: <TResult1 = unknown, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => {
        const data = table === "company_category_full_breakdown" ? breakdown : [];
        return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
      },
    };
    return query;
  };
  return { from, auth: { getUser: vi.fn(async () => ({ data: { user: null } })) } };
}

describe("breakdown page heading hierarchy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders exactly one h1 containing company name and Rotten Score Breakdown", async () => {
    supabaseServerMock.mockResolvedValue(
      makeSupabase({ id: 1, name: "Acme Corp", slug: "acme-corp", industry: "Tech" }),
    );

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "acme-corp" }) }),
    );

    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0][1]).toContain("Acme Corp");
    expect(h1Matches[0][1]).toContain("Rotten Score Breakdown");
  });

  it("h1 uses the live company name from the database", async () => {
    supabaseServerMock.mockResolvedValue(
      makeSupabase({ id: 2, name: "Big Oil Inc", slug: "big-oil-inc", industry: "Energy" }),
    );

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "big-oil-inc" }) }),
    );

    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0][1]).toContain("Big Oil Inc");
  });

  it("has exactly one h1 when multiple categories are present", async () => {
    supabaseServerMock.mockResolvedValue(
      makeSupabase(
        { id: 3, name: "Multi Cat Corp", slug: "multi-cat", industry: "Retail" },
        [
          { category_id: 1, category_name: "Corporate Misconduct", final_score: 20, evidence_count: 3, rating_count: 2, avg_rating_score: 3, severity_score: 15, misconduct_low_count: 1, misconduct_medium_count: 1, misconduct_high_count: 1, remediation_low_count: 0, remediation_medium_count: 0, remediation_high_count: 0 },
          { category_id: 2, category_name: "Human Rights", final_score: 10, evidence_count: 1, rating_count: 0, avg_rating_score: null, severity_score: 10, misconduct_low_count: 1, misconduct_medium_count: 0, misconduct_high_count: 0, remediation_low_count: 0, remediation_medium_count: 0, remediation_high_count: 0 },
        ],
      ),
    );

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "multi-cat" }) }),
    );

    expect([...html.matchAll(/<h1[^>]*>/gi)]).toHaveLength(1);
  });

  it("has exactly one h1 when there is no evidence", async () => {
    supabaseServerMock.mockResolvedValue(
      makeSupabase({ id: 4, name: "Empty Co", slug: "empty-co", industry: "Finance" }),
    );

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "empty-co" }) }),
    );

    expect([...html.matchAll(/<h1[^>]*>/gi)]).toHaveLength(1);
  });

  it("returns 404 for missing company", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(null));

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );

    await expect(
      BreakdownPage({ params: Promise.resolve({ slug: "does-not-exist" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
