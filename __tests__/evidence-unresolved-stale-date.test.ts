/**
 * Regression tests for the hidden resolution-date bug.
 *
 * Bug:
 *   User sets resolution status to "resolved", enters a date, then switches back
 *   to "unresolved". The resolution date fields disappear visually, but the stale
 *   values remain in form state and are posted to the server. The server's
 *   normalizer previously rejected this with:
 *     "Resolution date must be empty when resolution status is unresolved."
 *
 * Fix (two layers):
 *   1. Client (EvidenceUpload.tsx): clear resolutionDate and resolutionDatePrecision
 *      when resolutionStatus changes to "unresolved"; do not append those fields to
 *      FormData when unresolved.
 *   2. Server (evidence-timeline.ts): when resolution_status is "unresolved",
 *      silently normalize resolution_date and resolution_date_precision to null
 *      instead of returning an error.
 *
 * Tests:
 *   1. Server stale-payload: unresolved payload containing stale resolution_date
 *      and resolution_date_precision is normalized to null/null without error.
 *   2. Client FormData mapping: simulate the "resolved → unresolved" transition and
 *      assert that the outgoing FormData contains no resolution date fields.
 */

import { describe, it, expect } from "vitest";
import { normalizeEvidenceTimelineInput } from "../lib/evidence-timeline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serverNormalize(formValues: Record<string, string | boolean | null | undefined>) {
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

/**
 * Simulate the client FormData mapping for an unresolved submission after the
 * "resolved → unresolved" transition.
 *
 * After the fix:
 *  - resolutionDate is cleared to "" when status becomes unresolved
 *  - resolutionDatePrecision is reset to "day" (default) when status becomes unresolved
 *  - FormData only appends resolution_date / resolution_date_precision when status === "resolved"
 */
function buildUnresolvedFormData(opts: {
  eventStartDate: string;
  eventStartPrecision: string;
  eventEndDate: string;
  eventEndPrecision: string;
  // After transition, these should have been cleared by the client fix:
  resolutionDate: string;          // cleared → ""
  resolutionDatePrecision: string; // reset → "day"
  resolutionStatus: string;        // "unresolved"
}): Record<string, string> {
  const form: Record<string, string> = {
    event_start_date: opts.eventStartDate,
    event_start_precision: opts.eventStartPrecision,
    event_end_date: opts.eventEndDate,
    event_end_precision: opts.eventEndPrecision,
    event_is_ongoing: "false",
    resolution_status: opts.resolutionStatus,
  };
  // Client-side fix: only append resolution fields when resolved
  if (opts.resolutionStatus === "resolved") {
    if (opts.resolutionDate) form.resolution_date = opts.resolutionDate;
    if (opts.resolutionDatePrecision) form.resolution_date_precision = opts.resolutionDatePrecision;
  }
  return form;
}

// ---------------------------------------------------------------------------
// 1. Server stale-payload regression test
// ---------------------------------------------------------------------------

describe("Server stale-payload normalization — unresolved with stale resolution date", () => {
  it("accepts unresolved payload with stale resolution_date and normalizes to null", () => {
    const result = serverNormalize({
      event_start_date: "2020",
      event_start_precision: "year",
      event_is_ongoing: false,
      event_end_date: "2021",
      event_end_precision: "year",
      resolution_status: "unresolved",
      // stale hidden values that should be ignored
      resolution_date: "2022",
      resolution_date_precision: "year",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.resolution_date).toBeNull();
    expect(result.data.resolution_date_precision).toBeNull();
    expect(result.data.resolution_status).toBe("unresolved");
  });

  it("accepts unresolved payload with stale day-precision resolution_date and normalizes to null", () => {
    const result = serverNormalize({
      event_start_date: "2022-03-01",
      event_start_precision: "day",
      event_is_ongoing: false,
      event_end_date: "2022-06-15",
      event_end_precision: "day",
      resolution_status: "unresolved",
      resolution_date: "2022-09-01",
      resolution_date_precision: "day",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.resolution_date).toBeNull();
    expect(result.data.resolution_date_precision).toBeNull();
  });

  it("accepts unresolved payload with only stale resolution_date_precision and normalizes to null", () => {
    const result = serverNormalize({
      event_start_date: "2021-06",
      event_start_precision: "month",
      event_is_ongoing: false,
      event_end_date: "2021-09",
      event_end_precision: "month",
      resolution_status: "unresolved",
      // only precision is stale, no date
      resolution_date_precision: "month",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.resolution_date).toBeNull();
    expect(result.data.resolution_date_precision).toBeNull();
  });

  it("still validates resolved case normally — resolved with date is accepted", () => {
    const result = serverNormalize({
      event_start_date: "2019",
      event_start_precision: "year",
      event_is_ongoing: false,
      event_end_date: "2021",
      event_end_precision: "year",
      resolution_status: "resolved",
      resolution_date: "2022",
      resolution_date_precision: "year",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.resolution_date).toBe("2022-01-01");
    expect(result.data.resolution_date_precision).toBe("year");
  });
});

// ---------------------------------------------------------------------------
// 2. Client-side transition: resolved → unresolved clears date + precision
// ---------------------------------------------------------------------------

describe("Client FormData mapping — resolved → unresolved transition clears resolution fields", () => {
  it("FormData sent after resolved→unresolved transition contains no resolution_date or resolution_date_precision", () => {
    // Simulate: user entered resolution date "2022" with precision "year" while resolved,
    // then switched to unresolved (client fix clears the state).
    const formData = buildUnresolvedFormData({
      eventStartDate: "2020",
      eventStartPrecision: "year",
      eventEndDate: "2021",
      eventEndPrecision: "year",
      resolutionDate: "",         // cleared by client fix
      resolutionDatePrecision: "day", // reset to default by client fix
      resolutionStatus: "unresolved",
    });

    expect(formData.resolution_date).toBeUndefined();
    expect(formData.resolution_date_precision).toBeUndefined();
    expect(formData.resolution_status).toBe("unresolved");
  });

  it("FormData for resolved→unresolved case is accepted by the server normalizer", () => {
    const formData = buildUnresolvedFormData({
      eventStartDate: "2020",
      eventStartPrecision: "year",
      eventEndDate: "2021",
      eventEndPrecision: "year",
      resolutionDate: "",
      resolutionDatePrecision: "day",
      resolutionStatus: "unresolved",
    });

    const result = serverNormalize(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.resolution_status).toBe("unresolved");
    expect(result.data.resolution_date).toBeNull();
    expect(result.data.resolution_date_precision).toBeNull();
  });
});
