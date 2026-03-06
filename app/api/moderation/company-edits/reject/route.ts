import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";

async function requireModerator(cookieClient: Awaited<ReturnType<typeof supabaseServer>>) {
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user?.id) {
    return { ok: false as const, error: "Not authenticated" };
  }

  const { data: modRow } = await cookieClient
    .from("moderators")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!modRow) {
    return { ok: false as const, error: "Not a moderator" };
  }

  return { ok: true as const, userId: user.id };
}

export async function POST(req: Request) {
  const cookieClient = await supabaseServer();
  const service = supabaseService();

  const guard = await requireModerator(cookieClient);
  if (!guard.ok) {
    return new NextResponse(guard.error, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const moderator_note = String(body?.moderator_note ?? "").trim();

  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  if (!moderator_note) {
    return new NextResponse("Rejection reason is required", { status: 400 });
  }

  // Fetch the edit request — must be pending and have approved_company_id set
  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select("id, status, name, user_id")
    .eq("id", id)
    .not("approved_company_id", "is", null)
    .maybeSingle();

  if (crErr || !cr) {
    return new NextResponse("Edit request not found", { status: 404 });
  }

  if (cr.status !== "pending") {
    return new NextResponse("Request is not pending", { status: 409 });
  }

  // Update the request to rejected
  const { data: updated, error: updateErr } = await service
    .from("company_requests")
    .update({
      status: "rejected",
      moderator_id: guard.userId,
      decision_reason: moderator_note,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (updateErr) {
    return new NextResponse(`Failed to update request: ${updateErr.message}`, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return new NextResponse("Request already processed", { status: 409 });
  }

  // Log to moderation_actions
  const { error: logErr } = await service.from("moderation_actions").insert({
    moderator_id: guard.userId,
    target_type: "company_request",
    target_id: id,
    action: "reject",
    moderator_note,
    source: "ui",
  });

  if (logErr) {
    console.error("[company-edits/reject] failed to log action:", logErr.message);
  }

  return NextResponse.json({ ok: true });
}
