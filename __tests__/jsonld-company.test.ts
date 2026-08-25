import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/flavor-engine", () => ({
  getRottenFlavor: (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    let macroTier: string;
    if (clamped >= 70) macroTier = "Corporate Disaster Zone";
    else if (clamped >= 40) macroTier = "Serious Rot Detected";
    else macroTier = "Mostly Decent";
    return { microFlavor: `Score is ${clamped}`, macroTier };
  },
  getCategoryFlavor: (id: number) => `flavor-${id}`,
}));

vi.mock("@/lib/company-modified-at", async () => await import("../lib/company-modified-at"));

import { buildCompanyJsonLd } from "../lib/jsonld-company";

const baseCompany = {
  id: 1,
  name: "Acme Corp",
  slug: "acme-corp",
  industry: "Manufacturing",
  updated_at: "2024-01-01T00:00:00Z",
};

const baseBreakdown = [
  {
    category_id: 1,
    category_name: "Safety",
    rating_count: 5,
    avg_rating_score: 3.5,
    evidence_count: 3,
    severity_score: 2.0,
    final_score: 40,
    misconduct_low_count: 1,
    misconduct_medium_count: 1,
    misconduct_high_count: 0,
    remediation_low_count: 0,
    remediation_medium_count: 1,
    remediation_high_count: 0,
  },
  {
    category_id: 2,
    category_name: "Environment",
    rating_count: 2,
    avg_rating_score: 4.0,
    evidence_count: 7,
    severity_score: 1.5,
    final_score: 30,
    misconduct_low_count: 2,
    misconduct_medium_count: 3,
    misconduct_high_count: 1,
    remediation_low_count: 1,
    remediation_medium_count: 0,
    remediation_high_count: 0,
  },
];

describe("buildCompanyJsonLd – Organization JSON-LD", () => {
  it("returns an Organization type", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    expect(ld["@type"]).toBe("Organization");
    expect(ld["@context"]).toBe("https://schema.org");
  });

  it("includes the company name", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    expect(ld.name).toBe("Acme Corp");
  });

  it("canonical URL contains the slug", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    expect(ld.url).toBe("https://rotten-company.com/company/acme-corp");
  });

  it("canonical URL changes when slug changes", () => {
    const ld = buildCompanyJsonLd({
      company: { ...baseCompany, slug: "other-corp" },
      rottenScore: 50,
      breakdown: baseBreakdown,
    });
    expect(ld.url).toBe("https://rotten-company.com/company/other-corp");
  });

  it("preserves dateModified", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    expect(ld.dateModified).toBe("2024-01-01T00:00:00.000Z");
  });

  it("omits invalid dateModified safely", () => {
    const ld = buildCompanyJsonLd({
      company: { ...baseCompany, updated_at: "not-a-date" },
      rottenScore: 50,
      breakdown: baseBreakdown,
    });
    expect(ld.dateModified).toBeUndefined();
  });

  it("preserves description", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    expect(typeof ld.description).toBe("string");
    expect(ld.description.length).toBeGreaterThan(0);
  });
});

