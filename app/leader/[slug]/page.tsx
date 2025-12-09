import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function LeaderPage({ params }: { params: { slug: string } }) {
  try {
    const leader = await fetchEntityBySlug("leader", params.slug);
    if (!leader) return <div>No leader found for slug: {params.slug}</div>;

    const evidence = await fetchApprovedEvidence("leader", leader.id);

    return (
      <div>
        <h1>{leader.name}</h1>
        <p>{leader.description}</p>
        <h2>Approved Evidence</h2>
        {evidence.length ? (
          <ul>{evidence.map((e: any) => <li key={e.id}>{e.title}</li>)}</ul>
        ) : <p>No approved evidence yet.</p>}
      </div>
    );
  } catch (err) {
    console.error(err);
    return <div>Unexpected error occurred.</div>;
  }
}
