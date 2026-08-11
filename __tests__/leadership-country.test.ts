/**
 * Tests for leadership country derivation and filtering.
 *
 * The /leadership page must derive each leader's country from their
 * associated company's country field (not from the leader's own country).
 * Country filtering must also be based on the company country.
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Reproduce the country derivation + filtering logic from getRottenIndexData
// so it can be tested in isolation.
// ---------------------------------------------------------------------------

type Leader = { id: number; name: string; slug: string; country: string | null };
type Company = { id: number; name: string; slug: string; country: string | null };
type Tenure = { id: number; leader_id: number; started_at: string; ended_at: string | null; companies: Company | null };

function deriveLeaderCountry(leader: Leader, primaryCompany: Company | null): string | null {
  // Company country takes precedence; fall back to standalone leader country.
  return primaryCompany?.country ?? leader.country ?? null;
}

function filterByCountry<T extends { country: string | null }>(
  rows: T[],
  selectedCountry: string | null,
): T[] {
  if (!selectedCountry) return rows;
  return rows.filter((r) => r.country === selectedCountry);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Leadership country derivation", () => {
  it("uses company country when leader has an associated company", () => {
    const leader: Leader = { id: 1, name: "Mark Zuckerberg", slug: "mark-zuckerberg", country: null };
    const company: Company = { id: 10, name: "Meta", slug: "meta", country: "United States" };
    expect(deriveLeaderCountry(leader, company)).toBe("United States");
  });

  it("uses company country even if leader also has their own country", () => {
    const leader: Leader = { id: 2, name: "Test Leader", slug: "test-leader", country: "Bulgaria" };
    const company: Company = { id: 20, name: "Acme Corp", slug: "acme", country: "United Kingdom" };
    expect(deriveLeaderCountry(leader, company)).toBe("United Kingdom");
  });

  it("falls back to leader country for standalone leaders without a company", () => {
    const leader: Leader = { id: 3, name: "Standalone Leader", slug: "standalone", country: "Bulgaria" };
    expect(deriveLeaderCountry(leader, null)).toBe("Bulgaria");
  });

  it("returns null when neither company nor leader has country", () => {
    const leader: Leader = { id: 4, name: "Unknown", slug: "unknown", country: null };
    expect(deriveLeaderCountry(leader, null)).toBeNull();
  });

  it("derives Netherlands for JBS leader (Gilberto Tomazoni example)", () => {
    const leader: Leader = { id: 5, name: "Gilberto Tomazoni", slug: "gilberto-tomazoni", country: null };
    const company: Company = { id: 30, name: "JBS", slug: "jbs", country: "Netherlands" };
    expect(deriveLeaderCountry(leader, company)).toBe("Netherlands");
  });
});

describe("Leadership country filtering", () => {
  const rows = [
    { name: "Mark Zuckerberg", country: "United States" },
    { name: "Wael Sawan", country: "United Kingdom" },
    { name: "Gilberto Tomazoni", country: "Netherlands" },
    { name: "Demo Leader", country: "Bulgaria" },
    { name: "No Country Leader", country: null },
  ];

  it("returns all rows when no country is selected", () => {
    expect(filterByCountry(rows, null)).toHaveLength(5);
  });

  it("filters to United States only", () => {
    const result = filterByCountry(rows, "United States");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Mark Zuckerberg");
  });

  it("filters to United Kingdom only", () => {
    const result = filterByCountry(rows, "United Kingdom");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Wael Sawan");
  });

  it("excludes leaders with null country when a country is selected", () => {
    const result = filterByCountry(rows, "United States");
    const noCountryRow = result.find((r) => r.name === "No Country Leader");
    expect(noCountryRow).toBeUndefined();
  });

  it("country options derived from rows exclude null and deduplicate", () => {
    const options = Array.from(
      new Set(rows.map((r) => r.country).filter((c): c is string => c !== null))
    ).sort((a, b) => a.localeCompare(b));

    expect(options).toEqual(["Bulgaria", "Netherlands", "United Kingdom", "United States"]);
    expect(options).not.toContain(null);
  });
});
