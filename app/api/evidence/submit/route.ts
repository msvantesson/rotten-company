// app/api/evidence/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

type JsonResponse =
  | { success: true; evidenceId: number | string; jobId: number | null }
  | { success?: false; error: string; dbError?: any; details?: string };

async function resolveCategoryId(supabase: any, rawCategory: string | null) {
  // If empty, return null (caller may decide default)
  if (!rawCategory) return null;

  const trimmed = rawCategory.trim();

  // If numeric string, return parsed int
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Try to find by slug (case-insensitive) or name
  // Try slug first, then name
  const slugRes = await supabase
    .from("categories")
    .select("id")
    .ilike("slug", trimmed)
    .limit(1)
    .maybeSingle();

  if (slugRes?.data?.id) return slugRes.data.id;

  const nameRes = await supabase
    .from("categories")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (nameRes?.data?.id) return nameRes.data.id;

  // Not found
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseRoute();

    // parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = String(formData.get("entityType") ?? "").trim();
    const entityId = String(formData.get("entityId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const rawCategory = String(formData.get("category") ?? "").trim();

    if (!file || !entityType || !entityId) {
      return NextResponse.json({ error: "missing required fields" }, { status: 400 });
    }

    // Build safe filename and path
    const timestamp = Date.now();
    const sanitizedTitle = (title || "evidence")
      .replace(/[^a-z0-9\-_.]/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
    const ext = (file.name?.split(".").pop() ?? "bin").replace(/[^a-z0-9]/gi, "");
    const path = `${entityType}/${entityId}/${timestamp}-${sanitizedTitle}.${ext}`;

    // Convert File -> Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      return NextResponse.json({ error: "storage upload failed", details: String(uploadError) }, { status: 500 });
    }

    // Get authenticated user (server-side)
    const {
      data: { user: authUser },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      console.warn("supabase.auth.getUser warning:", userErr);
    }

    const userId = authUser?.id ?? null;

    // Resolve category id (schema expects integer in `category`)
    const resolvedCategoryId = await resolveCategoryId(supabase, rawCategory);

    // If category is required by schema and not resolved, choose a safe fallback or return error.
    // Your schema shows `category integer NOT NULL` with a CHECK list; choose policy:
    // - Option A: return error so client must provide a valid category id/slug/name
    // - Option B: fallback to a default category id (e.g., 1)
    //
    // Here we return an error to avoid inserting an invalid category silently.
    if (resolvedCategoryId === null) {
      // cleanup uploaded file
      try {
        await supabase.storage.from("evidence").remove([path]);
      } catch (cleanupErr) {
        console.warn("cleanup failed:", cleanupErr);
      }
      return NextResponse.json(
        { error: "invalid or unknown category. Provide a category id, slug, or exact name." },
        { status: 400 }
      );
    }

    // Build insert payload
    const insertPayload: Record<string, any> = {
      title,
      summary: null,
      company_id: null,
      leader_id: null,
      manager_id: null,
      owner_id: null,
      customer_flag: false,
      file_url: null,
      status: "pending",
      user_id: userId,
      category: resolvedCategoryId, // integer column in your schema
      file_type: file.type ?? null,
      file_size: Number(file.size ?? 0),
      entity_id: Number(entityId) || null,
      entity_type: entityType,
      file_path: path,
      evidence_type: "misconduct",
    };

    // If your schema expects company_id when entity_type === 'company', set it
    if (entityType === "company") {
      // entityId may be string; try to parse to integer for company_id
      const parsed = Number(entityId);
      if (!Number.isNaN(parsed)) insertPayload.company_id = parsed;
    }

    // Attempt DB insert
    const { data: insertData, error: insertError } = await supabase
      .from("evidence")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !insertData) {
      console.error("db insert error:", insertError);

      // cleanup uploaded file on failure
      try {
        await supabase.storage.from("evidence").remove([path]);
      } catch (cleanupErr) {
        console.warn("cleanup failed:", cleanupErr);
      }

      return NextResponse.json(
        {
          error: "db insert failed",
          dbError: {
            message: insertError?.message ?? null,
            details: insertError?.details ?? null,
            hint: insertError?.hint ?? null,
            code: insertError?.code ?? null,
          },
        },
        { status: 500 }
      );
    }

    // Create notification job (best-effort)
    const { data: jobData, error: jobError } = await supabase
      .from("notification_jobs")
      .insert({
        type: "evidence_submitted",
        payload: { evidence_id: insertData.id },
        status: "pending",
      })
      .select()
      .single();

    if (jobError) {
      console.warn("job insert warning:", jobError);
    }

    return NextResponse.json({ success: true, evidenceId: insertData.id, jobId: jobData?.id ?? null }, { status: 200 });
  } catch (err) {
    console.error("Unexpected /api/evidence/submit error:", err);
    return NextResponse.json({ error: "unexpected error", details: String(err) }, { status: 500 });
  }
}
