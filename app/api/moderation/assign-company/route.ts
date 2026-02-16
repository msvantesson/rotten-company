import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

/**
 * POST /api/moderation/assign-company
 * 
 * Client-callable API that accepts { id, moderator_id } and atomically
 * assigns the moderator to a company_request row.
 * 
 * Returns 200 on success, 409 if already assigned, 500 on error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = body?.id as string | undefined;
    const moderatorId = body?.moderator_id as string | undefined;

    if (!id || !moderatorId) {
      return NextResponse.json(
        { ok: false, error: "Missing id or moderator_id" },
        { status: 400 }
      );
    }

    const service = supabaseService();

    // Verify moderator exists
    const { data: modRow, error: modErr } = await service
      .from("moderators")
      .select("user_id")
      .eq("user_id", moderatorId)
      .maybeSingle();

    if (modErr || !modRow) {
      console.error("[assign-company] moderator lookup failed", modErr);
      return NextResponse.json(
        { ok: false, error: "Invalid moderator" },
        { status: 403 }
      );
    }

    // Atomically assign the moderator to a pending, unassigned company_request
    const { data, error } = await service
      .from("company_requests")
      .update({
        assigned_moderator_id: moderatorId,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .is("assigned_moderator_id", null)
      .select("id");

    if (error) {
      console.error("[assign-company] update failed", error);
      return NextResponse.json(
        { ok: false, error: error.message ?? "Failed to assign company request" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      // Either doesn't exist, not pending, or already assigned
      return NextResponse.json(
        { ok: false, error: "Company request not available for assignment" },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[assign-company] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
