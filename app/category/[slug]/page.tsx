import { supabase } from '@/lib/supabaseClient'

export default async function CategoryDetail({ params }: { params: { slug: string } }) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error) {
    return <div>Error loading category: {error.message}</div>
  }

  if (!data) {
    return <div>Category not found</div>
  }

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.description}</p>
    </div>
  )
}