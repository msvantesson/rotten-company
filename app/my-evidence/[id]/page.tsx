// app/my-evidence/[id]/page.tsx

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";

export default function MyEvidencePage({
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

  return (
    <main style={{ padding: 24 }}>
      {/* Client wrapper owns auth + fetch + render */}
      <EvidenceClientWrapper />

      {/* RSC preflight can arrive without params; treat as loading */}
      {!isResolved && <p>Loading your evidence details…</p>}

      {/* Only show invalid once we actually have something resolved */}
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
