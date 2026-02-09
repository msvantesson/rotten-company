export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";
import { supabaseServer } from "@/lib/supabase-server";
import { canModerate } from "@/lib/moderation-guards";

export default async function MyEvidencePage({
  params,
}: {
  params: { id: string };
}) {
  console.info("[my-evidence] params.id:", params.id);

  const evidenceId = Number(params.id);

  if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
    return (
      <main style={{ padding: 24 }}>
        <strong>Invalid evidence id</strong>
        <pre style={{ marginTop: 12 }}>
          {JSON.stringify({ params }, null, 2)}
        </pre>
      </main>
    );
  }

  let userId: string | null = null;
  let isModerator = false;

  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    isModerator = userId ? await canModerate(userId) : false;
  } catch (err) {
    console.error("[my-evidence] auth error", err);
  }

  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper
        evidenceId={evidenceId}
        isModerator={isModerator}
        currentUserId={userId}
      />
    </main>
  );
}
