// app/category/[slug]/page.tsx
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export default async function CategoryDetail({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)

  const category = data?.[0]

  return (
    <div>
      <h1>{category?.name ?? 'Not found'}</h1>
      <p>{category?.description ?? 'No description available'}</p>
    </div>
  )
}
