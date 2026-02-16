import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

/**
 * POST /api/moderation/claim-next
 * 
 * Client-callable claim API that accepts { moderator_id } and calls
 * the service RPC claim_next_moderation_item using service role.
 * 
 * Returns JSON { ok: true, data } or { ok: false, error }.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const moderatorId = body?.moderator_id as string | undefined;

    if (!moderatorId) {
      return NextResponse.json(
        { ok: false, error: "Missing moderator_id" },
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
      console.error("[claim-next] moderator lookup failed", modErr);
      return NextResponse.json(
        { ok: false, error: "Invalid moderator" },
        { status: 403 }
      );
    }

    // Call RPC to claim next moderation item
    const { data, error } = await service.rpc("claim_next_moderation_item", {
      p_moderator_id: moderatorId,
    });

    if (error) {
      console.error("[claim-next] claim RPC error", error);
      return NextResponse.json(
        { ok: false, error: error.message ?? "Failed to claim item" },
        { status: 500 }
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "No items available to claim" },
        { status: 404 }
      );
    }

    // Return the claimed item
    const item = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ ok: true, data: item });
  } catch (err) {
    console.error("[claim-next] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
