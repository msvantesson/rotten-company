import { describe, expect, it } from "vitest";
import {
  formatEvidenceTimeline,
  formatTimelineDate,
  normalizeEvidenceTimelineInput,
} from "../lib/evidence-timeline";
import { buildResubmittedEvidenceInsertPayload } from "../lib/build-resubmitted-evidence";

describe("evidence timeline validation", () => {
  it("accepts resolved single-day event", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2025-07-03",
      event_start_precision: "day",
      event_is_ongoing: false,
      event_end_date: "2025-07-03",
      event_end_precision: "day",
      resolution_status: "resolved",
      resolution_date: "2025-07-10",
      resolution_date_precision: "day",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts resolved multi-year event", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2017",
      event_start_precision: "year",
      event_is_ongoing: false,
      event_end_date: "2020",
      event_end_precision: "year",
      resolution_status: "resolved",
      resolution_date: "2025-07",
      resolution_date_precision: "month",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.event_start_date).toBe("2017-01-01");
    expect(result.data.event_end_date).toBe("2020-01-01");
    expect(result.data.resolution_date).toBe("2025-07-01");
  });

  it("ongoing auto-submits unresolved with null end and resolution fields", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2024",
      event_start_precision: "year",
      event_is_ongoing: true,
      event_end_date: "2024-06-30",
      event_end_precision: "day",
      resolution_status: "resolved",
      resolution_date: "2025-01-01",
      resolution_date_precision: "day",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.resolution_status).toBe("unresolved");
    expect(result.data.event_end_date).toBeNull();
    expect(result.data.event_end_precision).toBeNull();
    expect(result.data.resolution_date).toBeNull();
    expect(result.data.resolution_date_precision).toBeNull();
  });

  it("accepts ended conduct + unresolved case", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2024-01",
      event_start_precision: "month",
      event_is_ongoing: false,
      event_end_date: "2024-03",
      event_end_precision: "month",
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing start", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_precision: "day",
      event_is_ongoing: true,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects missing end when not ongoing", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2024-01",
      event_start_precision: "month",
      event_is_ongoing: false,
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects end before start", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2024-05-01",
      event_start_precision: "day",
      event_is_ongoing: false,
      event_end_date: "2024-04-30",
      event_end_precision: "day",
      resolution_status: "unresolved",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts ended conduct + resolved case with resolution date", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2024-05-01",
      event_start_precision: "day",
      event_is_ongoing: false,
      event_end_date: "2024-05-02",
      event_end_precision: "day",
      resolution_status: "resolved",
      resolution_date: "2024-06-01",
      resolution_date_precision: "day",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects impossible ended+resolved without resolution date", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2024-05-01",
      event_start_precision: "day",
      event_is_ongoing: false,
      event_end_date: "2024-05-02",
      event_end_precision: "day",
      resolution_status: "resolved",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects impossible ended+unresolved with resolution date", () => {
    const result = normalizeEvidenceTimelineInput({
      event_start_date: "2024-05-01",
      event_start_precision: "day",
      event_is_ongoing: false,
      event_end_date: "2024-05-02",
      event_end_precision: "day",
      resolution_status: "unresolved",
      resolution_date: "2025-01-01",
      resolution_date_precision: "day",
    });
    expect(result.ok).toBe(false);
  });
});

describe("timeline date formatting", () => {
  it("formats year precision", () => {
    expect(formatTimelineDate("2019-01-01", "year")).toBe("2019");
  });

  it("formats month precision", () => {
    expect(formatTimelineDate("2025-07-01", "month")).toBe("July 2025");
  });

  it("formats day precision", () => {
    expect(formatTimelineDate("2025-07-03", "day")).toBe("July 3, 2025");
  });
});

describe("timeline display compatibility", () => {
  it("preserves timeline on resubmission payload", () => {
    const previous = {
      id: 10,
      entity_type: "company",
      entity_id: 1,
      company_id: 1,
      company_request_id: null,
      category: 2,
      category_id: 2,
      evidence_type: "misconduct",
      event_start_date: "2017-01-01",
      event_start_precision: "year" as const,
      event_end_date: "2020-01-01",
      event_end_precision: "year" as const,
      event_is_ongoing: false,
      resolution_status: "resolved" as const,
      resolution_date: "2025-07-01",
      resolution_date_precision: "month" as const,
    };
    const formData = new FormData();
    formData.set("title", "New");
    formData.set("summary", "Updated");
    const payload = buildResubmittedEvidenceInsertPayload(previous, formData, "u-1");
    expect(payload.event_start_date).toBe(previous.event_start_date);
    expect(payload.event_start_precision).toBe(previous.event_start_precision);
    expect(payload.event_end_date).toBe(previous.event_end_date);
    expect(payload.event_end_precision).toBe(previous.event_end_precision);
    expect(payload.event_is_ongoing).toBe(previous.event_is_ongoing);
    expect(payload.resolution_status).toBe(previous.resolution_status);
    expect(payload.resolution_date).toBe(previous.resolution_date);
    expect(payload.resolution_date_precision).toBe(previous.resolution_date_precision);
  });

  it("handles historical evidence with null timeline fields", () => {
    const timeline = formatEvidenceTimeline({
      event_start_date: null,
      event_start_precision: null,
      event_end_date: null,
      event_end_precision: null,
      event_is_ongoing: null,
      resolution_status: null,
      resolution_date: null,
      resolution_date_precision: null,
    });
    expect(timeline.hasTimeline).toBe(false);
    expect(timeline.conductPeriod).toBeNull();
  });
});
