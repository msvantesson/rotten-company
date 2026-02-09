export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";
import { supabaseServer } from "@/lib/supabase-server";
import { canModerate } from "@/lib/moderation-guards";

export default async function MyEvidencePage({
  params,
  searchParams,
}: {
  params: { id?: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // ─────────────────────────────────────────────
  // CANONICAL ID RESOLUTION
  // ─────────────────────────────────────────────
  const rawId =
    params?.id ??
    (typeof searchParams?.nxtPid === "string"
      ? searchParams.nxtPid
      : Array.isArray(searchParams?.nxtPid)
      ? searchParams.nxtPid[0]
      : null);

  const evidenceId = Number(rawId);
  const isValidId = Number.isInteger(evidenceId) && evidenceId > 0;

  if (!isValidId) {
    return (
      <main style={{ padding: 24 }}>
        <div
          style={{
            background: "#fff7e6",
            padding: 12,
            border: "1px solid #f0c36b",
          }}
        >
          <strong>Invalid evidence id</strong>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // NON‑BLOCKING AUTH (CRITICAL)
  // ─────────────────────────────────────────────
  let userId: string | null = null;
  let isModerator = false;

  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    isModerator = userId ? await canModerate(userId) : false;
  } catch {
    userId = null;
    isModerator = false;
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper
        isModerator={isModerator}
        currentUserId={userId}
      />
    </main>
  );
}
