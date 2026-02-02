import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { logDebug } from "@/lib/log";

export async function POST(req: NextRequest) {
  const supabase = supabaseService();

  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const why = String(body.why || "").trim();

    if (!name || !why) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const payload = {
      name,
      country: body.country || null,
      website: body.website || null,
      description: body.description || null,
      why,
      user_id: null, // TODO: wire in auth
      status: "pending",
    };

    logDebug("company-request-api", "Inserting", payload);

    const { data, error } = await supabase
      .from("company_requests")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logDebug("company-request-api", "Insert error", error);
      return new NextResponse("Failed to create request", { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id, redirectTo: null });
  } catch (err: any) {
    logDebug("company-request-api", "Unhandled error", {
      message: err?.message,
      stack: err?.stack,
    });
    return new NextResponse("Internal server error", { status: 500 });
  }
}
