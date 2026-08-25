import CategoriesPageClient from "./CategoriesPageClient";
import { getAllCategoriesServer } from "../../lib/categories";
import { canonicalUrl } from "../../lib/seo";
import { supabaseServer } from "../../lib/supabase-server";

function buildCategoriesJsonLd(
  categories: Awaited<ReturnType<typeof getAllCategoriesServer>>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Rotten Company Categories",
    itemListElement: categories.map((category, index) => {
      const url = canonicalUrl(`/category/${category.slug}`);

      return {
        "@type": "ListItem",
        position: index + 1,
        url,
        item: {
          "@type": "CategoryCode",
          identifier: category.id,
          name: category.name,
          description: category.description,
          url,
        },
      };
    }),
  };
}

export default async function CategoriesPage() {
  const supabase = await supabaseServer();
  const categories = await getAllCategoriesServer(supabase, {
    column: "name",
  });
  const jsonLd = buildCategoriesJsonLd(categories);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CategoriesPageClient />
    </>
  );
}
