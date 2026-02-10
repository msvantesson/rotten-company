import { supabaseServer } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";

export default async function MyEvidencePage({
  params,
}: {
  params: { id: string };
}) {
  // 🧠 Parse ID safely – this should work for /my-evidence/637
  const evidenceId = parseInt(params.id, 10);
  if (isNaN(evidenceId)) {
    return <div>Invalid evidence ID</div>;
  }

  const supabase = await supabaseServer();

  // 🔐 Require login
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(
      `/login?reason=view-evidence&message=${encodeURIComponent(
        "You’ll need an account to view your evidence."
      )}`
    );
  }

  // 📄 Fetch evidence belonging to this user
  const { data: evidence, error } = await supabase
    .from("evidence")
    .select(
      "id, title, status, created_at, file_url, category, user_id, entity_type, entity_id"
    )
    .eq("id", evidenceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error loading evidence", error.message);
    return <div>Error loading evidence</div>;
  }

  if (!evidence) {
    // Either does not exist or does not belong to this user
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          Your Evidence #{evidence.id}
        </h1>
        <p className="text-sm text-gray-500">
          Created at {new Date(evidence.created_at).toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">
          Status:{" "}
          <span className="inline-flex items-center rounded-full border px-2 py-0.5">
            {evidence.status}
          </span>
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-semibold">Title</h2>
        <p>{evidence.title}</p>
      </section>

      {evidence.file_url && (
        <section className="space-y-2">
          <h2 className="font-semibold">Attached file</h2>
          <a
            href={evidence.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View uploaded file
          </a>
        </section>
      )}

      {evidence.category && (
        <section className="space-y-2">
          <h2 className="font-semibold">Category</h2>
          <p>{evidence.category}</p>
        </section>
      )}

      {evidence.entity_type && evidence.entity_id && (
        <section className="space-y-2 text-sm text-gray-500">
          <h2 className="font-semibold">Linked entity</h2>
          <p>
            {evidence.entity_type} #{evidence.entity_id}
          </p>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2 text-sm text-gray-500">
          Raw record (debug)
        </h2>
        <pre className="bg-black text-green-400 p-4 overflow-x-auto text-xs rounded">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </section>
    </main>
  );
}
