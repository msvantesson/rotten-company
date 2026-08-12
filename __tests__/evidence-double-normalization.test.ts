/**
 * Regression tests for the double-normalization bug.
 *
 * Production failure:
 *   User selects "Year" precision and enters "2022".
 *   EvidenceUpload.tsx (before the fix) was calling normalizeEvidenceTimelineInput()
 *   client-side, then appending the *already-normalized* value ("2022-01-01") to FormData.
 *   The server would then call normalizeEvidenceTimelineInput() again with:
 *     event_start_date: "2022-01-01"
 *     event_start_precision: "year"
 *   normalizeDateByPrecision("2022-01-01", "year") checks /^\d{4}$/ → fails → returns null
 *   → Server responds: "Event start date does not match the selected precision."
 *
 * Fix (commit 83c6ae1):
 *   EvidenceUpload.tsx now appends raw user values to FormData.
 *   The server remains the single authoritative normalization boundary.
 *
 * These tests verify both sides of the fix:
 *   1. normalizeEvidenceTimelineInput() correctly handles raw user inputs for all precisions.
 *   2. normalizeEvidenceTimelineInput() correctly rejects already-normalized values when the
 *      wrong precision is given (i.e., the old double-normalization path is now a detectable error).
 *   3. The full client→server flow works for year, month, and day precision.
 */

import { describe, expect, it } from "vitest";
import { normalizeEvidenceTimelineInput } from "../lib/evidence-timeline";

// ---------------------------------------------------------------------------
// Simulate what the server receives when EvidenceUpload.tsx sends RAW values
// (the correct behaviour after the fix).
// ---------------------------------------------------------------------------

/**
 * Simulate the server-side call to normalizeEvidenceTimelineInput() using the
 * values that FormData would carry after EvidenceUpload.tsx appends raw inputs.
 */
function serverNormalize(formValues: Record<string, string | boolean | null>) {
  return normalizeEvidenceTimelineInput({
    event_start_date: formValues.event_start_date as string | undefined,
    event_start_precision: formValues.event_start_precision as string | undefined,
    event_end_date: formValues.event_end_date as string | undefined,
    event_end_precision: formValues.event_end_precision as string | undefined,
    event_is_ongoing: formValues.event_is_ongoing,
    resolution_status: formValues.resolution_status as string | undefined,
    resolution_date: formValues.resolution_date as string | undefined,
    resolution_date_precision: formValues.resolution_date_precision as string | undefined,
  });
}

// ---------------------------------------------------------------------------
// REGRESSION: reproduce the exact production failure
// ---------------------------------------------------------------------------

