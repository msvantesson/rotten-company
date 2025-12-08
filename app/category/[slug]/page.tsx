// app/category/[slug]/page.tsx
import { getSupabaseClient } from '@/app/lib/supabaseClient'

interface CategoryPageProps {
  params: {
    slug: string
  }
}

export default async function CategoryDetail({ params }: CategoryPageProps) {
  // Debug logs to check environment variables at runtime
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log(
    'Supabase Key:',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 5) + '...'
      : 'undefined'
  )
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
