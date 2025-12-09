import { fetchEntityBySlug, fetchApprovedEvidence } from "@/lib/data";

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  try {
    const category = await fetchEntityBySlug("category", params.slug);
    if (!category) return <div>No category found for slug: {params.slug}</div>;

    const evidence = await fetchApprovedEvidence("category", category.id);

    return (
      <div>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
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
