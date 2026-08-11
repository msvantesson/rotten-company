export type TimelineDatePrecision = "day" | "month" | "year";
export type TimelineResolutionStatus = "resolved" | "unresolved";

export type EvidenceTimelineFields = {
  event_start_date: string;
  event_start_precision: TimelineDatePrecision;
  event_end_date: string | null;
  event_end_precision: TimelineDatePrecision | null;
  event_is_ongoing: boolean;
  resolution_status: TimelineResolutionStatus;
  resolution_date: string | null;
  resolution_date_precision: TimelineDatePrecision | null;
};

type EvidenceTimelineInput = {
  event_start_date?: string | null;
  event_start_precision?: string | null;
  event_end_date?: string | null;
  event_end_precision?: string | null;
  event_is_ongoing?: boolean | string | null;
  resolution_status?: string | null;
  resolution_date?: string | null;
  resolution_date_precision?: string | null;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function toPrecision(value: string | null | undefined): TimelineDatePrecision | null {
  if (value === "day" || value === "month" || value === "year") return value;
  return null;
}

function toResolutionStatus(value: string | null | undefined): TimelineResolutionStatus | null {
  if (value === "resolved" || value === "unresolved") return value;
  return null;
}

function normalizeBoolean(value: boolean | string | null | undefined): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function normalizeDateByPrecision(raw: string, precision: TimelineDatePrecision): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (precision === "year") {
    if (!/^\d{4}$/.test(value)) return null;
    return `${value}-01-01`;
  }

  if (precision === "month") {
    const m = value.match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (!Number.isInteger(year) || month < 1 || month > 12) return null;
    return `${m[1]}-${m[2]}-01`;
  }

  const d = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!d) return null;
  const year = Number(d[1]);
  const month = Number(d[2]);
  const day = Number(d[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  const max = daysInMonth(year, month);
  if (day < 1 || day > max) return null;
  return `${d[1]}-${d[2]}-${d[3]}`;
}

function compareDateStrings(a: string, b: string): number {
  return a.localeCompare(b);
}

export function normalizeEvidenceTimelineInput(
  input: EvidenceTimelineInput,
): { ok: true; data: EvidenceTimelineFields } | { ok: false; error: string } {
  const startPrecision = toPrecision(input.event_start_precision ?? null);
  if (!startPrecision) {
    return { ok: false, error: "Event start precision is required." };
  }

  const startRaw = input.event_start_date?.trim() ?? "";
  if (!startRaw) {
    return { ok: false, error: "Event start date is required." };
  }

  const startDate = normalizeDateByPrecision(startRaw, startPrecision);
  if (!startDate) {
    return { ok: false, error: "Event start date does not match the selected precision." };
  }

  const isOngoing = normalizeBoolean(input.event_is_ongoing);
  if (isOngoing === null) {
    return { ok: false, error: "Please specify whether the event is ongoing." };
  }

  let endDate: string | null = null;
  let endPrecision: TimelineDatePrecision | null = null;
  if (!isOngoing) {
    endPrecision = toPrecision(input.event_end_precision ?? null);
    if (!endPrecision) {
      return { ok: false, error: "Event end precision is required when the event is not ongoing." };
    }
    const endRaw = input.event_end_date?.trim() ?? "";
    if (!endRaw) {
      return { ok: false, error: "Event end date is required when the event is not ongoing." };
    }
    endDate = normalizeDateByPrecision(endRaw, endPrecision);
    if (!endDate) {
      return { ok: false, error: "Event end date does not match the selected precision." };
    }
    if (compareDateStrings(endDate, startDate) < 0) {
      return { ok: false, error: "Event end date cannot be earlier than event start date." };
    }
  }

  const resolutionStatus = toResolutionStatus(input.resolution_status ?? null);
  if (!resolutionStatus) {
    return { ok: false, error: "Resolution status is required." };
  }

  let resolutionDate: string | null = null;
  let resolutionPrecision: TimelineDatePrecision | null = null;
  if (resolutionStatus === "resolved") {
    resolutionPrecision = toPrecision(input.resolution_date_precision ?? null);
    if (!resolutionPrecision) {
      return { ok: false, error: "Resolution date precision is required when resolved." };
    }
    const resolutionRaw = input.resolution_date?.trim() ?? "";
    if (!resolutionRaw) {
      return { ok: false, error: "Resolution date is required when resolved." };
    }
    resolutionDate = normalizeDateByPrecision(resolutionRaw, resolutionPrecision);
    if (!resolutionDate) {
      return { ok: false, error: "Resolution date does not match the selected precision." };
    }
    if (compareDateStrings(resolutionDate, startDate) < 0) {
      return { ok: false, error: "Resolution date cannot be earlier than event start date." };
    }
  } else {
    if ((input.resolution_date?.trim() ?? "") || (input.resolution_date_precision?.trim() ?? "")) {
      return {
        ok: false,
        error: "Resolution date must be empty when resolution status is unresolved.",
      };
    }
  }

  return {
    ok: true,
    data: {
      event_start_date: startDate,
      event_start_precision: startPrecision,
      event_end_date: endDate,
      event_end_precision: endPrecision,
      event_is_ongoing: isOngoing,
      resolution_status: resolutionStatus,
      resolution_date: resolutionDate,
      resolution_date_precision: resolutionPrecision,
    },
  };
}

export function formatTimelineDate(
  dateValue: string | null | undefined,
  precision: TimelineDatePrecision | null | undefined,
): string | null {
  if (!dateValue || !precision) return null;
  const m = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;

  if (precision === "year") return String(year);
  if (precision === "month") return `${MONTH_NAMES[month - 1]} ${year}`;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

export function formatEvidenceTimeline(evidence: {
  event_start_date?: string | null;
  event_start_precision?: TimelineDatePrecision | null;
  event_end_date?: string | null;
  event_end_precision?: TimelineDatePrecision | null;
  event_is_ongoing?: boolean | null;
  resolution_status?: TimelineResolutionStatus | null;
  resolution_date?: string | null;
  resolution_date_precision?: TimelineDatePrecision | null;
}): {
  hasTimeline: boolean;
  conductPeriod: string | null;
  ongoingLabel: "Yes" | "No" | null;
  resolutionStatusLabel: string | null;
  resolutionDateLabel: string | null;
} {
  const start = formatTimelineDate(evidence.event_start_date, evidence.event_start_precision);
  if (!start) {
    return {
      hasTimeline: false,
      conductPeriod: null,
      ongoingLabel: null,
      resolutionStatusLabel: null,
      resolutionDateLabel: null,
    };
  }

  const ongoing = evidence.event_is_ongoing === true;
  const end = formatTimelineDate(evidence.event_end_date, evidence.event_end_precision);
  const conductPeriod = ongoing ? `${start}–ongoing` : end ? `${start}–${end}` : start;

  const resolutionStatusLabel =
    evidence.resolution_status === "resolved"
      ? "Resolved"
      : evidence.resolution_status === "unresolved"
        ? "Unresolved"
        : null;
  const resolutionDateLabel =
    evidence.resolution_status === "resolved"
      ? formatTimelineDate(evidence.resolution_date, evidence.resolution_date_precision)
      : null;

  return {
    hasTimeline: true,
    conductPeriod,
    ongoingLabel: ongoing ? "Yes" : "No",
    resolutionStatusLabel,
    resolutionDateLabel,
  };
}
