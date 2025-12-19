import { createClient } from "@/utils/supabase/server";

export default async function ModerationPage() {
  const supabase = createClient();

  // Step 2: Fetch pending evidence
  const { data: pendingEvidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("status", "pending");

  console.log("Pending evidence:", pendingEvidence);
  console.log("Error:", error);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Moderation</h1>
      <p>Pending evidence count: {pendingEvidence?.length ?? 0}</p>

      <pre style={{ background: "#eee", padding: "1rem", marginTop: "1rem" }}>
        {JSON.stringify(pendingEvidence, null, 2)}
      </pre>
    </div>
  );
}
