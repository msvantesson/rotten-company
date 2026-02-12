export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn("/api/auth/me supabase.auth.getUser error:", error);
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: user ?? null }, { status: 200 });
  } catch (err) {
    console.error("Unexpected /api/auth/me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
