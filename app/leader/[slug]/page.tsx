export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";

type Params = Promise<{ slug: string }> | { slug: string };
type Evidence = { id: number; title: string; summary?: string };
type Leader = { id: number; name: string; role: string | null; slug: string } | null;

export default async function LeaderPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string };
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  const { data: leader } = await supabase
    .from("leaders")
    .select("id, name, role, slug")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (!leader) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No leader found</h1>
        <p>Slug: {rawSlug}</p>
      </div>
    );
  }

  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, title, summary")
    .eq("leader_id", leader.id)
    .eq("status", "approved");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{leader.name}</h1>
      {leader.role && <p>{leader.role}</p>}
      <h2>Approved Evidence</h2>

      {evidence?.length ? (
        <ul>
          {evidence.map((item) => (
            <li key={item.id} style={{ marginBottom: "1rem" }}>
              <strong>{item.title}</strong>
              {item.summary && <div style={{ marginTop: 6 }}>{item.summary}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <p>No approved evidence found.</p>
      )}
    </div>
  );
}
