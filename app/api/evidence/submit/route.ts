import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

function now() {
  return Date.now();
}

function getStorageHost() {
  // Keeps existing behavior (works on hosted + local)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) return "localhost:54321";
  return url.replace(/^https?:\/\//, "");
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

  const { entityType, entityId, title, summary, category } = fields;

  // ---- REQUIRED FIELDS (server-side) ----
  if (!entityType || !entityId || !title || !category || !summary) {
    return NextResponse.json(
      {
        error:
          "Missing required fields. Required: entityType, entityId, title, summary, category.",
        requestId,
      },
      { status: 400 },
    );
  }

  if (!String(title).trim()) {
    return NextResponse.json(
      { error: "Title is required.", requestId },
      { status: 400 },
    );
  }

  if (!String(summary).trim()) {
    return NextResponse.json(
      { error: "Summary is required.", requestId },
      { status: 400 },
    );
  }

  // Optional: basic sanity check to encourage links when naming individuals.
  // (Not a perfect "employee name" detector, but it nudges behavior and reduces abuse.)
  const summaryText = String(summary);
  const mentionsLinkedIn = /linkedin\.com/i.test(summaryText);
  const mentionsHttp = /https?:\/\//i.test(summaryText);
  const mentionsPersonHint = /\b(CEO|CFO|CTO|COO|VP|Vice President|Director|Manager|Head of)\b/i.test(
    summaryText,
  );

  if (mentionsPersonHint && !(mentionsLinkedIn || mentionsHttp)) {
    return NextResponse.json(
      {
        error:
          "If you name a leader/manager in the summary, please include a public link (LinkedIn or company webpage).",
        requestId,
      },
      { status: 400 },
    );
  }

  const supabase = await supabaseServer();

  // AUTH
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data?.user) {
    return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
  }
  const userId = data.user.id;

  // CATEGORY (validate existence)
  const catIdNum = Number(category);
  if (!Number.isFinite(catIdNum)) {
    return NextResponse.json(
      { error: "Invalid category.", requestId },
      { status: 400 },
    );
  }

  const { data: cat, error: catErr } = await supabase
    .from("categories")
    .select("id")
    .eq("id", catIdNum)
    .maybeSingle();

  if (catErr || !cat?.id) {
    return NextResponse.json(
      { error: "Unknown category.", requestId },
      { status: 400 },
    );
  }

  // FILE UPLOAD (still optional here because UI enforces it; keep API tolerant)
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
        { error: "File upload failed", requestId },
        { status: 500 },
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
        title: String(title).trim(),
        summary: String(summary).trim(),
        // Keep using `category` integer column (matches existing code)
        category: cat.id,
        user_id: userId,
        file_url: fileUrl,
        // Optional: persist file metadata if available
        file_type: file?.type ?? null,
        file_size: file?.size ?? null,
      },
    ])
    .select("id")
    .single();

  if (insertError) {
    console.error("[evidence-submit] insert failed", { requestId, insertError });
    return NextResponse.json(
      { error: "Failed to submit evidence", requestId },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      id: inserted.id,
      requestId,
    },
    { status: 200 },
  );
}
