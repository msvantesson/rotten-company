import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const body = await req.json();
    const { companySlug, categorySlug, score } = body;
    const parsedScore = Number(score);

    if (!companySlug || !categorySlug || isNaN(parsedScore)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Load authenticated user (this now works in Vercel)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[submit-rating:user-load]");
      return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { error: upsertError } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        moderation_credits: 0,
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("[submit-rating:user-upsert]");
      return NextResponse.json({ error: "User upsert failed" }, { status: 500 });
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", companySlug)
      .single();

    if (!company || companyError) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();

    if (!category || categoryError) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { data: ratingRow, error: ratingError } = await supabase
      .from("ratings")
      .upsert(
        {
          user_id: user.id,
          company_id: company.id,
          category: category.id,
          score: parsedScore,
        },
        { onConflict: "user_id,company_id,category" }
      )
      .select("id, user_id, company_id, category, score, created_at")
      .single();

    if (ratingError) {
      const ratingErrorCode =
        typeof ratingError === "object" &&
        ratingError !== null &&
        "code" in ratingError &&
        typeof ratingError.code === "string"
          ? ratingError.code
          : null;
      const ratingErrorConstraint =
        typeof ratingError === "object" &&
        ratingError !== null &&
        "constraint" in ratingError &&
        typeof ratingError.constraint === "string"
          ? ratingError.constraint
          : null;

      if (
        ratingErrorCode === "23505" &&
        ratingErrorConstraint !== "ratings_user_id_company_id_category_key"
      ) {
        return NextResponse.json(
          { error: "Rating already exists for this category." },
          { status: 409 }
        );
      }

      console.error("[submit-rating:rating-upsert]");
      return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
    }

    return NextResponse.json({ success: true, rating: ratingRow });
  } catch {
    console.error("[submit-rating:unhandled]");
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
