import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

/**
 * GET /api/debug/company-request?id=<id>
 * Temporary debug endpoint to validate that supabaseService() can read a row
 * in production. Returns JSON with the row or error message.
 *
 * Remove this file after debugging.
 */

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const service = supabaseService();
    const { data, error } = await service
      .from("company_requests")
      .select("id, name, status, user_id, assigned_moderator_id, assigned_at, created_at")
      .eq("id", id)
      .maybeSingle();

    return NextResponse.json({ ok: true, data, error: error ? error.message : null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
