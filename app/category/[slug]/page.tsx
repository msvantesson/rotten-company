// app/category/[slug]/page.tsx
'use client'

import { supabase } from '@/app/lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function CategoryDetail() {
  const params = useParams() as { slug?: string }
  const [category, setCategory] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params?.slug) {
      console.log('Slug param missing')
      setLoading(false)
      return
    }

    console.log('Slug param:', params.slug)

    const fetchCategory = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .ilike('slug', params.slug)

      console.log('Supabase query result:', data, error)

      if (error) {
        setError(error.message)
      } else {
        setCategory(data?.[0] ?? null)
      }
      setLoading(false)
    }
    fetchCategory()
  }, [params?.slug])

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
