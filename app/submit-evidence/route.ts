import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { supabaseRoute } from "@/lib/supabase-route";

// File size limits
const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_PDF_SIZE = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file") as File | null;
    const title = (form.get("title") as string) ?? null;
    const summary = (form.get("summary") as string) ?? null;
    const entityType = (form.get("entityType") as string) ?? null;
    const entityId = Number(form.get("entityId"));
    const categoryId = Number(form.get("categoryId"));
    const severity = Number(form.get("severity"));
    const evidenceType = (form.get("evidenceType") as string) ?? null;

    if (!file || !title || !entityType || !entityId || !categoryId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Validate file size
    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image too large. Max size is 3MB. Please compress using TinyPNG before uploading." },
        { status: 400 }
      );
    }

    if (file.type === "application/pdf" && file.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: "PDF too large. Max size is 8MB. Please compress using iLovePDF or SmallPDF before uploading." },
        { status: 400 }
      );
    }

    // NOTE: supabaseRoute() and supabaseService() return Promises in this repo.
    // Await them to get the actual Supabase clients.
    const supabase = await supabaseRoute();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const service = await supabaseService();

    // Sanitize filename
    const safeName = file.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.\-_]/g, "-")
      .toLowerCase();

    const filePath = `${entityType}/${entityId}/${Date.now()}-${safeName}`;

    // Upload to Supabase Storage (service role)
    const { error: uploadError } = await service.storage.from("evidence").upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "File upload failed." }, { status: 500 });
    }

    // Insert evidence row
    const { data: inserted, error: insertError } = await service
      .from("evidence")
      .insert([
        {
          entity_type: entityType,
          entity_id: entityId,
          title,
          summary,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          user_id: user.id,
          evidence_type: evidenceType,
          category_id: categoryId,
          severity_suggested: severity,
          status: "pending",
          moderator_id: null,
          moderator_note: null,
          moderated_at: null,
        },
      ])
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Database insert failed." }, { status: 500 });
    }

    // Create moderation notification job
    await service.from("notification_jobs").insert([
      {
        type: "evidence_submitted",
        status: "pending",
        payload: {
          evidence_id: inserted.id,
          entity_id: entityId,
          entity_type: entityType,
          submitted_by: user.id,
        },
      },
    ]);

    return NextResponse.json({ success: true, evidence_id: inserted.id });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
