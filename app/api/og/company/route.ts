import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase-server";
import { getFlavor } from "@/lib/get-flavor";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    console.error("Missing slug");
    return new Response("Missing slug", { status: 400 });
  }

  const supabase = await supabaseServer();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, industry")
    .eq("slug", slug)
    .maybeSingle();

  if (companyError) {
    console.error("Error fetching company:", companyError);
    return new Response("Error fetching company", { status: 500 });
  }

  if (!company) {
    console.error("Company not found");
    return new Response("Company not found", { status: 404 });
  }

  const { data: scoreRow, error: scoreError } = await supabase
    .from("company_rotten_score")
    .select("rotten_score")
    .eq("company_id", company.id)
    .maybeSingle();

  if (scoreError) {
    console.error("Error fetching score:", scoreError);
    return new Response("Error fetching score", { status: 500 });
  }

  const score = scoreRow?.rotten_score ?? 0;

  const { data: breakdown, error: breakdownError } = await supabase
    .from("company_category_breakdown")
    .select("rating_count, evidence_count")
    .eq("company_id", company.id);

  if (breakdownError) {
    console.error("Error fetching breakdown:", breakdownError);
    return new Response("Error fetching breakdown", { status: 500 });
  }

  const ratingCount = Array.isArray(breakdown)
    ? breakdown.reduce((sum, b) => sum + (b.rating_count ?? 0), 0)
    : 0;

  const evidenceCount = Array.isArray(breakdown)
    ? breakdown.reduce((sum, b) => sum + (b.evidence_count ?? 0), 0)
    : 0;

  const totalSignals = ratingCount + evidenceCount;

  const confidence =
    totalSignals >= 50 ? "High confidence" :
    totalSignals >= 10 ? "Medium confidence" :
    "Low confidence";

  const { microFlavor, macroTier } = getFlavor(score);

  const getColor = () => {
    if (score >= 90) return "#8B0000";
    if (score >= 75) return "#B22222";
    if (score >= 60) return "#D2691E";
    if (score >= 45) return "#DAA520";
    if (score >= 30) return "#CD853F";
    if (score >= 15) return "#A9A9A9";
    return "#2E8B57";
  };

  const barColor = getColor();

  try {
    return
