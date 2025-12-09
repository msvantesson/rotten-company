// app/owner/[slug]/page.tsx
import { fetchEntityBySlug, fetchApprovedEvidence } from "../../lib/api";
import { badgeForScore } from "../../lib/scoring";

export default async function OwnerPage({ params }: { params: { slug: string } }) {
  const owner = await fetchEntityBySlug("owner", params.slug);
  const evidence = await fetchApprovedEvidence("owner", owner.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{owner.name}</h1>
      <p>
        RottenMeter: {owner.rotten_score} ({badgeForScore(owner.rotten_score)})
      </p>
      <p>Type: {owner.type}</p>
      <section>
        <h2 className="text-xl font-semibold">Evidence</h2>
        <ul>
          {evidence.map((e: any) => (
            <li key={e.id}>
              <strong>{e.title}</strong> — {e.category} · {e.severity}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
