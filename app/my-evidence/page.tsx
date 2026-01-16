import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import EvidenceView from "@/components/EvidenceView";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function MyEvidencePage({ params }: PageProps) {
  const supabase = await supabaseServer();

  const evidenceId = Number(params.id);

  console.log("[MY-EVIDENCE] Requested ID:", evidenceId);

  if (!Number.isInteger(evidenceId)) {
    console.log("[MY-EVIDENCE] NOT FOUND: invalid evidence id");
    notFound();
  }

  // ─────────────────────────────────────────────
  // Fetch authenticated user
  // ─────────────────────────────────────────────
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("[MY-EVIDENCE] Auth user:", user);
  console.log("[MY-EVIDENCE] Auth error:", userError);

  if (!user) {
    console.log("[MY-EVIDENCE] NOT FOUND: no authenticated user");
    notFound();
  }

  // ─────────────────────────────────────────────
  // Fetch evidence row
  // ─────────────────────────────────────────────
  const { data: evidence, error: evidenceError } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  console.log("[MY-EVIDENCE] Evidence row:", evidence);
  console.log("[MY-EVIDENCE] Evidence error:", evidenceError);

  if (!evidence) {
    console.log("[MY-EVIDENCE] NOT FOUND: evidence row does not exist");
    notFound();
  }

  // ─────────────────────────────────────────────
  // Ownership check
  // ─────────────────────────────────────────────
  console.log("[MY-EVIDENCE] Evidence user_id:", evidence.user_id);
  console.log("[MY-EVIDENCE] Current user id:", user.id);

  if (evidence.user_id !== user.id) {
    console.log("[MY-EVIDENCE] NOT FOUND: ownership mismatch", {
      evidenceUser: evidence.user_id,
      currentUser: user.id,
    });
    notFound();
  }

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  console.log("[MY-EVIDENCE] ACCESS GRANTED");

  return <EvidenceView evidence={evidence} />;
}
