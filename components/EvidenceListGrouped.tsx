"use client";

import React from "react";
import Image from "next/image";

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

export default function EvidenceListGrouped({ evidence }: Props) {
  if (!evidence || evidence.length === 0) {
    return <p>No approved evidence found.</p>;
  }

  //
  // GROUP EVIDENCE BY CATEGORY
  //
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

  //
  // SORT CATEGORIES ALPHABETICALLY
  //
  const sortedCategories = Object.entries(grouped).sort((a, b) =>
    a[1].categoryName.localeCompare(b[1].categoryName)
  );

  return (
    <div className="space-y-10">
      {sortedCategories.map(([catId, group]) => (
        <div key={catId} className="space-y-4">
          {/* CATEGORY HEADER */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {group.categoryName}
            </h2>
            <span className="text-sm text-gray-600">
              {group.items.length} item{group.items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* CATEGORY EVIDENCE LIST */}
          <div className="space-y-6">
            {group.items.map((item) => {
              const weight = item.total_weight ?? 0;

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
                category: item.category?.name,
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
                  {/* JSON-LD */}
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
                  <h3 className="font-semibold text-lg text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-700">{item.summary}</p>

                  {/* Manager Info */}
                  {item.manager && (
                    <p className="text-sm text-gray-600 mt-1">
                      Reported manager: {item.manager.name}
                      {typeof item.manager.report_count === "number" &&
                        ` (${item.manager.report_count} reports)`}
                    </p>
                  )}

                  {/* Weight Meter */}
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
                        <Image
                          src={item.file_url}
                          alt={item.title}
                          className="max-w-full h-auto rounded-md border"
                          width={800}
                          height={600}
                          style={{ maxWidth: '100%', height: 'auto' }}
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
        </div>
      ))}
    </div>
  );
}
