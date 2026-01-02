// /app/api/submit-rating/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  // Create SSR Supabase client
  const supabase = await supabaseServer();

  // Parse request body
  const { companySlug, categorySlug, score } = await req.json();

  // Validate input
  if (!companySlug || !categorySlug || !score) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Look up company ID
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", companySlug)
    .single();

  if (companyError || !company) {
    return NextResponse.json(
      { error: "Company not found" },
      { status: 404 }
    );
  }

  // Look up category ID
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (categoryError || !category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  // Insert rating (RLS enforces user_id = auth.uid())
  const { error: insertError } = await supabase.from("ratings").insert({
    company_id: company.id,
    category: category.id,
    score,
    user_id: user.id,
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
