// app/api/evidence/submit/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const start = Date.now();
  console.log("[EVIDENCE-SUBMIT] handler start:", new Date().toISOString());

  const contentType = req.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let fields: Record<string, string> = {};
  let file: File | null = null;

  if (isFormData) {
    try {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          fields[key] = value;
        } else if (value instanceof File && key === "file") {
          file = value;
        }
      }
    } catch (err) {
      console.error("[EVIDENCE-SUBMIT] formData parse error:", err);
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
  } else {
    try {
      fields = await req.json();
    } catch (err) {
      console.error("[EVIDENCE-SUBMIT] invalid JSON body:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const { entityType, entityId, title, category } = fields;
  console.log("[EVIDENCE-SUBMIT] received:", {
    entityType,
    entityId,
    title,
    category,
    fileName: file?.name,
  });

  if (!entityType || !entityId || !title) {
    console.warn("[EVIDENCE-SUBMIT] missing required fields");
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  // Resolve category
  let categoryId = 1;
  try {
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
  } catch (err) {
    console.error("[EVIDENCE-SUBMIT] category lookup threw:", err);
  }

  // Get authenticated user
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) {
    console.error("[EVIDENCE-SUBMIT] auth error or missing user:", authError?.message);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.user.id;

  // Upload file to Supabase Storage
  let fileUrl: string | null = null;
  if (file) {
    console.log("[EVIDENCE-SUBMIT] file received:", file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const filePath = `evidence/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("evidence-files")
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[EVIDENCE-SUBMIT] file upload error:", uploadError.message);
        return NextResponse.json({ error: "File upload failed" }, { status: 500 });
      }

      fileUrl = `https://erkxyvwblgstoedlbxfa.supabase.co/storage/v1/object/public/evidence-files/${filePath}`;
      console.log("[EVIDENCE-SUBMIT] file uploaded:", fileUrl);
    } catch (err) {
      console.error("[EVIDENCE-SUBMIT] file upload threw:", err);
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }
  }

  // Insert evidence
  try {
    const { data: inserted, error: insertError } = await supabase
      .from("evidence")
      .insert([
        {
          entity_type: entityType,
          entity_id: entityId,
          title,
          category: categoryId,
          user_id: userId,
          file_url: fileUrl,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("[EVIDENCE-SUBMIT] insert error:", insertError.message);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    console.log(
      "[EVIDENCE-SUBMIT] inserted:",
      inserted?.id,
      "user_id:",
      inserted?.user_id,
      "durationMs:",
      Date.now() - start
    );

    return NextResponse.json({ id: inserted.id, ok: true });
  } catch (err) {
    console.error("[EVIDENCE-SUBMIT] unexpected insert error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
