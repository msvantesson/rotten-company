// app/submit-evidence/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "");
  const summary = String(formData.get("summary") ?? "");
  const entityType = String(formData.get("entityType") ?? "");
  const entityId = Number(formData.get("entityId") ?? "");
  const categoryId = Number(formData.get("categoryId") ?? "");
  const severity = Number(formData.get("severity") ?? "");
  const evidenceType = String(formData.get("evidenceType") ?? "");

  if (!file || !title || !entityType || !entityId || !categoryId || !evidenceType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const filePath = `${entityType}/${entityId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("evidence-files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage
    .from("evidence-files")
    .getPublicUrl(filePath);

  const fileUrl = publicUrlData?.publicUrl ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      summary,
      entity_type: entityType,
      entity_id: entityId,
      category_id: categoryId,
      severity,
      evidence_type: evidenceType,
      user_id: user.id,
      file_url: fileUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: "Failed to insert evidence" }, { status: 500 });
  }

  return NextResponse.json({ evidence_id: inserted.id });
}
