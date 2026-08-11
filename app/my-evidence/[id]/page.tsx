import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import TechnicalDetails from "@/components/MyEvidenceTechnicalDetails";
import { formatEvidenceTimeline } from "@/lib/evidence-timeline";

type ParamsShape = { id: string };

export default async function MyEvidencePage(props: {
  params: ParamsShape | Promise<ParamsShape>;
}) {
  // Next 16 quirk: params may be a Promise
  const resolvedParams =
    props.params instanceof Promise ? await props.params : props.params;

  const supabase = await supabaseServer();

  // Require login
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect(
      `/login?reason=view-evidence&message=${encodeURIComponent(
        "You’ll need an account to view your evidence."
      )}`
    );
  }

  const userId = auth.user.id;

  // Parse ID
  const evidenceId = Number(resolvedParams.id);
  if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
    return <div style={{ padding: 24 }}>Invalid evidence ID</div>;
  }

  // Load evidence for this user
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[my-evidence] evidence query error:", error.message);
    return <div style={{ padding: 24 }}>Error loading evidence</div>;
  }

  if (!evidence) {
    return <div style={{ padding: 24 }}>Evidence not found</div>;
  }

  const createdAt = evidence.created_at
    ? new Date(evidence.created_at).toLocaleString()
    : "Unknown";
  const timeline = formatEvidenceTimeline(evidence);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 16 }}>
        Your Evidence #{evidence.id}
      </h1>

      <section style={{ marginBottom: 24, lineHeight: 1.6 }}>
        <div>
          <strong>Title:</strong> {evidence.title || "Untitled submission"}
        </div>
        <div>
          <strong>Status:</strong>{" "}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "2px 10px",
              fontSize: 12,
              border: "1px solid #ddd",
            }}
          >
            {evidence.status ?? "pending"}
          </span>
        </div>
        <div>
          <strong>Added to Rotten Company:</strong> {createdAt}
        </div>
        {timeline.hasTimeline ? (
          <>
            <div>
              <strong>Conduct/Event period:</strong> {timeline.conductPeriod}
            </div>
            <div>
              <strong>Ongoing:</strong> {timeline.ongoingLabel}
            </div>
            <div>
              <strong>Resolution status:</strong> {timeline.resolutionStatusLabel ?? "(not set)"}
            </div>
            {timeline.resolutionStatusLabel === "Resolved" && (
              <div>
                <strong>Resolution date:</strong> {timeline.resolutionDateLabel ?? "(not set)"}
              </div>
            )}
          </>
        ) : (
          <div>
            <strong>Timeline:</strong> Event date not yet documented
          </div>
        )}
        {evidence.file_url && (
          <div>
            <strong>File:</strong>{" "}
            <a
              href={evidence.file_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View uploaded file
            </a>
          </div>
        )}
      </section>

      <TechnicalDetails evidence={evidence} />
    </main>
  );
}
