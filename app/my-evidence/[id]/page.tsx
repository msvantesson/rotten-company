export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";

export default function MyEvidencePage({ params }) {
  const rawId = params?.id ?? null;
  const evidenceId = Number(rawId);
  const isValidId = Number.isInteger(evidenceId) && evidenceId > 0;

  return (
    <main style={{ padding: 24 }}>
      <EvidenceClientWrapper />

      {!isValidId && (
        <div style={{ background: "#fff7e6", padding: 12, border: "1px solid #f0c36b", marginBottom: 12 }}>
          <strong>Invalid evidence id</strong>
          <div>The client will re-check and load the correct evidence.</div>
        </div>
      )}

      {isValidId && (
        <div style={{ background: "#f0f5ff", padding: 12, border: "1px solid #adc6ff", marginBottom: 12 }}>
          <strong>Evidence page shell</strong>
          <div>Client will fetch evidence #{evidenceId}.</div>
        </div>
      )}

      <h1>My Evidence {isValidId ? `#${evidenceId}` : ""}</h1>
      <p>Loading your evidence details…</p>
    </main>
  );
}
