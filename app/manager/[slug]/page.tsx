export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";
import { EvidenceList } from "@/components/EvidenceList";

type Params = Promise<{ slug: string }> | { slug: string };
type Evidence = { id: number; title: string; summary?: string };
type Manager = { id: number; name: string; role: string | null; slug: string } | null;

export default async function ManagerPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string };
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  const { data: manager } = await supabase
    .from("managers")
    .select("id, name, role, slug")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (!manager) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No manager found</h1>
        <p>Slug: {rawSlug}</p>
      </div>
    );
  }

  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, title, summary")
    .eq("manager_id", manager.id)
    .eq("status", "approved");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{manager.name}</h1>
      {manager.role && <p>{manager.role}</p>}
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
