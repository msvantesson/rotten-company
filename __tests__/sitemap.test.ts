import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseServiceMock = vi.fn();

vi.mock("@/lib/supabase-service", () => ({
  supabaseService: supabaseServiceMock,
}));

vi.mock("@/lib/test-company", () => ({
  isTestCompany: (name: string) => /\(test\)/i.test(name),
}));

vi.mock("@/lib/seo", () => ({
  SITE_ORIGIN: "https://example.test",
}));

type CompanyRow = {
  id: number;
  slug: string | null;
  name: string;
  updated_at: string | null;
};

function createSitemapSupabase(params: {
  companies: CompanyRow[];
  leaders?: Array<{ slug: string | null }>;
  categories?: Array<{ slug: string | null }>;
}) {
  const companyRanges: Array<{ from: number; to: number }> = [];
  const companyOrders: Array<{ column: string; ascending: boolean | undefined }> = [];

  const leaders = params.leaders ?? [];
  const categories = params.categories ?? [];

  const from = (table: string) => {
    const state: {
      range?: { from: number; to: number };
    } = {};

    const query = {
      select: () => query,
      order: (column: string, options?: { ascending?: boolean }) => {
        if (table === "companies") {
          companyOrders.push({ column, ascending: options?.ascending });
        }
        return query;
      },
      range: (from: number, to: number) => {
        if (table === "companies") {
          state.range = { from, to };
          companyRanges.push({ from, to });
        }
        return query;
      },
      then: <TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => {
        let data: unknown[] = [];

        if (table === "companies") {
          const range = state.range ?? {
            from: 0,
            to: params.companies.length ? params.companies.length - 1 : -1,
          };
          data = params.companies.slice(range.from, range.to + 1);
        } else if (table === "leaders") {
          data = leaders;
        } else if (table === "categories") {
          data = categories;
        }

        return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
      },
    };

    return query;
  };

  return {
    from,
    companyRanges,
    companyOrders,
  };
}

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches companies in deterministic ordered batches and preserves expected sitemap behavior", async () => {
    const orderedCompanies: CompanyRow[] = [
      { id: 1, slug: "duplicate-company", name: "Duplicate Company A", updated_at: "2026-08-20T00:00:00.000Z" },
      { id: 2, slug: "duplicate-company", name: "Duplicate Company B", updated_at: "2026-08-20T00:00:00.000Z" },
      { id: 3, slug: null, name: "Null Slug Co", updated_at: "2026-08-20T00:00:00.000Z" },
      { id: 4, slug: "   ", name: "Blank Slug Co", updated_at: "2026-08-20T00:00:00.000Z" },
      { id: 5, slug: "test1", name: "Known Production Test Co", updated_at: "2026-08-20T00:00:00.000Z" },
      { id: 6, slug: "trimmed-company", name: "Trimmed Company", updated_at: "not-a-date" },
      { id: 7, slug: "acme-test", name: "Acme (Test)", updated_at: "2026-08-20T00:00:00.000Z" },
      ...Array.from({ length: 1194 }, (_, index) => {
        const id = index + 8;
        return {
          id,
          slug: `company-${id}`,
          name: `Company ${id}`,
          updated_at: id === 1201 ? "2026-08-20T12:34:56.000Z" : null,
        };
      }),
      { id: 1202, slug: " newly-created-company ", name: "Newly Created Company", updated_at: "2026-08-20T10:00:00.000Z" },
    ];

    const mockSupabase = createSitemapSupabase({
      companies: orderedCompanies,
      leaders: [
        { slug: "leader-one" },
        { slug: " demo-leader " },
        { slug: null },
        { slug: "   " },
      ],
      categories: [{ slug: "category-one" }, { slug: " category-two " }, { slug: "" }],
    });

    supabaseServiceMock.mockReturnValue(mockSupabase);

    const { COMPANY_SITEMAP_PAGE_SIZE, default: sitemap } = await import("../app/sitemap");
    const entries = await sitemap();

    expect(COMPANY_SITEMAP_PAGE_SIZE).toBe(500);
    expect(mockSupabase.companyRanges).toEqual([
      { from: 0, to: 499 },
      { from: 500, to: 999 },
      { from: 1000, to: 1499 },
    ]);
    expect(mockSupabase.companyOrders).toEqual([
      { column: "id", ascending: true },
      { column: "id", ascending: true },
      { column: "id", ascending: true },
    ]);

    const urls = entries.map((entry) => entry.url);
    const companyUrls = urls.filter((url) => url.includes("/company/"));
    const leaderUrls = urls.filter((url) => url.includes("/leader/"));
    const categoryUrls = urls.filter((url) => url.includes("/category/"));

    expect(companyUrls).toContain("https://example.test/company/newly-created-company");
    expect(companyUrls).toContain("https://example.test/company/company-1201");
    expect(companyUrls).toContain("https://example.test/company/trimmed-company");
    expect(companyUrls).toHaveLength(1197);
    expect(companyUrls.filter((url) => url === "https://example.test/company/duplicate-company")).toHaveLength(1);
    expect(companyUrls).not.toContain("https://example.test/company/test1");
    expect(companyUrls).not.toContain("https://example.test/company/acme-test");

    expect(leaderUrls).toEqual(["https://example.test/leader/leader-one"]);
    expect(categoryUrls).toEqual([
      "https://example.test/category/category-one",
      "https://example.test/category/category-two",
    ]);

    const companyWithDate = entries.find((entry) => entry.url === "https://example.test/company/company-1201");
    expect(companyWithDate?.lastModified).toBeInstanceOf(Date);
    if (!(companyWithDate?.lastModified instanceof Date)) {
      throw new Error("Expected company lastModified to be a Date");
    }
    expect(companyWithDate.lastModified.toISOString()).toBe("2026-08-20T12:34:56.000Z");

    const companyWithoutValidDate = entries.find((entry) => entry.url === "https://example.test/company/trimmed-company");
    expect(companyWithoutValidDate?.lastModified).toBeUndefined();

    expect(new Set(urls).size).toBe(entries.length);
    expect(urls).not.toContain("https://example.test/leader/demo-leader");
    expect(urls).not.toContain("https://example.test/company/");
    expect(urls).not.toContain("https://example.test/leader/");
    expect(urls).not.toContain("https://example.test/category/");
  });
});
