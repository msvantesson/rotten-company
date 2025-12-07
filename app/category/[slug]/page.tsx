import { supabase } from '@/lib/supabaseClient'

export default async function CategoryDetail({ params }: { params: { slug: string } }) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)

  if (error) {
    return <div>Error loading category: {error.message}</div>
  }

  if (!data || data.length === 0) {
    return <div>Category not found</div>
  }

  const category = data[0]

  return (
    <div>
      <h1>{category.name}</h1>
      <p>{category.description ?? 'No description available'}</p>
    </div>
  )
}