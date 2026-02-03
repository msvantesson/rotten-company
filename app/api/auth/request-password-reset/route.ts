import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import crypto from "crypto";

export async function POST(req: Request) {
  const service = supabaseService();

  let email: string | null = null;

  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
  } catch {
    return new NextResponse("Invalid request", { status: 400 });
  }

  if (!email) {
    return new NextResponse("Missing email", { status: 400 });
  }

  // ─────────────────────────────────────────────
  // 1. Look up user (but never reveal existence)
  // ─────────────────────────────────────────────

  const { data: userRow } = await service
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  // Always return ok, even if user does not exist
  // to avoid account enumeration.
  if (!userRow) {
    return NextResponse.json({ ok: true });
  }

  const userId = userRow.id;

  // ─────────────────────────────────────────────
  // 2. Generate secure token
  // ─────────────────────────────────────────────

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

  await service.from("password_reset_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });

  // ─────────────────────────────────────────────
  // 3. Build reset link
  // ─────────────────────────────────────────────

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://rotten-company.com";

  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // ─────────────────────────────────────────────
  // 4. Enqueue notification job
  // ─────────────────────────────────────────────

  await service.from("notification_jobs").insert({
    recipient_email: email,
    subject: "Reset your Rotten Company password",
    body: `Hi,

We received a request to reset your Rotten Company password.

Click the link below to choose a new password:

${resetUrl}

If you did not request this, you can safely ignore this email.

— Rotten Company`,
    metadata: { userId, action: "password_reset_request" },
    status: "pending",
  });

  return NextResponse.json({ ok: true });
}
