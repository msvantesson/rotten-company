import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

/**
 * POST /api/moderation/assign-company
 *
 * Assigns a specific company_request to a moderator.
 * Accepts { id, moderator_id } and performs atomic update.
 *
 * Returns:
 * - 200 { ok: true } on successful assignment
 * - 400 { ok: false, error: "..." } on missing/invalid params
 * - 409 { ok: false, error: "Already assigned" } if already assigned
 * - 500 { ok: false, error: "..." } on server errors
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, moderator_id } = body;

    if (!id || !moderator_id) {
      return NextResponse.json(
        { ok: false, error: "Missing id or moderator_id" },
        { status: 400 },
      );
    }

    const companyRequestId = typeof id === "number" ? id : parseInt(id, 10);
    if (Number.isNaN(companyRequestId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 },
      );
    }

    const supabase = supabaseService();

    // Verify moderator exists
    const { data: modRow, error: modErr } = await supabase
      .from("moderators")
      .select("user_id")
      .eq("user_id", moderator_id)
      .maybeSingle();

    if (modErr || !modRow) {
      console.error("[assign-company] moderator lookup failed", modErr);
      return NextResponse.json(
        { ok: false, error: "Invalid moderator" },
        { status: 400 },
      );
    }

    // Atomic update: only assign if status='pending' and assigned_moderator_id IS NULL
    const { data, error } = await supabase
      .from("company_requests")
      .update({
        assigned_moderator_id: moderator_id,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", companyRequestId)
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[assign-company] update error:", error);
      return NextResponse.json(
        { ok: false, error: error.message || "Update failed" },
        { status: 500 },
      );
    }

    if (!data) {
      // No rows updated - either already assigned or not pending
      return NextResponse.json(
        { ok: false, error: "Already assigned or not pending" },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[assign-company] exception:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
