/**
 * Tests for deriveSizeTierFromRange – the canonical range-based company-size
 * tier helper used by leader Rotten Score computation.
 *
 * Explicit mapping used:
 *   "1-50"           → small
 *   "51-200"         → medium
 *   "201-500"        → medium
 *   "501-1000"       → large
 *   "1001-5000"      → enterprise
 *   "5001-10000"     → enterprise
 *   "10001-50000"    → enterprise
 *   "50001-100000"   → enterprise
 *   "100001-250000"  → enterprise
 *   "250001-500000"  → enterprise
 *   "500001-1000000" → enterprise
 *   "1000001+"       → enterprise
 *   null / ""        → medium  (neutral default)
 *   "10000+"         → enterprise  (legacy backwards-compatible)
 *   unknown string   → medium  (safe neutral fallback)
 */

import { describe, it, expect } from "vitest";
import {
  deriveSizeTierFromRange,
  SIZE_MULTIPLIERS,
  type CompanySizeTier,
} from "../lib/rotten-score";

describe("deriveSizeTierFromRange", () => {
  // ── all 12 canonical ranges (explicit lookup) ─────────────────────────────

  it("'1-50' → small", () => {
    expect(deriveSizeTierFromRange("1-50")).toBe("small");
  });

  it("'51-200' → medium", () => {
    expect(deriveSizeTierFromRange("51-200")).toBe("medium");
  });

  it("'201-500' → medium", () => {
    expect(deriveSizeTierFromRange("201-500")).toBe("medium");
  });

  it("'501-1000' → large", () => {
    expect(deriveSizeTierFromRange("501-1000")).toBe("large");
  });

  it("'1001-5000' → enterprise", () => {
    expect(deriveSizeTierFromRange("1001-5000")).toBe("enterprise");
  });

  it("'5001-10000' → enterprise", () => {
    expect(deriveSizeTierFromRange("5001-10000")).toBe("enterprise");
  });

  it("'10001-50000' → enterprise", () => {
    expect(deriveSizeTierFromRange("10001-50000")).toBe("enterprise");
  });

  it("'50001-100000' → enterprise", () => {
    expect(deriveSizeTierFromRange("50001-100000")).toBe("enterprise");
  });

  it("'100001-250000' → enterprise", () => {
    expect(deriveSizeTierFromRange("100001-250000")).toBe("enterprise");
  });

  it("'250001-500000' → enterprise", () => {
    expect(deriveSizeTierFromRange("250001-500000")).toBe("enterprise");
  });

  it("'500001-1000000' → enterprise", () => {
    expect(deriveSizeTierFromRange("500001-1000000")).toBe("enterprise");
  });

  it("'1000001+' → enterprise", () => {
    expect(deriveSizeTierFromRange("1000001+")).toBe("enterprise");
  });

  // ── null / missing ────────────────────────────────────────────────────────

  it("null → medium (neutral default)", () => {
    expect(deriveSizeTierFromRange(null)).toBe("medium");
  });

  it("undefined → medium (neutral default)", () => {
    expect(deriveSizeTierFromRange(undefined)).toBe("medium");
  });

  it("empty string → medium (neutral default)", () => {
    expect(deriveSizeTierFromRange("")).toBe("medium");
  });

  // ── legacy stored value ───────────────────────────────────────────────────

  it("legacy '10000+' → enterprise (backwards-compatible)", () => {
    expect(deriveSizeTierFromRange("10000+")).toBe("enterprise");
  });

  it("legacy '10000+' does not crash", () => {
    expect(() => deriveSizeTierFromRange("10000+")).not.toThrow();
  });

  // ── unknown / future / bad data → neutral medium (no score inflation) ─────

  it("unknown range 'future-range' → medium (neutral fallback, no inflation)", () => {
    expect(deriveSizeTierFromRange("future-range")).toBe("medium");
  });

  it("garbage string 'abc' → medium (neutral fallback)", () => {
    expect(deriveSizeTierFromRange("abc")).toBe("medium");
  });

  // ── tier multiplier consistency ───────────────────────────────────────────

  it("small tier ('1-50') has multiplier < medium ('51-200')", () => {
    const smallM = SIZE_MULTIPLIERS[deriveSizeTierFromRange("1-50") as CompanySizeTier];
    const medM = SIZE_MULTIPLIERS[deriveSizeTierFromRange("51-200") as CompanySizeTier];
    expect(smallM).toBeLessThan(medM);
  });

  it("large tier ('501-1000') has multiplier < enterprise ('1001-5000')", () => {
    const largeM = SIZE_MULTIPLIERS[deriveSizeTierFromRange("501-1000") as CompanySizeTier];
    const entM = SIZE_MULTIPLIERS[deriveSizeTierFromRange("1001-5000") as CompanySizeTier];
    expect(largeM).toBeLessThan(entM);
  });
});
