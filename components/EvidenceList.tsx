"use client";

import React from "react";

type ManagerInfo = {
  name: string;
  report_count: number | null;
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
  manager?: ManagerInfo | null; // NEW
};

type Props = {
  evidence: EvidenceItem[];
};

export function EvidenceList({ evidence }: Props) {
  if (!evidence || evidence.length === 0) {
    return <p>No approved evidence found.</p>;
  }

  return (
    <div className="space-y-6">
      {evidence.map((item) => {
        const weight = item.total_weight ?? 0;

        // JSON-LD payload for this evidence item
        const jsonLd = {
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          identifier: item.id,
          headline: item.title,
          description: item.summary,
          contentUrl: item.file_url,
          encodingFormat: item.file_type,
          fileSize: item.file_size,
          evidenceType: item.evidence_type,
          severity: item.severity,
          recencyWeight: item.recency_weight,
          fileWeight: item.file_weight,
          totalWeight: item.total_weight,
          manager: item.manager
            ? {
                name: item.manager.name,
                reportCount: item.manager.report_count,
              }
            : undefined,
        };

        return (
          <div
            key={item.id}
            className="border p-4 rounded-md bg-white shadow-sm space-y-3"
          >
            {/* JSON-LD for this evidence item */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(jsonLd, null, 2),
              }}
            />

            {/* Evidence Type Badge */}
            {item.evidence_type && (
              <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-700 uppercase">
                {item.evidence_type}
              </span>
            )}

            {/* Title + Summary */}
            <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-700">{item.summary}</p>

            {/* Manager Info (NEW) */}
            {item.manager && (
              <p className="text-sm text-gray-600 mt-1">
                Reported manager: {item.manager.name}
                {typeof item.manager.report_count === "number" &&
                  ` (${item.manager.report_count} reports)`}
              </p>
            )}

            {/* Visual Weight Meter */}
            <div className="mt-2">
              <div className="text-xs text-gray-600 mb-1">
                Evidence Weight: {weight.toFixed(2)}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-500"
                  style={{ width: `${Math.min(weight, 100)}%` }}
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-500 space-y-1 mt-2">
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

            {/* File Preview */}
            {item.file_url && item.file_type && (
              <div className="mt-3">
                {item.file_type.startsWith("image") && (
                  <img
                    src={item.file_url}
                    alt={item.title}
                    className="max-w-full h-auto rounded-md border"
                  />
                )}

                {item.file_type === "application/pdf" && (
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-blue-600 underline"
                  >
                    View PDF
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
