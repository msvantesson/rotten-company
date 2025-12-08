// app/category/[slug]/page.tsx
import { getSupabaseClient } from '@/app/lib/supabaseClient'


export default async function CategoryDetail({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = getSupabaseClient()

  console.log('Slug param:', params.slug)

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .ilike('slug', params.slug) // case-insensitive

  if (error) {
    console.error('Supabase error:', error)
    return <div>Error loading category</div>
  }

  const category = data?.[0]

  if (!category) {
    return <div>Category not found</div>
  }

  return (
    <div>
      <h1>{category.name}</h1>
      <p>{category.description}</p>
    </div>
  )
}
