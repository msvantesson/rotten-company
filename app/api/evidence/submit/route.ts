// app/api/evidence/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

async function resolveCategoryId(supabase: any, rawCategory: string | null) {
  if (!rawCategory) return null;
  const trimmed = rawCategory.trim();

  // numeric id
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

  // slug
  const slugRes = await supabase
    .from("categories")
    .select("id")
    .ilike("slug", trimmed)
    .limit(1)
    .maybeSingle();

  if (slugRes?.data?.id) return slugRes.data.id;

  // name
  const nameRes = await supabase
    .from("categories")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (nameRes?.data?.id) return nameRes.data.id;

  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseRoute();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = String(formData.get("entityType") ?? "").trim();
    const entityId = String(formData.get("entityId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const rawCategory = String(formData.get("category") ?? "").trim();

    if (!file || !entityType || !entityId) {
      return NextResponse.json({ error: "missing required fields" }, { status: 400 });
    }

    // Build safe filename
    const timestamp = Date.now();
    const sanitizedTitle = (title || "evidence")
      .replace(/[^a-z0-9\-_.]/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
    const ext = (file.name?.split(".").pop() ?? "bin").replace(/[^a-z0-9]/gi, "");
    const path = `${entityType}/${entityId}/${timestamp}-${sanitizedTitle}.${ext}`;

    // Upload file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      return NextResponse.json({ error: "storage upload failed" }, { status: 500 });
    }

    // Authenticated user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const userId = authUser?.id ?? null;
    const userEmail = authUser?.email ?? null;

    // Resolve category
    const DEFAULT_CATEGORY_ID = 1;
    let resolvedCategoryId = await resolveCategoryId(supabase, rawCategory);
    if (resolvedCategoryId === null) {
      console.warn(`Category "${rawCategory}" not resolved — falling back to ${DEFAULT_CATEGORY_ID}`);
      resolvedCategoryId = DEFAULT_CATEGORY_ID;
    }

    // Insert evidence row
    const insertPayload: Record<string, any> = {
      title,
      summary: null,
      company_id: entityType === "company" ? Number(entityId) : null,
      leader_id: null,
      manager_id: null,
      owner_id: null,
      customer_flag: false,
      file_url: null,
      status: "pending",
      user_id: userId,
      category: resolvedCategoryId,
      file_type: file.type ?? null,
      file_size: Number(file.size ?? 0),
      entity_id: Number(entityId) || null,
      entity_type: entityType,
      file_path: path,
      evidence_type: "misconduct",
    };

    const { data: insertData, error: insertError } = await supabase
      .from("evidence")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !insertData) {
      console.error("db insert error:", insertError);
      await supabase.storage.from("evidence").remove([path]);
      return NextResponse.json(
        {
          error: "db insert failed",
          dbError: {
            message: insertError?.message,
            details: insertError?.details,
            hint: insertError?.hint,
            code: insertError?.code,
          },
        },
        { status: 500 }
      );
    }

    // Create notification job (Fix A)
    const { data: jobData, error: jobError } = await supabase
      .from("notification_jobs")
      .insert({
        recipient_email: userEmail, // REQUIRED
        subject: `New evidence submitted: ${insertData.id}`,
        body: `Evidence ${insertData.id} submitted by ${userEmail}`,
        metadata: { evidence_id: insertData.id },
        status: "pending",
      })
      .select()
      .single();

    if (jobError) {
      console.warn("job insert warning:", jobError);
    }

    return NextResponse.json(
      { success: true, evidenceId: insertData.id, jobId: jobData?.id ?? null },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "unexpected error", details: String(err) }, { status: 500 });
  }
}
