import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

type CompanyRow = { country: string | null };
type IndexRow = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  rotten_score: number;
  industry: string | null;
  approved_evidence_count: number;
};

type Operation =
  | { type: "not"; column: string; operator: string; value: unknown }
  | { type: "range"; from: number; to: number }
  | { type: "eq"; column: string; value: unknown }
  | { type: "or"; expression: string }
  | { type: "order"; column: string; ascending: boolean }
  | { type: "limit"; count: number };

function createSupabaseMock(companies: CompanyRow[], globalIndexRows: IndexRow[]) {
  return {
    from(table: string) {
      const operations: Operation[] = [];

      const query = {
        select: () => query,
        not: (column: string, operator: string, value: unknown) => {
          operations.push({ type: "not", column, operator, value });
          return query;
        },
        range: (from: number, to: number) => {
          operations.push({ type: "range", from, to });
          return query;
        },
        eq: (column: string, value: unknown) => {
          operations.push({ type: "eq", column, value });
          return query;
        },
        or: (expression: string) => {
          operations.push({ type: "or", expression });
          return query;
        },
        order: (column: string, opts: { ascending: boolean }) => {
          operations.push({ type: "order", column, ascending: opts.ascending });
          return query;
        },
        limit: (count: number) => {
          operations.push({ type: "limit", count });
          return query;
        },
        then: <TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
          onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => {
          let rows: Record<string, unknown>[] =
            table === "companies"
              ? companies.map((r) => ({ ...r }))
              : table === "global_rotten_index"
                ? globalIndexRows.map((r) => ({ ...r }))
                : [];

          let usedRange = false;

          for (const op of operations) {
            if (op.type === "not" && op.column === "country" && op.operator === "is" && op.value === null) {
              rows = rows.filter((r) => r.country !== null);
            }

            if (op.type === "range") {
              usedRange = true;
              rows = rows.slice(op.from, op.to + 1);
            }

            if (op.type === "eq") {
              rows = rows.filter((r) => r[op.column] === op.value);
            }

            if (op.type === "or") {
              const terms = op.expression
                .split(",")
                .map((part) => part.trim())
                .map((part) => {
                  const match = part.match(/^(\w+)\.ilike\.%(.*)%$/);
                  if (!match) return null;
                  return {
                    field: match[1],
                    needle: match[2].replace(/\\([\\%_])/g, "$1").toLowerCase(),
                  };
                })
                .filter((t): t is { field: string; needle: string } => t !== null);

              rows = rows.filter((r) =>
                terms.some((t) => String(r[t.field] ?? "").toLowerCase().includes(t.needle)),
              );
            }

            if (op.type === "order") {
              rows = [...rows].sort((a, b) => {
                const av = a[op.column];
                const bv = b[op.column];
                if (av === bv) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                if (av < bv) return op.ascending ? -1 : 1;
                return op.ascending ? 1 : -1;
              });
            }

            if (op.type === "limit") {
              rows = rows.slice(0, op.count);
            }
          }

          if (table === "companies" && !usedRange) {
            rows = rows.slice(0, 1000);
          }

          return Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
        },
      };

      return query;
    },
  };
}

