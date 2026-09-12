import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const supabaseServerMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
const permanentRedirectMock = vi.fn((url: string) => {
  throw new Error(`PERMANENT_REDIRECT:${url}`);
});
const getEvidenceWithManagersMock = vi.fn<
  (companyId: number) => Promise<Array<Record<string, unknown>>>
>(async () => []);

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/company-slug", async () => await import("../lib/company-slug"));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
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
    evidence,
  }: {
    company: { name: string };
    breakdown: Array<{ category_name: string }>;
    evidence: unknown[];
    showHeader?: boolean;
  }) => (
    <div data-testid="category-breakdown">
      <p>{company.name}</p>
      <p>evidence:{evidence.length}</p>
      {breakdown.length === 0 ? (
        <p>No category data available yet.</p>
      ) : (
        <ul>
          {breakdown.map((item) => (
            <li key={item.category_name}>
              {item.category_name} ratings:{String((item as { rating_count?: number }).rating_count)} evidence:
              {String((item as { evidence_count?: number }).evidence_count)}
            </li>
          ))}
        </ul>
      )}
    </div>
  ),
}));

vi.mock("@/lib/getEvidenceWithManagers", () => ({
  getEvidenceWithManagers: getEvidenceWithManagersMock,
}));

vi.mock("@/lib/test-company", () => ({
  isTestCompany: () => false,
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({ items }),
  SITE_ORIGIN: "https://example.test",
}));

vi.mock("@/lib/company-seo", () => ({
  buildBreakdownTitle: (name: string) =>
    `${name} Rotten Score Breakdown | Categories & Calculation`,
  buildBreakdownDescription: (name: string, score: number | null) =>
    `Explore how ${name}'s Rotten Score of ${score ?? 0}/100 is calculated across misconduct categories, evidence severity, remediation and documented sources.`,
}));

type QueryMode = "single" | "many";

type QueryOverride = {
  table: string;
  eqs?: Array<[string, unknown]>;
  mode?: QueryMode;
  result?: { data: unknown; error: { code?: string; message: string } | null };
};

type TableData = Record<string, Array<Record<string, unknown>>>;

function sameEqs(
  expected: Array<[string, unknown]> | undefined,
  actual: Array<[string, unknown]>,
): boolean {
  if (!expected) return true;

  return (
    expected.length === actual.length &&
    expected.every(([expectedColumn, expectedValue], index) => {
      const [actualColumn, actualValue] = actual[index] ?? [];
      return actualColumn === expectedColumn && actualValue === expectedValue;
    })
  );
}

function createBreakdownSupabase(
  tables: TableData,
  overrides: QueryOverride[] = [],
) {
  const allTables: TableData = {
    companies: [],
    company_slug_redirects: [],
    company_category_full_breakdown: [],
    company_rotten_score_v2: [],
    ...tables,
  };

  const findRows = (table: string, eqs: Array<[string, unknown]>) =>
    (allTables[table] ?? []).filter((row) =>
      eqs.every(([column, value]) => row[column] === value),
    );

  const findOverride = (
    table: string,
    eqs: Array<[string, unknown]>,
    mode: QueryMode,
  ) =>
    overrides.find((override) =>
      override.table === table &&
      (override.mode === undefined || override.mode === mode) &&
      sameEqs(override.eqs, eqs),
    );

  const from = (table: string) => {
    const state: { eqs: Array<[string, unknown]> } = { eqs: [] };
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        state.eqs.push([column, value]);
        return query;
      },
      maybeSingle: async () => {
        const override = findOverride(table, state.eqs, "single");
        if (override?.result) {
          return override.result;
        }

        const rows = findRows(table, state.eqs);
        return { data: rows[0] ?? null, error: null };
      },
      then: <T1 = unknown, T2 = never>(
        onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => T1 | PromiseLike<T1>) | null,
        onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
      ) => {
        const override = findOverride(table, state.eqs, "many");
        if (override?.result) {
          return Promise.resolve(override.result).then(onfulfilled, onrejected);
        }

        return Promise.resolve({
          data: findRows(table, state.eqs),
          error: null,
        }).then(onfulfilled, onrejected);
      },
    };

    return query;
  };

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
      from,
    },
  };
}

