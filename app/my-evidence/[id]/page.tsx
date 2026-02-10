import { supabaseServer } from "@/lib/supabase-server";
import EvidenceClientWrapper from "@/components/EvidenceClientWrapper";
import { redirect } from "next/navigation";

export default async function MyEvidencePage({
  params,
}: {
  params: { id: string };
}) {
  const evidenceId = parseInt(params.id, 10);
  if (isNaN(evidenceId)) {
    return <div>Invalid evidence ID</div>;
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(
      `/login?reason=view-evidence&message=${encodeURIComponent(
        "You’ll need an account to view your evidence."
      )}`
    );
  }

  // For /my-evidence, isModerator is false; we only show submitter view.
  const isModerator = false;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">
        Your Evidence #{evidenceId}
      </h1>
      <EvidenceClientWrapper
        evidenceId={evidenceId}
        isModerator={isModerator}
        currentUserId={user.id}
      />
    </main>
  );
}
