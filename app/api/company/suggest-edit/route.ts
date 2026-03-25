import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { buildCompanyEditPatch, isPatchNonEmpty } from "@/lib/company-edit-patch";
import { EMPLOYEE_RANGES } from "@/lib/constants/employee-ranges";

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
  };

  // Validate proposed name length if provided
  const proposedName = typeof proposed.name === "string" ? proposed.name.trim() : null;
  if (proposedName !== null && proposedName !== "" && proposedName.length < 2) {
    return new NextResponse("Company name must be at least 2 characters", { status: 400 });
  }

  // Parse size_employees: accept a range label (new) or a legacy integer string
  const sizeEmployeesRaw = body.size_employees ?? null;
  let sizeEmployeesLabel: string | null = null;
  let sizeEmployeesMin: number | null = null;

  if (sizeEmployeesRaw !== null && sizeEmployeesRaw !== undefined && sizeEmployeesRaw !== "") {
    const rangeEntry = EMPLOYEE_RANGES.find((r) => r.label === String(sizeEmployeesRaw));
    if (rangeEntry) {
      // New path: a known range label
      sizeEmployeesLabel = rangeEntry.label;
      sizeEmployeesMin = rangeEntry.min;
    } else {
      // Legacy path: try to parse as an integer
      const parsed = parseInt(String(sizeEmployeesRaw), 10);
      if (isNaN(parsed) || parsed < 0) {
        return new NextResponse(
          "size_employees must be a valid range label or an integer >= 0",
          { status: 400 }
        );
      }
      sizeEmployeesMin = parsed;
    }
  }

  const patch = buildCompanyEditPatch(proposed);
  if (!isPatchNonEmpty(patch) && sizeEmployeesMin === null) {
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
  };

  if (sizeEmployeesMin !== null) {
    insertRow.size_employees_min = sizeEmployeesMin;
  }
  if (sizeEmployeesLabel !== null) {
    // Store the range label so moderation can also update companies.size_employees_range
    insertRow.size_employees = sizeEmployeesLabel;
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
