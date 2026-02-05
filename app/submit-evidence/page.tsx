// app/submit-evidence/page.tsx
import EvidenceUpload from "@/components/EvidenceUpload";

export default function SubmitEvidencePage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <EvidenceUpload entityId={0} entityType="company" />
    </div>
  );
}