function buildFixtures() {
  const companies: CompanyRow[] = [];
  for (let i = 0; i < 1000; i++) {
    companies.push({ country: i % 2 === 0 ? "Belgium" : "Portugal" });
  }
  companies.push({ country: " Italy " });
  companies.push({ country: "Spain" });
  companies.push({ country: "Denmark" });
  companies.push({ country: "Finland" });
  companies.push({ country: "France" });
  companies.push({ country: "   " });
  companies.push({ country: null });

  const globalRows: IndexRow[] = [];
  let id = 1;

  for (let i = 0; i < 10; i++) {
    globalRows.push({
      id: id++,
      name: `Belgium Co ${i + 1}`,
      slug: `belgium-co-${i + 1}`,
      country: "Belgium",
      rotten_score: 200 - i,
      industry: "Finance",
      approved_evidence_count: 100 - i,
    });
  }

  for (let i = 0; i < 15; i++) {
    globalRows.push({
      id: id++,
      name: i < 10 ? `Banco Italia ${String.fromCharCode(65 + i)}` : `Italy Co ${i + 1}`,
      slug: `italy-co-${i + 1}`,
      country: "Italy",
      rotten_score: 180 - i,
      industry: i < 10 ? "Banking" : "Energy",
      approved_evidence_count: 90 - i,
    });
  }

  for (let i = 0; i < 12; i++) {
    globalRows.push({
      id: id++,
      name: `Spain Co ${i + 1}`,
      slug: `spain-co-${i + 1}`,
      country: "Spain",
      rotten_score: 160 - i,
      industry: "Retail",
      approved_evidence_count: 80 - i,
    });
  }

  for (let i = 0; i < 12; i++) {
    globalRows.push({
      id: id++,
      name: `Portugal Co ${i + 1}`,
      slug: `portugal-co-${i + 1}`,
      country: "Portugal",
      rotten_score: 140 - i,
      industry: "Logistics",
      approved_evidence_count: 70 - i,
    });
  }

  return { companies, globalRows };
}

describe("getRottenIndexData company filters + country source", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  });

  it(">1000 companies still yields full country dropdown from all company rows", async () => {
    const { companies, globalRows } = buildFixtures();
    createClientMock.mockReturnValue(createSupabaseMock(companies, globalRows));

    const { getRottenIndexData } = await import("../lib/getRottenIndexData");
    const result = await getRottenIndexData({ type: "company", limit: 10 });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.countries).toEqual([
      "Belgium",
      "Denmark",
      "Finland",
      "France",
      "Italy",
      "Portugal",
      "Spain",
    ]);
  });

  it.each(["Belgium", "Italy", "Spain", "Portugal"])(
    "country=%s returns only matching rows",
    async (country) => {
      const { companies, globalRows } = buildFixtures();
      createClientMock.mockReturnValue(createSupabaseMock(companies, globalRows));

      const { getRottenIndexData } = await import("../lib/getRottenIndexData");
      const result = await getRottenIndexData({ type: "company", country, limit: 10 });

      expect("error" in result).toBe(false);
      if ("error" in result) return;

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((row) => row.country === country)).toBe(true);
    },
  );

  it("applies country filter before top-10 limit", async () => {
    const { companies, globalRows } = buildFixtures();
    createClientMock.mockReturnValue(createSupabaseMock(companies, globalRows));

    const { getRottenIndexData } = await import("../lib/getRottenIndexData");
    const result = await getRottenIndexData({ type: "company", country: "Italy", limit: 10 });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.rows).toHaveLength(10);
    expect(result.rows.every((row) => row.country === "Italy")).toBe(true);
  });

  it("country='' behaves as all countries/global ranking", async () => {
    const { companies, globalRows } = buildFixtures();
    createClientMock.mockReturnValue(createSupabaseMock(companies, globalRows));

    const { getRottenIndexData } = await import("../lib/getRottenIndexData");
    const result = await getRottenIndexData({ type: "company", country: "", limit: 3 });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    expect(result.rows.map((r) => r.name)).toEqual(["Belgium Co 1", "Belgium Co 2", "Belgium Co 3"]);
  });

  it("country + search + sort work together", async () => {
    const { companies, globalRows } = buildFixtures();
    createClientMock.mockReturnValue(createSupabaseMock(companies, globalRows));

    const { getRottenIndexData } = await import("../lib/getRottenIndexData");
    const result = await getRottenIndexData({
      type: "company",
      country: "Italy",
      q: "banco",
      sort: "name",
      dir: "asc",
      limit: 5,
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;

    const names = result.rows.map((r) => r.name);
    expect(result.rows.every((row) => row.country === "Italy")).toBe(true);
    expect(names).toEqual(["Banco Italia A", "Banco Italia B", "Banco Italia C", "Banco Italia D", "Banco Italia E"]);
  });
});
