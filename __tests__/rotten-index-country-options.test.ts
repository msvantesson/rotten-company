/**
 * Tests for Rotten Index country-option building.
 *
 * These tests document and guard the fix that ensures the Country dropdown on
 * the Rotten Index page always derives its options from the **complete**
 * company dataset, independent of the current page subset or pagination limit.
 *
 * Regression: after old test companies were deleted, Italy, Spain and Portugal
 * disappeared from the dropdown even though real companies for those countries
 * remained in the database.  The fix fetches countries from the full dataset
 * and builds the option list with buildCountryOptions().
 */

import { describe, it, expect } from "vitest";
import { buildCountryOptions, normalizeCountryOption } from "../lib/buildCountryOptions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CompanyRow = { country: string | null | undefined };

function makeRows(countries: (string | null | undefined)[]): CompanyRow[] {
  return countries.map((country) => ({ country }));
}

// ---------------------------------------------------------------------------
// normalizeCountryOption
// ---------------------------------------------------------------------------

describe("normalizeCountryOption", () => {
  it("returns a trimmed string for normal input", () => {
    expect(normalizeCountryOption("Italy")).toBe("Italy");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeCountryOption("  Spain  ")).toBe("Spain");
  });

  it("returns null for null", () => {
    expect(normalizeCountryOption(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeCountryOption(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(normalizeCountryOption("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(normalizeCountryOption("   ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildCountryOptions – core regression tests
// ---------------------------------------------------------------------------

describe("buildCountryOptions – regression: Italy, Spain, Portugal must appear", () => {
  const allCompanies = makeRows([
    "United States",
    "Italy",
    "Spain",
    "Portugal",
    "United Kingdom",
    "Germany",
  ]);

  it("includes Italy", () => {
    expect(buildCountryOptions(allCompanies)).toContain("Italy");
  });

  it("includes Spain", () => {
    expect(buildCountryOptions(allCompanies)).toContain("Spain");
  });

  it("includes Portugal", () => {
    expect(buildCountryOptions(allCompanies)).toContain("Portugal");
  });
});

// ---------------------------------------------------------------------------
// buildCountryOptions – option-building rules
// ---------------------------------------------------------------------------

describe("buildCountryOptions – option-building rules", () => {
  it("returns options sorted alphabetically", () => {
    const rows = makeRows(["United States", "Germany", "Australia", "Brazil"]);
    const options = buildCountryOptions(rows);
    expect(options).toEqual(["Australia", "Brazil", "Germany", "United States"]);
  });

  it("deduplicates countries", () => {
    const rows = makeRows(["Italy", "Italy", "Italy", "Spain", "Spain"]);
    const options = buildCountryOptions(rows);
    expect(options.filter((c) => c === "Italy")).toHaveLength(1);
    expect(options.filter((c) => c === "Spain")).toHaveLength(1);
    expect(options).toHaveLength(2);
  });

  it("excludes null values", () => {
    const rows = makeRows(["Italy", null, "Spain"]);
    expect(buildCountryOptions(rows)).not.toContain(null);
  });

  it("excludes undefined values", () => {
    const rows = makeRows(["Italy", undefined, "Spain"]);
    const options = buildCountryOptions(rows);
    expect(options.every((c) => typeof c === "string")).toBe(true);
  });

  it("excludes blank/whitespace-only values", () => {
    const rows = makeRows(["Italy", "   ", "", "Spain"]);
    const options = buildCountryOptions(rows);
    expect(options).not.toContain("");
    expect(options).not.toContain("   ");
    expect(options).toHaveLength(2);
  });

  it("trims whitespace from country values before deduplication", () => {
    const rows = makeRows(["  Italy  ", "Italy", " Italy"]);
    const options = buildCountryOptions(rows);
    expect(options).toEqual(["Italy"]);
  });

  it("returns an empty array when all countries are null/blank", () => {
    const rows = makeRows([null, "", "   ", undefined]);
    expect(buildCountryOptions(rows)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildCountryOptions – pagination independence
// ---------------------------------------------------------------------------

describe("buildCountryOptions – pagination independence", () => {
  /**
   * Simulate the regression: a top-N subset (e.g. the first page of 10)
   * does NOT contain Italy/Spain/Portugal, but the full dataset does.
   * Country options must come from the full dataset, not the page subset.
   */

  const fullDataset = makeRows([
    // Top page – high-scoring companies from other countries
    "United States",
    "United Kingdom",
    "Germany",
    "France",
    "Netherlands",
    "Belgium",
    "Denmark",
    "Sweden",
    "Norway",
    "Finland",
    // Further results – the countries that disappeared in the regression
    "Italy",
    "Spain",
    "Portugal",
  ]);

  const pageSubset = fullDataset.slice(0, 10); // only top-10

  it("page subset (top 10) does NOT contain Italy, Spain, Portugal", () => {
    const options = buildCountryOptions(pageSubset);
    expect(options).not.toContain("Italy");
    expect(options).not.toContain("Spain");
    expect(options).not.toContain("Portugal");
  });

  it("full dataset DOES contain Italy, Spain, Portugal", () => {
    const options = buildCountryOptions(fullDataset);
    expect(options).toContain("Italy");
    expect(options).toContain("Spain");
    expect(options).toContain("Portugal");
  });

  it("using the full dataset instead of the page subset fixes the regression", () => {
    const fromFull = buildCountryOptions(fullDataset);
    const fromPage = buildCountryOptions(pageSubset);

    // The fix: always pass the full dataset
    expect(fromFull).toContain("Italy");
    expect(fromFull).toContain("Spain");
    expect(fromFull).toContain("Portugal");

    // Confirm the bug was real
    expect(fromPage).not.toContain("Italy");
    expect(fromPage).not.toContain("Spain");
    expect(fromPage).not.toContain("Portugal");
  });
});

// ---------------------------------------------------------------------------
// buildCountryOptions – countries with zero Rotten Score
// ---------------------------------------------------------------------------

describe("buildCountryOptions – zero rotten score companies", () => {
  /**
   * The country dropdown must not depend on rotten_score at all.
   * Companies with rotten_score === 0 (or null) must still contribute
   * their country to the dropdown.
   */

  type CompanyWithScore = { country: string | null; rotten_score: number | null };

  function buildCountryOptionsFromScored(rows: CompanyWithScore[]): string[] {
    // This mirrors the page: pass the raw rows to buildCountryOptions
    // WITHOUT pre-filtering on rotten_score.
    return buildCountryOptions(rows);
  }

  const companies: CompanyWithScore[] = [
    { country: "United States", rotten_score: 85.0 },
    { country: "Italy", rotten_score: 0 },
    { country: "Spain", rotten_score: 0 },
    { country: "Portugal", rotten_score: null },
  ];

  it("Italy appears even with rotten_score === 0", () => {
    expect(buildCountryOptionsFromScored(companies)).toContain("Italy");
  });

  it("Spain appears even with rotten_score === 0", () => {
    expect(buildCountryOptionsFromScored(companies)).toContain("Spain");
  });

  it("Portugal appears even with rotten_score === null", () => {
    expect(buildCountryOptionsFromScored(companies)).toContain("Portugal");
  });
});

// ---------------------------------------------------------------------------
// "All countries" default is the caller's responsibility (page.tsx)
// ---------------------------------------------------------------------------

describe("buildCountryOptions – All countries default", () => {
  it("does NOT include an empty-string sentinel for All countries", () => {
    const rows = makeRows(["Germany", "Italy"]);
    const options = buildCountryOptions(rows);
    // The page renders <option value="">All countries</option> separately;
    // buildCountryOptions must not add it to avoid duplication.
    expect(options).not.toContain("");
  });

  it("a caller prepending the default produces All countries as first entry", () => {
    const rows = makeRows(["Germany", "Italy"]);
    const withDefault = ["", ...buildCountryOptions(rows)];
    expect(withDefault[0]).toBe("");
    // Verify the rest are the country options in alphabetical order
    expect(withDefault.slice(1)).toEqual(["Germany", "Italy"]);
  });
});

// ---------------------------------------------------------------------------
// fetchAllCompanyCountries logic – mirrors getRottenIndexData's new source
// ---------------------------------------------------------------------------

describe("fetchAllCompanyCountries logic (mirrors getRottenIndexData's companies-table query)", () => {
  /**
   * The root cause of the regression:
   *
   * Previously the dropdown was built from `global_rotten_index`, a Supabase
   * view that only contains companies with at least one piece of approved
   * evidence and a non-null rotten_score.
   *
   * Italy / Spain / Portugal companies had rotten_score 0 and no evidence, so
   * they were absent from the view → absent from the dropdown.
   *
   * The fix: fetch all distinct countries directly from `public.companies`,
   * which holds every company regardless of evidence or score.
   *
   * These tests exercise that exact logic in isolation so we can guard the
   * contract without a live database.
   */

  /**
   * Replicate the fetchAllCompanyCountries logic from getRottenIndexData.ts
   * so it can be unit-tested without Supabase.
   */
  function simulateFetchAllCompanyCountries(
    companiesTableRows: Array<{ country: string | null }>,
  ): string[] {
    return Array.from(
      new Set(
        companiesTableRows
          .map((row) => row.country?.trim())
          .filter((c): c is string => Boolean(c)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }

  // -------------------------------------------------------------------------
  // Regression scenario: zero-score, zero-evidence companies
  // -------------------------------------------------------------------------

  const companiesTable: Array<{ country: string | null; rotten_score: number | null; approved_evidence_count: number }> = [
    // high-scoring companies present in global_rotten_index
    { country: "United States", rotten_score: 90, approved_evidence_count: 15 },
    { country: "United Kingdom", rotten_score: 85, approved_evidence_count: 12 },
    { country: "Germany",        rotten_score: 70, approved_evidence_count: 8  },
    { country: "France",         rotten_score: 65, approved_evidence_count: 6  },
    // regression countries – rotten_score 0, no evidence → NOT in global_rotten_index
    { country: "Italy",          rotten_score: 0,  approved_evidence_count: 0  },
    { country: "Spain",          rotten_score: 0,  approved_evidence_count: 0  },
    { country: "Portugal",       rotten_score: 0,  approved_evidence_count: 0  },
  ];

  // What global_rotten_index (the old source) would return
  const globalRottenIndexRows = companiesTable.filter(
    (c) => c.rotten_score != null && c.rotten_score > 0 && c.approved_evidence_count > 0,
  );

  it("global_rotten_index (old source) does NOT contain Italy", () => {
    const options = buildCountryOptions(globalRottenIndexRows);
    expect(options).not.toContain("Italy");
  });

  it("global_rotten_index (old source) does NOT contain Spain", () => {
    const options = buildCountryOptions(globalRottenIndexRows);
    expect(options).not.toContain("Spain");
  });

  it("global_rotten_index (old source) does NOT contain Portugal", () => {
    const options = buildCountryOptions(globalRottenIndexRows);
    expect(options).not.toContain("Portugal");
  });

  it("companies table (new source) DOES contain Italy", () => {
    expect(simulateFetchAllCompanyCountries(companiesTable)).toContain("Italy");
  });

  it("companies table (new source) DOES contain Spain", () => {
    expect(simulateFetchAllCompanyCountries(companiesTable)).toContain("Spain");
  });

  it("companies table (new source) DOES contain Portugal", () => {
    expect(simulateFetchAllCompanyCountries(companiesTable)).toContain("Portugal");
  });

  it("companies-table source includes all countries regardless of rotten_score", () => {
    const options = simulateFetchAllCompanyCountries(companiesTable);
    expect(options).toContain("United States");
    expect(options).toContain("Italy");
    expect(options).toContain("Spain");
    expect(options).toContain("Portugal");
  });

  // -------------------------------------------------------------------------
  // A country absent from the current Top 10 still appears
  // -------------------------------------------------------------------------

  it("a country not in the Top 10 table still appears in the dropdown", () => {
    const top10 = companiesTable.slice(0, 4); // only United States, UK, Germany, France
    const allCountriesSource = companiesTable; // full companies table

    const dropdownFromTop10 = buildCountryOptions(top10);
    const dropdownFromAll   = simulateFetchAllCompanyCountries(allCountriesSource);

    expect(dropdownFromTop10).not.toContain("Italy");
    expect(dropdownFromAll).toContain("Italy");
    expect(dropdownFromAll).toContain("Spain");
    expect(dropdownFromAll).toContain("Portugal");
  });

  // -------------------------------------------------------------------------
  // Option-building rules still apply to the companies-table source
  // -------------------------------------------------------------------------

  it("deduplicates when companies table has multiple rows per country", () => {
    const rows = [
      { country: "Italy" },
      { country: "Italy" },
      { country: "Spain" },
    ];
    const options = simulateFetchAllCompanyCountries(rows);
    expect(options.filter((c) => c === "Italy")).toHaveLength(1);
  });

  it("excludes null country rows", () => {
    const rows = [{ country: "Italy" }, { country: null }, { country: "Spain" }];
    const options = simulateFetchAllCompanyCountries(rows);
    expect(options).not.toContain(null);
    expect(options.every(Boolean)).toBe(true);
  });

  it("excludes blank/whitespace country values", () => {
    const rows = [{ country: "Italy" }, { country: "   " }, { country: "" }, { country: "Spain" }];
    const options = simulateFetchAllCompanyCountries(rows);
    expect(options).not.toContain("");
    expect(options).not.toContain("   ");
  });

  it("trims whitespace and then deduplicates", () => {
    const rows = [{ country: "  Italy  " }, { country: "Italy" }];
    const options = simulateFetchAllCompanyCountries(rows);
    expect(options).toEqual(["Italy"]);
  });

  it("sorts the resulting list alphabetically", () => {
    const rows = [
      { country: "Spain" },
      { country: "Italy" },
      { country: "Portugal" },
      { country: "Germany" },
    ];
    const options = simulateFetchAllCompanyCountries(rows);
    expect(options).toEqual(["Germany", "Italy", "Portugal", "Spain"]);
  });

  it('"All countries" is not injected by the countries source', () => {
    const rows = [{ country: "Italy" }];
    const options = simulateFetchAllCompanyCountries(rows);
    expect(options).not.toContain("");
    // The page renders <option value="">All countries</option> separately
    const withDefault = ["", ...options];
    expect(withDefault[0]).toBe("");
  });
});
