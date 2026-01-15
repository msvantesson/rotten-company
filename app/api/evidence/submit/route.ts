// app/api/evidence/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

type JsonResponse = { success?: boolean; evidenceId?: number | string | null; jobId?: number | null; error?: string };

export async function POST(req: Request) {
  try {
    const supabase = await supabaseRoute();

    // parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = String(formData.get("entityType") ?? "");
    const entityId = String(formData.get("entityId") ?? "");
    const title = String(formData.get("title") ?? "");
    const category = String(formData.get("category") ?? "");

    if (!file || !entityType || !entityId) {
      const body: JsonResponse = { error: "missing fields" };
      return NextResponse.json(body, { status: 400 });
    }

    // create a safe path and filename
    const timestamp = Date.now();
    const sanitized = (title || "evidence")
      .replace(/[^a-z0-9\-_.]/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
    const ext = (file.name?.split(".").pop() ?? "bin").replace(/[^a-z0-9]/gi, "");
    const path = `${entityType}/${entityId}/${timestamp}-${sanitized}.${ext}`;

    // convert File -> Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // upload to storage
    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      const body: JsonResponse = { error: "upload failed" };
      return NextResponse.json(body, { status: 500 });
    }

    // insert evidence row
    const { data: insertData, error: insertError } = await supabase
      .from("evidence")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        title,
        category,
        file_path: path,
        status: "pending",
      })
      .select()
      .single();

    if (insertError || !insertData) {
      console.error("db insert error:", insertError);
      // cleanup uploaded file on failure
      await supabase.storage.from("evidence").remove([path]);
      const body: JsonResponse = { error: "db insert failed" };
      return NextResponse.json(body, { status: 500 });
    }

    // create notification job
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

    const body: JsonResponse = {
      success: true,
      evidenceId: insertData.id,
      jobId: jobData?.id ?? null,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("Unexpected /api/evidence/submit error:", err);
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}
