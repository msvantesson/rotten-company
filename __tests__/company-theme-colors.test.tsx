import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/flavor-engine", () => ({
  getCategoryFlavor: () => "Documented impact",
  getRottenFlavor: (score: number) => ({
    score,
    roundedScore: score,
    macroTier: "Test tier",
    microFlavor: "Test description",
  }),
}));

vi.mock("@/lib/category-help", () => ({
  getCategoryHelp: () => null,
}));

describe("company page theme colors", () => {
  it("uses theme-aware colors in the category breakdown", async () => {
    const { CategoryBreakdown } = await import("../components/CategoryBreakdown");
    const html = renderToStaticMarkup(
      <CategoryBreakdown
        company={{ name: "Acme" }}
        breakdown={[
          {
            category_id: 1,
            category_name: "Misconduct",
            rating_count: 1,
            avg_rating_score: 3,
            evidence_count: 1,
            severity_score: 10,
            final_score: 10,
            misconduct_low_count: 1,
            misconduct_medium_count: 0,
            misconduct_high_count: 0,
            remediation_low_count: 1,
            remediation_medium_count: 0,
            remediation_high_count: 0,
          },
        ]}
        evidence={[
          {
            id: 1,
            title: "Evidence",
            summary: "Summary",
            category: { name: "Misconduct" },
            manager: { name: "Manager", report_count: 1 },
          },
        ]}
      />,
    );

    expect(html).toContain("text-muted-foreground");
    expect(html).toContain("bg-muted");
    expect(html).toContain("border-border");
    expect(html).toContain("text-red-700 dark:text-red-400");
    expect(html).toContain("text-green-700 dark:text-green-400");
  });

  it("uses theme-aware dialog, link, and focus colors in category help", async () => {
    const { default: CategoryInfoPopover } = await import("../components/CategoryInfoPopover");
    const html = renderToStaticMarkup(
      <CategoryInfoPopover categoryName="Misconduct" categorySlug="misconduct" description={null} />,
    );

    expect(html).toContain("bg-surface");
    expect(html).toContain("text-foreground");
    expect(html).toContain("text-muted-foreground");
    expect(html).toContain("text-accent");
    expect(html).toContain("focus-visible:ring-ring");
  });

  it("uses theme-aware colors in the company score meter", async () => {
    const { default: RottenScoreMeter } = await import("../components/RottenScoreMeter");
    const html = renderToStaticMarkup(<RottenScoreMeter score={42} />);

    expect(html).toContain("text-muted-foreground");
    expect(html).toContain("bg-muted");
    expect(html).toContain("text-foreground");
  });
});
