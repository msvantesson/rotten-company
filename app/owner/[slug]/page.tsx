import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function OwnerPage({ params }: { params: { slug: string } }) {
  try {
    const owner = await fetchEntityBySlug("owner", params.slug);
    if (!owner) return <div>No owner/investor found for slug: {params.slug}</div>;

    const evidence = await fetchApprovedEvidence("owner", owner.id);

    return (
      <div>
        <h1>{owner.name}</h1>
        <p>{owner.description}</p>
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
