// app/my-evidence/[id]/page.tsx
// Enhanced diagnostics: top-level start log, headers, timing, safe env flags, auth details, DB results, and error stacks.
console.log("[MY-EVIDENCE] page file loaded - TOP");
// very top of file — temporary
console.log("[MY-EVIDENCE] page file executed - START");


import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";

interface PageProps {
  params: {
    id: string;
  };
}

function extractCookieNames(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter(Boolean);
}

function safeLogObject(label: string, obj: unknown) {
  try {
    console.log(label, JSON.stringify(obj));
  } catch {
    console.log(label, String(obj));
  }
}

export default async function MyEvidencePage({ params }: PageProps) {
  const start = Date.now();
  console.log("[MY-EVIDENCE] handler start:", new Date().toISOString());

  // Parse and validate id early
  const rawId = params?.id;
  const evidenceId = Number(rawId);
  console.log("[MY-EVIDENCE] Requested path param id:", rawId);
  console.log("[MY-EVIDENCE] Parsed evidenceId (Number):", evidenceId);

  if (!Number.isInteger(evidenceId)) {
    console.log("[MY-EVIDENCE] NOT FOUND: invalid evidence id (not integer)");
    notFound();
  }

  // Capture request headers (await headers() because it may be async)
  let cookieHeader: string | null = null;
  let ua: string | null = null;
  let requestIdHeader: string | null = null;
  try {
    const hdrs = await headers();
    // headers() may be a ReadonlyHeaders-like object
    cookieHeader = typeof hdrs.get === "function" ? hdrs.get("cookie") : null;
    ua = typeof hdrs.get === "function" ? hdrs.get("user-agent") : null;
    // Vercel/Proxies sometimes set x-vercel-id or x-request-id
    requestIdHeader =
      (typeof hdrs.get === "function" && (hdrs.get("x-vercel-id") || hdrs.get("x-request-id"))) || null;
  } catch (err) {
    console.log("[MY-EVIDENCE] headers() threw:", err instanceof Error ? err.stack ?? err.message : String(err));
  }

  const cookieNames = extractCookieNames(cookieHeader);
  console.log("[MY-EVIDENCE] Cookie header present:", !!cookieHeader);
  console.log("[MY-EVIDENCE] Cookie names:", cookieNames.length ? cookieNames.join(", ") : "(none)");
  console.log("[MY-EVIDENCE] User-Agent header:", ua ?? "(none)");
  console.log("[MY-EVIDENCE] Request-id header (x-vercel-id/x-request-id):", requestIdHeader ?? "(none)");

  // Log safe environment flags (do NOT log secrets)
  console.log("[MY-EVIDENCE] ENV: VERCEL_ENV:", process.env.VERCEL_ENV ?? "(unset)");
  console.log("[MY-EVIDENCE] ENV: NODE_ENV:", process.env.NODE_ENV ?? "(unset)");
  console.log("[MY-EVIDENCE] DATABASE_URL set:", !!process.env.DATABASE_URL);

  // Create supabase server client and fetch user
  let supabase;
  try {
    supabase = await supabaseServer();
  } catch (err) {
    console.log("[MY-EVIDENCE] ERROR creating supabaseServer():", err instanceof Error ? err.stack ?? err.message : String(err));
    // If we can't create the DB client, it's a server error — show notFound to match current behavior
    notFound();
  }

  let user: { id?: string; email?: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.log("[MY-EVIDENCE] supabase.auth.getUser() returned error:", error.message);
    }
    user = data?.user ?? null;
    console.log("[MY-EVIDENCE] supabase.auth.getUser() user id:", user?.id ?? null);
    console.log("[MY-EVIDENCE] supabase.auth.getUser() user email present:", !!user?.email);
  } catch (err) {
    console.log("[MY-EVIDENCE] supabase.auth.getUser() threw:", err instanceof Error ? err.stack ?? err.message : String(err));
  }

  if (!user) {
    console.log("[MY-EVIDENCE] NOT FOUND: no authenticated user in server context");
    notFound();
  }

  // Fetch evidence row with timing and robust error logging
  let evidence: any = null;
  try {
    const qStart = Date.now();
    const { data, error } = await supabase
      .from("evidence")
      .select("*")
      .eq("id", evidenceId)
      .maybeSingle();
    const qDuration = Date.now() - qStart;

    if (error) {
      console.log("[MY-EVIDENCE] evidence query error:", error.message);
    }
    evidence = data ?? null;
    console.log("[MY-EVIDENCE] evidence query durationMs:", qDuration);
    safeLogObject("[MY-EVIDENCE] evidence row (raw)", evidence);
  } catch (err) {
    console.log("[MY-EVIDENCE] evidence query threw:", err instanceof Error ? err.stack ?? err.message : String(err));
  }

  if (!evidence) {
    console.log("[MY-EVIDENCE] NOT FOUND: evidence row does not exist for id:", evidenceId);
    notFound();
  }

  // Ownership and visibility checks with detailed logging
  try {
    console.log("[MY-EVIDENCE] evidence.user_id:", evidence.user_id ?? null);
    console.log("[MY-EVIDENCE] current user id:", user.id);

    if (evidence.user_id !== user.id) {
      console.log("[MY-EVIDENCE] NOT FOUND: ownership mismatch", {
        evidenceUser: evidence.user_id ?? null,
        currentUser: user.id ?? null,
      });
      notFound();
    }

    // Optional: additional visibility checks (example: published flag)
    if ("is_public" in evidence && evidence.is_public === false) {
      console.log("[MY-EVIDENCE] NOT FOUND: evidence explicitly not public (is_public=false)");
      notFound();
    }
  } catch (err) {
    console.log("[MY-EVIDENCE] ownership/visibility check threw:", err instanceof Error ? err.stack ?? err.message : String(err));
    notFound();
  }

  // Final success log with total duration
  const totalMs = Date.now() - start;
  console.log("[MY-EVIDENCE] ACCESS GRANTED for evidence id:", evidenceId, "totalMs:", totalMs);

  // Minimal render so the page builds reliably
  return (
    <main style={{ padding: 24 }}>
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
