"use client";

import React from "react";

interface LeaderScorePanelProps {
  name: string;
  role: string;
  companyName: string;
  slug: string;
  profileImageUrl?: string;
  finalScore: number;
  rawScore: number;
  directEvidenceScore: number;
  inequalityScore: number;
  companyInfluenceScore: number;
  categoryBreakdown: {
    category: string;
    evidenceCount: number;
    categoryScore: number;
  }[];
  evidenceTimeline: {
    id: number;
    title: string;
    summary: string;
    category: string;
    severity: "low" | "medium" | "high";
    createdAt: string;
    companySlug: string;
  }[];
  payRatio?: number;
}

export default function LeaderScorePanel(props: LeaderScorePanelProps) {
  const {
    finalScore,
  } = props;

  return (
    <div className="w-full space-y-8">
      <div className="p-6 border rounded-lg bg-white shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Leader Rotten Score</h2>
        <div className="text-4xl font-bold mb-2">{finalScore}</div>
        <div className="text-lg text-gray-600">{getFlavorTier(finalScore)}</div>
      </div>
    </div>
  );
}

/* Helper Components */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BreakdownItem({ label, value, tooltip }: {
  label: string;
  value: number;
  tooltip?: string;
}) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <p className="text-gray-600">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {tooltip && <p className="text-xs text-gray-400 mt-1">{tooltip}</p>}
    </div>
  );
}

function getFlavorTier(score: number): string {
  if (score <= 10) return "Fresh";
  if (score <= 30) return "Slightly Rotten";
  if (score <= 50) return "Rotten";
  if (score <= 70) return "Deeply Rotten";
  if (score <= 90) return "Working for the Empire";
  return "Working for Satan";
}
