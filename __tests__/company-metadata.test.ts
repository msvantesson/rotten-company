import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

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

vi.mock("@/lib/test-company", () => ({ isTestCompany: () => false }));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://rotten-company.com${path}`,
  SITE_ORIGIN: "https://rotten-company.com",
}));

vi.mock("@/lib/flavor-engine", () => ({
  getMacroTier: (score: number): string => {
    const clamped = Math.max(0, Math.min(100, score));
    if (clamped >= 40) return "Serious Rot Detected";
    return "Mildly Rotten";
  },
}));

// Mock @/lib/company-seo with inline implementations that match the real logic.
// This is needed because the @/ path alias isn't configured in vitest.
vi.mock("@/lib/company-seo", () => ({
  buildOverviewTitle: (name: string, score: number | null): string => {
    const s = score !== null ? Math.round(Math.max(0, Math.min(100, score))) : 0;
    const detailed = `${name} Rotten Score: ${s}/100 | Evidence & Misconduct`;
    if (detailed.length <= 70) return detailed;
    const compact = `${name} | Rotten Score ${s}/100`;
    if (compact.length <= 70) return compact;
    return `${name} | Rotten Score`.slice(0, 70);
  },
  buildOverviewDescription: (name: string, score: number | null, count: number): string => {
    const s = score !== null ? Math.round(Math.max(0, Math.min(100, score))) : 0;
    const word = count === 1 ? "record" : "records";
    return `${name} has a Rotten Score of ${s}/100 based on ${count} documented evidence ${word}. ` +
      `Review ${name}'s misconduct cases, category breakdown, sources and current status.`;
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
    return `Explore how ${name}'s Rotten Score of ${s}/100 is calculated across ` +
      `misconduct categories, evidence severity, remediation and documented sources.`;
  },
  buildSsrAnswer: (name: string, score: number | null, count: number): string => {
    const s = score !== null ? Math.round(Math.max(0, Math.min(100, score))) : 0;
    const word = count === 1 ? "record" : "records";
    return `${name} currently has a Rotten Score of ${s}/100. ` +
      `The score is based on ${count} approved evidence ${word}.`;
  },
  roundScore: (score: number | null): number => {
    if (score === null) return 0;
    return Math.round(Math.max(0, Math.min(100, score)));
  },
}));

// ─── Supabase helper ──────────────────────────────────────────────────────────

type TableData = Record<string, Array<Record<string, unknown>>>;

