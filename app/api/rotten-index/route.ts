import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

type IndexType = "company" | "leader" | "owner";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const type = (searchParams.get("type") ?? "company") as IndexType;
  const limit = Number(searchParams.get("limit") ?? 25);
  const offset = Number(searchParams.get("offset") ?? 0);
  const country = searchParams.get("country")?.trim() || null;

  console.log("[rotten-index] request", { type, limit, offset, country });

  const supabase = await supabaseRoute();

  let query = supabase
    .from("global_rotten_index")
    .select("*")
    .eq("entity_type", type);

  // Country only applies to companies
  if (type === "company" && country) {
    query = query.eq("country", country);
  }

  const { data, error } = await query
    .order("rotten_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[rotten-index] query failed", error);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }

  console.log("[rotten-index] ok", { rows: data.length });

  return NextResponse.json({
    type,
    rows: data,
  });
}
