import { describe, expect, it, vi } from "vitest";

// Mock @/lib/flavor-engine with an inline implementation so the @/ path alias
// doesn't need to be resolved by vitest (no path alias config in this environment).
vi.mock("@/lib/flavor-engine", () => ({
  getMacroTier: (score: number): string => {
    const clamped = Math.max(0, Math.min(100, score));
    if (clamped >= 95) return "Working for Satan";
    if (clamped >= 85) return "Working for the Empire from Star Wars";
    if (clamped >= 70) return "Corporate Disaster Zone";
    if (clamped >= 55) return "Ethics Sold Separately";
    if (clamped >= 40) return "Serious Rot Detected";
    if (clamped >= 25) return "Rotten Enough to Notice";
    if (clamped >= 10) return "Mildly Rotten";
    return "Mostly Decent";
  },
}));

import {
  buildOverviewTitle,
  buildBreakdownTitle,
  buildOverviewDescription,
  buildBreakdownDescription,
  buildSsrAnswer,
  roundScore,
} from "../lib/company-seo";

describe("roundScore", () => {
  it("rounds 47.4 to 47", () => expect(roundScore(47.4)).toBe(47));
  it("rounds 47.6 to 48", () => expect(roundScore(47.6)).toBe(48));
  it("returns 0 for null", () => expect(roundScore(null)).toBe(0));
  it("clamps below 0 to 0", () => expect(roundScore(-5)).toBe(0));
  it("clamps above 100 to 100", () => expect(roundScore(110)).toBe(100));
});

describe("buildOverviewTitle", () => {
  it("contains company name and score", () => {
    const t = buildOverviewTitle("Boeing", 47);
    expect(t).toContain("Boeing");
    expect(t).toContain("47");
  });

  it("preferred format for short name", () => {
    const t = buildOverviewTitle("Boeing", 47);
    expect(t).toBe("Boeing Rotten Score: 47/100 | Evidence & Misconduct");
  });

  it("uses ASCII | separator, not em-dash", () => {
    const t = buildOverviewTitle("Boeing", 47);
    expect(t).not.toMatch(/â|—|–/);
    expect(t).toContain("|");
  });

  it("title is at least 15 characters", () => {
    const t = buildOverviewTitle("A", 0);
    expect(t.length).toBeGreaterThanOrEqual(15);
  });

  it("short-name title is 70 chars or fewer", () => {
    const t = buildOverviewTitle("Boeing", 47);
    expect(t.length).toBeLessThanOrEqual(70);
  });

  it("uses compact fallback for long company name", () => {
    const longName = "A Very Long Corporation Name That Exceeds Typical Length";
    const t = buildOverviewTitle(longName, 80);
    expect(t.length).toBeLessThanOrEqual(70);
    // The title should at least start with the company name (may be truncated for very long names)
    expect(t.startsWith("A Very Long")).toBe(true);
  });

  it("contains /100 format", () => {
    const t = buildOverviewTitle("Acme", 33);
    expect(t).toContain("/100");
  });

  it("reflects updated score when score changes", () => {
    const t1 = buildOverviewTitle("Acme", 20);
    const t2 = buildOverviewTitle("Acme", 80);
    expect(t1).toContain("20");
    expect(t2).toContain("80");
    expect(t1).not.toBe(t2);
  });

  it("does not contain table artifact strings", () => {
    const t = buildOverviewTitle("Acme", 50);
    expect(t).not.toContain("Table_title:");
    expect(t).not.toContain("Table_content:");
    expect(t).not.toContain("| # | Company");
  });
});

describe("buildBreakdownTitle", () => {
  it("contains company name", () => {
    const t = buildBreakdownTitle("Boeing");
    expect(t).toContain("Boeing");
  });

  it("contains Rotten Score Breakdown", () => {
    const t = buildBreakdownTitle("Boeing");
    expect(t).toContain("Rotten Score Breakdown");
  });

  it("preferred format for short name", () => {
    const t = buildBreakdownTitle("Boeing");
    expect(t).toBe("Boeing Rotten Score Breakdown | Categories & Calculation");
  });

  it("uses compact fallback for long company name", () => {
    const longName = "A Very Long Corporation Name That Exceeds Typical Length";
    const t = buildBreakdownTitle(longName);
    expect(t.length).toBeLessThanOrEqual(70);
    // The title should at least start with the company name (may be truncated for very long names)
    expect(t.startsWith("A Very Long")).toBe(true);
  });

  it("still contains Rotten Score Breakdown or Rotten Breakdown in compact fallback", () => {
    const longName = "A Very Long Corporation Name That Exceeds Typical Length";
    const t = buildBreakdownTitle(longName);
    expect(t).toMatch(/Rotten.*Breakdown/);
  });
});

