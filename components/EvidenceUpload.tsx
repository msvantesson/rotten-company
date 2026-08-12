"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { type SeverityLabel } from "@/lib/severity-mapping";
import { normalizeEvidenceTimelineInput, type TimelineDatePrecision, type TimelineResolutionStatus } from "@/lib/evidence-timeline";

type EvidenceUploadProps = {
  entityId: number;
  entityType: "company" | "leader" | "manager" | "owner";
};

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_PDF_SIZE = 1 * 1024 * 1024; // 1MB

const toMB = (bytes: number) => bytes / (1024 * 1024);

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export default function EvidenceUpload({ entityId, entityType }: EvidenceUploadProps) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState<"misconduct" | "remediation">(
    "misconduct"
  );

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [severitySuggested, setSeveritySuggested] = useState<SeverityLabel>("medium");

  const [eventStartDate, setEventStartDate] = useState("");
  const [eventStartPrecision, setEventStartPrecision] = useState<TimelineDatePrecision>("day");
  const [eventIsOngoing, setEventIsOngoing] = useState<boolean | null>(null);
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventEndPrecision, setEventEndPrecision] = useState<TimelineDatePrecision>("day");
  const [resolutionStatus, setResolutionStatus] = useState<TimelineResolutionStatus | "">("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolutionDatePrecision, setResolutionDatePrecision] = useState<TimelineDatePrecision>("day");

  const [confirmPolicy, setConfirmPolicy] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function precisionInputType(precision: TimelineDatePrecision) {
    if (precision === "month") return "month";
    if (precision === "year") return "number";
    return "date";
  }

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("id", { ascending: true });

      if (!error && data) {
        setCategories(data as any);
      }
    }
    loadCategories();
  }, [supabase]);

  useEffect(() => {
    if (eventIsOngoing === true) {
      setEventEndDate("");
      setResolutionStatus("unresolved");
      setResolutionDate("");
    }
  }, [eventIsOngoing]);

  useEffect(() => {
    if (resolutionStatus === "unresolved") {
      setResolutionDate("");
    }
  }, [resolutionStatus]);

  const handleSubmit = async () => {
    setError("");

    if (!title.trim()) return setError("Title is required.");
    if (!summary.trim()) return setError("Summary is required.");
    if (!confirmPolicy)
      return setError(
        "Please confirm the policy about naming only leaders/managers."
      );

    if (!categoryId) return setError("Please select a category.");

    if (file) {
      if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
        return setError(`Image too large. Max size is ${toMB(MAX_IMAGE_SIZE)}MB.`);
      }

      if (file.type === "application/pdf" && file.size > MAX_PDF_SIZE) {
        return setError(`PDF too large. Max size is ${toMB(MAX_PDF_SIZE)}MB.`);
      }
    }

    // Client-side validation only: verify the timeline values would normalize correctly.
    // Do NOT append the normalized values to FormData.
    // The server will perform the authoritative normalization.
    const timelineValidation = normalizeEvidenceTimelineInput({
      event_start_date: eventStartDate,
      event_start_precision: eventStartPrecision,
      event_end_date: eventEndDate,
      event_end_precision: eventEndPrecision,
      event_is_ongoing: eventIsOngoing,
      resolution_status: resolutionStatus,
      resolution_date: resolutionDate,
      resolution_date_precision: resolutionDatePrecision,
    });
    if (!timelineValidation.ok) {
      return setError(timelineValidation.error);
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to submit evidence.");
        setLoading(false);
        return;
      }

      const form = new FormData();
      if (file) {
        form.append("file", file, sanitizeFileName(file.name));
      }
      form.append("title", title.trim());
      form.append("summary", summary.trim());
      form.append("entityType", entityType);
      form.append("entityId", String(entityId));
      form.append("category", String(categoryId));
      form.append("severitySuggested", severitySuggested);
      form.append("evidenceType", evidenceType);
      form.append("userId", user.id);
      
      // CRITICAL: Append RAW user-entered timeline values, not normalized values.
      // The server will perform the authoritative normalization.
      form.append("event_start_date", eventStartDate);
      form.append("event_start_precision", eventStartPrecision);
      form.append("event_is_ongoing", String(eventIsOngoing));
      if (eventEndDate) {
        form.append("event_end_date", eventEndDate);
      }
      if (eventEndPrecision) {
        form.append("event_end_precision", eventEndPrecision);
      }
      form.append("resolution_status", resolutionStatus);
      if (resolutionDate) {
        form.append("resolution_date", resolutionDate);
      }
      if (resolutionDatePrecision) {
        form.append("resolution_date_precision", resolutionDatePrecision);
      }

      const res = await fetch("/api/evidence/submit", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Upload failed.");
        setLoading(false);
        return;
      }

      router.push(`/my-evidence/${json.id}`);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Unexpected upload error.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Submit Evidence</h2>

      {/* Policy box */}
      <div className="rounded-md border border-border bg-surface-2 p-4 text-sm text-foreground space-y-2">
        <div className="font-medium">Before you submit</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Do not name regular employees.</strong> Only name{" "}
            <strong>leaders</strong> and <strong>managers</strong>.
          </li>
          <li>
            If you mention a leader/manager, include a{" "}
            <strong>public link</strong> (company website profile or{" "}
            <strong>LinkedIn</strong>) in the summary.
          </li>
          <li>
            Remove personal data (addresses, phone numbers, private emails) from
            uploads when possible.
          </li>
        </ul>

        <label className="flex items-start gap-2 mt-3">
          <input
            type="checkbox"
            checked={confirmPolicy}
            onChange={(e) => setConfirmPolicy(e.target.checked)}
            disabled={loading}
            className="mt-1"
          />
          <span>
            I confirm I will only name leaders/managers and will include public
            links where relevant.
          </span>
        </label>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Evidence Type</label>
        <select
          value={evidenceType}
          onChange={(e) =>
            setEvidenceType(e.target.value as "misconduct" | "remediation")
          }
          className="border p-2 rounded w-full"
          disabled={loading}
        >
          <option value="misconduct">Misconduct</option>
          <option value="remediation">Remediation</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Title *</label>
        <input
          type="text"
          className="border p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          placeholder="Short headline (e.g. "Retaliation after reporting safety issue")"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Summary *</label>
        <textarea
          className="border p-2 rounded w-full text-sm"
          rows={5}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={loading}
          placeholder="Describe what happened, when, where, who (leaders/managers only), and add links (website/LinkedIn) when naming leadership."
        />
        <p className="text-xs text-muted-foreground">
          Tip: Include dates/approximate timeframe, location, and public links for any
          named leader/manager.
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Category</label>
        <select
          className="border p-2 rounded w-full"
          value={categoryId ?? ""}
          onChange={(e) =>
            setCategoryId(e.target.value ? Number(e.target.value) : null)
          }
          disabled={loading}
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Severity (suggested)</label>
        <select
          value={severitySuggested}
          onChange={(e) => setSeveritySuggested(e.target.value as SeverityLabel)}
          className="border p-2 rounded w-full"
          disabled={loading}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="space-y-3 rounded-md border border-border bg-surface-2 p-4">
        <h3 className="text-sm font-semibold">When did the conduct/event happen?</h3>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Event start *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={eventStartPrecision}
              onChange={(e) => setEventStartPrecision(e.target.value as TimelineDatePrecision)}
              className="border p-2 rounded w-full"
              disabled={loading}
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
            <input
              type={precisionInputType(eventStartPrecision)}
              className="border p-2 rounded w-full"
              value={eventStartDate}
              onChange={(e) => setEventStartDate(e.target.value)}
              placeholder={eventStartPrecision === "year" ? "YYYY" : undefined}
              min={eventStartPrecision === "year" ? 1900 : undefined}
              max={eventStartPrecision === "year" ? 2100 : undefined}
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">Is the conduct/event still happening? *</label>
          <select
            value={
              eventIsOngoing === null ? "" : eventIsOngoing ? "true" : "false"
            }
            onChange={(e) =>
              setEventIsOngoing(
                e.target.value === "" ? null : e.target.value === "true",
              )
            }
            className="border p-2 rounded w-full"
            disabled={loading}
          >
            <option value="">Select one</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        {eventIsOngoing === false && (
          <div className="space-y-1">
            <label className="block text-sm font-medium">Event end *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={eventEndPrecision}
                onChange={(e) => setEventEndPrecision(e.target.value as TimelineDatePrecision)}
                className="border p-2 rounded w-full"
                disabled={loading}
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
              <input
                type={precisionInputType(eventEndPrecision)}
                className="border p-2 rounded w-full"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                placeholder={eventEndPrecision === "year" ? "YYYY" : undefined}
                min={eventEndPrecision === "year" ? 1900 : undefined}
                max={eventEndPrecision === "year" ? 2100 : undefined}
                disabled={loading}
              />
            </div>
          </div>
        )}
      </div>

      {eventIsOngoing === false && (
        <div className="space-y-3 rounded-md border border-border bg-surface-2 p-4">
          <h3 className="text-sm font-semibold">Has the case or matter been resolved?</h3>
          <div className="space-y-1">
            <select
              value={resolutionStatus}
              onChange={(e) =>
                setResolutionStatus(e.target.value as TimelineResolutionStatus | "")
              }
              className="border p-2 rounded w-full"
              disabled={loading}
            >
              <option value="">Select status</option>
              <option value="resolved">Yes — resolved</option>
              <option value="unresolved">No — still unresolved</option>
            </select>
          </div>

          {resolutionStatus === "resolved" && (
            <div className="space-y-1">
              <label className="block text-sm font-medium">Resolution date *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={resolutionDatePrecision}
                  onChange={(e) =>
                    setResolutionDatePrecision(e.target.value as TimelineDatePrecision)
                  }
                  className="border p-2 rounded w-full"
                  disabled={loading}
                >
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                <input
                  type={precisionInputType(resolutionDatePrecision)}
                  className="border p-2 rounded w-full"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  placeholder={resolutionDatePrecision === "year" ? "YYYY" : undefined}
                  min={resolutionDatePrecision === "year" ? 1900 : undefined}
                  max={resolutionDatePrecision === "year" ? 2100 : undefined}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium">Attachment (optional — image or PDF)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Max file size: images {toMB(MAX_IMAGE_SIZE)} MB · PDFs {toMB(MAX_PDF_SIZE)} MB.{" "}
          Need to reduce a PDF?{" "}
          <a
            href="https://www.ilovepdf.com/compress_pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Compress it for free at ilovepdf.com
          </a>
          .
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit evidence"}
      </button>
    </div>
  );
}
