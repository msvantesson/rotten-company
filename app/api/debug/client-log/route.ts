// app/api/debug/client-log/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("[CLIENT-LOG]", JSON.stringify(payload));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CLIENT-LOG] parse error", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
