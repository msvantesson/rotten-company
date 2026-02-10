import { supabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

type ParamsShape = { id: string };

export default async function MyEvidencePage(props: {
  params: ParamsShape | Promise<ParamsShape>;
}) {
  // In your logs, params is actually a Promise, so normalize it here.
  const resolvedParams =
    props.params instanceof Promise ? await props.params : props.params;

  const supabase = await supabaseServer();

  // 🔐 Require login
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect(
      `/login?reason=view-evidence&message=${encodeURIComponent(
        "You’ll need an account to view your evidence."
      )}`
    );
  }

  const userId = auth.user.id;

  // 🧠 Parse ID from the resolved params
  const evidenceId = Number(resolvedParams.id);
  if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
    return <div>Invalid evidence ID</div>;
  }

  // 📄 Load evidence belonging to this user
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
