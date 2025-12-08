// app/category/[slug]/page.tsx
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export default async function CategoryDetail({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('Supabase client not configured')
    return <div>Supabase not configured</div>
  }

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
