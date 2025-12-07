import { supabase } from '@/lib/supabaseClient'

export default async function CategoryDetail({ params }: { params: { slug: string } }) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')

  if (error) {
    return <div>Error loading categories: {error.message}</div>
  }

  if (!data || data.length === 0) {
    return <div>No categories found</div>
  }

  return (
    <div>
      <h1>Testing categories</h1>
      <ul>
        {data.map(cat => (
          <li key={cat.id}>
            {cat.slug} — {cat.name} — {cat.description ?? 'No description'}
          </li>
        ))}
      </ul>
    </div>
  )
