import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

function isIntegerScore(score: unknown): score is number {
  return typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 5;
}

function validationError(field: string, message: string) {
  return NextResponse.json(
    { error: "invalid_request", field, message },
    { status: 400 }
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return validationError("body", "Invalid JSON body");
    }

    const payload = body as Record<string, unknown> | null;
    const companySlug = payload?.companySlug;
    const categorySlug = payload?.categorySlug;
    const score = payload?.score;

    if (typeof companySlug !== "string" || companySlug.trim() === "") {
      return validationError("companySlug", "companySlug is required");
    }
    if (typeof categorySlug !== "string" || categorySlug.trim() === "") {
      return validationError("categorySlug", "categorySlug is required");
    }
    if (!isIntegerScore(score)) {
      return validationError("score", "score must be an integer from 1 to 5");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[submit-rating:user-load]");
      return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
          score,
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

      if (ratingErrorCode === "23505" && ratingErrorConstraint === "ratings_user_id_company_id_category_key") {
        return NextResponse.json({ error: "Rating already exists for this category." }, { status: 409 });
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
