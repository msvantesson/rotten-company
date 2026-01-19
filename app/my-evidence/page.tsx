// app/my-evidence/page.tsx
import React from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";
import { supabaseServer } from "@/lib/supabase-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Evidence",
};

function isDev() {
  return process.env.NODE_ENV !== "production";
}

export default async function MyEvidenceIndexPage() {
  const start = Date.now();
  if (isDev()) console.log("[MY-EVIDENCE-INDEX] handler start:", new Date().toISOString());

  // Quick visibility into whether cookies are available on the server render (no secrets).
  let cookieStorePresent = false;
  try {
    const cs = await cookies();
    cookieStorePresent = !!cs;
    if (isDev()) console.log("[MY-EVIDENCE-INDEX] cookies() available:", cookieStorePresent);
  } catch (e) {
    if (isDev()) console.warn("[MY-EVIDENCE-INDEX] cookies() threw:", e);
  }

  // Create Supabase server client
  let supabase;
  try {
    supabase = await supabaseServer();
  } catch (e) {
    if (isDev()) console.error("[MY-EVIDENCE-INDEX] supabaseServer creation failed:", e);
    // Avoid exposing internals; show notFound so page doesn't leak details.
    notFound();
  }

  // Get server-side user
  let user: { id: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isDev()) console.warn("[MY-EVIDENCE-INDEX] supabase.auth.getUser error:", error.message);
    user = data?.user ?? null;
    if (isDev()) console.log("[MY-EVIDENCE-INDEX] supabase user id:", user?.id ?? null);
  } catch (e) {
    if (isDev()) console.warn("[MY-EVIDENCE-INDEX] supabase.auth.getUser threw:", e);
  }

  // If no server-side user, render a safe fallback so Next preflight/RSC requests don't return 404.
  if (!user) {
    if (isDev()) console.log("[MY-EVIDENCE-INDEX] No server session — rendering fallback instead of 404");
    return (
      <main style={{ padding: 24 }}>
        <EvidenceClientWrapper />

        <div style={{ background: "#fff7e6", padding: 12, border: "1px solid #f0c36b", marginBottom: 12 }}>
          <strong>Server session not present</strong>
          <div>
            You appear to be signed out on this server render. If you are signed in, the client will re-check your session
            and load your evidence shortly.
          </div>
        </div>

        <h1>My Evidence</h1>
        <p>Loading your evidence list…</p>
      </main>
    );
  }

  // Fetch evidence rows for the authenticated user
  let evidenceList: any[] = [];
  try {
    const qStart = Date.now();
    const { data, error } = await supabase
      .from("evidence")
      .select("id,title,status,created_at,category,file_url,entity_type,entity_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (isDev()) console.log("[MY-EVIDENCE-INDEX] evidence query durationMs:", Date.now() - qStart);
    if (error) {
      if (isDev()) console.warn("[MY-EVIDENCE-INDEX] evidence query error:", error.message);
    } else {
      evidenceList = data ?? [];
    }
    if (isDev()) console.log("[MY-EVIDENCE-INDEX] evidence count:", evidenceList.length);
  } catch (e) {
    if (isDev()) console.error("[MY-EVIDENCE-INDEX] evidence query threw:", e);
  }

  // If no evidence found, show an empty state (not a 404)
  const totalMs = Date.now() - start;
  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper />

      <header style={{ marginBottom: 16 }}>
        <h1>My Evidence</h1>
        <div style={{ color: "#666", fontSize: 13 }}>
          Showing evidence submitted by you. Request processed in {totalMs}ms.
        </div>
      </header>

      <section style={{ marginBottom: 20 }}>
        {evidenceList.length === 0 ? (
          <div style={{ padding: 16, background: "#f6f6f6", borderRadius: 6 }}>
            <strong>No evidence found</strong>
            <div style={{ marginTop: 8 }}>
              You haven't submitted any evidence yet. Use the upload form to add a new item.
            </div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {evidenceList.map((ev) => (
              <li
                key={ev.id}
                style={{
                  padding: 12,
                  border: "1px solid #e6e6e6",
                  borderRadius: 6,
                  marginBottom: 10,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <a href={`/my-evidence/${ev.id}`} style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>
                      {ev.title ?? `Evidence #${ev.id}`}
                    </a>
                    <div style={{ color: "#666", fontSize: 13 }}>
                      {ev.entity_type ? `${ev.entity_type} #${ev.entity_id}` : null} • {ev.category ?? "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "#333" }}>{ev.status}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>{new Date(ev.created_at).toLocaleString()}</div>
                  </div>
                </div>
                {ev.file_url ? (
                  <div style={{ marginTop: 8 }}>
                    <a href={ev.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                      View attached file
                    </a>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        <div>Server cookies available: {String(cookieStorePresent)}</div>
      </footer>
    </main>
  );
}