function makeSupabase(tables: TableData) {
  const from = (table: string) => {
    const state: { eqs: Array<[string, unknown]> } = { eqs: [] };
    const query = {
      select: () => query,
      eq: (col: string, val: unknown) => {
        state.eqs.push([col, val]);
        return query;
      },
      order: () => query,
      maybeSingle: async () => {
        const rows = (tables[table] ?? []).filter((row) =>
          state.eqs.every(([col, val]) => row[col] === val),
        );
        return { data: rows[0] ?? null, error: null };
      },
      then: <T1 = unknown, T2 = never>(
        ok?: ((v: { data: unknown[]; error: null }) => T1 | PromiseLike<T1>) | null,
        fail?: ((r: unknown) => T2 | PromiseLike<T2>) | null,
      ) => {
        const rows = (tables[table] ?? []).filter((row) =>
          state.eqs.every(([col, val]) => row[col] === val),
        );
        return Promise.resolve({ data: rows, error: null }).then(ok, fail);
      },
    };
    return query;
  };
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
    from,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_TABLES: TableData = {
  companies: [
    { id: 1, name: "Acme Corp", slug: "acme-corp", industry: "Tech" },
  ],
  company_slug_redirects: [],
  company_rotten_score_v2: [{ company_id: 1, rotten_score: 47 }],
  company_category_full_breakdown: [
    { company_id: 1, category_id: 1, category_name: "Corporate Misconduct", evidence_count: 5 },
    { company_id: 1, category_id: 2, category_name: "Human Rights", evidence_count: 3 },
  ],
};

// ─── Overview metadata tests ──────────────────────────────────────────────────

describe("overview generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("title includes live company name", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    expect(String(result.title)).toContain("Acme Corp");
  });

  it("title includes current displayed score", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    expect(String(result.title)).toContain("47");
  });

  it("title is at least 15 characters", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    expect(String(result.title).length).toBeGreaterThanOrEqual(15);
  });

  it("title is at most 70 characters for standard name", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    expect(String(result.title).length).toBeLessThanOrEqual(70);
  });

  it("title uses ASCII | separator (no em-dash mojibake)", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const t = String(result.title);
    expect(t).not.toMatch(/â|—|–/);
    expect(t).toContain("|");
  });

  it("description includes the score", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    expect(String(result.description)).toContain("47");
  });

  it("description includes the approved evidence count (5 + 3 = 8)", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    expect(String(result.description)).toContain("8");
  });

  it("description uses plural 'records' for multiple evidence", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    expect(String(result.description)).toContain("records");
  });

  it("description uses singular 'record' for one evidence item", async () => {
    const tables: TableData = {
      ...BASE_TABLES,
      company_category_full_breakdown: [
        { company_id: 1, category_id: 1, category_name: "Corporate Misconduct", evidence_count: 1 },
      ],
    };
    supabaseServerMock.mockResolvedValue(makeSupabase(tables));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const desc = String(result.description);
    expect(desc).toContain("1 documented evidence record");
    expect(desc).not.toMatch(/\b1 documented evidence records\b/);
  });

  it("canonical URL uses stored company.slug", async () => {
    const tables: TableData = {
      ...BASE_TABLES,
      companies: [{ id: 1, name: "Acme Corp", slug: "acme-stored-slug", industry: "Tech" }],
    };
    supabaseServerMock.mockResolvedValue(makeSupabase(tables));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-stored-slug" } });
    const canonical = (result.alternates as { canonical?: string })?.canonical ?? "";
    expect(canonical).toContain("acme-stored-slug");
    expect(canonical).not.toContain("/breakdown");
  });

  it("openGraph title matches generated title", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const ogTitle = (result.openGraph as { title?: string })?.title;
    expect(ogTitle).toBe(String(result.title));
  });

  it("openGraph description matches generated description", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const ogDesc = (result.openGraph as { description?: string })?.description;
    expect(ogDesc).toBe(String(result.description));
  });

  it("twitter title matches generated title", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const tw = result.twitter as { title?: string };
    expect(tw?.title).toBe(String(result.title));
  });

  it("twitter description matches generated description", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const tw = result.twitter as { description?: string };
    expect(tw?.description).toBe(String(result.description));
  });

  it("title does not contain serialized table content", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const t = String(result.title);
    expect(t).not.toContain("Table_title:");
    expect(t).not.toContain("Table_content:");
    expect(t).not.toContain("| # | Company");
  });

  it("dynamic regression: changing score updates title and description", async () => {
    supabaseServerMock.mockResolvedValue(
      makeSupabase({ ...BASE_TABLES, company_rotten_score_v2: [{ company_id: 1, rotten_score: 47 }] }),
    );
    const { generateMetadata: gm1 } = await import("../app/company/[slug]/metadata");
    const r1 = await gm1({ params: { slug: "acme-corp" } });

    vi.resetModules();
    supabaseServerMock.mockResolvedValue(
      makeSupabase({ ...BASE_TABLES, company_rotten_score_v2: [{ company_id: 1, rotten_score: 80 }] }),
    );
    const { generateMetadata: gm2 } = await import("../app/company/[slug]/metadata");
    const r2 = await gm2({ params: { slug: "acme-corp" } });

    expect(String(r1.title)).toContain("47");
    expect(String(r2.title)).toContain("80");
    expect(String(r1.description)).toContain("47");
    expect(String(r2.description)).toContain("80");
  });

  it("404 for nonexistent company — metadata not fabricated", async () => {
    supabaseServerMock.mockResolvedValue(
      makeSupabase({ ...BASE_TABLES, companies: [], company_slug_redirects: [] }),
    );
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    await expect(
      generateMetadata({ params: { slug: "does-not-exist" } }),
    ).rejects.toThrow("NOT_FOUND");
  });

  it("legacy slug permanently redirects", async () => {
    const tables: TableData = {
      ...BASE_TABLES,
      company_slug_redirects: [{ company_id: 1, old_slug: "acme", new_slug: "acme-corp" }],
    };
    supabaseServerMock.mockResolvedValue(makeSupabase(tables));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    await expect(
      generateMetadata({ params: { slug: "acme" } }),
    ).rejects.toThrow("PERMANENT_REDIRECT:/company/acme-corp");
  });

  it("openGraph type is website", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const og = result.openGraph as { type?: string };
    expect(og?.type).toBe("website");
  });

  it("twitter card is summary_large_image", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata } = await import("../app/company/[slug]/metadata");
    const result = await generateMetadata({ params: { slug: "acme-corp" } });
    const tw = result.twitter as { card?: string };
    expect(tw?.card).toBe("summary_large_image");
  });
});

