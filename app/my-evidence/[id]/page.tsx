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
      <EvidenceClientWrapper />

      {!isResolved && (
        <p>Loading your evidence details…</p>
      )}

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

      {isValidId && (
        <div
          style={{
            background: "#f0f5ff",
            padding: 12,
            border: "1px solid #adc6ff",
            marginBottom: 12,
          }}
        >
          <strong>Evidence page shell</strong>
          <div>Client will fetch evidence #{evidenceId}.</div>
        </div>
      )}

      <h1>My Evidence {isValidId ? `#${evidenceId}` : ""}</h1>
    </main>
  );
}
