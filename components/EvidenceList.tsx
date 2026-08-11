"use client";

import React, { useState } from "react";
import { formatEvidenceTimeline } from "@/lib/evidence-timeline";

type ManagerInfo = {
  name: string;
  report_count: number | null;
};

type CategoryInfo = {
  name: string;
};

type EvidenceItem = {
  id: number;
  title: string;
  summary?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  evidence_type?: string;
  created_at?: string;
  event_start_date?: string | null;
  event_start_precision?: "day" | "month" | "year" | null;
  event_end_date?: string | null;
  event_end_precision?: "day" | "month" | "year" | null;
  event_is_ongoing?: boolean | null;
  resolution_status?: "resolved" | "unresolved" | null;
  resolution_date?: string | null;
  resolution_date_precision?: "day" | "month" | "year" | null;
  severity?: number;
  recency_weight?: number;
  file_weight?: number;
  total_weight?: number;
  category_id: number | null;
  category: CategoryInfo | null;
  manager?: ManagerInfo | null;
};

type Props = {
  evidence: EvidenceItem[];
};

const SEGMENTS = 5;
const MAX_WEIGHT = 150; // tune this to your typical total_weight scale

function WeightBoxes({ weight }: { weight: number }) {
  const clamped = Math.max(0, Math.min(weight, MAX_WEIGHT));
  const filled = Math.round((clamped / MAX_WEIGHT) * SEGMENTS);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <div
              key={i}
              className={[
                "h-3 w-6 rounded-sm border",
                isFilled ? "bg-red-600 border-red-700" : "bg-muted border-border",
              ].join(" ")}
              title={`${weight.toFixed(2)} / ${MAX_WEIGHT}`}
            />
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {weight.toFixed(2)}
      </div>
    </div>
  );
}

function SummaryBlock({ summary }: { summary?: string }) {
  const text = summary?.trim() ?? "";
  return (
    <div className="text-sm text-foreground">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Summary
      </div>
      {text.length > 0 ? (
        <p className="whitespace-pre-wrap">{text}</p>
      ) : (
        <p className="italic text-muted-foreground">(No summary provided)</p>
      )}
    </div>
  );
}

function FilePreview({ item }: { item: EvidenceItem }) {
  if (!item.file_url || !item.file_type) return null;

  const href = item.file_url;

  // Image: do NOT show inline preview; only show a link
  if (item.file_type.startsWith("image")) {
    return (
      <div className="mt-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface hover:bg-muted text-sm"
        >
          Open image →
        </a>
      </div>
    );
  }

  // PDF: show a normal link button.
  if (item.file_type === "application/pdf") {
    return (
      <div className="mt-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface hover:bg-muted text-sm"
        >
          View PDF →
        </a>
      </div>
    );
  }

  // Other file types: provide a generic link.
  return (
    <div className="mt-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-700 hover:underline"
      >
        Open attachment →
      </a>
    </div>
  );
}

export default function EvidenceList({ evidence }: Props) {
  const grouped = evidence?.length
    ? evidence.reduce((acc, item) => {
        const catId = item.category_id ?? 0;
        if (!acc[catId]) {
          acc[catId] = {
            categoryName: item.category?.name ?? "Uncategorized",
            items: [],
          };
        }
        acc[catId].items.push(item);
        return acc;
      }, {} as Record<number, { categoryName: string; items: EvidenceItem[] }>)
    : ({} as Record<number, { categoryName: string; items: EvidenceItem[] }>);

  const sortedCategories = Object.entries(grouped).sort((a, b) =>
    a[1].categoryName.localeCompare(b[1].categoryName),
  );

  // Initialise all categories with evidence as expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const [catId, group] of Object.entries(grouped)) {
      initial[catId] = group.items.length > 0;
    }
    return initial;
  });

  if (!evidence || evidence.length === 0) {
    return <p>No approved evidence found.</p>;
  }

  function toggleCategory(catId: string) {
    setExpanded((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }

  function expandAll() {
    setExpanded((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, true])));
  }

  function collapseAll() {
    setExpanded((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, false])));
  }

  return (
    <div>
      {/* EXPAND / COLLAPSE ALL CONTROLS */}
      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={expandAll}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Collapse all
        </button>
      </div>

      {/* CATEGORY SECTIONS */}
      <div className="space-y-14">
        {sortedCategories.map(([catId, group]) => {
          const isExpanded = expanded[catId] ?? true;
          const bodyId = `evidence-section-${catId}`;
          const count = group.items.length;

          return (
            <div key={catId}>
              {/* CATEGORY HEADER BUTTON */}
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={bodyId}
                onClick={() => toggleCategory(catId)}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="text-xl font-semibold text-foreground">
                  {group.categoryName}{" "}
                  <span className="font-normal text-muted-foreground text-base">
                    ({count} {count === 1 ? "evidence" : "evidence"})
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    transition: "transform 175ms ease",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                  className="text-muted-foreground"
                >
                  ▶
                </span>
              </button>

              {/* CATEGORY EVIDENCE LIST */}
              {isExpanded && (
                <div id={bodyId} className="mt-4 space-y-6">
                  {group.items.map((item) => {
                    const weight = item.total_weight ?? 0;

                    return (
                      <div
                        key={item.id}
                        id={`evidence-${item.id}`}
                        className="border border-border p-4 rounded-md bg-surface shadow-sm space-y-3"
                      >
                        {(() => {
                          const timeline = formatEvidenceTimeline(item);
                          return (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>
                                Added to Rotten Company:{" "}
                                {item.created_at
                                  ? new Date(item.created_at).toLocaleDateString()
                                  : "Unknown"}
                              </div>
                              {timeline.hasTimeline ? (
                                <>
                                  <div>Conduct/Event period: {timeline.conductPeriod}</div>
                                  <div>Ongoing: {timeline.ongoingLabel}</div>
                                  <div>
                                    Resolution status:{" "}
                                    {timeline.resolutionStatusLabel ?? "(not set)"}
                                  </div>
                                  {timeline.resolutionStatusLabel === "Resolved" && (
                                    <div>
                                      Resolution date:{" "}
                                      {timeline.resolutionDateLabel ?? "(not set)"}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div>Event date not yet documented</div>
                              )}
                            </div>
                          );
                        })()}

                        {item.evidence_type && (
                          <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-muted text-muted-foreground uppercase">
                            {item.evidence_type}
                          </span>
                        )}

                        <h3 className="font-semibold text-lg text-foreground">
                          {item.title}
                        </h3>

                        <SummaryBlock summary={item.summary} />

                        {item.manager && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reported manager: {item.manager.name}
                            {typeof item.manager.report_count === "number" &&
                              ` (${item.manager.report_count} reports)`}
                          </p>
                        )}

                        {/* Compact Weight Meter */}
                        <div className="mt-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Evidence Weight
                          </div>
                          <WeightBoxes weight={weight} />
                        </div>

                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                          {item.severity !== undefined && (
                            <div>Severity: {item.severity}</div>
                          )}
                          {item.recency_weight !== undefined && (
                            <div>Recency Weight: {item.recency_weight}</div>
                          )}
                          {item.file_weight !== undefined && (
                            <div>File Weight: {item.file_weight}</div>
                          )}
                        </div>

                        <FilePreview item={item} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