// ─── Breakdown metadata tests ─────────────────────────────────────────────────

describe("breakdown generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("title contains company name", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const result = await generateBreakdownMetadata({ slug: "acme-corp" });
    expect(String(result.title)).toContain("Acme Corp");
  });

  it("title contains Rotten Score Breakdown", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const result = await generateBreakdownMetadata({ slug: "acme-corp" });
    expect(String(result.title)).toContain("Rotten Score Breakdown");
  });

  it("breakdown canonical ends with /breakdown", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const result = await generateBreakdownMetadata({ slug: "acme-corp" });
    const canonical = (result.alternates as { canonical?: string })?.canonical ?? "";
    expect(canonical).toMatch(/\/breakdown$/);
  });

  it("breakdown OG URL uses breakdown canonical", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const result = await generateBreakdownMetadata({ slug: "acme-corp" });
    const ogUrl = (result.openGraph as { url?: string })?.url ?? "";
    expect(ogUrl).toMatch(/\/breakdown$/);
  });

  it("breakdown description is distinct from overview description", async () => {
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateMetadata: overviewMeta } = await import(
      "../app/company/[slug]/metadata"
    );
    const overviewResult = await overviewMeta({ params: { slug: "acme-corp" } });

    vi.resetModules();
    supabaseServerMock.mockResolvedValue(makeSupabase(BASE_TABLES));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const breakdownResult = await generateBreakdownMetadata({ slug: "acme-corp" });

    expect(String(overviewResult.description)).not.toBe(
      String(breakdownResult.description),
    );
  });

  it("uses stored slug, not regenerated slug from name", async () => {
    const tables: TableData = {
      ...BASE_TABLES,
      companies: [{ id: 1, name: "Acme Corp", slug: "acme-stored-slug", industry: "Tech" }],
    };
    supabaseServerMock.mockResolvedValue(makeSupabase(tables));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const result = await generateBreakdownMetadata({ slug: "acme-stored-slug" });
    const canonical = (result.alternates as { canonical?: string })?.canonical ?? "";
    expect(canonical).toContain("acme-stored-slug");
    expect(canonical).not.toContain("acme-corp");
  });

  it("long company names get compact title within 70 chars", async () => {
    const tables: TableData = {
      ...BASE_TABLES,
      companies: [{
        id: 1,
        name: "A Very Long Corporation Name That Exceeds Typical Length",
        slug: "a-very-long-corp",
        industry: "Tech",
      }],
    };
    supabaseServerMock.mockResolvedValue(makeSupabase(tables));
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    const result = await generateBreakdownMetadata({ slug: "a-very-long-corp" });
    expect(String(result.title).length).toBeLessThanOrEqual(70);
  });

  it("404 for nonexistent company — metadata not fabricated", async () => {
    supabaseServerMock.mockResolvedValue(
      makeSupabase({ ...BASE_TABLES, companies: [], company_slug_redirects: [] }),
    );
    const { generateBreakdownMetadata } = await import(
      "../app/company/[slug]/breakdown/metadata"
    );
    await expect(
      generateBreakdownMetadata({ slug: "does-not-exist" }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
