export const runtime = "nodejs";

import { NextResponse } from "next/server";

const {
  CRON_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  EDGE_FUNCTION_SECRET,
} = process.env;

export async function GET(req: Request) {
  // Protect against unauthorised callers.
  const incomingCronSecret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || incomingCronSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[refresh-scoring cron] Missing Supabase env vars");
    return NextResponse.json(
      { ok: false, error: "missing_supabase_env_vars" },
      { status: 500 },
    );
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/refresh_scoring_if_dirty`;
  const bearerToken = EDGE_FUNCTION_SECRET || SUPABASE_SERVICE_ROLE_KEY;

  try {
    const res = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(
        "[refresh-scoring cron] Edge function returned non-2xx:",
        res.status,
        body,
      );
      return NextResponse.json(
        { ok: false, status: res.status, body },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true, body });
  } catch (err) {
    console.error("[refresh-scoring cron] Fetch error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 200 },
    );
  }
}

// Allow POST as well (e.g. manual triggers or webhook-style callers).
export async function POST(req: Request) {
  return GET(req);
}
