// app/api/evidence/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-route";

/**
 * Resolve a category id from numeric id, slug, or name.
 * Returns null when not found.
 */
async function resolveCategoryId(supabase: any, rawCategory: string | null) {
  if (!rawCategory) return null;
  const trimmed = rawCategory.trim();

  // numeric id
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

  // slug
  const { data: slugData, error: slugErr } = await supabase
    .from("categories")
    .select("id")
    .ilike("slug", trimmed)
    .limit(1)
    .maybeSingle();

  if (slugErr) {
    console.warn("category slug lookup error:", slugErr);
  }
  if (slugData?.id) return slugData.id;

  // name
  const { data: nameData, error: nameErr } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (nameErr) {
    console.warn("category name lookup error:", nameErr);
  }
  if (nameData?.id) return nameData.id;

  return null;
}

/**
 * Check that an entity exists for the given type and id.
 * Returns true when exists, false otherwise.
 */
async function entityExists(supabase: any, entityType: string, entityId: number) {
  if (!entityType || !entityId) return false;

  const tableMap: Record<string, string> = {
    company: "companies",
    leader: "leaders",
    manager: "managers",
    owner: "owners_investors",
  };

  const table = tableMap[entityType];
  if (!table) return false;

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", entityId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`entityExists lookup error for ${entityType}/${entityId}:`, error);
    return false;
  }

  return !!data?.id;
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseRoute();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityTypeRaw = String(formData.get("entityType") ?? "").trim();
    const entityIdRaw = String(formData.get("entityId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const rawCategory = String(formData.get("category") ?? "").trim();

    if (!file || !entityTypeRaw || !entityIdRaw) {
      return NextResponse.json({ error: "missing required fields" }, { status: 400 });
    }

    const entityType = entityTypeRaw;
    const entityIdNum = Number(entityIdRaw);
    if (Number.isNaN(entityIdNum)) {
      return NextResponse.json({ error: "invalid entityId" }, { status: 400 });
    }

    // Build safe filename
    const timestamp = Date.now();
    const sanitizedTitle = (title || "evidence")
      .replace(/[^a-z0-9\-_.]/gi, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
    const ext = (file.name?.split(".").pop() ?? "bin").replace(/[^a-z0-9]/gi, "");
    const path = `${entityType}/${entityIdNum}/${timestamp}-${sanitizedTitle}.${ext}`;

    // Upload file to storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("storage upload error:", uploadError);
      return NextResponse.json({ error: "storage upload failed", details: uploadError.message }, { status: 500 });
    }

    // Authenticated user (server-side)
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr) {
      console.warn("supabase.auth.getUser() returned error:", authErr);
    }

    const userId = authUser?.id ?? null;
    const userEmail = authUser?.email ?? null;

    // Resolve category
    const DEFAULT_CATEGORY_ID = 1;
    let resolvedCategoryId = await resolveCategoryId(supabase, rawCategory);
    if (resolvedCategoryId === null) {
      console.warn(`Category "${rawCategory}" not resolved — falling back to ${DEFAULT_CATEGORY_ID}`);
      resolvedCategoryId = DEFAULT_CATEGORY_ID;
    }

    // Validate referenced entity exists to avoid FK violation
    let companyIdToInsert: number | null = null;
    if (entityType === "company") {
      const exists = await entityExists(supabase, "company", entityIdNum);
      if (exists) {
        companyIdToInsert = entityIdNum;
      } else {
        // Company doesn't exist — log and keep company_id null to avoid FK error.
        console.warn(`Referenced company id ${entityIdNum} not found — inserting evidence with company_id = null`);
        companyIdToInsert = null;
      }
    }

    // Build insert payload
    const insertPayload: Record<string, any> = {
      title,
      summary: null,
      company_id: companyIdToInsert,
      leader_id: entityType === "leader" ? entityIdNum : null,
      manager_id: entityType === "manager" ? entityIdNum : null,
      owner_id: entityType === "owner" ? entityIdNum : null,
      customer_flag: false,
      file_url: null,
      status: "pending",
      user_id: userId,
      category: resolvedCategoryId,
      file_type: file.type ?? null,
      file_size: Number(file.size ?? 0),
      entity_id: entityIdNum || null,
      entity_type: entityType,
      file_path: path,
      evidence_type: "misconduct",
    };

    // Insert evidence row
    const { data: insertData, error: insertError } = await supabase
      .from("evidence")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError || !insertData) {
      console.error("db insert error:", insertError);
      // cleanup uploaded file to avoid orphaned storage
      try {
        await supabase.storage.from("evidence").remove([path]);
      } catch (cleanupErr) {
        console.warn("failed to cleanup uploaded file after db error:", cleanupErr);
      }

      // If FK error, return a clear message
      const fkViolation = insertError?.code === "23503" || insertError?.message?.includes("violates foreign key");
      return NextResponse.json(
        {
          error: "db insert failed",
          fkViolation: fkViolation ? true : false,
          dbError: {
            message: insertError?.message,
            details: insertError?.details,
            hint: insertError?.hint,
            code: insertError?.code,
          },
        },
        { status: 500 }
      );
    }

    // Create notification job (recipient_email required by schema)
    try {
      const { data: jobData, error: jobError } = await supabase
        .from("notification_jobs")
        .insert({
          recipient_email: userEmail, // required
          subject: `New evidence submitted: ${insertData.id}`,
          body: `Evidence ${insertData.id} submitted by ${userEmail}`,
          metadata: { evidence_id: insertData.id },
          status: "pending",
        })
        .select()
        .single();

      if (jobError) {
        console.warn("job insert warning:", jobError);
      }
    } catch (jobEx) {
      console.warn("notification job insert threw:", jobEx);
    }

    return NextResponse.json({ success: true, evidenceId: insertData.id }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in evidence submit route:", err);
    return NextResponse.json({ error: "unexpected error", details: String(err) }, { status: 500 });
  }
}
