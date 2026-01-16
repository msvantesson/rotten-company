// app/my-evidence/[id]/page.tsx
export const dynamic = "force-dynamic";

import { supabaseRoute } from "@/lib/supabase-route";
import { notFound } from "next/navigation";
import React from "react";

type EvidenceRow = {
  id: number;
  title?: string | null;
  summary?: string | null;
  status?: string | null;
  category?: number | null;
  user_id?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  file_path?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

export default async function MyEvidencePage({ params }: { params: { id: string } }) {
  console.info("[MY-EVIDENCE] invoked - params:", params);

  const supabase = await supabaseRoute();
  console.info("[MY-EVIDENCE] supabaseRoute ready");

  const rawId = params?.id;
  const evidenceId = Number(rawId);
  if (!rawId || Number.isNaN(evidenceId)) {
    console.info("[MY-EVIDENCE] invalid id:", rawId);
    return notFound();
  }
  console.info("[MY-EVIDENCE] evidenceId:", evidenceId);

  // Get server-side auth user (for logging and RLS context)
  let authUser: { id?: string; email?: string } | null = null;
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.warn("[MY-EVIDENCE] auth.getUser error:", userErr);
    authUser = userData?.user ?? null;
    console.info("[MY-EVIDENCE] authUser:", authUser ? { id: authUser.id, email: authUser.email } : null);
  } catch (err) {
    console.error("[MY-EVIDENCE] auth.getUser threw:", err);
  }

  // Fetch evidence row (no generic to avoid SDK typing mismatch)
  let evidence: EvidenceRow | null = null;
  try {
    const { data, error } = await supabase
      .from("evidence")
      .select("*")
      .eq("id", evidenceId)
      .maybeSingle();

    if (error) {
      console.error("[MY-EVIDENCE] evidence fetch error:", error);
    }
    evidence = data ?? null;
    console.info("[MY-EVIDENCE] evidence fetched:", evidence ? { id: evidence.id, user_id: evidence.user_id, status: evidence.status } : null);
  } catch (err) {
    console.error("[MY-EVIDENCE] evidence fetch threw:", err);
  }

  if (!evidence) {
    console.info("[MY-EVIDENCE] no evidence found for id:", evidenceId);
    return notFound();
  }

  // Resolve public file URL if file_path exists
  let fileUrl: string | null = null;
  try {
    if (evidence.file_path) {
      // getPublicUrl returns { data: { publicUrl: string } }
      const { data: fileUrlData } = supabase.storage.from("evidence").getPublicUrl(evidence.file_path);
      fileUrl = fileUrlData?.publicUrl ?? null;
      console.info("[MY-EVIDENCE] fileUrl resolved:", fileUrl);
    } else {
      console.info("[MY-EVIDENCE] evidence has no file_path");
    }
  } catch (err) {
    console.error("[MY-EVIDENCE] storage.getPublicUrl threw:", err);
  }

  // Render server-side page with a compact debug panel
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 900 }}>
      <h1>Evidence #{evidence.id}</h1>

      <section style={{ marginTop: 12 }}>
        <p><strong>Title</strong>: {evidence.title ?? "—"}</p>
        <p><strong>Status</strong>: {evidence.status ?? "—"}</p>
        <p><strong>Category</strong>: {String(evidence.category ?? "—")}</p>
        <p><strong>Submitted by</strong>: {evidence.user_id ?? "—"}</p>
        <p><strong>Entity</strong>: {evidence.entity_type ?? "—"} {evidence.entity_id ? `#${evidence.entity_id}` : ""}</p>
        <p><strong>Created at</strong>: {evidence.created_at ?? "—"}</p>
      </section>

      <section style={{ marginTop: 12 }}>
        {fileUrl ? (
          <p><a href={fileUrl} target="_blank" rel="noreferrer">Download file</a></p>
        ) : (
          <p>No file available</p>
        )}
      </section>

      <details style={{ marginTop: 20, background: "#f5f5f5", padding: 12 }}>
        <summary>Server debug info</summary>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
{JSON.stringify({
  invokedAt: new Date().toISOString(),
  params,
  evidenceId,
  authUser: authUser ? { id: authUser.id, email: authUser.email } : null,
  evidence: {
    id: evidence.id,
    user_id: evidence.user_id,
    status: evidence.status,
    file_path: evidence.file_path ?? null,
    created_at: evidence.created_at ?? null
  },
  fileUrl
}, null, 2)}
        </pre>
      </details>

      <div style={{ marginTop: 16, color: "#666" }}>
        **Note**: This page is server-rendered. Debug logs are written to server logs. Remove debug panel and console logs after verification.
      </div>
    </div>
  );
}
