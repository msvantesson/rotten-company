import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const getRottenIndexDataMock = vi.fn();

vi.mock("@/lib/getRottenIndexData", () => ({
  getRottenIndexData: getRottenIndexDataMock,
}));

vi.mock("@/lib/seo", () => ({
  canonicalUrl: (path: string) => `https://example.test${path}`,
  buildBreadcrumbJsonLd: (items: unknown[]) => ({ items }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/MacroTierBadge", () => ({
  default: () => <span>Tier</span>,
}));

vi.mock("@/components/JsonLdDebugPanel", () => ({
  default: () => null,
}));

vi.mock("../app/rotten-index/ExportCsvButton", () => ({
  default: () => null,
}));

vi.mock("../app/rotten-index/CompanyCardList", () => ({
  default: () => null,
}));

vi.mock("../app/rotten-index/FindCompanyInline", () => ({
  default: () => null,
}));

describe("RottenIndexPage query flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRottenIndexDataMock.mockResolvedValue({ rows: [], countries: ["Belgium"] });
  });

  it("passes type/country/limit/q/sort/dir from searchParams into getRottenIndexData", async () => {
    const { default: RottenIndexPage } = await import("../app/rotten-index/page");

    const html = renderToStaticMarkup(
      await RottenIndexPage({
        searchParams: {
          type: "company",
          country: "Belgium",
          limit: "10",
          q: "bank",
          sort: "name",
          dir: "asc",
        },
      }),
    );

    expect(html).toContain("Rotten Index");
    expect(getRottenIndexDataMock).toHaveBeenCalledTimes(1);
    expect(getRottenIndexDataMock).toHaveBeenCalledWith({
      type: "company",
      country: "Belgium",
      limit: 10,
      q: "bank",
      sort: "name",
      dir: "asc",
    });
  });
});
