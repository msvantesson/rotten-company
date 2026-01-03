import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

export async function POST(req: Request) {
  const supabase = await supabaseRoute();
  const body = await req.json();

  const { companySlug, categorySlug, score } = body;
  const parsedScore = Number(score);

  if (!companySlug || !categorySlug || isNaN(parsedScore)) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json(
      { error: "Failed to load user", details: userError.message },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // 🔍 Full debug log
  console.log("Rating request:", {
    companySlug,
    categorySlug,
    score: parsedScore,
    userId: user.id,
    email: user.email,
    metadata: user.user_metadata,
  });

  // 🔥 FIX: Upsert by ID only (avoid email unique constraint)
  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      moderation_credits: 0,
    },
    { onConflict: "id" } // ← THIS FIXES THE DUPLICATE EMAIL ERROR
  );

  if (upsertError) {
    console.error("User upsert failed:", upsertError);
    return NextResponse.json(
      { error: "User upsert failed", details: upsertError },
      { status: 500 }
    );
  }

  // Fetch company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", companySlug)
    .single();

  if (!company || companyError) {
    return NextResponse.json(
      { error: "Company not found", details: companyError?.message },
      { status: 404 }
    );
  }

  // Fetch category
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (!category || categoryError) {
    return NextResponse.json(
      { error: "Category not found", details: categoryError?.message },
      { status: 404 }
    );
  }

  // Insert rating
  const { error: insertError } = await supabase.from("ratings").upsert({
    user_id: user.id,
    company_id: company.id,
    category: category.id,
    score: parsedScore,
  });

  if (insertError) {
    console.error("Rating insert failed:", insertError);
    return NextResponse.json(
      { error: "Rating insert failed", details: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
