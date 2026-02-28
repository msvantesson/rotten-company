import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { getModerationGateStatus } from "@/lib/moderation-guards";

export async function POST(req: NextRequest) {
  // Auth check
  const userClient = await supabaseServer();
  const { data: auth } = await userClient.auth.getUser();
  const userId = auth.user?.id ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Gate check (Rule A): user must have completed required moderations
  const gate = await getModerationGateStatus();
  if (!gate.allowed) {
    console.warn("[leader-tenure-requests POST] authorization failed", {
      userId,
      allowed: gate.allowed,
    });
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const service = supabaseService();

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    company_id,
    request_type,
    role,
    leader_name,
    linkedin_url,
    started_at,
    ended_at,
    target_tenure_id,
  } = body;

  if (!company_id || !request_type || !role) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (request_type === "add") {
    if (!leader_name || !leader_name.trim()) {
      return NextResponse.json(
        { error: "leader_name is required for add requests." },
        { status: 400 },
      );
    }
    if (!started_at) {
      return NextResponse.json(
        { error: "started_at is required for add requests." },
        { status: 400 },
      );
    }
  } else if (request_type === "end") {
    if (!target_tenure_id) {
      return NextResponse.json(
        { error: "target_tenure_id is required for end requests." },
        { status: 400 },
      );
    }
    if (!ended_at) {
      return NextResponse.json(
        { error: "ended_at is required for end requests." },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ error: "Invalid request_type." }, { status: 400 });
  }

  const { data, error } = await service
    .from("leader_tenure_requests")
    .insert({
      company_id: Number(company_id),
      request_type,
      role,
      leader_name: leader_name ?? null,
      linkedin_url: linkedin_url ?? null,
      started_at: started_at ?? null,
      ended_at: ended_at ?? null,
      target_tenure_id: target_tenure_id ? Number(target_tenure_id) : null,
      user_id: userId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[leader-tenure-requests POST] insert failed:", error.message);
    return NextResponse.json({ error: "Failed to create request." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
