import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const supabaseServerMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: unknown; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/MacroTierBadge", () => ({
  default: ({ score }: { score: number }) => <span>Tier {score.toFixed(1)}</span>,
}));

vi.mock("@/components/FindCompanySection", () => ({
  default: () => <section>Find company</section>,
}));

type SnapshotRow = {
  company_id: number;
  snapshot_date: string;
  rotten_score: number;
};

type TableState = Record<string, unknown>;

function createMockSupabase(nowIsoDate: string, weekAgoIsoDate: string) {
  const topCompanies = Array.from({ length: 10 }, (_, idx) => ({
    id: 101 + idx,
    name: `Index Co ${idx + 1}`,
    slug: `index-co-${idx + 1}`,
    industry: "Tech",
    country: "US",
    rotten_score: 90 - idx,
    approved_evidence_count: 10 - idx,
  }));

  const positiveDeltas = [10, 9, 8, 7, 6, 5];
  const negativeDeltas = [-10, -9, -8, -7, -6, -5];

  const snapshots: SnapshotRow[] = [];

  positiveDeltas.forEach((delta, idx) => {
    const companyId = idx + 1;
    snapshots.push(
      { company_id: companyId, snapshot_date: weekAgoIsoDate, rotten_score: 30 },
      { company_id: companyId, snapshot_date: nowIsoDate, rotten_score: 30 + delta },
    );
  });

  negativeDeltas.forEach((delta, idx) => {
    const companyId = idx + 7;
    snapshots.push(
      { company_id: companyId, snapshot_date: weekAgoIsoDate, rotten_score: 70 },
      { company_id: companyId, snapshot_date: nowIsoDate, rotten_score: 70 + delta },
    );
  });

  // This would have rendered in the Rotten Index row before removing inline weekly delta text.
  snapshots.push(
    { company_id: 101, snapshot_date: weekAgoIsoDate, rotten_score: 78 },
    { company_id: 101, snapshot_date: nowIsoDate, rotten_score: 80 },
  );

  const companies = [
    ...positiveDeltas.map((_, idx) => ({ id: idx + 1, name: `Worsen ${idx + 1}`, slug: `worsen-${idx + 1}` })),
    ...negativeDeltas.map((_, idx) => ({ id: idx + 7, name: `Improve ${idx + 1}`, slug: `improve-${idx + 1}` })),
    { id: 101, name: "Index Co 1", slug: "index-co-1" },
  ];

  const moderationEvents = [
    { id: "evt-1", evidence_id: 501, created_at: `${nowIsoDate}T12:00:00.000Z`, action: "approved" },
  ];
  const evidenceRows = [{ id: 501, title: "Approved evidence", company_id: 1 }];

  const resolveRows = (table: string, state: TableState): unknown[] => {
    if (table === "global_rotten_index") {
      return topCompanies.slice(0, Number(state.limit ?? topCompanies.length));
    }

    if (table === "company_rotten_score_snapshots") {
      let rows = snapshots;
      const snapshotDates = state["in:snapshot_date"] as string[] | undefined;
      const companyIds = state["in:company_id"] as number[] | undefined;

      if (snapshotDates) rows = rows.filter((row) => snapshotDates.includes(row.snapshot_date));
      if (companyIds) rows = rows.filter((row) => companyIds.includes(row.company_id));
      return rows;
    }

    if (table === "companies") {
      const ids = state["in:id"] as number[] | undefined;
      if (!ids) return companies;
      return companies.filter((row) => ids.includes(row.id));
    }

    if (table === "moderation_events") {
      const action = state["eq:action"] as string | undefined;
      let rows = moderationEvents;
      if (action) rows = rows.filter((row) => row.action === action);
      return rows.slice(0, Number(state.limit ?? rows.length));
    }

    if (table === "evidence") {
      const ids = state["in:id"] as number[] | undefined;
      if (!ids) return evidenceRows;
      return evidenceRows.filter((row) => ids.includes(row.id));
    }

    return [];
  };

  const from = (table: string) => {
    const state: TableState = {};

    const query = {
      select: () => query,
      order: () => query,
      limit: (count: number) => {
        state.limit = count;
        return query;
      },
      in: (column: string, values: number[] | string[]) => {
        state[`in:${column}`] = values;
        return query;
      },
      eq: (column: string, value: string) => {
        state[`eq:${column}`] = value;
        return query;
      },
      then: <TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve({ data: resolveRows(table, state), error: null }).then(onfulfilled, onrejected),
    };

    return query;
  };

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
    },
    from,
  };
}

describe("Homepage UI updates", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T05:52:32.163Z"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const nowIsoDate = new Date().toISOString().slice(0, 10);
    const weekAgoIsoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    supabaseServerMock.mockResolvedValue(createMockSupabase(nowIsoDate, weekAgoIsoDate));
  });

  it("shows 5 movers per direction and no inline Rotten Score weekly text", async () => {
    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Biggest movers this week");
    expect(html).toMatch(/↑ Worsening[\s\S]*Company[\s\S]*7-day change[\s\S]*Current score[\s\S]*Worsen 1/);
    expect(html).toMatch(/↓ Improving[\s\S]*Company[\s\S]*7-day change[\s\S]*Current score[\s\S]*Improve 1/);

    expect(html).toContain("Worsen 1");
    expect(html).toContain("Worsen 5");
    expect(html).not.toContain("Worsen 6");

    expect(html).toContain("Improve 1");
    expect(html).toContain("Improve 5");
    expect(html).not.toContain("Improve 6");

    expect(html).toContain("↑ +10.0");
    expect(html).toContain("↓ -10.0");

    expect(html).not.toContain("↑ +2.0 this week");
  });
});
