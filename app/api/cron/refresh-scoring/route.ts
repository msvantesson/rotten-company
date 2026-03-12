export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const { CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!CRON_SECRET) {
  console.error("Missing CRON_SECRET env var");
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars");
}

function isValidSecret(incoming: string | null): boolean {
  if (!CRON_SECRET || !incoming) return false;
  try {
    const a = Buffer.from(CRON_SECRET, "utf8");
    const b = Buffer.from(incoming, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const incoming = req.headers.get("x-cron-secret");

  if (!isValidSecret(incoming)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "missing_supabase_env" }, { status: 500 });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/refresh_scoring_if_dirty`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trigger: "github-actions-cron" }),
      cache: "no-store",
    });

    const text = await res.text();
    return NextResponse.json(
      { ok: res.ok, status: res.status, body: text.slice(0, 2000) },
      { status: res.status }
    );
  } catch (e: any) {
    console.error("refresh-scoring cron error:", e?.message);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown_error" },
      { status: 500 }
    );
  }
}
