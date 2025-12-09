// app/category/[slug]/page.tsx
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  try {
    // Defensive check: ensure slug exists
    if (!params.slug) {
      throw new Error("Slug param is missing");
    }

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .ilike("slug", params.slug!); // non-null assertion

    if (error) {
      console.error("Supabase error:", error);
      return <div>Failed to load category.</div>;
    }

    if (!data || data.length === 0) {
      return <div>No category found for slug: {params.slug}</div>;
    }

    const category = data[0];

    return (
      <div>
        <h1>{category.name}</h1>
        <p>Slug: {category.slug}</p>
        <p>Description: {category.description}</p>
      </div>
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return <div>Unexpected error occurred.</div>;
  }
}
