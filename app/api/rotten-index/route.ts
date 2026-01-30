import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type EntityType = "company" | "leader" | "owner";

function parseEntityType(value: string | null): EntityType {
  if (value === "leader" || value === "owner") return value;
  return "company";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const type = parseEntityType(url.searchParams.get("type"));
    const country = url.searchParams.get("country");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    const supabase = await supabaseServer();

    let query = supabase
      .from("global_rotten_index")
      .select("entity_type,id,name,slug,country,rotten_score")
      .eq("entity_type", type)
      .order("rotten_score", { ascending: false })
      .limit(limit);

    if (country && country.trim().length > 0) {
      query = query.eq("country", country.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error("[api/rotten-index] query error:", String(error));
      return NextResponse.json({ error: "query failed" }, { status: 500 });
    }

    return NextResponse.json({
      type,
      rows: data ?? [],
    });
  } catch (err) {
    console.error("[api/rotten-index] fatal:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
