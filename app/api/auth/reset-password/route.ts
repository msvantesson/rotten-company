import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";

export async function POST(req: Request) {
  const service = supabaseService();

  let token: string | null = null;
  let newPassword: string | null = null;

  try {
    const body = await req.json();
    token = String(body.token || "").trim();
    newPassword = String(body.new_password || "").trim();
  } catch {
    return new NextResponse("Invalid request", { status: 400 });
  }

  if (!token || !newPassword) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  // ─────────────────────────────────────────────
  // 1. Fetch token row
  // ─────────────────────────────────────────────

  const { data: tokenRow } = await service
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) {
    return new NextResponse("Invalid token", { status: 400 });
  }

  if (tokenRow.used_at) {
    return new NextResponse("Token already used", { status: 400 });
  }

  const now = Date.now();
  const expiresAt = new Date(tokenRow.expires_at).getTime();

  if (now > expiresAt) {
    return new NextResponse("Token expired", { status: 400 });
  }

  // ─────────────────────────────────────────────
  // 2. Update password via Supabase Admin API
  // ─────────────────────────────────────────────

  const { error: pwError } = await service.auth.admin.updateUserById(
    tokenRow.user_id,
    { password: newPassword }
  );

  if (pwError) {
    console.error("[reset-password] updateUserById failed", pwError);
    return new NextResponse("Password update failed", { status: 500 });
  }

  // ─────────────────────────────────────────────
  // 3. Mark token as used
  // ─────────────────────────────────────────────

  await service
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  // ─────────────────────────────────────────────
  // 4. Success
  // ─────────────────────────────────────────────

  return NextResponse.json({ ok: true });
}
