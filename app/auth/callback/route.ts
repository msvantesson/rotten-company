import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  const safeNext = next.startsWith("/") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL(safeNext, url));
  }

  const supabase = await supabaseRoute();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", url));
  }

  return NextResponse.redirect(new URL(safeNext, url));
}
