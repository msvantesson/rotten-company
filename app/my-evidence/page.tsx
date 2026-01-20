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

// 🔥 CRITICAL FIX: FORCE THIS ROUTE TO BE DYNAMIC
export const dynamic = "force-dynamic";

interface PageProps {
  params: { id?: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

export default async function MyEvidencePage({ params, searchParams = {} }: PageProps) {
  const start = Date.now();
  if (isDev()) console.log("[MY-EVIDENCE] handler start:", new Date().toISOString());

  // --- Extract id: primary from route params, fallback to Next internal navigation params ---
  let rawId = params?.id ?? null;

  if (!rawId) {
    const nxt = searchParams?.nxtPid ?? searchParams?._rsc ?? null;
    let nxtStr: string | undefined;
    if (Array.isArray(nxt)) nxtStr = nxt[0];
    else nxtStr = nxt as string | undefined;

    if (typeof nxtStr === "string" && nxtStr.trim().length > 0) {
      const match = nxtStr.match(/\d+/);
      if (match) rawId = match[0];
    }
  }

  const evidenceId = Number(rawId);
  if (isDev()) console.log("[MY-EVIDENCE] path param id:", rawId, "parsed:", evidenceId);

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

  // --- Read headers safely ---
  let cookieHeader: string | null = null;
  let ua: string | null = null;
  try {
    const hdrs = await headers();
    cookieHeader = hdrs.get("cookie");
    ua = hdrs.get("user-agent");
  } catch (e) {
    if (isDev()) console.log("[MY-EVIDENCE] headers() error:", e);
  }
  if (isDev()) console.log("[MY-EVIDENCE] cookie present:", !!cookieHeader, "user-agent:", ua ?? "(none)");

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
    console.log("[MY-EVIDENCE] refresh-token present (header):", !!refreshTokenHeader);
  }

  const cookieStore = await cookies();
  const authCookieObj = cookieStore.get("sb-erkxyvwblgstoedlbxfa-auth-token") ?? null;
  const refreshCookieObj = cookieStore.get("sb-erkxyvwblgstoedlbxfa-refresh-token") ?? null;

  if (isDev()) {
    console.log("[MY-EVIDENCE] cookies().get auth present:", !!authCookieObj);
    console.log("[MY-EVIDENCE] cookies().get refresh present:", !!refreshCookieObj);
  }

  // create supabase server client
  let supabase;
  try {
    supabase = await supabaseServer();
  } catch (e) {
    if (isDev()) console.log("[MY-EVIDENCE] ERROR creating supabaseServer:", e);
    notFound();
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
    const { data, error } = await supabase
      .from("evidence")
      .select("*")
      .eq("id", evidenceId)
      .maybeSingle();

    evidence = data ?? null;
    if (isDev()) console.log("[MY-EVIDENCE] evidence row present:", !!evidence);
  } catch (e) {
    if (isDev()) console.log("[MY-EVIDENCE] evidence query threw:", e);
  }

  if (!evidence) {
    if (isDev()) console.log("[MY-EVIDENCE] NOT FOUND reason: evidence row missing for id:", evidenceId);
    notFound();
  }

  // ownership check (debug-friendly)
  if (evidence.user_id !== user.id) {
    if (isDev()) {
      console.warn("[MY-EVIDENCE] Ownership mismatch detected");
      console.warn("[MY-EVIDENCE] evidence.user_id:", evidence.user_id);
      console.warn("[MY-EVIDENCE] server user.id:", user?.id ?? "(null)");
    }

    return (
      <main style={{ padding: 24 }}>
        <EvidenceClientWrapper />

        <div style={{ background: "#fff1f0", padding: 12, border: "1px solid #f2a0a0", marginBottom: 12 }}>
          <strong>Debug: ownership mismatch</strong>
          <div>The evidence owner does not match the authenticated server user.</div>
          <div style={{ marginTop: 8 }}>
            <strong>evidence.user_id:</strong> {String(evidence.user_id)}
            <br />
            <strong>server user.id:</strong> {String(user.id)}
          </div>
        </div>

        <h1>My Evidence #{evidence.id}</h1>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12 }}>
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </main>
    );
  }

  const totalMs = Date.now() - start;
  if (isDev()) console.log("[MY-EVIDENCE] ACCESS GRANTED id:", evidenceId, "totalMs:", totalMs);

  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper />

      <h1>My Evidence #{evidence.id}</h1>
      <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12 }}>
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </main>
  );
}
