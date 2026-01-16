// app/api/debug/my-evidence/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

export async function GET(req: Request) {
  try {
    const supabase = await supabaseRoute();

    // read id from query string ?id=632
    const url = new URL(req.url);
    const idParam = url.searchParams.get("id");
    const evidenceId = idParam ? Number(idParam) : null;

    // get server-side auth user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const authUser = userData?.user ?? null;

    // fetch evidence if id provided
    let evidence = null;
    let evidenceErr = null;
    if (evidenceId) {
      const res = await supabase.from("evidence").select("*").eq("id", evidenceId).maybeSingle();
      evidence = res.data ?? null;
      evidenceErr = res.error ?? null;
    }

    // return everything as JSON for easy inspection
    return NextResponse.json({
      ok: true,
      authUser: authUser ? { id: authUser.id, email: authUser.email } : null,
      userErr: userErr ?? null,
      evidenceId,
      evidence,
      evidenceErr,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
