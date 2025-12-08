import { getSupabaseClient } from '@/app/lib/supabaseClient'


export default async function CategoryDetail({ params }) {
  console.log('Route params:', params)

  const supabase = getSupabaseClient()
  if (!supabase) {
    return <div>Supabase not configured</div>
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)

  if (error) {
    console.error(error)
    return <div>Error loading category</div>
  }

  const category = data?.[0]
  return (
    <div>
      <h1>{category?.slug ?? 'Not found'}</h1>
      <p>{category?.description ?? 'No description available'}</p>
    </div>
  )
}
