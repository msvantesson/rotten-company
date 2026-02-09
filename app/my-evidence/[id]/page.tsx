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
  const rawId =
    params?.id ??
    (typeof searchParams?.nxtPid === "string"
      ? searchParams.nxtPid
      : Array.isArray(searchParams?.nxtPid)
      ? searchParams.nxtPid[0]
      : null);

  const evidenceId = Number(rawId);
  const isResolved = rawId !== null;
  const isValidId = Number.isInteger(evidenceId) && evidenceId > 0;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;
  const isModerator = userId ? await canModerate(userId) : false;

  return (
    <main style={{ padding: 24 }}>
      {/* Only render wrapper once ID is valid */}
      {isResolved && isValidId && (
        <EvidenceClientWrapper
          isModerator={isModerator}
          currentUserId={userId}
        />
      )}

      {/* Loading state */}
      {!isResolved && <p>Loading your evidence details…</p>}

      {/* Invalid ID */}
      {isResolved && !isValidId && (
        <div
          style={{
            background: "#fff7e6",
            padding: 12,
            border: "1px solid #f0c36b",
            marginBottom: 12,
          }}
        >
          <strong>Invalid evidence id</strong>
        </div>
      )}
    </main>
  );
}