describe("buildOverviewDescription", () => {
  it("contains company name", () => {
    const d = buildOverviewDescription("Boeing", 47, 12);
    expect(d).toContain("Boeing");
  });

  it("contains the score", () => {
    const d = buildOverviewDescription("Boeing", 47, 12);
    expect(d).toContain("47");
  });

  it("contains evidence count", () => {
    const d = buildOverviewDescription("Boeing", 47, 12);
    expect(d).toContain("12");
  });

  it("uses plural 'records' for count > 1", () => {
    const d = buildOverviewDescription("Acme", 50, 5);
    expect(d).toContain("records");
    expect(d).not.toMatch(/\b1 documented evidence records\b/);
  });

  it("uses singular 'record' for count = 1", () => {
    const d = buildOverviewDescription("Acme", 50, 1);
    expect(d).toContain("1 documented evidence record");
    expect(d).not.toContain("records");
  });

  it("updates when score changes", () => {
    const d1 = buildOverviewDescription("Acme", 20, 5);
    const d2 = buildOverviewDescription("Acme", 80, 5);
    expect(d1).toContain("20");
    expect(d2).toContain("80");
    expect(d1).not.toBe(d2);
  });

  it("does not contain table artifact strings", () => {
    const d = buildOverviewDescription("Acme", 50, 3);
    expect(d).not.toContain("Table_title:");
    expect(d).not.toContain("Table_content:");
  });
});

describe("buildBreakdownDescription", () => {
  it("contains company name", () => {
    const d = buildBreakdownDescription("Boeing", 47);
    expect(d).toContain("Boeing");
  });

  it("contains the score", () => {
    const d = buildBreakdownDescription("Boeing", 47);
    expect(d).toContain("47");
  });

  it("is distinct from overview description", () => {
    const overview = buildOverviewDescription("Boeing", 47, 12);
    const breakdown = buildBreakdownDescription("Boeing", 47);
    expect(overview).not.toBe(breakdown);
  });

  it("contains 'calculated' or similar calculation language", () => {
    const d = buildBreakdownDescription("Boeing", 47);
    expect(d.toLowerCase()).toMatch(/calculat/);
  });
});

describe("buildSsrAnswer", () => {
  it("contains company name", () => {
    const a = buildSsrAnswer("Boeing", 47, 12);
    expect(a).toContain("Boeing");
  });

  it("contains the score", () => {
    const a = buildSsrAnswer("Boeing", 47, 12);
    expect(a).toContain("47");
  });

  it("contains /100", () => {
    const a = buildSsrAnswer("Boeing", 47, 12);
    expect(a).toContain("/100");
  });

  it("contains the status/classification", () => {
    const a = buildSsrAnswer("Boeing", 47, 12);
    // getMacroTier(47) = "Serious Rot Detected"
    expect(a).toContain("Serious Rot Detected");
  });

  it("contains evidence count", () => {
    const a = buildSsrAnswer("Boeing", 47, 12);
    expect(a).toContain("12");
  });

  it("uses singular 'record' for count = 1", () => {
    const a = buildSsrAnswer("Acme", 50, 1);
    expect(a).toContain("1 approved evidence record");
    expect(a).not.toContain("records");
  });

  it("uses plural 'records' for count > 1", () => {
    const a = buildSsrAnswer("Acme", 50, 5);
    expect(a).toContain("records");
  });

  it("updates when score changes (dynamic regression)", () => {
    const a1 = buildSsrAnswer("Acme", 20, 5);
    const a2 = buildSsrAnswer("Acme", 80, 5);
    expect(a1).toContain("20");
    expect(a2).toContain("80");
    expect(a1).not.toBe(a2);
  });
});
