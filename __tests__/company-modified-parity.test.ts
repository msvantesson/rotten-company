import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/flavor-engine", () => ({
  getRottenFlavor: () => ({ microFlavor: "x", macroTier: "y" }),
  getCategoryFlavor: () => "z",
}));
vi.mock("@/lib/company-modified-at", async () => await import("../lib/company-modified-at"));

import { buildCompanyJsonLd } from "../lib/jsonld-company";
import { calculateCompanyModifiedAt } from "../lib/company-modified-at";

describe("company modified timestamp parity", () => {
  it("uses the same timestamp value for JSON-LD and sitemap lastModified", () => {
    const modifiedAt = calculateCompanyModifiedAt({
      companyUpdatedAt: "2026-01-01T00:00:00.000Z",
      approvedEvidenceUpdatedAt: "2026-02-01T12:34:56.000Z",
    });

    const jsonLd = buildCompanyJsonLd({
      company: {
        id: 1,
        name: "Boeing",
        slug: "boeing",
        updated_at: modifiedAt,
      },
      rottenScore: 42,
      breakdown: [],
    });

    const sitemapLastModifiedIso = modifiedAt ? new Date(modifiedAt).toISOString() : null;
    expect(jsonLd.dateModified).toBe(sitemapLastModifiedIso);
  });
});
