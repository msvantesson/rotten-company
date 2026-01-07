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

function getFlavorTier(score: number): string {
  if (score <= 10) return "Fresh";
  if (score <= 30) return "Slightly Rotten";
  if (score <= 50) return "Rotten";
  if (score <= 70) return "Deeply Rotten";
  if (score <= 90) return "Working for the Empire";
  return "Working for Satan";
}
