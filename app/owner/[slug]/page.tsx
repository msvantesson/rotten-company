export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const fetchCache = "force-no-store";

import { supabase } from "@/lib/supabaseClient";

type Params = Promise<{ slug: string }> | { slug: string };
type Evidence = { id: number; title: string; summary?: string };
type Owner = { id: number; name: string; type: string; slug: string } | null;

export default async function OwnerPage({ params }: { params: Params }) {
  const resolvedParams = (await params) as { slug?: string };
  const rawSlug = resolvedParams?.slug ? decodeURIComponent(resolvedParams.slug) : "";

  const { data: owner } = await supabase
    .from("owners_investors")
    .select("id, name, type, slug")
    .eq("slug", rawSlug)
    .maybeSingle();

  if (!owner) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>No owner/investor found</h1>
        <p>Slug: {rawSlug}</p>
      </div>
    );
  }

  const { data: evidence } = await supabase
    .from("evidence")
    .select("id, title, summary")
    .eq("owner_id", owner.id)
    .eq("status", "approved");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{owner.name}</h1>
      <p>{owner.type}</p>
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
