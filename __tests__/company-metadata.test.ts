import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseServerMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/company-slug", async () => await import("../lib/company-slug"));

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});
const permanentRedirectMock = vi.fn((url: string) => {
  throw new Error(`PERMANENT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock("next/link", () => ({
  default: () => null,
}));

vi.mock("@/components/RatingStars", () => ({
  default: () => null,
}));

vi.mock("@/components/RottenScoreMeter", () => ({
  default: () => null,
}));

vi.mock("@/components/ScoreDebugPanel", () => ({
  ScoreDebugPanel: () => null,
}));

vi.mock("@/components/JsonLdDebugPanel", () => ({
  JsonLdDebugPanel: () => null,
}));

vi.mock("@/components/CategoryInfoPopover", () => ({
  default: () => null,
}));

vi.mock("@/components/CeoSection", () => ({
  default: () => null,
}));

vi.mock("@/components/CompanyTabs", () => ({
  default: () => null,
}));

vi.mock("@/lib/jsonld-company", () => ({
  buildCompanyJsonLd: () => ({ "@type": "Organization" }),
}));

vi.mock("@/lib/flavor-engine", () => ({
  getMacroTier: (score: number): string => {
    const clamped = Math.max(0, Math.min(100, score));
    if (clamped >= 40) return "Serious Rot Detected";
    return "Mildly Rotten";
  },
  getRottenFlavor: () => ({
    color: "#000",
    macroTier: "Watchlist",
    microFlavor: "Evidence-backed",
  }),
}));

vi.mock("@/lib/test-company", () => ({ isTestCompany: () => false }));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://rotten-company.com${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({ items }),
  SITE_ORIGIN: "https://rotten-company.com",
}));

vi.mock("@/lib/constants/employee-ranges", () => ({
  EMPLOYEE_RANGES: [],
}));

vi.mock("@/lib/company-seo", () => ({
  buildOverviewTitle: (name: string, score: number | null): string => {
    const s = score !== null ? Math.round(Math.max(0, Math.min(100, score))) : 0;
    const detailed = `${name} Rotten Score: ${s}/100 | Evidence & Misconduct`;
    if (detailed.length <= 70) return detailed;
    const compact = `${name} | Rotten Score ${s}/100`;
    if (compact.length <= 70) return compact;
    return `${name} | Rotten Score`.slice(0, 70);
  },
  buildBreakdownTitle: (name: string): string => {
    const detailed = `${name} Rotten Score Breakdown | Categories & Calculation`;
    if (detailed.length <= 70) return detailed;
    const compact = `${name} | Rotten Score Breakdown`;
    if (compact.length <= 70) return compact;
    return `${name} | Rotten Breakdown`.slice(0, 70);
  },
  buildBreakdownDescription: (name: string, score: number | null): string => {
    const s = score !== null ? Math.round(Math.max(0, Math.min(100, score))) : 0;
    return `Explore how ${name}'s Rotten Score of ${s}/100 is calculated across misconduct categories, evidence severity, remediation and documented sources.`;
  },
  buildSsrAnswer: (name: string, score: number | null, count: number): string => {
    const s = score !== null ? Math.round(Math.max(0, Math.min(100, score))) : 0;
    const word = count === 1 ? "record" : "records";
    return `${name} currently has a Rotten Score of ${s}/100 and is classified as Mildly Rotten. The score is based on ${count} approved evidence ${word}.`;
  },
  roundScore: (score: number | null): number => {
    if (score === null) return 0;
    return Math.round(Math.max(0, Math.min(100, score)));
  },
}));

type TableData = Record<string, Array<Record<string, unknown>>>;

type QueryOverride = {
  table: string;
  eqs?: Array<[string, unknown]>;
  mode?: "single" | "many";
  result?: { data: unknown; error: { message: string } | null };
  reject?: Error;
};

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

