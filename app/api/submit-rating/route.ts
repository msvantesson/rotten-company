// /app/api/submit-rating/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { companySlug, categorySlug, score } = await req.json();

  // 1. Validate input
  if (!companySlug || !categorySlug || !score) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // 2. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 3. Look up company
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

  // 4. Look up category
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

  // 5. Insert rating (RLS enforces user_id = auth.uid())
  const { error: insertError } = await supabase.from("ratings").insert({
    company_id: company.id,
    category: category.id,
    score,
    user_id: user.id, // RLS will verify this matches auth.uid()
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
