import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { getSsrUser } from "@/lib/get-ssr-user";

/**
 * POST /api/moderation/claim-next
 * 
 * Client-side claim API that calls the claim_next_moderation_item RPC
 * server-side using the service client. This avoids SSR/hydration issues
 * and makes the claim button reliable.
 * 
 * Returns JSON: { ok: boolean, data?: { kind, item_id }, error?: string }
 */

type ClaimRow = { kind: "evidence" | "company_request"; item_id: string };

export async function POST(req: Request) {
  try {
    // Get authenticated user
    const user = await getSsrUser();
    
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const moderatorId = user.id;

    // Use service client to claim next moderation item
    const service = supabaseService();
    
    const { data, error } = await service.rpc("claim_next_moderation_item", {
      p_moderator_id: moderatorId,
    });

    if (error) {
      console.error("[claim-next API] RPC error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const row: ClaimRow | null = 
      Array.isArray(data) && data.length > 0 ? data[0] as ClaimRow : null;

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "No items available to claim" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: row,
    });
  } catch (err) {
    console.error("[claim-next API] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
