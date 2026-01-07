import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase-server";
import { getRottenFlavor } from "@/lib/flavor-engine";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

export async function GET(req: Request) {
  try {
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

    if (companyError) throw companyError;
    if (!company) return new Response("Company not found", { status: 404 });

    const { data: scoreRow, error: scoreError } = await supabase
      .from("company_rotten_score")
      .select("rotten_score")
      .eq("company_id", company.id)
      .maybeSingle();

    if (scoreError) throw scoreError;

    const score = scoreRow?.rotten_score ?? 0;

    const { data: breakdown, error: breakdownError } = await supabase
      .from("company_category_breakdown")
      .select("rating_count, evidence_count")
      .eq("company_id", company.id);

    if (breakdownError) throw breakdownError;

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

    //
    // 🔥 Canonical flavor engine
    //
    const { microFlavor, macroTier, color } = getRottenFlavor(score);

    return new ImageResponse(
      React.createElement(
        "div",
        {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            padding: "60px",
