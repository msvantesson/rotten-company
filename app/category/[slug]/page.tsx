// app/category/[slug]/page.tsx
'use client'

import { supabase } from '@/app/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function CategoryDetail({ params }: { params: { slug: string } }) {
  const [category, setCategory] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Slug param:', params.slug) // debug log
    const fetchCategory = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .ilike('slug', params.slug) // case-insensitive match

      console.log('Supabase query result:', data, error) // debug log

      if (error) {
        setError(error.message)
      } else {
        setCategory(data?.[0] ?? null)
      }
      setLoading(false)
    }
    fetchCategory()
  }, [params.slug])

  if (loading) return <div>Loading category…</div>
  if (error) return <div>Error loading category: {error}</div>
  if (!category) return <div>Category not found</div>

  return (
    <div>
      <h1>{category.name}</h1>
      <p>{category.description}</p>
    </div>
  )
}
