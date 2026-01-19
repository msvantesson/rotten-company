// app/my-evidence/[id]/page.tsx
console.log("[MY-EVIDENCE] FILE EXECUTED - START");

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

export default async function MyEvidencePage({ params }: PageProps) {
  const start = Date.now();
  console.log("[MY-EVIDENCE] handler start:", new Date().toISOString());

  const rawId = params?.id;
  const evidenceId = Number(rawId);
  console.log("[MY-EVIDENCE] path param id:", rawId, "parsed:", evidenceId);

  if (!Number.isInteger(evidenceId)) {
    console.log("[MY-EVIDENCE] NOT FOUND reason: invalid id (not integer)");
    notFound();
  }

  // headers (safe)
  let cookieHeader: string | null = null;
  let ua: string | null = null;
  try {
    const hdrs = await headers();
    cookieHeader = typeof hdrs.get === "function" ? hdrs.get("cookie") : null;
    ua = typeof hdrs.get === "function" ? hdrs.get("user-agent") : null;
  } catch (e) {
    console.log("[MY-EVIDENCE] headers() error:", e);
  }
  console.log("[MY-EVIDENCE] cookie present:", !!cookieHeader, "user-agent:", ua ?? "(none)");

  // debug: print raw cookie header and extract Supabase tokens
  console.log("[MY-EVIDENCE] raw cookieHeader:", cookieHeader ?? "(none)");

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

  console.log("[MY-EVIDENCE] auth-token present (header):", !!authTokenHeader);
  console.log(
    "[MY-EVIDENCE] auth-token (header truncated):",
    authTokenHeader ? (authTokenHeader.length > 200 ? authTokenHeader.slice(0, 200) + "..." : authTokenHeader) : "(missing)"
  );
  console.log("[MY-EVIDENCE] refresh-token present (header):", !!refreshTokenHeader);
  console.log(
    "[MY-EVIDENCE] refresh-token (header truncated):",
    refreshTokenHeader ? (refreshTokenHeader.length > 200 ? refreshTokenHeader.slice(0, 200) + "..." : refreshTokenHeader) : "(missing)"
  );

  // --- NEW: use Next cookies() store for server-side cookie visibility ---
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("sb-erkxyvwblgstoedlbxfa-auth-token")?.value ?? null;
  const refreshCookie = cookieStore.get("sb-erkxyvwblgstoedlbxfa-refresh-token")?.value ?? null;

  console.log("[MY-EVIDENCE] cookieStore present:", !!cookieStore);
  console.log("[MY-EVIDENCE] cookies().get auth present:", !!authCookie);
  console.log("[MY-EVIDENCE] cookies().get auth (truncated):", authCookie ? (authCookie.length > 200 ? authCookie.slice(0,200) + "..." : authCookie) : "(missing)");
  console.log("[MY-EVIDENCE] cookies().get refresh present:", !!refreshCookie);
  console.log("[MY-EVIDENCE] cookies().get refresh (truncated):", refreshCookie ? (refreshCookie.length > 200 ? refreshCookie.slice(0,200) + "..." : refreshCookie) : "(missing)");
  // --- end cookieStore debug ---

  // safe env flags
  console.log("[MY-EVIDENCE] ENV: VERCEL_ENV:", process.env.VERCEL_ENV ?? "(unset)");
  console.log("[MY-EVIDENCE] DATABASE_URL set:", !!process.env.DATABASE_URL);

  // create supabase server client
  let supabase;
  try {
    supabase = await supabaseServer();
  } catch (e) {
    console.log("[MY-EVIDENCE] ERROR creating supabaseServer:", e);
    notFound();
  }

  // get server-side user
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) console.log("[MY-EVIDENCE] supabase.getUser error:", error.message);
    user = data?.user ?? null;
    console.log("[MY-EVIDENCE] supabase user id:", user?.id ?? null);
  } catch (e) {
    console.log("[MY-EVIDENCE] supabase.getUser threw:", e);
  }

  if (!user) {
    console.log("[MY-EVIDENCE] NOT FOUND reason: no authenticated user");
    notFound();
  }

  // fetch evidence row
  let evidence: any = null;
  try {
    const qStart = Date.now();
    const { data, error } = await supabase.from("evidence").select("*").eq("id", evidenceId).maybeSingle();
    console.log("[MY-EVIDENCE] evidence query durationMs:", Date.now() - qStart);
    if (error) console.log("[MY-EVIDENCE] evidence query error:", error.message);
    evidence = data ?? null;
    console.log("[MY-EVIDENCE] evidence row:", evidence ? JSON.stringify(evidence) : null);
  } catch (e) {
    console.log("[MY-EVIDENCE] evidence query threw:", e);
  }

  if (!evidence) {
    console.log("[MY-EVIDENCE] NOT FOUND reason: evidence row missing for id:", evidenceId);
    notFound();
  }

  // ownership check
  console.log("[MY-EVIDENCE] evidence.user_id:", evidence.user_id ?? null, "current user:", user.id);
  if (evidence.user_id !== user.id) {
    console.log("[MY-EVIDENCE] NOT FOUND reason: ownership mismatch", {
      evidenceUser: evidence.user_id,
      currentUser: user.id,
    });
    notFound();
  }

  const totalMs = Date.now() - start;
  console.log("[MY-EVIDENCE] ACCESS GRANTED id:", evidenceId, "totalMs:", totalMs);

  return (
    <main style={{ padding: 24 }}>
      {/* Client-side logger mounts here */}
      <EvidenceClientWrapper />

      {/* Server cookie debug box */}
      <div style={{ background: "#fff7e6", padding: 12, border: "1px solid #f0c36b", marginBottom: 12 }}>
        <strong>Server cookie debug:</strong>
        <div>auth present (cookies()): {String(!!authCookie)}</div>
        <div>auth (truncated): {authCookie ? (authCookie.length > 200 ? authCookie.slice(0,200) + "..." : authCookie) : "(missing)"}</div>
        <div>auth present (header): {String(!!authTokenHeader)}</div>
        <div>refresh present (cookies()): {String(!!refreshCookie)}</div>
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