function makeSupabase(
  tables: TableData,
  overrides: QueryOverride[] = [],
) {
  const allTables: TableData = {
    company_slug_redirects: [],
    company_rotten_score_v2: [],
    company_category_full_breakdown: [],
    categories: [],
    ownership_signals_summary: [],
    ratings: [],
    ...tables,
  };

  const findRows = (table: string, eqs: Array<[string, unknown]>) =>
    (allTables[table] ?? []).filter((row) =>
      eqs.every(([column, value]) => row[column] === value),
    );

  const findOverride = (
    table: string,
    eqs: Array<[string, unknown]>,
    mode: "single" | "many",
  ) => overrides.find((override) =>
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
      order: () => query,
      maybeSingle: async () => {
        const override = findOverride(table, state.eqs, "single");
        if (override?.reject) {
          throw override.reject;
        }
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
        if (override?.reject) {
          return Promise.reject(override.reject).then(onfulfilled, onrejected);
        }
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
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
    from,
  };
}

const BASE_TABLES: TableData = {
  companies: [
    { id: 1, name: "Boeing", slug: "boeing", industry: "Aerospace" },
  ],
  company_rotten_score_v2: [{ company_id: 1, rotten_score: 39 }],
  company_category_full_breakdown: [
    { company_id: 1, category_id: 1, category_name: "Corporate Misconduct", evidence_count: 5 },
    { company_id: 1, category_id: 2, category_name: "Human Rights", evidence_count: 3 },
  ],
};

async function loadOverviewMetadata(
  {
    tables = BASE_TABLES,
    overrides = [],
    slug = "boeing",
  }: {
    tables?: TableData;
    overrides?: QueryOverride[];
    slug?: string;
  } = {},
) {
  supabaseServerMock.mockResolvedValue(makeSupabase(tables, overrides));
  const { generateMetadata } = await import("../app/company/[slug]/metadata");
  return await generateMetadata({ params: { slug } });
}

function metadataStrings(metadata: Awaited<ReturnType<typeof loadOverviewMetadata>>) {
  return [
    String(metadata.title ?? ""),
    String(metadata.description ?? ""),
    (metadata.alternates as { canonical?: string } | undefined)?.canonical ?? "",
    (metadata.openGraph as { title?: string; description?: string; url?: string } | undefined)?.title ?? "",
    (metadata.openGraph as { title?: string; description?: string; url?: string } | undefined)?.description ?? "",
    (metadata.openGraph as { title?: string; description?: string; url?: string } | undefined)?.url ?? "",
    (metadata.twitter as { title?: string; description?: string } | undefined)?.title ?? "",
    (metadata.twitter as { title?: string; description?: string } | undefined)?.description ?? "",
  ].filter(Boolean);
}

describe("company overview metadata regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns dynamic metadata for a valid company with a score", async () => {
    const result = await loadOverviewMetadata();

    expect(result.title).toBe("Boeing Rotten Score: 39/100 | Evidence & Misconduct");
    expect(result.description).toBe(
      "Boeing has a Rotten Score of 39/100 based on 8 documented evidence records. Review misconduct cases, category breakdown, sources and current status.",
    );
    expect((result.alternates as { canonical?: string }).canonical).toBe(
      "https://rotten-company.com/company/boeing",
    );
    expect((result.openGraph as { title?: string }).title).toBe(String(result.title));
    expect((result.openGraph as { description?: string }).description).toBe(String(result.description));
    expect((result.openGraph as { url?: string }).url).toBe(
      "https://rotten-company.com/company/boeing",
    );
    expect((result.twitter as { title?: string }).title).toBe(String(result.title));
    expect((result.twitter as { description?: string }).description).toBe(String(result.description));
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(permanentRedirectMock).not.toHaveBeenCalled();

    for (const value of metadataStrings(result)) {
      expect(value).not.toContain("Table_title");
      expect(value).not.toContain("Table_content");
      expect(value).not.toContain("| # | Company");
      expect(value).not.toMatch(/â|—|–/);
    }
  });

  it("returns company-specific fallback metadata when score lookup fails", async () => {
    const result = await loadOverviewMetadata({
      overrides: [
        {
          table: "company_rotten_score_v2",
          eqs: [["company_id", 1]],
          mode: "single",
          result: { data: null, error: { message: "score unavailable" } },
        },
      ],
    });

    expect(result.title).toBe("Boeing Rotten Score & Evidence | Rotten Company");
    expect(result.description).toBe(
      "Review Boeing's Rotten Score, documented evidence, misconduct cases, category breakdown and sources.",
    );
    expect((result.alternates as { canonical?: string }).canonical).toBe(
      "https://rotten-company.com/company/boeing",
    );
    expect(metadataStrings(result).join(" ")).not.toContain("0/100");
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("does not throw when evidence lookup fails", async () => {
    await expect(loadOverviewMetadata({
      overrides: [
        {
          table: "company_category_full_breakdown",
          eqs: [["company_id", 1]],
          mode: "many",
          reject: new Error("evidence unavailable"),
        },
      ],
    })).resolves.toMatchObject({
      title: "Boeing Rotten Score: 39/100 | Evidence & Misconduct",
      description:
        "Review Boeing's Rotten Score, documented evidence, misconduct cases, category breakdown and sources.",
    });

    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("returns generic fallback metadata on company query DB error without throwing", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await loadOverviewMetadata({
      overrides: [
        {
          table: "companies",
          eqs: [["id", 1]],
          mode: "single",
          result: { data: null, error: { message: "db unavailable" } },
        },
      ],
    });

    expect(result.title).toBe("Company Rotten Score & Evidence | Rotten Company");
    expect(result.description).toBe(
      "Review company Rotten Scores, documented evidence, misconduct cases and sources on Rotten Company.",
    );
    expect(result.alternates).toBeUndefined();
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Company metadata lookup failed", {
      slug: "boeing",
      error: "db unavailable",
    });
  });

  it("returns generic fallback metadata when slug resolution throws", async () => {
    const result = await loadOverviewMetadata({
      overrides: [
        {
          table: "companies",
          eqs: [["slug", "boeing"]],
          mode: "single",
          reject: new Error("slug lookup failed"),
        },
      ],
    });

    expect(result.title).toBe("Company Rotten Score & Evidence | Rotten Company");
    expect(result.description).toBe(
      "Review company Rotten Scores, documented evidence, misconduct cases and sources on Rotten Company.",
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("returns generic fallback metadata when company lookup returns null", async () => {
    const result = await loadOverviewMetadata({
      overrides: [
        {
          table: "companies",
          eqs: [["id", 1]],
          mode: "single",
          result: { data: null, error: null },
        },
      ],
    });

    expect(result.title).toBe("Company Rotten Score & Evidence | Rotten Company");
    expect(result.description).toBe(
      "Review company Rotten Scores, documented evidence, misconduct cases and sources on Rotten Company.",
    );
    expect(result.alternates).toBeUndefined();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("uses the stored company slug for the canonical URL", async () => {
    const result = await loadOverviewMetadata({
      tables: {
        ...BASE_TABLES,
        companies: [
          { id: 1, name: "Boeing", slug: "boeing-official", industry: "Aerospace" },
        ],
      },
      slug: "boeing-official",
    });

    expect((result.alternates as { canonical?: string }).canonical).toBe(
      "https://rotten-company.com/company/boeing-official",
    );
    expect((result.openGraph as { url?: string }).url).toBe(
      "https://rotten-company.com/company/boeing-official",
    );
  });

  it("keeps unknown company routes as page-level 404s instead of metadata 404s", async () => {
    const metadata = await loadOverviewMetadata({
      tables: {
        ...BASE_TABLES,
        companies: [],
        company_slug_redirects: [],
      },
      slug: "missing-company",
    });

    expect(metadata.title).toBe("Company Rotten Score & Evidence | Rotten Company");
    expect(notFoundMock).not.toHaveBeenCalled();

    const { default: CompanyPage } = await import("../app/company/[slug]/page");

    await expect(
      CompanyPage({ params: Promise.resolve({ slug: "missing-company" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});

describe("company breakdown metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("keeps the breakdown canonical URL on the breakdown route", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const result = await generateBreakdownMetadata({ slug: "boeing" });

    expect((result.alternates as { canonical?: string }).canonical).toBe(
      "https://rotten-company.com/company/boeing/breakdown",
    );
    expect((result.openGraph as { url?: string }).url).toBe(
      "https://rotten-company.com/company/boeing/breakdown",
    );
  });
});
