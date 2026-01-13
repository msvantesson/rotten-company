import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function MyEvidencePage() {
  const supabase = supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">My evidence</h1>
        <p>You must be signed in.</p>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("evidence")
    .select(`
      id,
      title,
      status,
      created_at,
      companies ( name, slug ),
      company_requests ( name )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return <p>Error loading evidence: {error.message}</p>;
  }

  return (
    <main className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">My evidence</h1>

      <ul className="space-y-3">
        {data.map((e) => (
          <li
            key={e.id}
            className="border rounded-lg p-4 flex justify-between"
          >
            <div>
              <div className="font-medium">{e.title}</div>
              <div className="text-sm opacity-70">
                Target: {e.companies?.name ?? e.company_requests?.name}
              </div>
              <div className="text-xs opacity-50">
                {new Date(e.created_at).toLocaleString()}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase tracking-wide">
                {e.status}
              </div>
              <Link
                href={`/my-evidence/${e.id}`}
                className="text-sm underline mt-2 inline-block"
              >
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
