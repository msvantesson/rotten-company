// app/api/evidence/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

type JsonResponse =
  | { success: true; evidenceId: number | string; jobId: number | null }
  | { success?: false; error: string; dbError?: any; details?: string };

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
      const body: JsonResponse = { error: "missing required fields" };
      return NextResponse.json(body, { status: 400 });
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
      const body: JsonResponse = { error: "storage upload failed", details: String(uploadError) };
      return NextResponse.json(body, { status: 500 });
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

    // Parse category: prefer integer id, otherwise store as text
    let categoryId: number | null = null;
    let categoryText: string | null = null;

    if (rawCategory === "") {
      categoryId = null;
      categoryText = null;
    } else if (/^\d+$/.test(rawCategory)) {
      categoryId = parseInt(rawCategory, 10);
      categoryText = null;
    } else {
      categoryId = null;
      categoryText = rawCategory.slice(0, 120);
    }

    // Build insert payload; include user_id for RLS checks
    const insertPayload: Record<string, any> = {
      entity_type: entityType,
      entity_id: entityId,
      title,
      file_path: path,
      status: "pending",
      user_id: userId,
    };

    if (categoryId !== null) insertPayload.category_id = categoryId;
    if (categoryText !== null) insertPayload.category_text = categoryText;

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

      const body: JsonResponse = {
        error: "db insert failed",
        dbError: {
          message: insertError?.message ?? null,
          details: insertError?.details ?? null,
          hint: insertError?.hint ?? null,
          code: insertError?.code ?? null,
        },
      };
      return NextResponse.json(body, { status: 500 });
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

    const successBody: JsonResponse = {
      success: true,
      evidenceId: insertData.id,
      jobId: jobData?.id ?? null,
    };

    return NextResponse.json(successBody, { status: 200 });
  } catch (err) {
    console.error("Unexpected /api/evidence/submit error:", err);
    const body: JsonResponse = { error: "unexpected error", details: String(err) };
    return NextResponse.json(body, { status: 500 });
  }
}
