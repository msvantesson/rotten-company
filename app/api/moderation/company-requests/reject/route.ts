import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";

/* ─────────────────────────────────────────────
   Auth guard
───────────────────────────────────────────── */

async function requireModerator(cookieClient: any) {
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

/* ─────────────────────────────────────────────
   POST /api/moderation/company-requests/reject
───────────────────────────────────────────── */

export async function POST(req: Request) {
  // Cookie‑scoped client for auth only
  const cookieClient = await supabaseServer();

  // Service‑role client for authoritative writes
  const service = supabaseService();

  const guard = await requireModerator(cookieClient);
  if (!guard.ok) {
    return new NextResponse(guard.error, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const moderator_note = String(body?.moderator_note ?? "").trim();

  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  if (!moderator_note) {
    return new NextResponse("Moderator note is required", { status: 400 });
  }

  /* ─────────────────────────────────────────────
     Fetch request (authoritative)
  ───────────────────────────────────────────── */

  const { data: cr, error: crErr } = await service
    .from("company_requests")
    .select("id, status, name, user_id")
    .eq("id", id)
    .maybeSingle();

  if (crErr || !cr) {
    return new NextResponse("Company request not found", { status: 404 });
  }

  if (cr.status !== "pending") {
    return new NextResponse("Request is not pending", { status: 409 });
  }

  /* ─────────────────────────────────────────────
     Update request (belt‑and‑suspenders)
  ───────────────────────────────────────────── */

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
    return new NextResponse(
      `Failed to update request: ${updateErr.message}`,
      { status: 500 }
    );
  }

  if (!updated || updated.length === 0) {
    return new NextResponse(
      "Request update blocked or already processed",
      { status: 409 }
    );
  }

  /* ─────────────────────────────────────────────
     Moderation log
  ───────────────────────────────────────────── */

  const { error: logErr } = await service
    .from("moderation_actions")
    .insert({
      moderator_id: guard.userId,
      target_type: "company_request",
      target_id: id,
      action: "reject",
      moderator_note,
      source: "ui",
    });

  if (logErr) {
    return new NextResponse(
      `Failed to log action: ${logErr.message}`,
      { status: 500 }
    );
  }

  /* ─────────────────────────────────────────────
     Fetch contributor email
  ───────────────────────────────────────────── */

  let contributorEmail: string | null = null;

  if (cr.user_id) {
    const { data: userRow } = await service
      .from("users")
      .select("email")
      .eq("id", cr.user_id)
      .maybeSingle();

    contributorEmail = userRow?.email ?? null;
  }

  /* ─────────────────────────────────────────────
     Enqueue notification
  ───────────────────────────────────────────── */

  if (contributorEmail) {
    await service.from("notification_jobs").insert({
      recipient_email: contributorEmail,
      subject: "Your company request was rejected",
      body: `Hi,

Your request to add "${cr.name}" was rejected.

Reason:
${moderator_note}

— Rotten Company`,
      metadata: { requestId: id, action: "reject" },
      status: "pending",
    });
  }

  /* ─────────────────────────────────────────────
     Success
  ───────────────────────────────────────────── */

  return NextResponse.json({ ok: true });
}
