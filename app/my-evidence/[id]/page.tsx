// app/my-evidence/[id]/page.tsx
console.log("[MY-EVIDENCE] FILE EXECUTED - START");

import React from "react";
import { notFound } from "next/navigation";
import { headers, cookies } from "next/headers";
import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";
import { supabaseServer } from "@/lib/supabase-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Evidence",
};

interface PageProps {
  params: { id: string };
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

export default async function MyEvidencePage({ params }: PageProps) {
  const start = Date.now();
  if (isDev()) console.log("[MY-EVIDENCE] handler start:", new Date().toISOString());

  const rawId = params?.id;
  const evidenceId = Number(rawId);
  if (isDev()) console.log("[MY-EVIDENCE] path param id:", rawId, "parsed:", evidenceId);

  // If id is invalid on server render, render a safe fallback instead of returning 404.
  // This avoids transient Next preflight/RSC requests from producing a hard 404.
  if (!Number.isInteger(evidenceId)) {
    if (isDev()) console.log("[MY-EVIDENCE] Invalid or missing id on server render — rendering fallback instead of 404");

    return (
      <main style={{ padding: 24 }}>
        <EvidenceClientWrapper />

        <div style={{ background: "#fff7e6", padding: 12, border: "1px solid #f0c36b", marginBottom: 12 }}>
          <strong>Missing evidence id on server render</strong>
          <div>
            This server render did not receive a valid id. If you navigated here from the app,
            the client will re-check the route and load the evidence shortly.
          </div>
        </div>

        <h1>Loading evidence</h1>
        <p>Checking route parameters and authentication…</p>
      </main>
    );
  }

  // --- Read headers safely (guarded logs) ---
  let cookieHeader: string | null = null;
  let ua: string | null = null;
  try {
    const hdrs = await headers();
    cookieHeader = typeof hdrs.get === "function" ? hdrs.get("cookie") : null;
    ua = typeof hdrs.get === "function" ? hdrs.get("user-agent") : null;
  } catch (e) {
    if (isDev()) console.log("[MY-EVIDENCE] headers() error:", e);
  }
  if (isDev()) console.log("[MY-EVIDENCE] cookie present:", !!cookieHeader, "user-agent:", ua ?? "(none)");

  // Avoid logging secrets in production. Only show raw cookie header in dev.
  if (isDev()) console.log("[MY-EVIDENCE] raw cookieHeader:", cookieHeader ?? "(none)");

  function getCookieFromHeader(name: string, header: string | null) {
    if (!header) return null;
    const parts = header.split("; ");
    for (const p of parts) {
      if (p.startsWith(name + "=")) {
        try {
          return decodeURIComponent(p.slice(name.length + 1));
        } catch {
          return p.slice(name.length + 1);
        }
      }
    }
    return null;
  }

  const authTokenHeader = getCookieFromHeader("sb-erkxyvwblgstoedlbxfa-auth-token", cookieHeader);
  const refreshTokenHeader = getCookieFromHeader("sb-erkxyvwblgstoedlbxfa-refresh-token", cookieHeader);

  if (isDev()) {
    console.log("[MY-EVIDENCE] auth-token present (header):", !!authTokenHeader);
    console.log(
      "[MY-EVIDENCE] auth-token (header truncated):",
      authTokenHeader ? (authTokenHeader.length > 200 ? authTokenHeader.slice(0, 200) + "..." : authTokenHeader) : "(missing)"
    );
    console.log("[MY-EVIDENCE] refresh-token present (header):", !!refreshTokenHeader);
  }

  // --- Use Next cookies() store for server-side cookie visibility ---
  const cookieStore = await cookies();
  const authCookieObj = cookieStore.get("sb-erkxyvwblgstoedlbxfa-auth-token") ?? null;
  const refreshCookieObj = cookieStore.get("sb-erkxyvwblgstoedlbxfa-refresh-token") ?? null;

  if (isDev()) {
    console.log("[MY-EVIDENCE] cookieStore present:", !!cookieStore);
    console.info("[MY-EVIDENCE] cookies().get auth present:", !!authCookieObj);
    console.info("[MY-EVIDENCE] cookies().get refresh present:", !!refreshCookieObj);
  }

  // --- Environment checks (guarded) ---
  if (isDev()) {
    console.log("[MY-EVIDENCE] ENV: VERCEL_ENV:", process.env.VERCEL_ENV ?? "(unset)");
    console.log("[MY-EVIDENCE] DATABASE_URL set:", !!process.env.DATABASE_URL);
  }

  // create supabase server client
  let supabase;
  try {
    supabase = await supabaseServer();
  } catch (e) {
    if (isDev()) console.log("[MY-EVIDENCE] ERROR creating supabaseServer:", e);
    // If we can't create the DB client, treat as not found to avoid exposing internals.
    notFound();
  }

  // --- DEBUG: cookie adapter inspection (dev only) ---
  if (isDev()) {
    try {
      const adapterGet = (supabase as any)?.cookies?.get;
      if (typeof adapterGet === "function") {
        const rawAuth = await adapterGet("sb-erkxyvwblgstoedlbxfa-auth-token").catch((err: any) => {
          console.warn("[MY-EVIDENCE] adapter.get threw:", err?.message ?? err);
          return null;
        });
        console.info("[MY-EVIDENCE] rawAuthCookie (adapter.get) type:", rawAuth ? typeof rawAuth : "(missing)");
      } else {
        console.info("[MY-EVIDENCE] supabase.cookies.get not available");
      }
    } catch (e) {
      console.error("[MY-EVIDENCE] cookie adapter inspection failed", e);
    }
  }

  // get server-side user
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isDev()) console.log("[MY-EVIDENCE] supabase.getUser error:", error.message);
    user = data?.user ?? null;
    if (isDev()) console.log("[MY-EVIDENCE] supabase user id:", user?.id ?? null);
  } catch (e) {
    if (isDev()) console.log("[MY-EVIDENCE] supabase.getUser threw:", e);
  }

  // If no server-side user, render a safe fallback (do not immediately notFound)
  if (!user) {
    if (isDev()) console.log("[MY-EVIDENCE] No authenticated user on server render — rendering fallback instead of 404");

    return (
      <main style={{ padding: 24 }}>
        <EvidenceClientWrapper />

        <div style={{ background: "#fff7e6", padding: 12, border: "1px solid #f0c36b", marginBottom: 12 }}>
          <strong>Server session not present</strong>
          <div>
            It looks like your session is not available on this server render. If you are signed in,
            the page will re-check your session on the client and load the evidence.
          </div>
        </div>

        <h1>Loading evidence #{evidenceId}</h1>
        <p>Checking authentication and loading content…</p>
      </main>
    );
  }

  // fetch evidence row
  let evidence: any = null;
  try {
    const qStart = Date.now();
    const { data, error } = await supabase.from("evidence").select("*").eq("id", evidenceId).maybeSingle();
    if (isDev()) console.log("[MY-EVIDENCE] evidence query durationMs:", Date.now() - qStart);
    if (error && isDev()) console.log("[MY-EVIDENCE] evidence query error:", error.message);
    evidence = data ?? null;
    if (isDev()) console.log("[MY-EVIDENCE] evidence row present:", evidence ? true : false);
  } catch (e) {
    if (isDev()) console.log("[MY-EVIDENCE] evidence query threw:", e);
  }

  if (!evidence) {
    if (isDev()) console.log("[MY-EVIDENCE] NOT FOUND reason: evidence row missing for id:", evidenceId);
    notFound();
  }

  // ownership check
  if (isDev()) console.log("[MY-EVIDENCE] evidence.user_id:", evidence.user_id ?? null, "current user:", user.id);
  if (evidence.user_id !== user.id) {
    if (isDev()) console.log("[MY-EVIDENCE] NOT FOUND reason: ownership mismatch", {
      evidenceUser: evidence.user_id,
      currentUser: user.id,
    });
    notFound();
  }

  const totalMs = Date.now() - start;
  if (isDev()) console.log("[MY-EVIDENCE] ACCESS GRANTED id:", evidenceId, "totalMs:", totalMs);

  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper />

      <div style={{ background: "#fff7e6", padding: 12, border: "1px solid #f0c36b", marginBottom: 12 }}>
        <strong>Server cookie debug:</strong>
        <div>auth present (cookies()): {String(!!authCookieObj)}</div>
        <div>auth (type): {authCookieObj ? typeof authCookieObj.value : "(missing)"}</div>
        <div>auth present (header): {String(!!authTokenHeader)}</div>
        <div>refresh present (cookies()): {String(!!refreshCookieObj)}</div>
      </div>

      <h1>My Evidence #{evidence.id}</h1>
      <p>
        <strong>Title:</strong> {evidence.title ?? "(no title)"}
      </p>
      <p>
        <strong>Category:</strong> {evidence.category ?? "(no category)"}
      </p>
      <p>
        <strong>Owner:</strong> {String(evidence.user_id ?? "(none)")}
      </p>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12 }}>
        {JSON.stringify(evidence, null, 2)}
      </pre>
      <footer style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
        <div>Request processed in {totalMs}ms</div>
      </footer>
    </main>
  );
}
