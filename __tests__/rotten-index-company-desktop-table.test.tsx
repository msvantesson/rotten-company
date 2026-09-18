import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/MacroTierBadge", () => ({
  default: ({ score }: { score: number }) => <span>Tier {score}</span>,
}));

describe("CompanyDesktopTable", () => {
  it("renders company desktop rows with links, score formatting, and status", async () => {
    const { default: CompanyDesktopTable } = await import("../app/rotten-index/CompanyDesktopTable");

    const html = renderToStaticMarkup(
      <CompanyDesktopTable
        tableId="rotten-index-table"
        sort="rotten_score"
        dir="desc"
        rows={[
          {
            id: 1,
            name: "Acme Corp",
            slug: "acme-corp",
            country: "Belgium",
            industry: "Finance",
            approved_evidence_count: 7,
            rotten_score: 42.5,
          },
          {
            id: 2,
            name: "No Score LLC",
            slug: "no-score-llc",
            country: null,
            industry: null,
            approved_evidence_count: 0,
            rotten_score: null,
          },
        ]}
      />,
    );

    expect(html).toContain('id="rotten-index-table"');
    expect(html).toContain("Acme Corp");
    expect(html).toContain('href="/company/acme-corp"');
    expect(html).toContain("42.50");
    expect(html).toContain("Tier 42.5");
    expect(html).toContain("No Score LLC");
    expect(html).toContain("Rotten Score");
    expect(html).toContain("▼");
    expect(html).toContain("text-[0.95rem] font-semibold text-accent");
    expect(html).toContain("w-[7.5rem] pl-3 pr-5 text-right");
    expect(html).toContain("w-[9rem] pl-3 pr-5 text-right");
    expect(html).toContain("text-[0.95rem] font-bold tabular-nums text-foreground");
    expect(html).toContain("min-w-[11rem] text-center");
  });

  it("updates the visible sort indicator for alternate sort field and direction", async () => {
    const { default: CompanyDesktopTable } = await import("../app/rotten-index/CompanyDesktopTable");

    const html = renderToStaticMarkup(
      <CompanyDesktopTable
        tableId="rotten-index-table"
        sort="name"
        dir="asc"
        rows={[
          {
            id: 1,
            name: "Acme Corp",
            slug: "acme-corp",
            country: "Belgium",
            industry: "Finance",
            approved_evidence_count: 7,
            rotten_score: 42.5,
          },
        ]}
      />,
    );

    expect(html).toContain("Name");
    expect(html).toContain("▲");
  });
});
