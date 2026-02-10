import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function MyEvidencePage({
  params,
}: {
  params: { id: string };
}) {
  console.log("[my-evidence] raw params:", params);

  const supabase = await supabaseServer();

  // 🔐 Auth check (any logged-in user)
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    console.log("[my-evidence] no authenticated user");
    redirect(
      `/login?reason=view-evidence&message=${encodeURIComponent(
        "You’ll need an account to view your evidence."
      )}`
    );
  }

  const userId = auth.user.id;
  console.log("[my-evidence] auth user:", userId);

  // 🧠 Parse ID safely — same pattern as admin moderation page
  const evidenceId = parseInt(params.id, 10);
  console.log("[my-evidence] parsed evidenceId:", evidenceId);

  if (Number.isNaN(evidenceId)) {
    console.log("[my-evidence] evidenceId is NaN, params.id:", params.id);
    return <div>Invalid evidence ID</div>;
  }

  // 📄 Load evidence, restricted to this user
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[my-evidence] evidence query error:", error.message);
    return <div>Error loading evidence</div>;
  }

  console.log("[my-evidence] evidence row:", evidence);

  if (!evidence) {
    return <div>Evidence not found</div>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Your Evidence #{evidence.id}</h1>

      <p>
        <strong>Title:</strong> {evidence.title}
      </p>

      <p>
        <strong>Status:</strong> {evidence.status}</p>

      <p>
        <strong>Created at:</strong>{" "}
        {new Date(evidence.created_at).toLocaleString()}
      </p>

      {evidence.file_url && (
        <p>
          <strong>File:</strong>{" "}
          <a href={evidence.file_url} target="_blank" rel="noopener noreferrer">
            View uploaded file
          </a>
        </p>
      )}

      <pre
        style={{
          marginTop: 24,
          background: "#111",
          color: "#0f0",
          padding: 16,
          overflowX: "auto",
        }}
      >
        {JSON.stringify(evidence, null, 2)}
      </pre>
    </main>
  );
}
