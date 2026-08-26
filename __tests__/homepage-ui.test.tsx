import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const supabaseServerMock = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: supabaseServerMock,
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
}));

vi.mock("@/lib/homepage-seo", () => ({
  homepageMetadata: { title: "Rotten Company" },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode; [key: string]: unknown }) => (
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
    name: idx === 0 ? "Nestlé" : `Index Co ${idx + 1}`,
    slug: idx === 0 ? "nestl" : `index-co-${idx + 1}`,
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
      // Both current-score query and baseline query use lte on snapshot_date.
      const lteSnapshotDate = state["lte:snapshot_date"] as string | undefined;
      const companyIds = state["in:company_id"] as number[] | undefined;

      if (lteSnapshotDate) rows = rows.filter((row) => row.snapshot_date <= lteSnapshotDate);
      if (companyIds) rows = rows.filter((row) => companyIds.includes(row.company_id));

      // Respect descending sort for both queries.
      if (state["order:snapshot_date"] === "desc") {
        rows = [...rows].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
      }
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
      order: (column: string, opts?: { ascending?: boolean }) => {
        if (opts?.ascending === false) state[`order:${column}`] = "desc";
        return query;
      },
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
      lte: (column: string, value: string) => {
        state[`lte:${column}`] = value;
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

// Minimal mock factory for targeted mover tests.
// Takes snapshots and companies directly; wires up a no-op for unrelated tables.
function createMinimalMockSupabase(
  snapshots: SnapshotRow[],
  companies: { id: number; name: string; slug: string }[],
) {
  const from = (table: string) => {
    const state: TableState = {};

    const query = {
      select: () => query,
      order: (column: string, opts?: { ascending?: boolean }) => {
        if (opts?.ascending === false) state[`order:${column}`] = "desc";
        return query;
      },
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
      lte: (column: string, value: string) => {
        state[`lte:${column}`] = value;
        return query;
      },
      then: <TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => {
        let rows: unknown[] = [];
        if (table === "company_rotten_score_snapshots") {
          rows = snapshots;
          const lteSnapshotDate = state["lte:snapshot_date"] as string | undefined;
          const companyIds = state["in:company_id"] as number[] | undefined;
          if (lteSnapshotDate) rows = (rows as SnapshotRow[]).filter((r) => r.snapshot_date <= lteSnapshotDate);
          if (companyIds) rows = (rows as SnapshotRow[]).filter((r) => companyIds.includes(r.company_id));
          if (state["order:snapshot_date"] === "desc") {
            rows = [...(rows as SnapshotRow[])].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
          }
        } else if (table === "companies") {
          const ids = state["in:id"] as number[] | undefined;
          rows = ids ? companies.filter((c) => ids.includes(c.id)) : companies;
        } else if (table === "global_rotten_index") {
          rows = [];
        } else if (table === "moderation_events") {
          rows = [];
        } else if (table === "evidence") {
          rows = [];
        }
        return Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
      },
    };

    return query;
  };

  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
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

  // With max-7-total logic: interleaving ±10, ±9, ±8, ±7 fills 4 increases + 3 decreases = 7.
  it("shows movers section with correct columns and top-7 results", async () => {
    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Biggest movers this week");
    expect(html).toContain("↑ Worsening");
    expect(html).toContain("Company");
    expect(html).toContain("7-day change");
    expect(html).toContain("Rotten Score");
    expect(html).toContain("Status");
    expect(html).toMatch(/↑ Worsening[\s\S]*Worsen 1[\s\S]*↑ \+10.0[\s\S]*40.0[\s\S]*Tier 40.0/);
    expect(html).toMatch(/↓ Improving[\s\S]*Improve 1[\s\S]*↓ -10.0[\s\S]*60.0[\s\S]*Tier 60.0/);

    // Top 7 by absolute change: +10,-10,+9,-9,+8,-8,+7 → Worsen1-4 and Improve1-3
    expect(html).toContain("Worsen 1");
    expect(html).toContain("Worsen 4");
    expect(html).not.toContain("Worsen 5");
    expect(html).toContain('href="/company/nestl"');

    expect(html).toContain("Improve 1");
    expect(html).toContain("Improve 3");
    expect(html).not.toContain("Improve 4");

    expect(html).toContain("↑ +10.0");
    expect(html).toContain("↓ -10.0");

    expect(html).not.toContain("↑ +2.0 this week");
    expect(html).not.toContain("↑ +10.0 this week");
    expect(html).not.toContain("↓ -10.0 this week");
  });
});

describe("getBiggestMovers – mover selection rules", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T05:52:32.163Z"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const NOW = "2026-08-18";
  const WEEK_AGO = "2026-08-11";

  it("includes existing company with a score increase", async () => {
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          { company_id: 1, snapshot_date: WEEK_AGO, rotten_score: 20 },
          { company_id: 1, snapshot_date: NOW, rotten_score: 35 },
        ],
        [{ id: 1, name: "Rising Co", slug: "rising-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Rising Co");
    expect(html).toContain("↑ +15.0");
  });

  it("includes newly scored company without a 7-day-ago snapshot (treats prev as 0)", async () => {
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        // Only a today snapshot — no WEEK_AGO entry
        [{ company_id: 2, snapshot_date: NOW, rotten_score: 42 }],
        [{ id: 2, name: "Brand New Co", slug: "brand-new-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Brand New Co");
    // delta = 42 - 0 = 42
    expect(html).toContain("↑ +42.0");
  });

  it("includes a company with a score decrease", async () => {
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          { company_id: 3, snapshot_date: WEEK_AGO, rotten_score: 80 },
          { company_id: 3, snapshot_date: NOW, rotten_score: 55 },
        ],
        [{ id: 3, name: "Falling Co", slug: "falling-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Falling Co");
    expect(html).toContain("↓ -25.0");
  });

  it("excludes companies where the calculated change is exactly 0", async () => {
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          { company_id: 4, snapshot_date: WEEK_AGO, rotten_score: 50 },
          { company_id: 4, snapshot_date: NOW, rotten_score: 50 },
        ],
        [{ id: 4, name: "Stable Co", slug: "stable-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(html).not.toContain("Stable Co");
    expect(html).not.toContain("Biggest movers this week");
  });

  it("returns at most 7 companies total", async () => {
    // 8 companies all with non-zero deltas
    const snapshots: SnapshotRow[] = Array.from({ length: 8 }, (_, i) => ({
      company_id: i + 10,
      snapshot_date: NOW,
      rotten_score: (i + 1) * 5,
    }));
    const companies = Array.from({ length: 8 }, (_, i) => ({
      id: i + 10,
      name: `Co ${i + 1}`,
      slug: `co-${i + 1}`,
    }));

    supabaseServerMock.mockResolvedValue(createMinimalMockSupabase(snapshots, companies));

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    // Count occurrences of company names in the movers section
    const matchCount = (html.match(/Co \d/g) ?? []).length;
    expect(matchCount).toBeLessThanOrEqual(7);
    // At least one mover is shown
    expect(html).toContain("Biggest movers this week");
  });

  it("orders movers by absolute score change descending", async () => {
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          // Company A: small change
          { company_id: 20, snapshot_date: WEEK_AGO, rotten_score: 50 },
          { company_id: 20, snapshot_date: NOW, rotten_score: 53 },
          // Company B: large change
          { company_id: 21, snapshot_date: WEEK_AGO, rotten_score: 10 },
          { company_id: 21, snapshot_date: NOW, rotten_score: 40 },
        ],
        [
          { id: 20, name: "Small Mover", slug: "small-mover" },
          { id: 21, name: "Big Mover", slug: "big-mover" },
        ],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    // Big Mover (delta=30) should appear before Small Mover (delta=3)
    const bigPos = html.indexOf("Big Mover");
    const smallPos = html.indexOf("Small Mover");
    expect(bigPos).toBeGreaterThan(-1);
    expect(smallPos).toBeGreaterThan(-1);
    expect(bigPos).toBeLessThan(smallPos);
  });

  it("uses older snapshot as baseline when the exact 7-day cutoff snapshot is missing", async () => {
    // Company has a snapshot from 14 days ago but nothing on the exact WEEK_AGO date.
    // The 14-days-ago snapshot should be used as the baseline, not 0.
    const FOURTEEN_DAYS_AGO = "2026-08-04";
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          { company_id: 30, snapshot_date: FOURTEEN_DAYS_AGO, rotten_score: 25 },
          { company_id: 30, snapshot_date: NOW, rotten_score: 35 },
          // No snapshot on WEEK_AGO (2026-08-11)
        ],
        [{ id: 30, name: "Gap Co", slug: "gap-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    expect(html).toContain("Gap Co");
    // delta = 35 - 25 = 10, not 35 - 0 = 35
    expect(html).toContain("↑ +10.0");
    expect(html).not.toContain("↑ +35.0");
  });

  it("uses 0 as baseline for a genuinely new company with no snapshot before the cutoff", async () => {
    // Company only has a snapshot inside the 7-day window; nothing on or before WEEK_AGO.
    const WITHIN_WINDOW = "2026-08-15"; // 3 days ago, after WEEK_AGO
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          { company_id: 31, snapshot_date: WITHIN_WINDOW, rotten_score: 55 },
          { company_id: 31, snapshot_date: NOW, rotten_score: 55 },
        ],
        [{ id: 31, name: "Truly New Co", slug: "truly-new-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    // No snapshot before WEEK_AGO → prev = 0, delta = 55 - 0 = 55
    // (the WITHIN_WINDOW row is not ≤ WEEK_AGO so it won't appear in the baseline query)
    expect(html).toContain("Truly New Co");
    expect(html).toContain("↑ +55.0");
  });

  it("uses a snapshot from 3 days ago as the current score when no snapshot exists today", async () => {
    // Company's most recent snapshot is 3 days ago (not today).
    // It should still appear as a mover using that snapshot as the current score.
    const THREE_DAYS_AGO = "2026-08-15";
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          { company_id: 40, snapshot_date: WEEK_AGO, rotten_score: 30 },
          { company_id: 40, snapshot_date: THREE_DAYS_AGO, rotten_score: 50 },
          // No snapshot on NOW (2026-08-18)
        ],
        [{ id: 40, name: "Stale Co", slug: "stale-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    // current score = 50 (3-days-ago snapshot), baseline = 30 (WEEK_AGO), delta = +20
    expect(html).toContain("Stale Co");
    expect(html).toContain("↑ +20.0");
  });

  it("uses today's snapshot as the current score when one exists", async () => {
    supabaseServerMock.mockResolvedValue(
      createMinimalMockSupabase(
        [
          { company_id: 41, snapshot_date: WEEK_AGO, rotten_score: 10 },
          { company_id: 41, snapshot_date: NOW, rotten_score: 45 },
        ],
        [{ id: 41, name: "Today Co", slug: "today-co" }],
      ),
    );

    const { default: HomePage } = await import("../app/page");
    const html = renderToStaticMarkup(await HomePage());

    // current score = 45 (today), baseline = 10 (WEEK_AGO), delta = +35
    expect(html).toContain("Today Co");
    expect(html).toContain("↑ +35.0");
  });
});
