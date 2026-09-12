import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const supabaseServerMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
const permanentRedirectMock = vi.fn((url: string) => {
  throw new Error(`PERMANENT_REDIRECT:${url}`);
});
const buildCompanyJsonLdMock = vi.fn(() => ({ "@type": "Organization" }));

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/company-slug", async () => await import("../lib/company-slug"));
vi.mock("@/lib/company-modified-at", async () => await import("../lib/company-modified-at"));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/RatingStars", () => ({
  default: () => <div>Rating stars</div>,
}));

vi.mock("@/components/RottenScoreMeter", () => ({
  default: () => <div>Rotten score meter</div>,
}));

vi.mock("@/components/ScoreDebugPanel", () => ({
  ScoreDebugPanel: () => <div>Score debug</div>,
}));

vi.mock("@/components/JsonLdDebugPanel", () => ({
  JsonLdDebugPanel: () => <div>JSON-LD debug</div>,
}));

vi.mock("@/components/CategoryInfoPopover", () => ({
  default: () => null,
}));

vi.mock("@/components/CeoSection", () => ({
  default: () => <div>CEO section</div>,
}));

vi.mock("@/components/CompanyTabs", () => ({
  default: ({ slug }: { slug: string }) => <nav>{slug}</nav>,
}));

vi.mock("@/lib/jsonld-company", () => ({
  buildCompanyJsonLd: buildCompanyJsonLdMock,
}));

vi.mock("@/lib/getEvidenceWithManagers", () => ({
  getEvidenceWithManagers: vi.fn(async () => []),
}));

vi.mock("@/lib/flavor-engine", () => ({
  getRottenFlavor: () => ({
    color: "#000",
    macroTier: "Watchlist",
    microFlavor: "Evidence-backed",
  }),
}));

vi.mock("@/lib/test-company", () => ({
  isTestCompany: () => false,
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({ items }),
  SITE_ORIGIN: "https://example.test",
}));

vi.mock("@/lib/constants/employee-ranges", () => ({
  EMPLOYEE_RANGES: [],
}));

vi.mock("@/lib/company-seo", () => ({
  buildSsrAnswer: () => "Test SSR answer.",
}));

type QueryState = {
  eqs: Array<[string, unknown]>;
  orderBy: { column: string; ascending: boolean } | null;
  limit: number | null;
};

function createCompanyPageSupabase(data: {
  companies: Array<Record<string, unknown>>;
  company_slug_redirects?: Array<Record<string, unknown>>;
  evidence?: Array<Record<string, unknown>>;
  failEvidenceLookup?: boolean;
  failCompanyLookup?: { code?: string; message: string };
}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    companies: data.companies,
    company_slug_redirects: data.company_slug_redirects ?? [],
    evidence: data.evidence ?? [],
    company_category_full_breakdown: [],
    categories: [],
    ownership_signals_summary: [],
    ratings: [],
  };

  const findRows = (table: string, state: QueryState) => {
    const filteredRows = (tables[table] ?? []).filter((row) =>
      state.eqs.every(([column, value]) => row[column] === value),
    );

    const orderedRows = state.orderBy
      ? [...filteredRows].sort((a, b) => {
          const left = a[state.orderBy!.column];
          const right = b[state.orderBy!.column];
          if (left === right) return 0;
          if (left == null) return 1;
          if (right == null) return -1;
          return state.orderBy!.ascending
            ? String(left).localeCompare(String(right))
            : String(right).localeCompare(String(left));
        })
      : filteredRows;

    return typeof state.limit === "number"
      ? orderedRows.slice(0, state.limit)
      : orderedRows;
  };

  const from = (table: string) => {
    const state: QueryState = { eqs: [], orderBy: null, limit: null };

    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        state.eqs.push([column, value]);
        return query;
      },
      order: (column: string, options?: { ascending?: boolean }) => {
        state.orderBy = { column, ascending: options?.ascending ?? true };
        return query;
      },
      limit: (count: number) => {
        state.limit = count;
        return query;
      },
      maybeSingle: async () => {
        if (
          table === "companies" &&
          data.failCompanyLookup &&
          state.eqs.some(([column]) => column === "id")
        ) {
          return { data: null, error: data.failCompanyLookup };
        }

        const rows = findRows(table, state);
        return { data: rows[0] ?? null, error: null };
      },
      then: <TResult1 = unknown, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => {
        if (table === "evidence" && data.failEvidenceLookup) {
          return Promise.reject(new Error("evidence lookup failed")).then(onfulfilled, onrejected);
        }

        return Promise.resolve({ data: findRows(table, state), error: null }).then(onfulfilled, onrejected);
      },
    };

    return query;
  };

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
    from,
  };
}

