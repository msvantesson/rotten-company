"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllCategoriesClient, type Category } from "../../lib/categories";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function CategoriesPageClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = supabaseBrowser();
      const { auth } = supabase;

      try {
        const data = await getAllCategoriesClient(supabase, {
          column: "name",
          throwOnError: true,
        });
        setCategories(data);
      } catch (error) {
        console.error("Supabase error:", error);

        const message =
          error instanceof Error ? error.message : String(error ?? "");
        if (
          message.includes("refresh_token_not_found") ||
          message.includes("Invalid Refresh Token")
        ) {
          // Clear broken auth state and let the page still work as anonymous.
          await auth.signOut();
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) return <div>Loading categories…</div>;
  if (error) return <div>Error loading categories: {error}</div>;
  if (!categories.length) return <div>No categories found</div>;

  return (
    <div>
      <h1>Categories</h1>

      <ul>
        {categories.map((cat) => (
          <li key={cat.id} className="mb-4">
            <Link href={`/category/${cat.slug}`} className="text-blue-600 underline">
              {cat.name}
            </Link>
            {cat.description && (
              <p className="text-sm text-gray-700">{cat.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
