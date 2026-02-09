import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id)) {
    return NextResponse.json({}, { status: 400 });
  }

  const db = supabaseService();

  const { data: evidence } = await db
    .from("evidence")
    .select("status, assigned_moderator_id")
    .eq("id", id)
    .single();

  const { data: history } = await db
    .from("moderation_actions")
    .select("action, moderator_id, note, created_at")
    .eq("target_type", "evidence")
    .eq("target_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    status: evidence?.status ?? "pending",
    assigned_moderator_id: evidence?.assigned_moderator_id ?? null,
    history: history ?? [],
  });
}
