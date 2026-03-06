import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { buildCompanyEditPatch, isPatchNonEmpty } from "@/lib/company-edit-patch";

export async function POST(req: Request) {
  const cookieClient = await supabaseServer();

  // Must be logged in
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user) {
    return new NextResponse("Not authenticated", { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const companySlug = String(body.companySlug ?? "").trim();
  if (!companySlug) {
    return new NextResponse("Missing companySlug", { status: 400 });
  }

  const why = String(body.why ?? "").trim();
  if (!why) {
    return new NextResponse("Field 'why' is required", { status: 400 });
  }

  // Validate proposed fields using the patch helper
  const proposed = {
    website: body.website ?? null,
    industry: body.industry ?? null,
    description: body.description ?? null,
    country: body.country ?? null,
    size_employees: body.size_employees ?? null,
  };

  // Validate size_employees if provided
  if (proposed.size_employees !== null && proposed.size_employees !== undefined && proposed.size_employees !== "") {
    const parsed = parseInt(String(proposed.size_employees), 10);
    if (isNaN(parsed) || parsed < 0) {
      return new NextResponse("size_employees must be an integer >= 0", { status: 400 });
    }
  }

  const patch = buildCompanyEditPatch(proposed);
  if (!isPatchNonEmpty(patch)) {
    return new NextResponse("No fields to update — all proposed values are empty", { status: 400 });
  }

  const service = supabaseService();

  // Look up the company by slug
  const { data: company, error: companyErr } = await service
    .from("companies")
    .select("id, name")
    .eq("slug", companySlug)
    .maybeSingle();

  if (companyErr || !company) {
    return new NextResponse("Company not found", { status: 404 });
  }

  // Build the company_requests row for an edit suggestion.
  // approved_company_id = the company being edited (distinguishes edits from new-company requests).
  const insertRow: Record<string, unknown> = {
    name: company.name,
    why,
    status: "pending",
    user_id: user.id,
    approved_company_id: company.id,
    website: typeof patch.website === "string" ? patch.website : null,
    description: typeof patch.description === "string" ? patch.description : null,
    country: typeof patch.country === "string" ? patch.country : null,
    industry: typeof patch.industry === "string" ? patch.industry : null,
  };

  if (patch.size_employees !== undefined) {
    insertRow.size_employees_min = patch.size_employees;
  }

  const { data: inserted, error: insertErr } = await service
    .from("company_requests")
    .insert(insertRow)
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[suggest-edit] insert failed:", insertErr?.message);
    return new NextResponse("Failed to submit suggestion", { status: 500 });
  }

  return NextResponse.json({ ok: true, requestId: inserted.id });
}
