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
      memoryUsage:
        typeof process !== "undefined" &&
        typeof process.memoryUsage === "function"
          ? process.memoryUsage()
          : null,
    });
  } catch {}

  try {
    const cookieHeader = req.headers.get("cookie") ?? null;
    console.info(
      `[EVIDENCE-SUBMIT][${requestId}] cookie header:`,
      cookieHeader ? "present" : "missing",
      "length:",
      cookieHeader?.length ?? 0,
      "contains sb-erkxyvwblgstoedlbxfa-auth-token:",
      Boolean(
        cookieHeader &&
          cookieHeader.includes("sb-erkxyvwblgstoedlbxfa-auth-token")
      )
    );
  } catch {}

  const contentType = req.headers.get("content-type") ?? "";
  const isFormData = contentType.includes("multipart/form-data");

  let fields: Record<string, string> = {};
  let file: File | null = null;

  if (isFormData) {
    try {
      const t0 = now();
      const formData = await req.formData();
      const t1 = now();
      console.info(`[EVIDENCE-SUBMIT][${requestId}] parsed formData`, {
        parseMs: t1 - t0,
      });

      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          fields[key] = value;
        } else if (value instanceof File) {
          file = value;
        }
      }

      console.info(`[EVIDENCE-SUBMIT][${requestId}] formData summary`, {
        fieldNames: Object.keys(fields),
        fileMeta: file
          ? { name: file.name, type: file.type, size: file.size }
          : null,
      });
    } catch (err) {
      console.error(
        `[EVIDENCE-SUBMIT][${requestId}] formData parse error`,
        String(err)
      );
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
  } else {
    try {
      const json = await req.json();
      fields =
        typeof json === "object" && json !== null
          ? (json as Record<string, string>)
          : {};
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

  let supabase;
  try {
    supabase = await supabaseServer();
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  let categoryId = 1;
  try {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();
    if (data?.id) categoryId = data.id;
  } catch {}

  // ─────────────────────────────────────────────
  // AUTH + USER MATERIALIZATION (OPTION A)
  // ─────────────────────────────────────────────
  let userId: string | null = null;
  let userEmail: string | null = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = data.user.id;
    userEmail = data.user.email ?? null;

    await supabase.from("users").upsert(
      {
        id: userId,
        email: userEmail,
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.error(
      `[EVIDENCE-SUBMIT][${requestId}] user materialization failed`,
      String(err)
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─────────────────────────────────────────────
  // FILE UPLOAD
  // ─────────────────────────────────────────────
  let fileUrl: string | null = null;

  if (file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const filePath = `evidence/${Date.now()}-${file.name.replace(
        /\s+/g,
        "_"
      )}`;
      const bucketName =
        process.env.EVIDENCE_BUCKET_NAME ?? "evidence-files";

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, arrayBuffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        return NextResponse.json(
          { error: "File upload failed" },
          { status: 500 }
        );
      }

      const storageHost = getStorageHost();
      fileUrl = `https://${storageHost}/storage/v1/object/public/${bucketName}/${filePath}`;
    } catch {
      return NextResponse.json(
        { error: "File processing failed" },
        { status: 500 }
      );
    }
  }

  // ─────────────────────────────────────────────
  // INSERT EVIDENCE
  // ─────────────────────────────────────────────
  try {
    const { data, error } = await supabase
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

    if (error) {
      console.error(
        `[EVIDENCE-SUBMIT][${requestId}] insert error`,
        error.message
      );
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id, evidence: data });
  } catch (err) {
    console.error(
      `[EVIDENCE-SUBMIT][${requestId}] unexpected insert error`,
      String(err)
    );
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  } finally {
    try {
      console.info(`[EVIDENCE-SUBMIT][${requestId}] handler finished`, {
        totalMs: now() - start,
        memoryUsage:
          typeof process !== "undefined" &&
          typeof process.memoryUsage === "function"
            ? process.memoryUsage()
            : null,
      });
    } catch {}
  }
}
