import { supabase } from '@/app/lib/supabaseClient'

export default async function CategoryDetail({ params }: { params: { slug: string } }) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .ilike('slug', params.slug)

  if (error) {
    console.error('Supabase error:', error)
    return <div>Error loading category</div>
  }

  const category = data?.[0]
  if (!category) return <div>Category not found</div>

  return (
    <div>
      <h1>{category.name}</h1>
      <p>{category.description}</p>
    </div>
  )
}
