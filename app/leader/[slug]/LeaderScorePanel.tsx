"use client";

import React from "react";

export default function LeaderScorePanel({
  name,
  role,
  companyName,
  slug,
  profileImageUrl,
  finalScore,
  rawScore,
  directEvidenceScore,
  inequalityScore,
  companyInfluenceScore,
  categoryBreakdown,
  evidenceTimeline,
  payRatio
}) {
  const flavorTier = getFlavorTier(finalScore);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {profileImageUrl && (
          <img
            src={profileImageUrl}
            alt={name}
            className="w-20 h-20 rounded-full object-cover"
          />
        )}

        <div>
          <h1 className="text-3xl font-bold">{name}</h1>
          <p className="text-gray-500">{role} @ {companyName}</p>
        </div>
      </div>

      {/* Score Meter */}
      <div className="p-6 rounded-xl border bg-white shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Leader Rotten Score</p>
            <p className="text-5xl font-bold">{finalScore}</p>
            <p className="text-gray-600 mt-1">{flavorTier}</p>
          </div>

          <div className="w-40 h-40 rounded-full border-4 border-black flex items-center justify-center text-4xl font-bold">
            {finalScore}
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <BreakdownItem
            label="Direct Evidence"
            value={directEvidenceScore}
          />
          <BreakdownItem
            label="Inequality Signal"
            value={inequalityScore}
            tooltip="Based on CEO pay ratio vs median worker pay"
          />
          <BreakdownItem
            label="Company Influence"
            value={companyInfluenceScore}
            tooltip="10% of company Rotten Score"
          />
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categoryBreakdown.map((cat) => (
            <div
              key={cat.category}
              className="p-4 border rounded-lg bg-white shadow-sm"
            >
              <p className="font-medium">{cat.category}</p>
              <p className="text-sm text-gray-500">
                {cat.evidenceCount} evidence
              </p>
              <p className="text-lg font-bold mt-1">{cat.categoryScore}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leadership Inequality */}
      {payRatio && (
        <div className="p-6 border rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Leadership Inequality</h2>
          <p className="text-gray-700">
            CEO Pay Ratio: <strong>{payRatio}×</strong>
          </p>
          <p className="text-gray-500 text-sm mt-1">
            In the 1950s, CEOs made ~30× a worker. Today it’s ~285×.
          </p>
        </div>
      )}

      {/* Evidence Timeline */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Evidence Timeline</h2>
        <div className="space-y-4">
          {evidenceTimeline.map((ev) => (
            <div
              key={ev.id}
              className="p-4 border rounded-lg bg-white shadow-sm"
            >
              <p className="font-medium">{ev.title}</p>
              <p className="text-sm text-gray-600">{ev.summary}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>{ev.category}</span>
                <span>{ev.severity}</span>
                <span>{new Date(ev.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Helper Components */

function BreakdownItem({ label, value, tooltip }) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <p className="text-gray-600">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {tooltip && <p className="text-xs text-gray-400 mt-1">{tooltip}</p>}
    </div>
  );
}

function getFlavorTier(score) {
  if (score <= 10) return "Fresh";
  if (score <= 30) return "Slightly Rotten";
  if (score <= 50) return "Rotten";
  if (score <= 70) return "Deeply Rotten";
  if (score <= 90) return "Working for the Empire";
  return "Working for Satan";
}
