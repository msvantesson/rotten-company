import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { buildCompanyEditPatch, isPatchNonEmpty } from "@/lib/company-edit-patch";
import { ALLOWED_EMPLOYEE_RANGE_VALUES } from "@/lib/constants/employee-ranges";

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

  // Validate proposed text fields using the patch helper
  const proposed = {
    name: body.name ?? null,
    website: body.website ?? null,
    industry: body.industry ?? null,
    description: body.description ?? null,
    country: body.country ?? null,
    hq_region: body.hq_region ?? null,
    hq_city: body.hq_city ?? null,
  };

  // Validate proposed name length if provided
  const proposedName = typeof proposed.name === "string" ? proposed.name.trim() : null;
  if (proposedName !== null && proposedName !== "" && proposedName.length < 2) {
    return new NextResponse("Company name must be at least 2 characters", { status: 400 });
  }

  // Parse size_employees: must be a canonical range value (e.g. "100001-250000")
  const sizeEmployeesRaw = body.size_employees ?? null;
  let sizeEmployeesValue: string | null = null;

  if (sizeEmployeesRaw !== null && sizeEmployeesRaw !== undefined && sizeEmployeesRaw !== "") {
    const raw = String(sizeEmployeesRaw).trim();
    if (!ALLOWED_EMPLOYEE_RANGE_VALUES.includes(raw)) {
      return new NextResponse(
        "size_employees must be a valid range value (e.g. '100001-250000')",
        { status: 400 }
      );
    }
    sizeEmployeesValue = raw;
  }

  const patch = buildCompanyEditPatch(proposed);
  if (!isPatchNonEmpty(patch) && sizeEmployeesValue === null) {
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
    proposed_name: proposedName || null,
    website: typeof patch.website === "string" ? patch.website : null,
    description: typeof patch.description === "string" ? patch.description : null,
    country: typeof patch.country === "string" ? patch.country : null,
    industry: typeof patch.industry === "string" ? patch.industry : null,
    hq_region: typeof patch.hq_region === "string" ? patch.hq_region : null,
    hq_city: typeof patch.hq_city === "string" ? patch.hq_city : null,
  };

  if (sizeEmployeesValue !== null) {
    insertRow.size_employees = sizeEmployeesValue;
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
