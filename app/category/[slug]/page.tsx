// app/category/[slug]/page.tsx
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export default async function CategoryDetail({
  params,
}: {
  params: { slug: string }
}) {
  // Supabase client is guaranteed non-null because of Option 3 typing
  const supabase = getSupabaseClient()

  // Debug log to confirm slug
  console.log('Slug used for query:', params.slug)

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)

  if (error) {
    console.error('Supabase error:', error)
    return <div>Error loading category</div>
  }

  const category = data?.[0]

  return (
    <div>
      <h1>{category?.name ?? 'Not found'}</h1>
      <p>{category?.description ?? 'No description available'}</p>
    </div>
  )
}
