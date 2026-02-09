import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "invalid_id" },
      { status: 400 }
    );
  }

  const supabase = supabaseService();

  const { data: evidence, error: evErr } = await supabase
    .from("evidence")
    .select("status, assigned_moderator_id")
    .eq("id", id)
    .single();

  if (evErr || !evidence) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404 }
    );
  }

  const { data: history } = await supabase
    .from("moderation_actions")
    .select("action, moderator_id, moderator_note, created_at")
    .eq("target_type", "evidence")
    .eq("target_id", String(id))
    .order("created_at", { ascending: true });

  return NextResponse.json({
    status: evidence.status,
    assigned_moderator_id: evidence.assigned_moderator_id,
    history: history ?? [],
  });
}
