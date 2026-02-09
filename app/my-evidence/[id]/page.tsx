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
  params: { id?: string | string[] };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const idFromParams =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : undefined;

  const nxtPid = searchParams?.nxtPid;
  const idFromNxtPid =
    typeof nxtPid === "string" ? nxtPid : Array.isArray(nxtPid) ? nxtPid[0] : undefined;

  const rawId = idFromParams ?? idFromNxtPid ?? undefined;

  const evidenceId = rawId ? Number.parseInt(rawId, 10) : NaN;

  if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
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

  // Non-blocking auth (never hang route)
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

  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper evidenceId={evidenceId} isModerator={isModerator} currentUserId={userId} />
    </main>
  );
}
