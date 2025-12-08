// app/category/[slug]/page.tsx
import { getSupabaseClient } from '@/app/lib/supabaseClient'

interface CategoryPageProps {
  params: {
    slug: string
  }
}

export default async function CategoryDetail({ params }: CategoryPageProps) {
  console.log('Route params:', params)

  const supabase = getSupabaseClient()
  if (!supabase) {
    return <div>Supabase not configured</div>
  }

  // Ensure params.slug is a string
  const slug = String(params.slug)
  console.log('Slug used for query:', slug)

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)

  if (error) {
    console.error('Supabase error:', error)
    return <div>Error loading category</div>
  }

  console.log('Supabase query result:', data)

  const category = data?.[0]
  return (
    <div>
      <h1>{category?.name ?? 'Not found'}</h1>
      <p>{category?.description ?? 'No description available'}</p>
    </div>
  )
}
