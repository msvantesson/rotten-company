// app/api/evidence/submit/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

function safeHeaderKeys(headers: Headers) {
  try {
    return Array.from(headers.keys());
  } catch {
    return [];
  }
}

function getStorageHost() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  try {
    const u = new URL(supabaseUrl);
    return u.host;
  } catch {
    return process.env.SUPABASE_PROJECT_REF
      ? `${process.env.SUPABASE_PROJECT_REF}.supabase.co`
      : "erkxyvwblgstoedlbxfa.supabase.co";
  }
}

function now() {
  return Date.now();
}

export async function POST(req: Request) {
  const start = now();
  const requestId = `srv-${start}-${Math.random().toString(36).slice(2, 8)}`;

  const contentType = req.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let fields: Record<string, string> = {};
  let file: File | null = null;

  if (isFormData) {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") fields[key] = value;
      else if (value instanceof File) file = value;
    }
  } else {
    try {
      fields = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const { entityType, entityId, title, category } = fields;

  if (!entityType || !entityId || !title) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabase = await supabaseServer();

  // AUTH
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = data.user.id;

  // CATEGORY
  let categoryId = 1;
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("id", Number(category))
    .maybeSingle();
  if (cat?.id) categoryId = cat.id;

  // FILE UPLOAD
  let fileUrl: string | null = null;

  if (file) {
    const arrayBuffer = await file.arrayBuffer();
    const filePath = `evidence/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const bucketName = process.env.EVIDENCE_BUCKET_NAME ?? "evidence-files";

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "File upload failed" },
        { status: 500 }
      );
    }

    const storageHost = getStorageHost();
    fileUrl = `https://${storageHost}/storage/v1/object/public/${bucketName}/${filePath}`;
  }

  // INSERT
  const { data: inserted, error: insertError } = await supabase
    .from("evidence")
    .insert([
      {
        entity_type: entityType,
        entity_id: Number(entityId),
        title,
        category: categoryId,
        user_id: userId,
        file_url: fileUrl,
      },
    ])
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
