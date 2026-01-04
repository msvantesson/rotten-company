import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase-server";
import { getFlavor } from "@/lib/get-flavor";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const supabase = await supabaseServer();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!company) {
    return new Response("Company not found", { status: 404 });
  }

  const { data: scoreRow } = await supabase
    .from("company_rotten_score")
    .select("rotten_score")
    .eq("company_id", company.id)
    .maybeSingle();

  const score = scoreRow?.rotten_score ?? 0;
  const { macroTier } = getFlavor(score);

  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#050816",
          color: "#f9fafb",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: "24px",
                opacity: 0.8,
                marginBottom: "16px",
              },
              children: "Rotten Company",
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: "48px",
                fontWeight: 700,
                marginBottom: "12px",
              },
              children: company.name,
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: "24px",
                marginBottom: "32px",
                opacity: 0.9,
              },
              children: [
                "Rotten Score: ",
                {
                  type: "span",
                  props: {
                    style: { fontWeight: 700 },
                    children: score.toFixed(2),
                  },
                },
                " · ",
                macroTier,
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                width: "100%",
                height: "16px",
                borderRadius: "9999px",
                background: "#111827",
                overflow: "hidden",
                marginBottom: "16px",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    height: "100%",
                    width: `${score}%`,
                    background: "#B22222",
                  },
                },
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontSize: "18px",
                opacity: 0.8,
              },
              children: "People don't leave reviews; they leave warnings.",
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
    }
  );
}
