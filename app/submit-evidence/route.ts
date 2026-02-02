import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { logDebug } from "@/lib/log";

export async function POST(req: Request) {
  try {
    logDebug("submit-evidence", "Incoming request");

    const formData = await req.formData();
    logDebug("submit-evidence", "Parsed formData");

    // 🔥 Use service role client (required for uploads + inserts)
    const supabase = supabaseService();
    logDebug("submit-evidence", "Supabase SERVICE client initialized");

    // User ID is passed from the client
    const userId = String(formData.get("userId") ?? "").trim();
    if (!userId) {
      logDebug("submit-evidence", "Missing userId");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") ?? "").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const entityType = String(formData.get("entityType") ?? "").trim();
    const entityId = Number(formData.get("entityId") ?? "");
    const category = Number(formData.get("categoryId") ?? "");
    const severityRaw = Number(formData.get("severity") ?? "");
    const evidenceTypeRaw = String(formData.get("evidenceType") ?? "");

    const severityMap: Record<number, "low" | "medium" | "high"> = {
      1: "low",
      2: "medium",
      3: "high",
    };

    const severity = severityMap[severityRaw];
    const evidenceType = evidenceTypeRaw.trim().toLowerCase();

    const allowedEvidenceTypes = [
      "misconduct",
      "remediation",
      "correction",
      "audit",
      "statement",
    ];

    if (!allowedEvidenceTypes.includes(evidenceType)) {
      return NextResponse.json(
        { error: "Invalid evidence type" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!title || !entityType || !entityId || !category || !severity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const filePath = `${entityType}/${entityId}/${Date.now()}-${file.name}`;
    logDebug("submit-evidence", "Uploading file", { filePath });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logDebug("submit-evidence", "UPLOAD ERROR", uploadError);
      return NextResponse.json(
        { error: "File upload failed" },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("evidence")
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData?.publicUrl ?? null;

    const insertPayload = {
      title,
      summary,
      severity,
      category,
      entity_type: entityType,
      entity_id: entityId,
      company_id: entityType === "company" ? entityId : null,
      evidence_type: evidenceType,
      user_id: userId,
      file_url: fileUrl,
      file_path: filePath,
      status: "pending",
      file_type: file.type,
      file_size: file.size,
    };

    logDebug("submit-evidence", "Insert payload", insertPayload);

    const { data: inserted, error: insertError } = await supabase
      .from("evidence")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !inserted) {
      logDebug("submit-evidence", "INSERT ERROR", insertError);
      return NextResponse.json(
        { error: "Failed to insert evidence" },
        { status: 500 }
      );
    }

    logDebug("submit-evidence", "Evidence inserted", { id: inserted.id });
    return NextResponse.json({ evidence_id: inserted.id });
  } catch (err: any) {
    logDebug("submit-evidence", "UNEXPECTED ERROR", {
      message: err?.message,
      stack: err?.stack,
    });
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
