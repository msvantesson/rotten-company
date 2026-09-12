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
const getEvidenceWithManagersMock = vi.fn(async () => []);

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
      <ul>
        {breakdown.map((item) => (
          <li key={item.category_name}>{item.category_name}</li>
        ))}
      </ul>
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

type QueryCall = {
  table: string;
  eqs: Array<[string, unknown]>;
  mode: QueryMode;
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
  const calls: QueryCall[] = [];
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
        calls.push({ table, eqs: [...state.eqs], mode: "single" });
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
        calls.push({ table, eqs: [...state.eqs], mode: "many" });
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
    calls,
  };
}

function countCalls(
  calls: QueryCall[],
  expected: { table: string; eqs: Array<[string, unknown]>; mode: QueryMode },
): number {
  return calls.filter((call) =>
    call.table === expected.table &&
    call.mode === expected.mode &&
    sameEqs(expected.eqs, call.eqs),
  ).length;
}

describe("company breakdown route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getEvidenceWithManagersMock.mockResolvedValue([]);
  });

  it("renders the breakdown page, keeps metadata equivalent, and dedupes shared reads", async () => {
    getEvidenceWithManagersMock.mockResolvedValue([{ id: 10 }]);
    const { client, calls } = createBreakdownSupabase({
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
    expect(countCalls(calls, {
      table: "companies",
      eqs: [["slug", "boeing"]],
      mode: "single",
    })).toBe(1);
    expect(countCalls(calls, {
      table: "companies",
      eqs: [["id", 1]],
      mode: "single",
    })).toBe(1);
    expect(countCalls(calls, {
      table: "company_category_full_breakdown",
      eqs: [["company_id", 1]],
      mode: "many",
    })).toBe(1);
    expect(countCalls(calls, {
      table: "company_rotten_score_v2",
      eqs: [["company_id", 1]],
      mode: "single",
    })).toBe(1);
  });

  it("keeps missing companies as notFound()", async () => {
    const { client, calls } = createBreakdownSupabase({
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
    expect(countCalls(calls, {
      table: "companies",
      eqs: [["slug", "missing-company"]],
      mode: "single",
    })).toBe(1);
    expect(countCalls(calls, {
      table: "company_slug_redirects",
      eqs: [["old_slug", "missing-company"]],
      mode: "single",
    })).toBe(1);
  });

  it("keeps DB failures as thrown errors instead of 404s", async () => {
    const dbError = { code: "57014", message: "db unavailable" };
    const { client, calls } = createBreakdownSupabase(
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
    expect(countCalls(calls, {
      table: "companies",
      eqs: [["slug", "boeing"]],
      mode: "single",
    })).toBe(1);
    expect(countCalls(calls, {
      table: "companies",
      eqs: [["id", 1]],
      mode: "single",
    })).toBe(1);
  });

  it("keeps legacy slug redirects on the breakdown route", async () => {
    const { client, calls } = createBreakdownSupabase({
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
    expect(countCalls(calls, {
      table: "companies",
      eqs: [["slug", "boing"]],
      mode: "single",
    })).toBe(1);
    expect(countCalls(calls, {
      table: "company_slug_redirects",
      eqs: [["old_slug", "boing"]],
      mode: "single",
    })).toBe(1);
    expect(countCalls(calls, {
      table: "companies",
      eqs: [["id", 1]],
      mode: "single",
    })).toBe(1);
  });
});
