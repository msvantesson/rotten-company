export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

export default async function MyEvidenceIndexPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, title, created_at, status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-semibold">My Evidence</h1>

      {!evidence || evidence.length === 0 ? (
        <p className="text-gray-600">
          You haven’t submitted any evidence yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {evidence.map((e) => (
            <li
              key={e.id}
              className="border rounded p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {e.title ?? `Evidence #${e.id}`}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(e.created_at).toLocaleString()} · {e.status}
                </div>
              </div>

              <Link
                href={`/my-evidence/${e.id}`}
                className="text-blue-600 hover:underline text-sm"
              >
                View →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