describe("Double-normalization regression — production failure reproduction", () => {
  it("REGRESSION: server accepts raw year value '2022' and stores it as '2022-01-01'", () => {
    // User enters: precision=year, start=2022 (type="number" input sends "2022")
    // After the fix, FormData contains event_start_date="2022" (raw).
    const result = serverNormalize({
      event_start_date: "2022",
      event_start_precision: "year",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2022-01-01");
    expect(result.data.event_start_precision).toBe("year");
  });

  it("REGRESSION: server rejects already-normalized value '2022-01-01' sent with year precision (catches the old double-normalization path)", () => {
    // Before the fix, FormData would contain event_start_date="2022-01-01" (already normalized).
    // The server's normalizer must reject this so the bug is detectable.
    const result = serverNormalize({
      event_start_date: "2022-01-01", // This is the wrong value to send with "year" precision
      event_start_precision: "year",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/does not match the selected precision/i);
  });

  it("REGRESSION: server rejects already-normalized month '2022-06-01' sent with month precision", () => {
    // Before the fix, "2022-06" → normalized to "2022-06-01" → re-sent as "2022-06-01" + "month"
    const result = serverNormalize({
      event_start_date: "2022-06-01", // Should have been "2022-06"
      event_start_precision: "month",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/does not match the selected precision/i);
  });
});

// ---------------------------------------------------------------------------
// Year precision — raw input flows
// ---------------------------------------------------------------------------

describe("Server normalization — year precision (raw inputs)", () => {
  it("accepts year start + ongoing", () => {
    const result = serverNormalize({
      event_start_date: "2022",
      event_start_precision: "year",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2022-01-01");
    expect(result.data.event_is_ongoing).toBe(true);
    expect(result.data.event_end_date).toBeNull();
    expect(result.data.resolution_status).toBe("unresolved");
  });

  it("accepts year start + year end + resolved with year resolution", () => {
    const result = serverNormalize({
      event_start_date: "2019",
      event_start_precision: "year",
      event_is_ongoing: false,
      event_end_date: "2023",
      event_end_precision: "year",
      resolution_status: "resolved",
      resolution_date: "2024",
      resolution_date_precision: "year",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2019-01-01");
    expect(result.data.event_end_date).toBe("2023-01-01");
    expect(result.data.resolution_date).toBe("2024-01-01");
    expect(result.data.resolution_date_precision).toBe("year");
  });

  it("accepts year start + year end + unresolved", () => {
    const result = serverNormalize({
      event_start_date: "2020",
      event_start_precision: "year",
      event_is_ongoing: false,
      event_end_date: "2021",
      event_end_precision: "year",
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2020-01-01");
    expect(result.data.event_end_date).toBe("2021-01-01");
    expect(result.data.resolution_date).toBeNull();
  });

  it("rejects invalid year value", () => {
    const result = serverNormalize({
      event_start_date: "abcd",
      event_start_precision: "year",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Month precision — raw input flows
// ---------------------------------------------------------------------------

describe("Server normalization — month precision (raw inputs)", () => {
  it("accepts month start + ongoing", () => {
    const result = serverNormalize({
      event_start_date: "2022-06",
      event_start_precision: "month",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2022-06-01");
    expect(result.data.event_start_precision).toBe("month");
  });

  it("accepts month start + month end + resolved with month resolution", () => {
    const result = serverNormalize({
      event_start_date: "2021-03",
      event_start_precision: "month",
      event_is_ongoing: false,
      event_end_date: "2021-09",
      event_end_precision: "month",
      resolution_status: "resolved",
      resolution_date: "2022-01",
      resolution_date_precision: "month",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2021-03-01");
    expect(result.data.event_end_date).toBe("2021-09-01");
    expect(result.data.resolution_date).toBe("2022-01-01");
  });

  it("rejects malformed month value '2022-13'", () => {
    const result = serverNormalize({
      event_start_date: "2022-13",
      event_start_precision: "month",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Day precision — raw input flows
// ---------------------------------------------------------------------------

describe("Server normalization — day precision (raw inputs)", () => {
  it("accepts day start + ongoing", () => {
    const result = serverNormalize({
      event_start_date: "2023-07-15",
      event_start_precision: "day",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2023-07-15");
    expect(result.data.event_start_precision).toBe("day");
  });

  it("accepts day start + day end + resolved with day resolution", () => {
    const result = serverNormalize({
      event_start_date: "2023-01-10",
      event_start_precision: "day",
      event_is_ongoing: false,
      event_end_date: "2023-01-20",
      event_end_precision: "day",
      resolution_status: "resolved",
      resolution_date: "2023-02-01",
      resolution_date_precision: "day",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2023-01-10");
    expect(result.data.event_end_date).toBe("2023-01-20");
    expect(result.data.resolution_date).toBe("2023-02-01");
  });

  it("rejects invalid day '2023-02-30'", () => {
    const result = serverNormalize({
      event_start_date: "2023-02-30",
      event_start_precision: "day",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mixed precision — cross-precision combinations
// ---------------------------------------------------------------------------

describe("Server normalization — mixed precision combinations", () => {
  it("accepts year start + month end + resolved with day resolution", () => {
    const result = serverNormalize({
      event_start_date: "2018",
      event_start_precision: "year",
      event_is_ongoing: false,
      event_end_date: "2022-06",
      event_end_precision: "month",
      resolution_status: "resolved",
      resolution_date: "2022-09-15",
      resolution_date_precision: "day",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2018-01-01");
    expect(result.data.event_end_date).toBe("2022-06-01");
    expect(result.data.resolution_date).toBe("2022-09-15");
  });

  it("ongoing flag overrides end/resolution fields (server-side, pre-existing normalizer contract)", () => {
    // Pre-existing behavior of normalizeEvidenceTimelineInput(): when event_is_ongoing=true,
    // end date and resolution fields are unconditionally nulled out regardless of what the
    // client sends. This test confirms that contract is not broken by the raw-value change.
    // (Not a new behavior introduced by this PR — see evidence-timeline.test.ts for the
    // canonical normalizer tests.)
    const result = serverNormalize({
      event_start_date: "2020",
      event_start_precision: "year",
      event_is_ongoing: true,
      // These should be discarded by the normalizer
      event_end_date: "2021",
      event_end_precision: "year",
      resolution_status: "resolved",
      resolution_date: "2022",
      resolution_date_precision: "year",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_is_ongoing).toBe(true);
    expect(result.data.event_end_date).toBeNull();
    expect(result.data.resolution_status).toBe("unresolved");
    expect(result.data.resolution_date).toBeNull();
  });
});
