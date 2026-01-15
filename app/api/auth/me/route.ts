import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

export async function GET(req: Request) {
  try {
    const supabase = await supabaseRoute();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn("supabase.auth.getUser error:", error);
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: user ?? null }, { status: 200 });
  } catch (err) {
    console.error("Unexpected /api/auth/me error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
