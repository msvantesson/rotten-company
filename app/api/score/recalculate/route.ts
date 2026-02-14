import { NextResponse } from "next/server";
import { supabaseBrowser } from "@/lib/supabase-browser";

const supabase = supabaseBrowser();

export async function POST() {
  try {
    // Recalculate scores for all companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id");

    if (companiesError) {
      console.error("[recalculate] failed to load companies", companiesError);
      return NextResponse.json(
        { error: "Failed to load companies" },
        { status: 500 },
      );
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json(
        { ok: true, companiesProcessed: 0 },
        { status: 200 },
      );
    }

    // Recalculate scores for each company
    // Note: This endpoint currently does not perform actual score recalculation.
    // Implementation needed: Import and call the score calculation function for each company.
    for (const _c of companies) {
      // TODO: Implement score recalculation
      // Example: await computeRottenScore({ companyId: _c.id, ... });
    }

    return NextResponse.json(
      { ok: true, companiesProcessed: companies.length },
      { status: 200 },
    );
  } catch (err) {
    console.error("[recalculate] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected error during recalculation" },
      { status: 500 },
    );
  }
}
