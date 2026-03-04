"use client";

import React from "react";

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
      <div className="text-xs text-muted-foreground tabular-nums">{weight.toFixed(2)}</div>
    </div>
  );
}

function SummaryBlock({ summary }: { summary?: string }) {
  const text = summary?.trim() ?? "";
  return (
    <div className="text-sm text-foreground">
      <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
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

  // Image: do NOT embed/preview the image inline; only provide a link.
  if (item.file_type.startsWith("image")) {
    return (
      <div className="mt-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface hover:bg-muted text-sm"
        >
          View image →
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
  if (!evidence || evidence.length === 0) {
    return <p>No approved evidence found.</p>;
  }

  const grouped = evidence.reduce((acc, item) => {
    const catId = item.category_id ?? 0;
    if (!acc[catId]) {
      acc[catId] = {
        categoryName: item.category?.name ?? "Uncategorized",
        items: [],
      };
    }
    acc[catId].items.push(item);
    return acc;
  }, {} as Record<number, { categoryName: string; items: EvidenceItem[] }>);

  const sortedCategories = Object.entries(grouped).sort((a, b) =>
    a[1].categoryName.localeCompare(b[1].categoryName)
  );

  return (
    <div className="space-y-10">
      {sortedCategories.map(([catId, group]) => (
        <div key={catId} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{group.categoryName}</h2>
            <span className="text-sm text-muted-foreground">
              {group.items.length} item{group.items.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-6">
            {group.items.map((item) => {
              const weight = item.total_weight ?? 0;

              return (
                <div
                  key={item.id}
                  className="border border-border p-4 rounded-md bg-surface shadow-sm space-y-3"
                >
                  {item.evidence_type && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-muted text-muted-foreground uppercase">
                      {item.evidence_type}
                    </span>
                  )}

                  <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>

                  <SummaryBlock summary={item.summary} />

                  {item.manager && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reported manager: {item.manager.name}
                      {typeof item.manager.report_count === "number" && ` (${item.manager.report_count} reports)`}
                    </p>
                  )}

                  <div className="mt-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Evidence Weight</div>
                    <WeightBoxes weight={weight} />
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    {item.severity !== undefined && <div>Severity: {item.severity}</div>}
                    {item.recency_weight !== undefined && <div>Recency Weight: {item.recency_weight}</div>}
                    {item.file_weight !== undefined && <div>File Weight: {item.file_weight}</div>}
                  </div>

                  <FilePreview item={item} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}