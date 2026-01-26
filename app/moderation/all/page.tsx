import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseService } from "@/lib/supabase-service";
import { canModerate } from "@/lib/moderation-guards";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ModerationAllPage() {
  // ─────────────────────────────────────────────
  // BUILD‑TIME GUARD
  // ─────────────────────────────────────────────
  const hdrs = await headers();
  const isBuildTime = hdrs.get("x-vercel-id") === null;

  if (isBuildTime) {
    return null;
  }

  // ─────────────────────────────────────────────
  // USER AUTH (COOKIE‑SCOPED)
  // ─────────────────────────────────────────────
  const userClient = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  const userId = user?.id ?? null;

  console.info(
    "[moderation/all] SSR user present:",
    !!user,
    "userId:",
    userId,
    "error:",
    userError
  );

  if (!userId) {
    return (
      <main className="max-w-5xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Admin moderation</h1>
        <p>You must be logged in to access this page.</p>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // ADMIN‑ONLY GATE
  // ─────────────────────────────────────────────
  const allowed = await canModerate(userId);

  if (!allowed) {
    return (
      <main className="max-w-5xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Admin moderation</h1>
        <p>You do not have admin access.</p>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // SERVICE‑ROLE DATA ACCESS
  // ─────────────────────────────────────────────
  const service = supabaseService();

  const { data: evidence, error } = await service
    .from("evidence")
    .select(
      `
      id,
      title,
      status,
      created_at,
      assigned_moderator_id,
      contributor_note,
      summary
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[moderation/all] fetch failed", error);
    return (
      <main className="max-w-5xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Admin moderation</h1>
        <p className="text-red-600">Failed to load moderation data.</p>
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <main className="max-w-5xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">
        Admin moderation — all evidence
      </h1>

      <div className="mb-4 p-3 rounded border bg-yellow-50 text-sm">
        <strong>Admin debug</strong>
        <div>User id: {userId}</div>
        <div>Total evidence items: {evidence?.length ?? 0}</div>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Assigned moderator</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {evidence?.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2 font-mono">{e.id}</td>
                <td className="px-3 py-2">{e.title}</td>
                <td className="px-3 py-2">{e.status}</td>
                <td className="px-3 py-2">
                  {e.assigned_moderator_id ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {new Date(e.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {!evidence?.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  No evidence found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
