import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { logDebug } from "@/lib/log";

export async function POST(req: NextRequest) {
  const supabase = supabaseService();

  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const why = String(body.why || "").trim();
    const ceoName = String(body.ceo_name || "").trim();
    const ceoLinkedinUrl = String(body.ceo_linkedin_url || "").trim();
    const ceoStartedAt = String(body.ceo_started_at || "").trim();

    if (!name || !why) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Validate CEO started_at format if provided
    if (ceoStartedAt && !/^\d{4}-\d{2}-\d{2}$/.test(ceoStartedAt)) {
      return new NextResponse("Invalid CEO start date format (use YYYY-MM-DD)", {
        status: 400,
      });
    }

    const payload = {
      name,
      country: body.country || null,
      website: body.website || null,
      description: body.description || null,
      why,
      user_id: null, // user is optional for now
      status: "pending",
    };

    logDebug("company-request-api", "Inserting request", payload);

    const { data, error } = await supabase
      .from("company_requests")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logDebug("company-request-api", "Insert error", error);
      return new NextResponse("Failed to create request", { status: 500 });
    }

    // Insert CEO staging data if CEO name is provided
    if (ceoName) {
      const ceoPayload = {
        company_request_id: data.id,
        leader_name: ceoName,
        started_at: ceoStartedAt || new Date().toISOString().split("T")[0], // Default to today
        ended_at: null,
        role: "ceo",
        linkedin_url: ceoLinkedinUrl || null,
      };

      logDebug("company-request-api", "Inserting CEO staging", ceoPayload);

      const { error: ceoError } = await supabase
        .from("company_request_leader_tenures")
        .insert(ceoPayload);

      if (ceoError) {
        logDebug("company-request-api", "CEO staging insert error", ceoError);
        // Note: We don't fail the entire request if CEO staging fails
        // The company request was already created successfully
      }
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
