// app/categories/page.tsx
'use client'

import { supabase } from '@/app/lib/supabaseClient'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
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

  return (
    <div>
      <h1>Categories</h1>
      <ul>
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link href={`/category/${cat.slug}`}>
              {cat.name}
            </Link>
            <p>{cat.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
