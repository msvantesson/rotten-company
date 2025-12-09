// app/category/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = await fetchEntityBySlug("category", params.slug);

  if (!category) {
    return (
      <div>
        <h1>No category found for slug: {params.slug}</h1>
      </div>
    );
  }

  const evidence = await fetchApprovedEvidence("category", category.id);

  return (
    <div>
      <h1>{category.name}</h1>
      <p>{category.description}</p>

      <h2>Approved Evidence</h2>
      {evidence.length === 0 ? (
        <p>No approved evidence yet.</p>
      ) : (
        <ul>
          {evidence.map((item: any) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
