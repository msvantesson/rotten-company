// app/category/[slug]/page.tsx (temporary debug)
import { fetchEntityBySlug, fetchApprovedEvidence } from "@/app/lib/data";

export default async function CategoryPage({
  params,
}: {
  params: { slug?: string };
}) {
  // Debug: force a visible error and console log
  console.log("CategoryPage params:", params);

  if (!params?.slug) {
    // Throw so Vercel function logs show a stack and the params value
    throw new Error("DEBUG: params.slug is undefined. params: " + JSON.stringify(params));
  }

  const category = await fetchEntityBySlug("category", params.slug);
  // ...
  return <div>OK</div>;
}
