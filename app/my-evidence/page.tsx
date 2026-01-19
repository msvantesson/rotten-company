
console.log("[MY-EVIDENCE] page loaded - START");

// app/my-evidence/[id]/page.tsx
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
// top of file — temporary, guaranteed log
console.log("[MY-EVIDENCE] page loaded - START");

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

export default async function MyEvidencePage({ params }: PageProps) {
  const supabase = await supabaseServer();

  const evidenceId = Number(params.id);
  console.log("[MY-EVIDENCE] Request URL:", `/my-evidence/${params.id}`);
  console.log("[MY-EVIDENCE] Parsed evidenceId:", evidenceId);

  if (!Number.isInteger(evidenceId)) {
    console.log("[MY-EVIDENCE] NOT FOUND: invalid evidence id");
    notFound();
  }

  // NOTE: headers() may be async in this build environment, so await it.
  const hdrs = await headers();
  const cookieHeader = hdrs.get ? hdrs.get("cookie") : null;
  const cookieNames = extractCookieNames(cookieHeader);
  console.log("[MY-EVIDENCE] Cookie header present:", !!cookieHeader);
  console.log("[MY-EVIDENCE] Cookie names:", cookieNames.join(", ") || "(none)");

  // Log whether DATABASE_URL is present (do NOT log its value)
  console.log("[MY-EVIDENCE] DATABASE_URL set:", !!process.env.DATABASE_URL);

  // Fetch authenticated user (server-side)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[MY-EVIDENCE] supabase.auth.getUser() returned user id:", user?.id ?? null);
  if (userError) console.log("[MY-EVIDENCE] supabase.auth.getUser() error:", userError.message);

  if (!user) {
    console.log("[MY-EVIDENCE] NOT FOUND: no authenticated user in server context");
    notFound();
  }

  // Fetch evidence row
  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  console.log("[MY-EVIDENCE] evidence row:", evidence ?? null);
  if (evidenceError) console.log("[MY-EVIDENCE] evidence query error:", evidenceError.message);

  if (!evidence) {
    console.log("[MY-EVIDENCE] NOT FOUND: evidence row does not exist");
    notFound();
  }

  // Ownership check
  console.log("[MY-EVIDENCE] evidence.user_id:", evidence.user_id ?? null);
  console.log("[MY-EVIDENCE] current user id:", user.id);

  if (evidence.user_id !== user.id) {
    console.log("[MY-EVIDENCE] NOT FOUND: ownership mismatch", {
      evidenceUser: evidence.user_id,
      currentUser: user.id,
    });
    notFound();
  }

  console.log("[MY-EVIDENCE] ACCESS GRANTED for evidence id:", evidenceId);

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
      <pre style={{ whiteSpace: "pre-wrap", background: "#f6f6f6", padding: 12 }}>
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </main>
  );
}
