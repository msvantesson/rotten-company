import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    console.log("[submit-evidence] Incoming request");

    const formData = await req.formData();
    console.log("[submit-evidence] Parsed formData");

    const supabase = await supabaseServer();
    console.log("[submit-evidence] Supabase client initialized");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[submit-evidence] No authenticated user");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("[submit-evidence] Authenticated user:", user.id);

    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") ?? "");
    const summary = String(formData.get("summary") ?? "");
    const entityType = String(formData.get("entityType") ?? "");
    const entityId = Number(formData.get("entityId") ?? "");
    const category = Number(formData.get("categoryId") ?? "");
    const severityRaw = Number(formData.get("severity") ?? "");
    const evidenceType = String(formData.get("evidenceType") ?? "");

    const severityMap = {
      1: "low",
      2: "medium",
      3: "high",
    };

    const severity = severityMap[severityRaw];

    console.log("[submit-evidence] Extracted fields:", {
      title,
      summary,
      entityType,
      entityId,
      category,
      severity,
      evidenceType,
      fileName: file?.name,
    });

    if (!file) {
      console.warn("[submit-evidence] Missing file");
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!title || !entityType || !entityId || !category || !evidenceType || !severity) {
      console.warn("[submit-evidence] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const filePath = `${entityType}/${entityId}/${Date.now()}-${file.name}`;
    console.log("[submit-evidence] Uploading file to path:", filePath);

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[submit-evidence] UPLOAD ERROR", uploadError);
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("evidence")
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData?.publicUrl ?? null;
    console.log("[submit-evidence] File uploaded. Public URL:", fileUrl);

    const { data: inserted, error: insertError } = await supabase
      .from("evidence")
      .insert({
        title,
        summary,
        severity,
        category,
        entity_type: entityType,
        entity_id: entityId,
        company_id: entityType === "company" ? entityId : null,
        evidence_type: evidenceType,
        user_id: user.id,
        file_url: fileUrl,
        status: "pending",
        file_type: file.type,
        file_size: file.size,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[submit-evidence] INSERT ERROR", insertError);
      return NextResponse.json({ error: "Failed to insert evidence" }, { status: 500 });
    }

    console.log("[submit-evidence] Evidence inserted:", inserted.id);
    return NextResponse.json({ evidence_id: inserted.id });
  } catch (err) {
    console.error("[submit-evidence] UNEXPECTED ERROR", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
