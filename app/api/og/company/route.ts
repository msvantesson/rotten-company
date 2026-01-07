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
            background: "#050816",
            color: "#f9fafb",
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          },
        },
        [
          React.createElement(
            "div",
            { key: "header", style: { fontSize: "24px", opacity: 0.7, marginBottom: "8px" } },
            "Rotten Company"
          ),
          React.createElement(
            "div",
            { key: "name", style: { fontSize: "56px", fontWeight: 700, marginBottom: "12px" } },
            company.name
          ),
          React.createElement(
            "div",
            { key: "microFlavor", style: { fontSize: "34px", fontWeight: 600, opacity: 0.95, marginBottom: "24px" } },
            microFlavor
          ),
          React.createElement(
            "div",
            {
              key: "bar-bg",
              style: {
                display: "flex",
                width: "100%",
                height: "20px",
                borderRadius: "9999px",
                background: "#111827",
                overflow: "hidden",
                marginBottom: "20px",
              },
            },
            React.createElement("div", {
              key: "bar-fill",
              style: {
                height: "100%",
                width: `${score}%`,
                background: color,
              },
            })
          ),
          React.createElement(
            "div",
            { key: "score-tier", style: { fontSize: "28px", fontWeight: 500, marginBottom: "12px" } },
            `Rotten Score: ${score.toFixed(1)} · ${macroTier}`
          ),
          React.createElement(
            "div",
            { key: "signals", style: { fontSize: "22px", opacity: 0.85, marginBottom: "6px" } },
            `${evidenceCount} evidence · ${ratingCount} ratings · ${totalSignals} total signals`
          ),
          React.createElement(
            "div",
            { key: "confidence", style: { fontSize: "20px", opacity: 0.7, marginBottom: "8px" } },
            confidence
          ),
          company.industry &&
            React.createElement(
              "div",
              { key: "industry", style: { fontSize: "20px", opacity: 0.6 } },
              `Industry: ${company.industry}`
            ),
        ]
      ),
      { width: 1200, height: 630 }
    );
  } catch (err: any) {
    console.error("OG route failed:", err);
    return new Response("OG route failed", { status: 500 });
  }
}
