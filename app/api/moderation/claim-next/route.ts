import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

/**
 * POST /api/moderation/claim-next
 *
 * Client-callable API to claim the next available moderation item.
 * Accepts { moderator_id } and calls the claim_next_moderation_item RPC.
 *
 * Returns:
 * - 200 { ok: true, data: { kind, item_id } } on success
 * - 400 { ok: false, error: "..." } on missing moderator_id
 * - 404 { ok: false, error: "No items available" } when nothing to claim
 * - 500 { ok: false, error: "..." } on RPC or server errors
 */

type ClaimRow = { kind: "evidence" | "company_request"; item_id: string };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const moderatorId = body.moderator_id;

    if (!moderatorId || typeof moderatorId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid moderator_id" },
        { status: 400 },
      );
    }

    const supabase = supabaseService();

    // Verify moderator exists
    const { data: modRow, error: modErr } = await supabase
      .from("moderators")
      .select("user_id")
      .eq("user_id", moderatorId)
      .maybeSingle();

    if (modErr || !modRow) {
      console.error("[claim-next] moderator lookup failed", modErr);
      return NextResponse.json(
        { ok: false, error: "Invalid moderator" },
        { status: 400 },
      );
    }

    // Call the RPC to claim next item
    const { data, error } = await supabase.rpc("claim_next_moderation_item", {
      p_moderator_id: moderatorId,
    });

    if (error) {
      console.error("[claim-next] RPC error:", error);
      return NextResponse.json(
        { ok: false, error: error.message || "RPC failed" },
        { status: 500 },
      );
    }

    const row: ClaimRow | null =
      Array.isArray(data) && data.length > 0 ? (data[0] as ClaimRow) : null;

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "No items available" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: row });
  } catch (err) {
    console.error("[claim-next] exception:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
