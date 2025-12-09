import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function ManagerPage({ params }: { params: { slug: string } }) {
  try {
    const manager = await fetchEntityBySlug("manager", params.slug);
    if (!manager) return <div>No manager found for slug: {params.slug}</div>;

    const evidence = await fetchApprovedEvidence("manager", manager.id);

    return (
      <div>
        <h1>{manager.name}</h1>
        <p>{manager.description}</p>
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
