import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const supabaseServerMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/computeLeaderScoreFromEvidence", () => ({
  computeLeaderScoreFromEvidence: vi.fn(() => ({
    finalScore: 42,
    baseCategoryScore: 40,
  })),
}));

vi.mock("@/lib/jsonld-leader", () => ({
  buildLeaderJsonLd: vi.fn(() => ({ "@type": "Person" })),
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({
    "@type": "BreadcrumbList",
    itemListElement: items,
  }),
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

type QueryState = {
  eqs: Array<[string, unknown]>;
  orderBys: Array<{ column: string; ascending: boolean }>;
};

type LeaderTables = {
  leaders: Array<Record<string, unknown>>;
  leader_tenures?: Array<Record<string, unknown>>;
  leader_inequality?: Array<Record<string, unknown>>;
  evidence?: Array<Record<string, unknown>>;
  leader_category_breakdown?: Array<Record<string, unknown>>;
};

function makeLeaderSupabase({
  tables,
  leaderLookupError,
}: {
  tables: LeaderTables;
  leaderLookupError?: { code?: string; message: string };
}) {
  const dataByTable: Record<string, Array<Record<string, unknown>>> = {
    leaders: tables.leaders,
    leader_tenures: tables.leader_tenures ?? [],
    leader_inequality: tables.leader_inequality ?? [],
    evidence: tables.evidence ?? [],
    leader_category_breakdown: tables.leader_category_breakdown ?? [],
  };

  const findRows = (table: string, state: QueryState) => {
    const filtered = (dataByTable[table] ?? []).filter((row) =>
      state.eqs.every(([column, value]) => row[column] === value),
    );

    if (state.orderBys.length === 0) {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      for (const orderBy of state.orderBys) {
        const leftValue = left[orderBy.column];
        const rightValue = right[orderBy.column];

        if (leftValue === rightValue) {
          continue;
        }

        if (leftValue == null) {
          return 1;
        }

        if (rightValue == null) {
          return -1;
        }

        const comparison =
          orderBy.column.endsWith("_at")
            ? Date.parse(String(leftValue)) - Date.parse(String(rightValue))
            : Number(leftValue) - Number(rightValue);

        return orderBy.ascending ? comparison : -comparison;
      }

      return 0;
    });
  };

  return {
    from: (table: string) => {
      const state: QueryState = { eqs: [], orderBys: [] };
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          state.eqs.push([column, value]);
          return query;
        },
        order: (column: string, options?: { ascending?: boolean }) => {
          state.orderBys.push({ column, ascending: options?.ascending ?? true });
          return query;
        },
        maybeSingle: async () => {
          if (table === "leaders" && leaderLookupError) {
            return { data: null, error: leaderLookupError };
          }

          const rows = findRows(table, state);
          return { data: rows[0] ?? null, error: null };
        },
        then: <TResult1 = unknown, TResult2 = never>(
          onfulfilled?:
            | ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>)
            | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) =>
          Promise.resolve({ data: findRows(table, state), error: null }).then(
            onfulfilled,
            onrejected,
          ),
      };

      return query;
    },
  };
}

const BASE_TABLES: LeaderTables = {
  leaders: [
    {
      id: 1,
      name: "Jane Doe",
      role: "CEO",
      slug: "jane-doe",
      rotten_score: null,
      country: "US",
      linkedin_url: null,
    },
  ],
  leader_tenures: [
    {
      leader_id: 1,
      company_id: 101,
      started_at: "2020-01-01T00:00:00.000Z",
      ended_at: null,
      companies: {
        name: "Acme Corp",
        slug: "acme-corp",
        size_employees_range: "10,001-50,000",
      },
    },
  ],
  leader_inequality: [{ leader_id: 1, pay_ratio: 0 }],
  evidence: [],
  leader_category_breakdown: [],
};

describe("leader page routing and metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders exactly one h1 with the live leader name", async () => {
    supabaseServerMock.mockResolvedValue(
      makeLeaderSupabase({ tables: BASE_TABLES }),
    );

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
    supabaseServerMock.mockResolvedValue(
      makeLeaderSupabase({
        tables: {
          ...BASE_TABLES,
          leaders: [
            {
              ...BASE_TABLES.leaders[0],
              name: "Mark Zuckerberg",
              slug: "mark-zuckerberg",
            },
          ],
        },
      }),
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
    supabaseServerMock.mockResolvedValue(
      makeLeaderSupabase({
        tables: {
          ...BASE_TABLES,
          leaders: [
            {
              ...BASE_TABLES.leaders[0],
              slug: "canonical-leader-slug",
              name: "Test Leader",
            },
          ],
        },
      }),
    );

    const { default: LeaderPage, generateMetadata } = await import(
      "../app/leader/[slug]/page"
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "canonical-leader-slug" }),
    });
    const html = renderToStaticMarkup(
      await LeaderPage({
        params: Promise.resolve({ slug: "canonical-leader-slug" }),
      }),
    );

    expect(
      (metadata.alternates as { canonical?: string } | undefined)?.canonical,
    ).toBe("https://example.test/leader/canonical-leader-slug");
    expect(html).toContain("https://example.test/leader/canonical-leader-slug");
  });

  it("calls notFound() for a missing leader", async () => {
    supabaseServerMock.mockResolvedValue(
      makeLeaderSupabase({
        tables: {
          ...BASE_TABLES,
          leaders: [],
          leader_tenures: [],
          leader_inequality: [],
        },
      }),
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
    supabaseServerMock.mockResolvedValue(
      makeLeaderSupabase({
        tables: BASE_TABLES,
        leaderLookupError: { code: "57014", message: "db unavailable" },
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
