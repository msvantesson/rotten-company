import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

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
    console.log("[MY-EVIDENCE] NOT FOUND: invalid id");
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[MY-EVIDENCE] User:", user?.id);

  if (!user) {
    console.log("[MY-EVIDENCE] NOT FOUND: no user");
    notFound();
  }

  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();

  console.log("[MY-EVIDENCE] Evidence:", evidence);
  console.log("[MY-EVIDENCE] Error:", error);

  if (!evidence) {
    console.log("[MY-EVIDENCE] NOT FOUND: no evidence row");
    notFound();
  }

  if (evidence.user_id !== user.id) {
    console.log("[MY-EVIDENCE] NOT FOUND: ownership mismatch", {
      evidenceUser: evidence.user_id,
      currentUser: user.id,
    });
    notFound();
  }

  console.log("[MY-EVIDENCE] ACCESS GRANTED");

  return (
    <main style={{ padding: 24 }}>
      <h1>My Evidence #{evidence.id}</h1>
      <pre>{JSON.stringify(evidence, null, 2)}</pre>
    </main>
  );
}
