// app/my-evidence/[id]/page.tsx 
export const dynamic = "force-dynamic";

import React from "react";
import { notFound } from "next/navigation";
import { supabaseRoute } from "@/lib/supabase-route";

type Props = { params: { id: string } };

export default async function EvidencePage({ params }: Props) {
  console.info("[MY-EVIDENCE PAGE] invoked - params:", params);

  const rawId = params?.id;
  if (!rawId) {
    console.info("[MY-EVIDENCE PAGE] missing id param");
    return notFound();
  }

  const id = Number(rawId);
  if (Number.isNaN(id)) {
    console.info("[MY-EVIDENCE PAGE] invalid id param:", rawId);
    return notFound();
  }

  const supabase = await supabaseRoute();
  console.info("[MY-EVIDENCE PAGE] supabaseRoute ready, fetching evidence id:", id);

  try {
    const { data, error } = await supabase
      .from("evidence")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[MY-EVIDENCE PAGE] supabase error:", error);
      // If you prefer to show an error page instead of 404, change this behavior.
      return notFound();
    }

    if (!data) {
      console.info("[MY-EVIDENCE PAGE] no evidence found for id:", id);
      return notFound();
    }

    // Render a simple evidence page. Replace with your real UI as needed.
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 900 }}>
        <h1>Evidence #{data.id}</h1>
        <div style={{ color: "#666", marginBottom: 12 }}>
          status: {data.status ?? "—"} • created: {data.created_at ?? "unknown"}
        </div>

        <section style={{ marginTop: 12 }}>
          <h2 style={{ marginBottom: 8 }}>{data.title ?? `Evidence #${data.id}`}</h2>
          <p style={{ whiteSpace: "pre-wrap", color: "#222" }}>{data.summary ?? "No summary provided."}</p>

          <dl style={{ marginTop: 12, color: "#444" }}>
            <div><strong>Entity</strong>: {data.entity_type ?? "—"} #{data.entity_id ?? "—"}</div>
            <div><strong>Category</strong>: {String(data.category ?? "—")}</div>
            <div><strong>File path</strong>: {data.file_path ?? "—"}</div>
          </dl>
        </section>
      </div>
    );
  } catch (err) {
    console.error("[MY-EVIDENCE PAGE] unexpected error:", err);
    return notFound();
  }
}
