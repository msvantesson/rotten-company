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
    return u.host; // e.g., erkxyvwblgstoedlbxfa.supabase.co
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

  // Top-level request metadata
  try {
    console.info(`[EVIDENCE-SUBMIT][${requestId}] handler start`, {
      time: new Date().toISOString(),
      method: req.method,
      url: typeof req.url === "string" ? req.url : "(unknown)",
      headers: safeHeaderKeys(req.headers),
      envPresent: {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        EVIDENCE_BUCKET_NAME: !!process.env.EVIDENCE_BUCKET_NAME,
        DATABASE_URL: !!process.env.DATABASE_URL,
      },
      memoryUsage: typeof process !== "undefined" && typeof process.memoryUsage === "function" ? process.memoryUsage() : null,
    });
  } catch (err) {
    // swallow logging errors
    console.error(`[EVIDENCE-SUBMIT][${requestId}] top-level log failed`, String(err));
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let fields: Record<string, string> = {};
  let file: File | null = null;

  // Parse body (form-data or json) with extensive logging
  if (isFormData) {
    try {
      const t0 = now();
      const formData = await req.formData();
      const t1 = now();
      console.info(`[EVIDENCE-SUBMIT][${requestId}] parsed formData`, { parseMs: t1 - t0 });

      for (const [key, value] of formData.entries()) {
        try {
          if (typeof value === "string") {
            // truncate long values for logs
            fields[key] = value;
          } else if (value instanceof File && key === "file") {
            file = value;
          } else if (value instanceof File) {
            // other file fields
            file = value;
          }
        } catch (inner) {
          console.warn(`[EVIDENCE-SUBMIT][${requestId}] formData entry parse failed for key=${String(key)}`, String(inner));
        }
      }

      // Log form field names and file metadata (no file content)
      try {
        const fieldNames = Object.keys(fields);
        const fileMeta = file
          ? { name: file.name, type: file.type, size: file.size }
          : null;
        console.info(`[EVIDENCE-SUBMIT][${requestId}] formData summary`, { fieldNames, fileMeta });
      } catch (inner) {
        console.warn(`[EVIDENCE-SUBMIT][${requestId}] formData summary failed`, String(inner));
      }
    } catch (err) {
      console.error(`[EVIDENCE-SUBMIT][${requestId}] formData parse error`, String(err));
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
  } else {
    try {
      const t0 = now();
      const json = await req.json();
      const t1 = now();
      fields = typeof json === "object" && json !== null ? (json as Record<string, string>) : {};
      console.info(`[EVIDENCE-SUBMIT][${requestId}] parsed JSON body`, { parseMs: t1 - t0, keys: Object.keys(fields) });
    } catch (err) {
      console.error(`[EVIDENCE-SUBMIT][${requestId}] invalid JSON body`, String(err));
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const { entityType, entityId, title, category } = fields;
  try {
    console.info(`[EVIDENCE-SUBMIT][${requestId}] received fields`, {
      entityType,
      entityId,
      title: title ? String(title).slice(0, 200) : null,
      category,
      fileName: file?.name ?? null,
    });
  } catch {
    // ignore
  }

  if (!entityType || !entityId || !title) {
    console.warn(`[EVIDENCE-SUBMIT][${requestId}] missing required fields`, { entityType, entityId, title });
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create supabase server client
  let supabase;
  try {
    const t0 = now();
    supabase = await supabaseServer();
    const t1 = now();
    console.info(`[EVIDENCE-SUBMIT][${requestId}] supabaseServer created`, { durationMs: t1 - t0 });
  } catch (err) {
    console.error(`[EVIDENCE-SUBMIT][${requestId}] ERROR creating supabaseServer`, String(err));
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // Resolve category with logging
  let categoryId = 1;
  try {
    const t0 = now();
    const { data: categoryRow, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();
    const t1 = now();

    if (categoryError) {
      console.warn(`[EVIDENCE-SUBMIT][${requestId}] category lookup error`, { message: categoryError.message });
    }

    if (categoryRow?.id) {
      categoryId = categoryRow.id;
      console.info(`[EVIDENCE-SUBMIT][${requestId}] category resolved`, { category, categoryId, durationMs: t1 - t0 });
    } else {
      console.warn(`[EVIDENCE-SUBMIT][${requestId}] category not resolved, falling back to 1`, { category, durationMs: t1 - t0 });
    }
  } catch (err) {
    console.error(`[EVIDENCE-SUBMIT][${requestId}] category lookup threw`, String(err));
  }

  // Get authenticated user server-side
  let userId: string | null = null;
  try {
    const t0 = now();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const t1 = now();
    if (authError) {
      console.error(`[EVIDENCE-SUBMIT][${requestId}] supabase.auth.getUser error`, { message: authError.message });
    }
    userId = authData?.user?.id ?? null;
    console.info(`[EVIDENCE-SUBMIT][${requestId}] supabase.auth.getUser result`, { userId, durationMs: t1 - t0 });
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch (err) {
    console.error(`[EVIDENCE-SUBMIT][${requestId}] supabase.auth.getUser threw`, String(err));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Upload file to Supabase Storage if present
  let fileUrl: string | null = null;
  if (file) {
    try {
      console.info(`[EVIDENCE-SUBMIT][${requestId}] starting file upload`, { fileName: file.name, fileType: file.type, fileSize: file.size });
      const t0 = now();
      const arrayBuffer = await file.arrayBuffer();
      const t1 = now();
      console.info(`[EVIDENCE-SUBMIT][${requestId}] file.arrayBuffer completed`, { readMs: t1 - t0, bytes: arrayBuffer.byteLength });

      const filePath = `evidence/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const bucketName = process.env.EVIDENCE_BUCKET_NAME ?? "evidence-files";

      try {
        const t2 = now();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, arrayBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        const t3 = now();

        if (uploadError) {
          console.error(`[EVIDENCE-SUBMIT][${requestId}] file upload error`, { message: uploadError.message });
          if (uploadError.message?.toLowerCase().includes("bucket")) {
            return NextResponse.json(
              { error: `File upload failed: bucket "${bucketName}" not found. Create the bucket in Supabase Storage or set EVIDENCE_BUCKET_NAME.` },
              { status: 500 }
            );
          }
          return NextResponse.json({ error: "File upload failed" }, { status: 500 });
        }

        console.info(`[EVIDENCE-SUBMIT][${requestId}] file upload succeeded`, { uploadData, uploadMs: t3 - t2 });

        const storageHost = getStorageHost();
        fileUrl = `https://${storageHost}/storage/v1/object/public/${bucketName}/${filePath}`;
        console.info(`[EVIDENCE-SUBMIT][${requestId}] file public URL`, { fileUrl });
      } catch (uploadErr) {
        console.error(`[EVIDENCE-SUBMIT][${requestId}] file upload threw`, String(uploadErr));
        return NextResponse.json({ error: "File upload failed" }, { status: 500 });
      }
    } catch (err) {
      console.error(`[EVIDENCE-SUBMIT][${requestId}] file handling threw`, String(err));
      return NextResponse.json({ error: "File processing failed" }, { status: 500 });
    }
  } else {
    console.info(`[EVIDENCE-SUBMIT][${requestId}] no file provided`);
  }

  // Insert evidence row with logging
  try {
    const t0 = now();
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
    const t1 = now();

    if (insertError) {
      console.error(`[EVIDENCE-SUBMIT][${requestId}] insert error`, { message: insertError.message });
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    console.info(
      `[EVIDENCE-SUBMIT][${requestId}] inserted evidence`,
      { id: inserted?.id, user_id: inserted?.user_id, durationMs: t1 - t0, totalMs: now() - start }
    );

    return NextResponse.json({ ok: true, id: inserted.id, evidence: inserted });
  } catch (err) {
    console.error(`[EVIDENCE-SUBMIT][${requestId}] unexpected insert error`, String(err));
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  } finally {
    try {
      console.info(`[EVIDENCE-SUBMIT][${requestId}] handler finished`, {
        totalMs: now() - start,
        memoryUsage: typeof process !== "undefined" && typeof process.memoryUsage === "function" ? process.memoryUsage() : null,
      });
    } catch {
      // ignore
    }
  }
}
