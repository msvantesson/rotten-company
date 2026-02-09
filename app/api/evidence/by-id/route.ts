import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = supabaseService();

  const { data, error } = await supabase
    .from("evidence")
    .select(
      "id, title, summary, file_url, created_at, category, user_id, entity_type, entity_id"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