describe("buildCompanyJsonLd – Rotten Score as PropertyValue", () => {
  it("additionalProperty is an array", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    expect(Array.isArray(ld.additionalProperty)).toBe(true);
  });

  it("Rotten Score entry uses PropertyValue with minValue 0 and maxValue 100", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const scoreEntry = ld.additionalProperty.find(
      (p: { name: string }) => p.name === "Rotten Score"
    ) as { "@type": string; name: string; value: number; minValue: number; maxValue: number; unitText: string } | undefined;
    expect(scoreEntry).toBeDefined();
    expect(scoreEntry!["@type"]).toBe("PropertyValue");
    expect(scoreEntry!.minValue).toBe(0);
    expect(scoreEntry!.maxValue).toBe(100);
    expect(scoreEntry!.unitText).toBe("points");
  });

  it("Rotten Score value reflects dynamic input score", () => {
    const ld1 = buildCompanyJsonLd({ company: baseCompany, rottenScore: 20, breakdown: baseBreakdown });
    const ld2 = buildCompanyJsonLd({ company: baseCompany, rottenScore: 80, breakdown: baseBreakdown });
    const score1 = ld1.additionalProperty.find((p: { name: string }) => p.name === "Rotten Score") as { value: number };
    const score2 = ld2.additionalProperty.find((p: { name: string }) => p.name === "Rotten Score") as { value: number };
    expect(score1.value).toBe(20);
    expect(score2.value).toBe(80);
  });

  it("Rotten Status is a PropertyValue with dynamic value", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 75, breakdown: baseBreakdown });
    const statusEntry = ld.additionalProperty.find(
      (p: { name: string }) => p.name === "Rotten Status"
    ) as { "@type": string; value: string } | undefined;
    expect(statusEntry).toBeDefined();
    expect(statusEntry!["@type"]).toBe("PropertyValue");
    expect(typeof statusEntry!.value).toBe("string");
    expect(statusEntry!.value.length).toBeGreaterThan(0);
  });

  it("Rotten Status value changes when score changes", () => {
    const ld1 = buildCompanyJsonLd({ company: baseCompany, rottenScore: 10, breakdown: baseBreakdown });
    const ld2 = buildCompanyJsonLd({ company: baseCompany, rottenScore: 90, breakdown: baseBreakdown });
    const s1 = ld1.additionalProperty.find((p: { name: string }) => p.name === "Rotten Status") as { value: string };
    const s2 = ld2.additionalProperty.find((p: { name: string }) => p.name === "Rotten Status") as { value: string };
    expect(s1.value).not.toBe(s2.value);
  });

  it("Approved Evidence Records is a PropertyValue", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const evidenceEntry = ld.additionalProperty.find(
      (p: { name: string }) => p.name === "Approved Evidence Records"
    ) as { "@type": string; value: number } | undefined;
    expect(evidenceEntry).toBeDefined();
    expect(evidenceEntry!["@type"]).toBe("PropertyValue");
    // baseBreakdown has evidence_count 3 + 7 = 10
    expect(evidenceEntry!.value).toBe(10);
  });

  it("Approved Evidence Records value changes when breakdown changes", () => {
    const ld1 = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const ld2 = buildCompanyJsonLd({
      company: baseCompany,
      rottenScore: 50,
      breakdown: [{ ...baseBreakdown[0], evidence_count: 20 }, baseBreakdown[1]],
    });
    const e1 = ld1.additionalProperty.find((p: { name: string }) => p.name === "Approved Evidence Records") as { value: number };
    const e2 = ld2.additionalProperty.find((p: { name: string }) => p.name === "Approved Evidence Records") as { value: number };
    expect(e1.value).toBe(10);
    expect(e2.value).toBe(27);
  });
});

describe("buildCompanyJsonLd – AggregateRating absent", () => {
  it("JSON string does not contain AggregateRating schema type", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const json = JSON.stringify(ld);
    expect(json).not.toContain("AggregateRating");
  });

  it("JSON string does not contain ratingValue", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const json = JSON.stringify(ld);
    expect(json).not.toContain("ratingValue");
  });

  it("does not have top-level aggregateRating property", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    // Verify both the property is undefined and a deep check for nested presence
    const topLevel = ld as Record<string, unknown>;
    expect(topLevel.aggregateRating).toBeUndefined();
    expect(JSON.stringify(ld)).not.toContain("AggregateRating");
  });

  it("JSON string does not contain reviewCount", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const json = JSON.stringify(ld);
    expect(json).not.toContain("reviewCount");
  });

  it("JSON string does not contain Review type", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const json = JSON.stringify(ld);
    expect(json).not.toContain('"Review"');
  });

  it("JSON string does not contain Rating type (standalone)", () => {
    const ld = buildCompanyJsonLd({ company: baseCompany, rottenScore: 50, breakdown: baseBreakdown });
    const json = JSON.stringify(ld);
    // Should not contain standalone "Rating" type (AggregateRating is already checked above)
    expect(json).not.toMatch(/"@type"\s*:\s*"Rating"/);
  });
});
