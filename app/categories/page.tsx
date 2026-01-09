// app/categories/page.tsx
'use client'

import { supabase } from '@/app/lib/supabaseClient'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        setError(error.message)
      } else {
        setCategories(data ?? [])
      }
      setLoading(false)
    }
    fetchCategories()
  }, [])

  if (loading) return <div>Loading categories…</div>
  if (error) return <div>Error loading categories: {error}</div>
  if (!categories.length) return <div>No categories found</div>

  // JSON-LD for the full category list
  const jsonLdList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Rotten Company Categories",
    itemListElement: categories.map((cat, index) => ({
      "@type": "CategoryCode",
      position: index + 1,
      name: cat.name,
      description: cat.description,
      identifier: cat.id,
      url: `https://rotten-company.com/category/${cat.slug}`,
    })),
  }

  return (
    <div>
      {/* JSON-LD for the full category list */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdList, null, 2),
        }}
      />

      <h1>Categories</h1>

      <ul>
        {categories.map((cat) => {
          // JSON-LD for each individual category
          const jsonLdCategory = {
            "@context": "https://schema.org",
            "@type": "CategoryCode",
            identifier: cat.id,
            name: cat.name,
            description: cat.description,
            url: `https://rotten-company.com/category/${cat.slug}`,
          }

          return (
            <li key={cat.id} className="mb-4">
              {/* JSON-LD for this category */}
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify(jsonLdCategory, null, 2),
                }}
              />

              <Link href={`/category/${cat.slug}`} className="text-blue-600 underline">
                {cat.name}
              </Link>

              {cat.description && (
                <p className="text-sm text-gray-700">{cat.description}</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
