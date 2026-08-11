/**
 * Tests for deriveSizeTierFromRange – the canonical range-based company-size
 * tier helper used by leader Rotten Score computation.
 */

import { describe, it, expect } from "vitest";
import {
  deriveSizeTierFromRange,
  SIZE_MULTIPLIERS,
  type CompanySizeTier,
} from "../lib/rotten-score";

describe("deriveSizeTierFromRange", () => {
  // ── canonical ranges ──────────────────────────────────────────────────────

  it("maps small canonical range '1-50' → micro (lower bound 1 ≤ 10)", () => {
    expect(deriveSizeTierFromRange("1-50")).toBe("micro");
  });

  it("maps a range with lower bound in small tier (e.g. '11-50' hypothetical) → small", () => {
    // Demonstrates the tier boundary: lower bound 11 ≤ 50 → small
    expect(deriveSizeTierFromRange("11-50")).toBe("small");
  });

  it("maps small canonical range '51-200' → medium", () => {
    expect(deriveSizeTierFromRange("51-200")).toBe("medium");
  });

  it("maps medium canonical range '201-500' → medium", () => {
    expect(deriveSizeTierFromRange("201-500")).toBe("medium");
  });

  it("maps large canonical range '501-1000' → large", () => {
    expect(deriveSizeTierFromRange("501-1000")).toBe("large");
  });

  it("maps large canonical range '1001-5000' → enterprise", () => {
    expect(deriveSizeTierFromRange("1001-5000")).toBe("enterprise");
  });

  it("maps large canonical range '10001-50000' → enterprise", () => {
    expect(deriveSizeTierFromRange("10001-50000")).toBe("enterprise");
  });

  it("maps '1000001+' → enterprise", () => {
    expect(deriveSizeTierFromRange("1000001+")).toBe("enterprise");
  });

  // ── null / missing ────────────────────────────────────────────────────────

  it("returns medium for null (neutral/default behaviour)", () => {
    expect(deriveSizeTierFromRange(null)).toBe("medium");
  });

  it("returns medium for undefined", () => {
    expect(deriveSizeTierFromRange(undefined)).toBe("medium");
  });

  it("returns medium for empty string", () => {
    expect(deriveSizeTierFromRange("")).toBe("medium");
  });

  // ── legacy stored value ───────────────────────────────────────────────────

  it("handles legacy '10000+' safely (lower bound 10000 → enterprise)", () => {
    const tier = deriveSizeTierFromRange("10000+");
    expect(tier).toBe("enterprise");
  });

  it("legacy '10000+' does not crash", () => {
    expect(() => deriveSizeTierFromRange("10000+")).not.toThrow();
  });

  // ── tier multiplier consistency ───────────────────────────────────────────

  it("small tier has multiplier < medium", () => {
    const smallM = SIZE_MULTIPLIERS[deriveSizeTierFromRange("1-50") as CompanySizeTier];
    const medM = SIZE_MULTIPLIERS[deriveSizeTierFromRange("51-200") as CompanySizeTier];
    expect(smallM).toBeLessThan(medM);
  });

  it("enterprise tier has the highest multiplier", () => {
    const entM = SIZE_MULTIPLIERS["enterprise"];
    const largeM = SIZE_MULTIPLIERS["large"];
    expect(entM).toBeGreaterThan(largeM);
  });
});
