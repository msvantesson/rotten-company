// app/api/evidence/submit/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const start = Date.now();
  console.log("[EVIDENCE-SUBMIT] handler start:", new Date().toISOString());

  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[EVIDENCE-SUBMIT] invalid JSON body:", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { entityType, entityId, title, category, fileUrl } = body ?? {};
  console.log("[EVIDENCE-SUBMIT] received:", { entityType, entityId, title, category, fileUrl });

  // Validate required fields
  if (!entityType || !entityId || !title) {
    console.warn("[EVIDENCE-SUBMIT] missing required fields");
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Resolve category
  let categoryId = 1; // fallback to "general"
  try {
    const supabase = await supabaseServer();
    const { data: categoryRow, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();

    if (categoryError) {
      console.warn("[EVIDENCE-SUBMIT] category lookup error:", categoryError.message);
    }

    if (categoryRow?.id) {
      categoryId = categoryRow.id;
    } else {
      console.warn(`[EVIDENCE-SUBMIT] Category "${category}" not resolved — falling back to 1`);
    }

    // Get authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user?.id) {
      console.error("[EVIDENCE-SUBMIT] auth error or missing user:", authError?.message);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authData.user.id;

    // Insert evidence
    const { data: inserted, error: insertError } = await supabase
      .from("evidence")
      .insert([
        {
          entity_type: entityType,
          entity_id: entityId,
          title,
          category: categoryId,
          user_id: userId,
          file_url: fileUrl ?? null,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("[EVIDENCE-SUBMIT] insert error:", insertError.message);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    console.log("[EVIDENCE-SUBMIT] inserted:", inserted?.id, "user_id:", inserted?.user_id, "durationMs:", Date.now() - start);
    return NextResponse.json({ id: inserted.id, ok: true });
  } catch (err) {
    console.error("[EVIDENCE-SUBMIT] unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
