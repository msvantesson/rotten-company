// /app/api/submit-rating/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const body = await req.json();

  const { companySlug, categorySlug, score } = body;

  if (!companySlug || !categorySlug || typeof score !== "number") {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Get logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // ✅ Ensure user exists in `users` table
  await supabase.from("users").upsert({
    id: user.id,
    email: user.email,
    name: user.user_metadata.full_name ?? null,
    avatar_url: user.user_metadata.avatar_url ?? null,
    moderation_credits: 0,
  });

  // Get company ID
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", companySlug)
    .single();

  if (!company) {
    return NextResponse.json(
      { error: "Company not found" },
      { status: 404 }
    );
  }

  // Get category ID
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!category) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  // Insert or update rating
  const { error: insertError } = await supabase
    .from("ratings")
    .upsert({
      user_id: user.id,
      company_id: company.id,
      category: category.id,
      score,
    });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