describe("company page slug routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders the canonical stored slug with HTTP 200 behavior", async () => {
    supabaseServerMock.mockResolvedValue(
      createCompanyPageSupabase({
        companies: [
          {
            id: 1,
            name: "Nestlé",
            slug: "nestle",
            industry: "Food",
            size_employees_range: null,
            country: "CH",
            hq_region: null,
            hq_city: null,
            website: null,
            description: "Chocolate",
          },
        ],
      }),
    );

    const { default: CompanyPage } = await import("../app/company/[slug]/page");
    const html = renderToStaticMarkup(
      await CompanyPage({ params: Promise.resolve({ slug: "nestle" }) }),
    );

    expect(html).toContain("Nestlé");
    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("permanently redirects legacy slugs on the server without client-side JS", async () => {
    supabaseServerMock.mockResolvedValue(
      createCompanyPageSupabase({
        companies: [{ id: 1, name: "Nestlé", slug: "nestle" }],
        company_slug_redirects: [
          {
            company_id: 1,
            old_slug: "nestl",
            new_slug: "nestle",
          },
        ],
      }),
    );

    const { default: CompanyPage } = await import("../app/company/[slug]/page");

    await expect(
      CompanyPage({ params: Promise.resolve({ slug: "nestl" }) }),
    ).rejects.toThrow("PERMANENT_REDIRECT:/company/nestle");
  });

  it("returns a real 404 for unknown slugs", async () => {
    supabaseServerMock.mockResolvedValue(
      createCompanyPageSupabase({
        companies: [],
        company_slug_redirects: [],
      }),
    );

    const { default: CompanyPage } = await import("../app/company/[slug]/page");

    await expect(
      CompanyPage({ params: Promise.resolve({ slug: "missing-company" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("throws database failures instead of converting them into notFound()", async () => {
    supabaseServerMock.mockResolvedValue(
      createCompanyPageSupabase({
        companies: [{ id: 1, name: "Boeing", slug: "boeing" }],
        failCompanyLookup: { code: "57014", message: "db unavailable" },
      }),
    );

    const { default: CompanyPage } = await import("../app/company/[slug]/page");

    await expect(
      CompanyPage({ params: Promise.resolve({ slug: "boeing" }) }),
    ).rejects.toMatchObject({
      code: "57014",
      message: "db unavailable",
    });
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("uses the newest approved evidence timestamp for company modified date", async () => {
    supabaseServerMock.mockResolvedValue(
      createCompanyPageSupabase({
        companies: [
          {
            id: 1,
            name: "Boeing",
            slug: "boeing",
            industry: "Aerospace",
            size_employees_range: null,
            country: "US",
            hq_region: null,
            hq_city: null,
            website: null,
            description: "Planes",
            updated_at: "2026-08-20T12:34:56.000Z",
          },
        ],
        evidence: [
          { company_id: 1, status: "approved", created_at: "2026-01-10T00:00:00.000Z" },
          { company_id: 1, status: "approved", created_at: "2026-09-01T00:00:00.000Z" },
          { company_id: 1, status: "pending", created_at: "2026-12-01T00:00:00.000Z" },
          { company_id: 2, status: "approved", created_at: "2026-12-31T00:00:00.000Z" },
        ],
      }),
    );

    const { default: CompanyPage } = await import("../app/company/[slug]/page");
    renderToStaticMarkup(await CompanyPage({ params: Promise.resolve({ slug: "boeing" }) }));

    expect(buildCompanyJsonLdMock).toHaveBeenCalledWith(
      expect.objectContaining({
        company: expect.objectContaining({
          updated_at: "2026-09-01T00:00:00.000Z",
        }),
      }),
    );
  });

  it("keeps company updated_at when there is no approved evidence", async () => {
    supabaseServerMock.mockResolvedValue(
      createCompanyPageSupabase({
        companies: [
          {
            id: 1,
            name: "Boeing",
            slug: "boeing",
            industry: "Aerospace",
            size_employees_range: null,
            country: "US",
            hq_region: null,
            hq_city: null,
            website: null,
            description: "Planes",
            updated_at: "2026-08-20T12:34:56.000Z",
          },
        ],
        evidence: [
          { company_id: 1, status: "pending", created_at: "2026-09-01T00:00:00.000Z" },
          { company_id: 2, status: "approved", created_at: "2026-09-02T00:00:00.000Z" },
        ],
      }),
    );

    const { default: CompanyPage } = await import("../app/company/[slug]/page");
    renderToStaticMarkup(await CompanyPage({ params: Promise.resolve({ slug: "boeing" }) }));

    expect(buildCompanyJsonLdMock).toHaveBeenCalledWith(
      expect.objectContaining({
        company: expect.objectContaining({
          updated_at: "2026-08-20T12:34:56.000Z",
        }),
      }),
    );
  });

  it("falls back safely when approved evidence timestamp lookup fails", async () => {
    supabaseServerMock.mockResolvedValue(
      createCompanyPageSupabase({
        companies: [
          {
            id: 1,
            name: "Boeing",
            slug: "boeing",
            industry: "Aerospace",
            size_employees_range: null,
            country: "US",
            hq_region: null,
            hq_city: null,
            website: null,
            description: "Planes",
            updated_at: "2026-08-20T12:34:56.000Z",
          },
        ],
        failEvidenceLookup: true,
      }),
    );

    const { default: CompanyPage } = await import("../app/company/[slug]/page");
    const html = renderToStaticMarkup(
      await CompanyPage({ params: Promise.resolve({ slug: "boeing" }) }),
    );

    expect(html).toContain("Boeing");
    expect(permanentRedirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(buildCompanyJsonLdMock).toHaveBeenCalledWith(
      expect.objectContaining({
        company: expect.objectContaining({
          updated_at: "2026-08-20T12:34:56.000Z",
        }),
      }),
    );
  });
});