describe("company breakdown route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getEvidenceWithManagersMock.mockResolvedValue([]);
  });

  it("renders the breakdown page and keeps metadata equivalent", async () => {
    getEvidenceWithManagersMock.mockResolvedValue([{ id: 10 }]);
    const { client } = createBreakdownSupabase({
      companies: [
        { id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" },
      ],
      company_category_full_breakdown: [
        {
          company_id: 1,
          category_id: 1,
          category_name: "Corporate Misconduct",
          rating_count: 2,
          avg_rating_score: 3,
          evidence_count: 4,
          severity_score: 11,
          final_score: 39,
          misconduct_low_count: 1,
          misconduct_medium_count: 1,
          misconduct_high_count: 0,
          remediation_low_count: 0,
          remediation_medium_count: 0,
          remediation_high_count: 0,
        },
      ],
      company_rotten_score_v2: [{ company_id: 1, rotten_score: 39 }],
    });
    supabaseServerMock.mockResolvedValue(client);

    const [{ default: BreakdownPage }, { generateBreakdownMetadata }] =
      await Promise.all([
        import("../app/company/[slug]/breakdown/page"),
        import("../app/company/[slug]/breakdown/metadata"),
      ]);

    const metadata = await generateBreakdownMetadata({ slug: "boeing" });
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "boeing" }) }),
    );

    expect(html).toContain("Boeing Rotten Score Breakdown");
    expect(html).toContain("Corporate Misconduct");
    expect(html).toContain("evidence:1");
    expect(metadata).toMatchObject({
      title: {
        absolute: "Boeing Rotten Score Breakdown | Categories & Calculation",
      },
      description:
        "Explore how Boeing's Rotten Score of 39/100 is calculated across misconduct categories, evidence severity, remediation and documented sources.",
      alternates: {
        canonical: "https://example.test/company/boeing/breakdown",
      },
      openGraph: {
        url: "https://example.test/company/boeing/breakdown",
      },
      twitter: {
        images: ["https://example.test/api/og/company?slug=boeing"],
      },
    });
    expect(getEvidenceWithManagersMock).toHaveBeenCalledWith(1);
  });

  it("keeps missing companies as notFound()", async () => {
    const { client } = createBreakdownSupabase({
      companies: [],
      company_slug_redirects: [],
    });
    supabaseServerMock.mockResolvedValue(client);

    const [{ default: BreakdownPage }, { generateBreakdownMetadata }] =
      await Promise.all([
        import("../app/company/[slug]/breakdown/page"),
        import("../app/company/[slug]/breakdown/metadata"),
      ]);

    await expect(
      generateBreakdownMetadata({ slug: "missing-company" }),
    ).rejects.toThrow("NOT_FOUND");
    await expect(
      BreakdownPage({ params: Promise.resolve({ slug: "missing-company" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(2);
  });

  it("keeps DB failures as thrown errors instead of 404s", async () => {
    const dbError = { code: "57014", message: "db unavailable" };
    const { client } = createBreakdownSupabase(
      {
        companies: [{ id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" }],
      },
      [
        {
          table: "companies",
          eqs: [["id", 1]],
          mode: "single",
          result: { data: null, error: dbError },
        },
      ],
    );
    supabaseServerMock.mockResolvedValue(client);

    const [{ default: BreakdownPage }, { generateBreakdownMetadata }] =
      await Promise.all([
        import("../app/company/[slug]/breakdown/page"),
        import("../app/company/[slug]/breakdown/metadata"),
      ]);

    await expect(
      generateBreakdownMetadata({ slug: "boeing" }),
    ).rejects.toMatchObject(dbError);
    await expect(
      BreakdownPage({ params: Promise.resolve({ slug: "boeing" }) }),
    ).rejects.toMatchObject(dbError);
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("keeps breakdown failures fail-open with an empty state", async () => {
    const { client } = createBreakdownSupabase(
      {
        companies: [{ id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" }],
        company_rotten_score_v2: [{ company_id: 1, rotten_score: 39 }],
      },
      [
        {
          table: "company_category_full_breakdown",
          eqs: [["company_id", 1]],
          mode: "many",
          result: { data: null, error: { message: "breakdown unavailable" } },
        },
      ],
    );
    supabaseServerMock.mockResolvedValue(client);

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "boeing" }) }),
    );

    expect(html).toContain("Boeing Rotten Score Breakdown");
    expect(html).toContain("No category data available yet.");
  });

  it("normalizes nullable breakdown counts before rendering", async () => {
    const { client } = createBreakdownSupabase({
      companies: [{ id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" }],
      company_category_full_breakdown: [
        {
          company_id: 1,
          category_id: 1,
          category_name: "Corporate Misconduct",
          rating_count: null,
          avg_rating_score: 3,
          evidence_count: null,
          severity_score: 11,
          final_score: 39,
          misconduct_low_count: 1,
          misconduct_medium_count: 1,
          misconduct_high_count: 0,
          remediation_low_count: 0,
          remediation_medium_count: 0,
          remediation_high_count: 0,
        },
      ],
      company_rotten_score_v2: [{ company_id: 1, rotten_score: 39 }],
    });
    supabaseServerMock.mockResolvedValue(client);

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "boeing" }) }),
    );

    expect(html).toContain("Corporate Misconduct ratings:0 evidence:0");
  });

  it("keeps evidence failures fail-open with an empty evidence list", async () => {
    getEvidenceWithManagersMock.mockRejectedValueOnce(new Error("evidence unavailable"));
    const { client } = createBreakdownSupabase({
      companies: [{ id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" }],
      company_category_full_breakdown: [
        {
          company_id: 1,
          category_id: 1,
          category_name: "Corporate Misconduct",
          rating_count: 2,
          avg_rating_score: 3,
          evidence_count: 4,
          severity_score: 11,
          final_score: 39,
          misconduct_low_count: 1,
          misconduct_medium_count: 1,
          misconduct_high_count: 0,
          remediation_low_count: 0,
          remediation_medium_count: 0,
          remediation_high_count: 0,
        },
      ],
      company_rotten_score_v2: [{ company_id: 1, rotten_score: 39 }],
    });
    supabaseServerMock.mockResolvedValue(client);

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    const html = renderToStaticMarkup(
      await BreakdownPage({ params: Promise.resolve({ slug: "boeing" }) }),
    );

    expect(html).toContain("Boeing Rotten Score Breakdown");
    expect(html).toContain("evidence:0");
  });

  it("starts loading evidence before breakdown normalization", async () => {
    const events: string[] = [];
    getEvidenceWithManagersMock.mockImplementationOnce(async () => {
      events.push("evidence-start");
      return [];
    });

    const breakdownRow = {
      company_id: 1,
      category_id: 1,
      category_name: "Corporate Misconduct",
      get rating_count() {
        events.push("normalize-rating_count");
        return null;
      },
      avg_rating_score: 3,
      get evidence_count() {
        events.push("normalize-evidence_count");
        return null;
      },
      severity_score: 11,
      final_score: 39,
      misconduct_low_count: 1,
      misconduct_medium_count: 1,
      misconduct_high_count: 0,
      remediation_low_count: 0,
      remediation_medium_count: 0,
      remediation_high_count: 0,
    };

    const { client } = createBreakdownSupabase({
      companies: [{ id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" }],
      company_category_full_breakdown: [breakdownRow],
      company_rotten_score_v2: [{ company_id: 1, rotten_score: 39 }],
    });
    supabaseServerMock.mockResolvedValue(client);

    const { default: BreakdownPage } = await import(
      "../app/company/[slug]/breakdown/page"
    );
    await BreakdownPage({ params: Promise.resolve({ slug: "boeing" }) });

    expect(events).toContain("normalize-rating_count");
    expect(events[0]).toBe("evidence-start");
  });

  it("keeps legacy slug redirects on the breakdown route", async () => {
    const { client } = createBreakdownSupabase({
      companies: [{ id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" }],
      company_slug_redirects: [
        { company_id: 1, old_slug: "boing", new_slug: "boeing" },
      ],
    });
    supabaseServerMock.mockResolvedValue(client);

    const [{ default: BreakdownPage }, { generateBreakdownMetadata }] =
      await Promise.all([
        import("../app/company/[slug]/breakdown/page"),
        import("../app/company/[slug]/breakdown/metadata"),
      ]);

    await expect(
      generateBreakdownMetadata({ slug: "boing" }),
    ).rejects.toThrow("PERMANENT_REDIRECT:/company/boeing/breakdown");
    await expect(
      BreakdownPage({ params: Promise.resolve({ slug: "boing" }) }),
    ).rejects.toThrow("PERMANENT_REDIRECT:/company/boeing/breakdown");
  });
});
